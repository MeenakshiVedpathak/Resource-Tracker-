'use strict';

const { Op, fn, col, literal } = require('sequelize');
const { MonthlyCost, Employee } = require('../models');
const logger = require('../utils/logger');

/**
 * Monthly Cost Repository
 * All direct Sequelize interactions for the monthly_costs table.
 */

// ─── Standard employee include ─────────────────────────────────────────────────
const employeeInclude = {
  model: Employee,
  as: 'employee',
  attributes: [
    'id',
    'employee_code',
    'full_name',
    'designation',
    'status',
  ],
};

/**
 * Retrieve a paginated, filtered, sorted list of monthly cost records.
 *
 * @param {object} filters          - { year, month, employee_id }
 * @param {{ limit, offset }} pagination
 * @param {{ sortBy, sortOrder }} sort
 * @returns {Promise<{ rows: MonthlyCost[], count: number }>}
 */
const findAll = async (filters = {}, pagination = {}, sort = {}) => {
  try {
    const where = {};

    if (filters.year) {
      where.year = parseInt(filters.year, 10);
    }

    if (filters.month) {
      where.month = parseInt(filters.month, 10);
    }

    if (filters.employee_id) {
      where.employee_id = parseInt(filters.employee_id, 10);
    }

    const allowedSortColumns = ['year', 'month', 'salary_cost', 'total_cost', 'created_at'];
    const sortBy = allowedSortColumns.includes(filters.sortBy || sort.sortBy)
      ? (filters.sortBy || sort.sortBy)
      : 'year';
    const sortOrder = ['ASC', 'DESC'].includes(
      (filters.sortOrder || sort.sortOrder || '').toUpperCase()
    )
      ? (filters.sortOrder || sort.sortOrder).toUpperCase()
      : 'DESC';

    const result = await MonthlyCost.findAndCountAll({
      where,
      include: [employeeInclude],
      order: [
        [sortBy, sortOrder],
        ['month', sortOrder],
      ],
      limit: pagination.limit || 20,
      offset: pagination.offset || 0,
      distinct: true,
    });

    return result;
  } catch (error) {
    logger.error('MonthlyCostRepository.findAll error', { error: error.message });
    throw error;
  }
};

/**
 * Find a single monthly cost record by primary key.
 *
 * @param {number} id
 * @returns {Promise<MonthlyCost|null>}
 */
const findById = async (id) => {
  try {
    return await MonthlyCost.findOne({
      where: { id: parseInt(id, 10) },
      include: [employeeInclude],
    });
  } catch (error) {
    logger.error('MonthlyCostRepository.findById error', { id, error: error.message });
    throw error;
  }
};

/**
 * Find a cost record by employee + month + year (unique combination).
 *
 * @param {number} employeeId
 * @param {number} month
 * @param {number} year
 * @returns {Promise<MonthlyCost|null>}
 */
const findByEmployeeMonthYear = async (employeeId, month, year) => {
  try {
    return await MonthlyCost.findOne({
      where: {
        employee_id: parseInt(employeeId, 10),
        month: parseInt(month, 10),
        year: parseInt(year, 10),
      },
      include: [employeeInclude],
    });
  } catch (error) {
    logger.error('MonthlyCostRepository.findByEmployeeMonthYear error', {
      employeeId, month, year, error: error.message,
    });
    throw error;
  }
};

/**
 * Create a new monthly cost record.
 *
 * @param {object} data
 * @returns {Promise<MonthlyCost>}
 */
const create = async (data) => {
  try {
    return await MonthlyCost.create(data);
  } catch (error) {
    logger.error('MonthlyCostRepository.create error', { error: error.message });
    throw error;
  }
};

/**
 * Update a monthly cost record by id.
 *
 * @param {number} id
 * @param {object} data
 * @returns {Promise<{ affectedCount: number, record: MonthlyCost|null }>}
 */
const update = async (id, data) => {
  try {
    const [affectedCount, updatedRows] = await MonthlyCost.update(data, {
      where: { id: parseInt(id, 10) },
      returning: true,
    });
    return { affectedCount, record: updatedRows ? updatedRows[0] : null };
  } catch (error) {
    logger.error('MonthlyCostRepository.update error', { id, error: error.message });
    throw error;
  }
};

/**
 * Hard-delete a monthly cost record by id.
 *
 * @param {number} id
 * @returns {Promise<number>} number of rows deleted
 */
const deleteCost = async (id) => {
  try {
    return await MonthlyCost.destroy({
      where: { id: parseInt(id, 10) },
    });
  } catch (error) {
    logger.error('MonthlyCostRepository.delete error', { id, error: error.message });
    throw error;
  }
};

/**
 * Count distinct employees who have salary_cost > 0 in a given month/year.
 * Used as the denominator for ops_cost_per_employee calculation.
 *
 * @param {number} month
 * @param {number} year
 * @returns {Promise<number>}
 */
const getActiveHeadcount = async (month, year) => {
  try {
    const result = await MonthlyCost.count({
      where: {
        month: parseInt(month, 10),
        year: parseInt(year, 10),
        salary_cost: { [Op.gt]: 0 },
      },
      distinct: true,
      col: 'employee_id',
    });
    return result || 0;
  } catch (error) {
    logger.error('MonthlyCostRepository.getActiveHeadcount error', {
      month, year, error: error.message,
    });
    throw error;
  }
};

/**
 * Sum the total ops_cost for a given month/year.
 *
 * @param {number} month
 * @param {number} year
 * @returns {Promise<number>}
 */
const getTotalOpsForMonth = async (month, year) => {
  try {
    const result = await MonthlyCost.findOne({
      where: {
        month: parseInt(month, 10),
        year: parseInt(year, 10),
      },
      attributes: [[fn('SUM', col('ops_cost')), 'total_ops']],
      raw: true,
    });
    return parseFloat(result?.total_ops || 0);
  } catch (error) {
    logger.error('MonthlyCostRepository.getTotalOpsForMonth error', {
      month, year, error: error.message,
    });
    throw error;
  }
};

/**
 * Get all monthly cost records for a given month/year (used for bulk recalculation).
 *
 * @param {number} month
 * @param {number} year
 * @returns {Promise<MonthlyCost[]>}
 */
const getBulkForMonth = async (month, year) => {
  try {
    return await MonthlyCost.findAll({
      where: {
        month: parseInt(month, 10),
        year: parseInt(year, 10),
      },
      include: [employeeInclude],
      order: [['employee_id', 'ASC']],
    });
  } catch (error) {
    logger.error('MonthlyCostRepository.getBulkForMonth error', {
      month, year, error: error.message,
    });
    throw error;
  }
};

module.exports = {
  findAll,
  findById,
  findByEmployeeMonthYear,
  create,
  update,
  delete: deleteCost,
  getActiveHeadcount,
  getTotalOpsForMonth,
  getBulkForMonth,
};
