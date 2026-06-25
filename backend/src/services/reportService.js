'use strict';

const reportRepo = require('../repositories/reportRepository');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');
const logger = require('../utils/logger');

/**
 * Report Service
 * Orchestrates repo calls, applies pagination, and shapes response data.
 */

/**
 * Parse and validate common query filters shared across most report endpoints.
 *
 * @param {object} query - Express req.query
 * @returns {object}
 */
function parseCommonFilters(query) {
  return {
    search: query.search ? String(query.search).trim() : undefined,
    sortBy: query.sortBy ? String(query.sortBy).trim() : undefined,
    sortOrder: query.sortOrder && ['ASC', 'DESC'].includes(query.sortOrder.toUpperCase())
      ? query.sortOrder.toUpperCase()
      : 'ASC',
    startDate: query.startDate || undefined,
    endDate: query.endDate || undefined,
    employeeId: query.employeeId ? parseInt(query.employeeId, 10) : undefined,
    poId: query.poId ? parseInt(query.poId, 10) : undefined,
    month: query.month ? parseInt(query.month, 10) : undefined,
    year: query.year ? parseInt(query.year, 10) : undefined,
    status: query.status || undefined,
  };
}

/**
 * Employee Hourly Rate Report
 * Requires month and year filters.
 *
 * @param {object} query - req.query
 * @returns {Promise<{ data: object[], meta: object }>}
 */
async function getEmployeeHourlyRate(query) {
  const { page, limit, offset } = getPaginationParams(query);
  const filters = parseCommonFilters(query);

  if (!filters.month || !filters.year) {
    const err = new Error('month and year query parameters are required for this report.');
    err.statusCode = 422;
    throw err;
  }
  if (filters.month < 1 || filters.month > 12) {
    const err = new Error('month must be between 1 and 12.');
    err.statusCode = 422;
    throw err;
  }

  logger.info('Report: getEmployeeHourlyRate', { filters, page, limit });

  const { rows, count } = await reportRepo.getEmployeeHourlyRate({
    ...filters,
    sortBy: query.sortBy,
    sortOrder: filters.sortOrder,
    limit,
    offset,
  });

  const meta = getPaginationMeta(count, page, limit);

  return { data: rows, meta };
}

/**
 * Monthly Cost Summary Report
 *
 * @param {object} query - req.query
 * @returns {Promise<{ data: object[], meta: object }>}
 */
async function getMonthlyCostSummary(query) {
  const { page, limit, offset } = getPaginationParams(query);
  const filters = parseCommonFilters(query);

  logger.info('Report: getMonthlyCostSummary', { filters, page, limit });

  const { rows, count } = await reportRepo.getMonthlyCostSummary({
    year: filters.year,
    month: filters.month,
    sortBy: query.sortBy,
    sortOrder: filters.sortOrder,
    limit,
    offset,
  });

  const meta = getPaginationMeta(count, page, limit);

  // Compute totals across the returned page for convenience
  const pageTotals = rows.reduce(
    (acc, row) => {
      acc.total_salary_cost += parseFloat(row.total_salary_cost) || 0;
      acc.total_ops_cost += parseFloat(row.total_ops_cost) || 0;
      acc.total_cost += parseFloat(row.total_cost) || 0;
      acc.total_billable_cost += parseFloat(row.total_billable_cost) || 0;
      return acc;
    },
    { total_salary_cost: 0, total_ops_cost: 0, total_cost: 0, total_billable_cost: 0 }
  );

  return {
    data: rows,
    meta,
    summary: {
      total_salary_cost: Math.round(pageTotals.total_salary_cost * 100) / 100,
      total_ops_cost: Math.round(pageTotals.total_ops_cost * 100) / 100,
      total_cost: Math.round(pageTotals.total_cost * 100) / 100,
      total_billable_cost: Math.round(pageTotals.total_billable_cost * 100) / 100,
    },
  };
}

/**
 * Timesheet Summary Report
 *
 * @param {object} query - req.query
 * @returns {Promise<{ data: object[], meta: object }>}
 */
async function getTimesheetSummary(query) {
  const { page, limit, offset } = getPaginationParams(query);
  const filters = parseCommonFilters(query);

  logger.info('Report: getTimesheetSummary', { filters, page, limit });

  const { rows, count } = await reportRepo.getTimesheetSummary({
    ...filters,
    sortBy: query.sortBy,
    sortOrder: filters.sortOrder,
    limit,
    offset,
  });

  const meta = getPaginationMeta(count, page, limit);

  const pageTotalHours = rows.reduce(
    (acc, row) => acc + (parseFloat(row.hours_logged) || 0),
    0
  );

  return {
    data: rows,
    meta,
    summary: {
      total_hours_on_page: Math.round(pageTotalHours * 100) / 100,
    },
  };
}

