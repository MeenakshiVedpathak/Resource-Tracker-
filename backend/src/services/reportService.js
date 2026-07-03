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

  const serviceTypeId = query.serviceTypeId ? parseInt(query.serviceTypeId, 10) : undefined;

  const { rows, count } = await reportRepo.getResourceAllocation({
    employeeId: filters.employeeId,
    poId: filters.poId,
    serviceTypeId,
    month: filters.month,
    year: filters.year,
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

/**
 * Employee Utilization Summary Report
 * Requires month and year filters.
 *
 * @param {object} query - req.query
 * @returns {Promise<{ data: object[], meta: object, summary: object }>}
 */
async function getEmployeeUtilizationSummary(query) {
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

  logger.info('Report: getEmployeeUtilizationSummary', { filters, page, limit });

  const { rows, count } = await reportRepo.getEmployeeUtilizationSummary({
    ...filters,
    sortBy: query.sortBy,
    sortOrder: filters.sortOrder,
    limit,
    offset,
  });

  const meta = getPaginationMeta(count, page, limit);

  const pageTotals = rows.reduce(
    (acc, row) => {
      acc.billable_total          += parseFloat(row.billable_total)          || 0;
      acc.non_billable_total      += parseFloat(row.non_billable_total)      || 0;
      acc.internal_support_hours  += parseFloat(row.internal_support_hours)  || 0;
      acc.team_management_hours   += parseFloat(row.team_management_hours)   || 0;
      acc.leaves_hours            += parseFloat(row.leaves_hours)            || 0;
      acc.lnd_hours               += parseFloat(row.lnd_hours)               || 0;
      acc.others_hours            += parseFloat(row.others_hours)            || 0;
      return acc;
    },
    {
      billable_total: 0, non_billable_total: 0, internal_support_hours: 0,
      team_management_hours: 0, leaves_hours: 0, lnd_hours: 0, others_hours: 0,
    }
  );

  const round2 = (n) => Math.round(n * 100) / 100;

  return {
    data: rows,
    meta,
    summary: {
      billable_total:         round2(pageTotals.billable_total),
      non_billable_total:     round2(pageTotals.non_billable_total),
      internal_support_hours: round2(pageTotals.internal_support_hours),
      team_management_hours:  round2(pageTotals.team_management_hours),
      leaves_hours:           round2(pageTotals.leaves_hours),
      lnd_hours:              round2(pageTotals.lnd_hours),
      others_hours:           round2(pageTotals.others_hours),
    },
  };
}

/**
 * Service PO Summary Report
 * Requires month and year. Returns one row per Service PO with hours delivered
 * before the selected month, available hours, and monthly billable amount.
 *
 * @param {object} query - req.query
 * @returns {Promise<{ data: object[], meta: object, summary: object }>}
 */
async function getServicePOSummary(query) {
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

  const isBillable = query.is_billable !== undefined
    ? query.is_billable === 'true' || query.is_billable === true
    : undefined;

  const clientId = query.clientId ? parseInt(query.clientId, 10) : undefined;

  logger.info('Report: getServicePOSummary', { filters, page, limit });

  const { rows, count } = await reportRepo.getServicePOSummary({
    month:      filters.month,
    year:       filters.year,
    status:     filters.status,
    clientId,
    isBillable,
    search:     filters.search,
    sortBy:     query.sortBy,
    sortOrder:  filters.sortOrder,
    limit,
    offset,
  });

  const meta = getPaginationMeta(count, page, limit);

  const round2 = (n) => Math.round(parseFloat(n || 0) * 100) / 100;

  const pageTotals = rows.reduce(
    (acc, row) => {
      acc.total_po_value                += round2(row.po_value);
      acc.total_expected_man_hours      += round2(row.expected_man_hours);
      acc.total_hours_delivered         += round2(row.hours_delivered_before_month);
      acc.total_available_hours         += round2(row.available_hours);
      acc.total_monthly_billable_amount += round2(row.monthly_billable_amount);
      return acc;
    },
    {
      total_po_value: 0,
      total_expected_man_hours: 0,
      total_hours_delivered: 0,
      total_available_hours: 0,
      total_monthly_billable_amount: 0,
    }
  );

  return {
    data: rows,
    meta,
    summary: {
      total_po_value:                round2(pageTotals.total_po_value),
      total_expected_man_hours:      round2(pageTotals.total_expected_man_hours),
      total_hours_delivered_before_month: round2(pageTotals.total_hours_delivered),
      total_available_hours:         round2(pageTotals.total_available_hours),
      total_monthly_billable_amount: round2(pageTotals.total_monthly_billable_amount),
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
  getEmployeeUtilizationSummary,
  getServicePOSummary,
};
