'use strict';

const { TimesheetImportHistory, TimesheetImportError, User, Employee } = require('../models');

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
 * @param {object} pagination - { limit, offset }
 * @returns {Promise<{ rows: TimesheetImportHistory[], count: number }>}
 */
const findAllImports = async (pagination = {}) => {
  const { limit = 20, offset = 0 } = pagination;

  return TimesheetImportHistory.findAndCountAll({
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

module.exports = {
  createImportHistory,
  updateImportHistory,
  createImportErrors,
  findImportById,
  findAllImports,
};