/**
 * Service PO Utilisation Report
 *
 * @param {object} query - req.query
 * @returns {Promise<{ data: object[], meta: object }>}
 */
async function getServicePOUtilisation(query) {
  const { page, limit, offset } = getPaginationParams(query);
  const filters = parseCommonFilters(query);

  logger.info('Report: getServicePOUtilisation', { filters, page, limit });

  const { rows, count } = await reportRepo.getServicePOUtilisation({
    ...filters,
    sortBy: query.sortBy,
    sortOrder: filters.sortOrder,
    limit,
    offset,
  });

  const meta = getPaginationMeta(count, page, limit);

  // Classify utilisation for quick scanning
  const enriched = rows.map((row) => {
    const pct = parseFloat(row.utilisation_pct);
    let utilisation_status = 'no_data';
    if (!isNaN(pct)) {
      if (pct >= 100) utilisation_status = 'over_utilized';
      else if (pct >= 75) utilisation_status = 'on_track';
      else if (pct >= 50) utilisation_status = 'moderate';
      else utilisation_status = 'under_utilized';
    }
    return { ...row, utilisation_status };
  });

  return { data: enriched, meta };
}

/**
 * Sub-Project Hours Report
 *
 * @param {object} query - req.query
 * @returns {Promise<{ data: object[], meta: object }>}
 */
async function getSubProjectHours(query) {
  const { page, limit, offset } = getPaginationParams(query);
  const filters = parseCommonFilters(query);

  logger.info('Report: getSubProjectHours', { filters, page, limit });

  const { rows, count } = await reportRepo.getSubProjectHours({
    poId: filters.poId,
    startDate: filters.startDate,
    endDate: filters.endDate,
    status: filters.status,
    search: filters.search,
    sortBy: query.sortBy,
    sortOrder: filters.sortOrder,
    limit,
    offset,
  });

  const meta = getPaginationMeta(count, page, limit);

  const pageTotalHours = rows.reduce(
    (acc, row) => acc + (parseFloat(row.total_hours) || 0),
    0
  );

  return {
    data: rows,
    meta,
    summary: {
      total_hours_on_page: Math.round(pageTotalHours * 100) / 100,
    },
  };
}

/**
 * Resource Allocation Report
 *
 * @param {object} query - req.query
 * @returns {Promise<{ data: object[], meta: object }>}
 */
async function getResourceAllocation(query) {
  const { page, limit, offset } = getPaginationParams(query);
  const filters = parseCommonFilters(query);

  logger.info('Report: getResourceAllocation', { filters, page, limit });

  const { rows, count } = await reportRepo.getResourceAllocation({
    employeeId: filters.employeeId,
    poId: filters.poId,
    status: filters.status,
    search: filters.search,
    sortBy: query.sortBy,
    sortOrder: filters.sortOrder,
    limit,
    offset,
  });

  const meta = getPaginationMeta(count, page, limit);

  return { data: rows, meta };
}

/**
 * Operational Cost Breakdown Report
 *
 * @param {object} query - req.query
 * @returns {Promise<{ data: object[], meta: object }>}
 */
async function getOperationalCostBreakdown(query) {
  const { page, limit, offset } = getPaginationParams(query);
  const filters = parseCommonFilters(query);

  logger.info('Report: getOperationalCostBreakdown', { filters, page, limit });

  const { rows, count } = await reportRepo.getOperationalCostBreakdown({
    year: filters.year,
    month: filters.month,
    employeeId: filters.employeeId,
    search: filters.search,
    sortBy: query.sortBy,
    sortOrder: filters.sortOrder,
    limit,
    offset,
  });

  const meta = getPaginationMeta(count, page, limit);

  const pageTotals = rows.reduce(
    (acc, row) => {
      acc.salary_cost += parseFloat(row.salary_cost) || 0;
      acc.ops_cost += parseFloat(row.ops_cost) || 0;
      acc.total_cost += parseFloat(row.total_cost) || 0;
      acc.billable_cost += parseFloat(row.billable_cost) || 0;
      return acc;
    },
    { salary_cost: 0, ops_cost: 0, total_cost: 0, billable_cost: 0 }
  );

  return {
    data: rows,
    meta,
    summary: {
      total_salary_cost: Math.round(pageTotals.salary_cost * 100) / 100,
      total_ops_cost: Math.round(pageTotals.ops_cost * 100) / 100,
      total_cost: Math.round(pageTotals.total_cost * 100) / 100,
      total_billable_cost: Math.round(pageTotals.billable_cost * 100) / 100,
    },
  };
}

module.exports = {
  getEmployeeHourlyRate,
  getMonthlyCostSummary,
  getTimesheetSummary,
  getServicePOUtilisation,
  getSubProjectHours,
  getResourceAllocation,
  getOperationalCostBreakdown,
};
