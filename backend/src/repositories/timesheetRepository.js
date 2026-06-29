'use strict';

const { Op, fn, col, literal } = require('sequelize');
const {
  Timesheet,
  Employee,
  ServicePO,
  SubProject,
  Client,
  sequelize,
} = require('../models');

/**
 * Timesheet Repository
 * Raw database access — no business logic.
 */

// ── Allowed sort columns (whitelist to prevent SQL injection) ─────────────────
const ALLOWED_SORT_COLUMNS = new Set([
  'timesheet_date',
  'hours_logged',
  'created_at',
]);

/**
 * Build the common `include` array used by findAll and findById.
 * @returns {object[]}
 */
function buildIncludes() {
  return [
    {
      model: Employee,
      as: 'employee',
      attributes: ['id', 'employee_code', 'full_name', 'designation', 'status'],
    },
    {
      model: ServicePO,
      as: 'servicePO',
      attributes: [
        'id',
        'service_po_code',
        'service_po_name',
        'is_billable',
        'status',
      ],
      include: [
        {
          model: Client,
          as: 'client',
          attributes: ['id', 'client_code', 'client_name'],
        },
      ],
    },
    {
      model: SubProject,
      as: 'subProject',
      attributes: [
        'id',
        'sub_project_code',
        'sub_project_name',
        'status',
      ],
      required: false,
    },
  ];
}

/**
 * Fetch a paginated, filtered, sorted list of timesheets.
 *
 * @param {object} filters    - { startDate, endDate, employeeId, poId, subProjectId }
 * @param {object} pagination - { limit, offset }
 * @param {object} sort       - { sortBy, sortOrder }
 * @returns {Promise<{ rows: Timesheet[], count: number }>}
 */
const findAll = async (filters = {}, pagination = {}, sort = {}) => {
  const { startDate, endDate, employeeId, poId, subProjectId } = filters;
  const { limit = 20, offset = 0 } = pagination;

  let { sortBy = 'timesheet_date', sortOrder = 'DESC' } = sort;
  if (!ALLOWED_SORT_COLUMNS.has(sortBy)) {
    sortBy = 'timesheet_date';
  }
  const order = sortOrder.toUpperCase() === 'ASC' ? 'ASC' : 'DESC';

  const where = {};

  if (startDate) {
    where.timesheet_date = { ...where.timesheet_date, [Op.gte]: startDate };
  }
  if (endDate) {
    where.timesheet_date = { ...where.timesheet_date, [Op.lte]: endDate };
  }
  if (employeeId) {
    where.employee_id = parseInt(employeeId, 10);
  }
  if (poId) {
    where.service_po_id = parseInt(poId, 10);
  }
  if (subProjectId) {
    where.sub_project_id = parseInt(subProjectId, 10);
  }

  return Timesheet.findAndCountAll({
    where,
    include: buildIncludes(),
    limit,
    offset,
    order: [[sortBy, order]],
    distinct: true,
  });
};

/**
 * Fetch a single timesheet entry by primary key with full associations.
 * @param {number} id
 * @returns {Promise<Timesheet|null>}
 */
const findById = async (id) => {
  return Timesheet.findOne({
    where: { id },
    include: buildIncludes(),
  });
};

/**
 * Check whether a timesheet entry already exists for the given
 * employee / PO / date combination.
 *
 * The unique index `timesheets_employee_po_date_unique` enforces this at
 * the DB level; this function lets the service layer produce a friendly
 * error before the DB constraint fires.
 *
 * @param {number} employeeId
 * @param {number} poId
 * @param {string} date  - ISO date string (YYYY-MM-DD)
 * @param {number} [excludeId] - Exclude this ID from the check (used on updates)
 * @returns {Promise<Timesheet|null>}
 */
const checkDuplicate = async (employeeId, poId, date, excludeId = null) => {
  const where = {
    employee_id: employeeId,
    service_po_id: poId,
    timesheet_date: date,
  };

  if (excludeId) {
    where.id = { [Op.ne]: excludeId };
  }

  return Timesheet.findOne({ where });
};

/**
 * Insert a new timesheet record.
 * @param {object} data
 * @returns {Promise<Timesheet>}
 */
const create = async (data) => {
  return Timesheet.create(data);
};

/**
 * Bulk-insert timesheet records within a single transaction.
 * Each object in `records` must already be validated.
 *
 * @param {object[]} records
 * @param {object}   [transaction] - Sequelize transaction object
 * @returns {Promise<Timesheet[]>}
 */
const bulkCreate = async (records, transaction = null) => {
  return Timesheet.bulkCreate(records, {
    validate: true,
    returning: true,
    ...(transaction ? { transaction } : {}),
  });
};

/**
 * Update an existing timesheet by primary key.
 * @param {number} id
 * @param {object} data
 * @returns {Promise<Timesheet|null>}
 */
const update = async (id, data) => {
  const timesheet = await Timesheet.findByPk(id);
  if (!timesheet) return null;
  return timesheet.update(data);
};

/**
 * Hard-delete a timesheet record.
 * @param {number} id
 * @returns {Promise<number>} 1 if deleted, 0 if not found.
 */
const deleteById = async (id) => {
  return Timesheet.destroy({ where: { id } });
};

/**
 * Aggregate total hours grouped by employee for the given filters.
 *
 * @param {object} filters - { startDate, endDate, employeeId, poId }
 * @returns {Promise<Array<{ employeeId, employeeCode, fullName, totalHours }>>}
 */
