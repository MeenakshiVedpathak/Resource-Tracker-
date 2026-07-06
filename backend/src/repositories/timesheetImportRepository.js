'use strict';

const { Op } = require('sequelize');
const { TimesheetImportHistory, TimesheetImportError, User, Employee, sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

/**
 * Timesheet Import Repository
 * Raw database access for timesheet_import_history and timesheet_import_errors.
 * No business logic lives here.
 */

/**
 * Insert a new import history record.
 *
 * @param {object} data
 * @param {number} data.imported_by  - User ID
 * @param {string} data.file_name
 * @param {string} data.file_path
 * @param {number} data.total_rows
 * @param {number} data.valid_rows
 * @param {number} data.error_rows
 * @param {string} data.status       - 'pending' | 'processing' | 'completed' | 'failed'
 * @returns {Promise<TimesheetImportHistory>}
 */
const createImportHistory = async (data) => {
  return TimesheetImportHistory.create(data);
};

/**
 * Update an existing import history record.
 *
 * @param {number} id
 * @param {object} data  - Partial fields to update
 * @returns {Promise<TimesheetImportHistory|null>}
 */
const updateImportHistory = async (id, data) => {
  const record = await TimesheetImportHistory.findByPk(id);
  if (!record) return null;
  return record.update(data);
};

/**
 * Bulk-insert error rows for a given import.
 * Each item in `errors` must include import_id, row_number, row_data, error_message.
 *
 * @param {object[]} errors
 * @returns {Promise<TimesheetImportError[]>}
 */
const createImportErrors = async (errors) => {
  if (!errors || errors.length === 0) return [];
  return TimesheetImportError.bulkCreate(errors, { validate: true, returning: true });
};

/**
 * Fetch a single import history record by primary key, including all error rows.
 *
 * @param {number} id
 * @returns {Promise<TimesheetImportHistory|null>}
 */
const findImportById = async (id) => {
  return TimesheetImportHistory.findOne({
    where: { id },
    include: [
      {
        model: TimesheetImportError,
        as: 'errors',
        attributes: ['id', 'row_number', 'row_data', 'error_message', 'created_at'],
        order: [['row_number', 'ASC']],
        required: false,
      },
      {
        model: User,
        as: 'importer',
        attributes: ['id', 'email'],
        required: false,
        include: [
          {
            model: Employee,
            as: 'employee',
            attributes: ['id', 'full_name', 'employee_code'],
            required: false,
          },
        ],
      },
    ],
  });
};

/**
 * Fetch a paginated list of all import history records, newest first.
 *
 * @param {object} pagination     - { limit, offset }
 * @param {object} [filters]      - { month, year } — filters on import_month/import_year
 * @returns {Promise<{ rows: TimesheetImportHistory[], count: number }>}
 */
const findAllImports = async (pagination = {}, filters = {}) => {
  const { limit = 20, offset = 0 } = pagination;
  const { month, year } = filters;

  const where = {};
  if (month) where.import_month = month;
  if (year) where.import_year = year;

  return TimesheetImportHistory.findAndCountAll({
    where,
    include: [
      {
        model: User,
        as: 'importer',
        attributes: ['id', 'email'],
        required: false,
        include: [
          {
            model: Employee,
            as: 'employee',
            attributes: ['id', 'full_name', 'employee_code'],
            required: false,
          },
        ],
      },
    ],
    limit,
    offset,
    order: [['created_at', 'DESC']],
    distinct: true,
  });
};

/**
 * Count distinct employees covered by each import batch, for a given set of
 * import IDs. Used to annotate the import history list with a total_employees
 * figure without an N+1 query per row.
 *
 * @param {number[]} importIds
 * @returns {Promise<Map<number, number>>} import_id -> distinct employee count
 */
const getEmployeeCountsByImportIds = async (importIds) => {
  const counts = new Map();
  if (!importIds || importIds.length === 0) return counts;

  const rows = await sequelize.query(
    `SELECT timesheet_import_id, COUNT(DISTINCT employee_id) AS total_employees
     FROM timesheets
     WHERE timesheet_import_id IN (:importIds)
     GROUP BY timesheet_import_id`,
    { replacements: { importIds }, type: QueryTypes.SELECT }
  );

  rows.forEach((r) => {
    counts.set(r.timesheet_import_id, parseInt(r.total_employees, 10));
  });

  return counts;
};

/**
 * Delete import history records by their IDs, excluding one (the current import).
 * timesheet_import_errors rows are removed automatically via ON DELETE CASCADE.
 *
 * @param {number[]} ids        - IDs to delete
 * @param {number}   excludeId  - The current import being confirmed — never deleted
 * @param {object}   [transaction]
 * @returns {Promise<number>} number of deleted records
 */
const deleteImportsByIds = async (ids, excludeId, transaction = null) => {
  const targets = ids.filter((id) => id !== excludeId);
  if (!targets.length) return 0;
  return TimesheetImportHistory.destroy({
    where: { id: { [Op.in]: targets } },
    ...(transaction ? { transaction } : {}),
  });
};

module.exports = {
  createImportHistory,
  updateImportHistory,
  createImportErrors,
  findImportById,
  findAllImports,
  getEmployeeCountsByImportIds,
  deleteImportsByIds,
};