const getSummaryByEmployee = async (filters = {}) => {
  const { startDate, endDate, employeeId, poId } = filters;

  const where = {};
  if (startDate) where.timesheet_date = { ...where.timesheet_date, [Op.gte]: startDate };
  if (endDate)   where.timesheet_date = { ...where.timesheet_date, [Op.lte]: endDate };
  if (employeeId) where.employee_id = parseInt(employeeId, 10);
  if (poId)       where.service_po_id = parseInt(poId, 10);

  const rows = await Timesheet.findAll({
    attributes: [
      'employee_id',
      [fn('SUM', col('Timesheet.hours_logged')), 'total_hours'],
      [fn('COUNT', col('Timesheet.id')), 'entry_count'],
    ],
    where,
    include: [
      {
        model: Employee,
        as: 'employee',
        attributes: ['id', 'employee_code', 'full_name', 'designation'],
      },
    ],
    group: [
      'Timesheet.employee_id',
      'employee.id',
      'employee.employee_code',
      'employee.full_name',
      'employee.designation',
    ],
    order: [[fn('SUM', col('Timesheet.hours_logged')), 'DESC']],
    raw: false,
  });

  return rows;
};

/**
 * Aggregate total hours grouped by Service PO for the given filters.
 *
 * @param {object} filters - { startDate, endDate, employeeId, poId }
 * @returns {Promise<Array>}
 */
const getSummaryByPO = async (filters = {}) => {
  const { startDate, endDate, employeeId, poId } = filters;

  const where = {};
  if (startDate) where.timesheet_date = { ...where.timesheet_date, [Op.gte]: startDate };
  if (endDate)   where.timesheet_date = { ...where.timesheet_date, [Op.lte]: endDate };
  if (employeeId) where.employee_id = parseInt(employeeId, 10);
  if (poId)       where.service_po_id = parseInt(poId, 10);

  const rows = await Timesheet.findAll({
    attributes: [
      'service_po_id',
      [fn('SUM', col('Timesheet.hours_logged')), 'total_hours'],
      [fn('COUNT', col('Timesheet.id')), 'entry_count'],
    ],
    where,
    include: [
      {
        model: ServicePO,
        as: 'servicePO',
        attributes: [
          'id',
          'service_po_code',
          'service_po_name',
          'is_billable',
          'status',
        ],
      },
    ],
    group: [
      'Timesheet.service_po_id',
      'servicePO.id',
      'servicePO.service_po_code',
      'servicePO.service_po_name',
      'servicePO.is_billable',
      'servicePO.status',
    ],
    order: [[fn('SUM', col('Timesheet.hours_logged')), 'DESC']],
    raw: false,
  });

  return rows;
};

/**
 * Get total logged hours for a specific employee in a given month/year.
 * If employeeId is omitted, returns the monthly total across all employees.
 *
 * @param {number} month      - 1-12
 * @param {number} year       - e.g. 2025
 * @param {number} [employeeId]
 * @returns {Promise<number>}  Total hours (or 0 if no entries found)
 */
const getMonthlyHours = async (month, year, employeeId = null) => {
  const where = {
    [Op.and]: [
      literal(`EXTRACT(MONTH FROM timesheet_date) = ${parseInt(month, 10)}`),
      literal(`EXTRACT(YEAR  FROM timesheet_date) = ${parseInt(year, 10)}`),
    ],
  };

  if (employeeId) {
    where.employee_id = parseInt(employeeId, 10);
  }

  const result = await Timesheet.findOne({
    attributes: [[fn('SUM', col('hours_logged')), 'total_hours']],
    where,
    raw: true,
  });

  return parseFloat(result?.total_hours ?? 0) || 0;
};

/**
 * Return distinct non-null timesheet_import_id values for all timesheets
 * in a given month/year. Used to identify old import history records to clean up.
 *
 * @param {number} month  - 1-12
 * @param {number} year
 * @param {object} [transaction]
 * @returns {Promise<number[]>}
 */
const getImportIdsByMonth = async (month, year, transaction = null) => {
  const rows = await Timesheet.findAll({
    attributes: ['timesheet_import_id'],
    where: {
      [Op.and]: [
        literal(`EXTRACT(MONTH FROM timesheet_date) = ${parseInt(month, 10)}`),
        literal(`EXTRACT(YEAR  FROM timesheet_date) = ${parseInt(year, 10)}`),
        { timesheet_import_id: { [Op.not]: null } },
      ],
    },
    group: ['timesheet_import_id'],
    raw: true,
    ...(transaction ? { transaction } : {}),
  });
  return rows.map((r) => r.timesheet_import_id);
};

/**
 * Delete ALL timesheet records for a given month and year.
 * Used by the import so re-uploading a monthly file fully replaces
 * the month's data — employees absent from the new file are removed.
 *
 * @param {number} month  - 1-12
 * @param {number} year
 * @param {object} [transaction]
 * @returns {Promise<number>} number of deleted rows
 */
const deleteByMonth = async (month, year, transaction = null) => {
  return Timesheet.destroy({
    where: {
      [Op.and]: [
        literal(`EXTRACT(MONTH FROM timesheet_date) = ${parseInt(month, 10)}`),
        literal(`EXTRACT(YEAR  FROM timesheet_date) = ${parseInt(year, 10)}`),
      ],
    },
    ...(transaction ? { transaction } : {}),
  });
};

/**
 * Fetch all timesheet records associated with a specific import batch.
 * Uses `timesheet_import_id` to link rows to the import history record.
 *
 * @param {number} importId
 * @returns {Promise<Timesheet[]>}
 */
const findByImportBatch = async (importId) => {
  return Timesheet.findAll({
    where: { timesheet_import_id: importId },
    include: buildIncludes(),
    order: [['timesheet_date', 'ASC']],
  });
};

module.exports = {
  findAll,
  findById,
  checkDuplicate,
  create,
  bulkCreate,
  getImportIdsByMonth,
  deleteByMonth,
  update,
  deleteById,
  getSummaryByEmployee,
  getSummaryByPO,
  getMonthlyHours,
  findByImportBatch,
};
