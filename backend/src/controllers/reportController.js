'use strict';

const reportService = require('../services/reportService');
const { sendPaginated, sendError } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Report Controller
 * Each method maps 1:1 with a report route. All are GET-only endpoints.
 */

/**
 * GET /api/v1/reports/employee-hourly-rate
 * Roles: Finance, Management
 *
 * Query params:
 *   month (required), year (required), employeeId, search,
 *   sortBy, sortOrder, page, limit
 */
async function getEmployeeHourlyRate(req, res, next) {
  try {
    const filters = { ...req.body, ...req.query };
    const { data, meta } = await reportService.getEmployeeHourlyRate(filters);
    return sendPaginated(res, data, meta, 'Employee hourly rate report fetched successfully.');
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.message, err.statusCode);
    }
    logger.error('getEmployeeHourlyRate error', { error: err.message, stack: err.stack });
    next(err);
  }
}

/**
 * GET /api/v1/reports/monthly-cost-summary
 * Roles: Finance, Management
 *
 * Query params:
 *   year, month, sortBy, sortOrder, page, limit
 */
async function getMonthlyCostSummary(req, res, next) {
  try {
    const filters = { ...req.body, ...req.query };
    const { data, meta, summary } = await reportService.getMonthlyCostSummary(filters);
    const response = { records: data, summary };
    return sendPaginated(res, response, meta, 'Monthly cost summary fetched successfully.');
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.message, err.statusCode);
    }
    logger.error('getMonthlyCostSummary error', { error: err.message, stack: err.stack });
    next(err);
  }
}

/**
 * GET /api/v1/reports/timesheet-summary
 * Roles: Finance, Management, HR, Division Head
 *
 * Query params:
 *   startDate, endDate, employeeId, poId, search,
 *   sortBy, sortOrder, page, limit
 */
async function getTimesheetSummary(req, res, next) {
  try {
    const filters = { ...req.body, ...req.query };
    const { data, meta, summary } = await reportService.getTimesheetSummary(filters);
    const response = { records: data, summary };
    return sendPaginated(res, response, meta, 'Timesheet summary fetched successfully.');
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.message, err.statusCode);
    }
    logger.error('getTimesheetSummary error', { error: err.message, stack: err.stack });
    next(err);
  }
}

/**
 * GET /api/v1/reports/service-po-utilisation
 * Roles: Finance, Management, Project Manager
 *
 * Query params:
 *   startDate, endDate, poId, status, search,
 *   sortBy, sortOrder, page, limit
 */
async function getServicePOUtilisation(req, res, next) {
  try {
    const filters = { ...req.body, ...req.query };
    const { data, meta } = await reportService.getServicePOUtilisation(filters);
    return sendPaginated(res, data, meta, 'Service PO utilisation report fetched successfully.');
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.message, err.statusCode);
    }
    logger.error('getServicePOUtilisation error', { error: err.message, stack: err.stack });
    next(err);
  }
}

/**
 * GET /api/v1/reports/sub-project-hours
 * Roles: Finance, Management, Project Manager
 *
 * Query params:
 *   poId, startDate, endDate, status, search,
 *   sortBy, sortOrder, page, limit
 */
async function getSubProjectHours(req, res, next) {
  try {
    const filters = { ...req.body, ...req.query };
    const { data, meta, summary } = await reportService.getSubProjectHours(filters);
    const response = { records: data, summary };
    return sendPaginated(res, response, meta, 'Sub-project hours report fetched successfully.');
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.message, err.statusCode);
    }
    logger.error('getSubProjectHours error', { error: err.message, stack: err.stack });
    next(err);
  }
}

/**
 * GET /api/v1/reports/resource-allocation
 * Roles: HR, Management, Division Head
 *
 * Query params:
 *   employeeId, poId, status, search,
 *   sortBy, sortOrder, page, limit
 */
async function getResourceAllocation(req, res, next) {
  try {
    const filters = { ...req.body, ...req.query };
    const { data, meta } = await reportService.getResourceAllocation(filters);
    return sendPaginated(res, data, meta, 'Resource allocation report fetched successfully.');
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.message, err.statusCode);
    }
    logger.error('getResourceAllocation error', { error: err.message, stack: err.stack });
    next(err);
  }
}

/**
 * GET /api/v1/reports/operational-cost-breakdown
 * Roles: Finance, Management
 *
 * Query params:
 *   year, month, employeeId, search,
 *   sortBy, sortOrder, page, limit
 */
async function getOperationalCostBreakdown(req, res, next) {
  try {
    const filters = { ...req.body, ...req.query };
    const { data, meta, summary } = await reportService.getOperationalCostBreakdown(filters);
    const response = { records: data, summary };
    return sendPaginated(res, response, meta, 'Operational cost breakdown fetched successfully.');
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.message, err.statusCode);
    }
    logger.error('getOperationalCostBreakdown error', { error: err.message, stack: err.stack });
    next(err);
  }
}

/**
 * GET /api/v1/reports/employee-utilization-summary
 * Roles: Finance, Management, HR, Division Head
 *
 * Query params:
 *   month (required), year (required), employeeId, search,
 *   sortBy, sortOrder, page, limit
 */
async function getEmployeeUtilizationSummary(req, res, next) {
  try {
    const filters = { ...req.body, ...req.query };
    const { data, meta, summary } = await reportService.getEmployeeUtilizationSummary(filters);
    const response = { records: data, summary };
    return sendPaginated(res, response, meta, 'Employee utilization summary fetched successfully.');
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.message, err.statusCode);
    }
    logger.error('getEmployeeUtilizationSummary error', { error: err.message, stack: err.stack });
    next(err);
  }
}

/**
 * GET /api/v1/reports/service-po-summary
 * Roles: Finance, Management, Division Head
 *
 * Query params:
 *   month (required), year (required), status, clientId, is_billable,
 *   search, sortBy, sortOrder, page, limit
 */
async function getServicePOSummary(req, res, next) {
  try {
    const filters = { ...req.body, ...req.query };
    const { data, meta, summary } = await reportService.getServicePOSummary(filters);
    const response = { records: data, summary };
    return sendPaginated(res, response, meta, 'Service PO summary report fetched successfully.');
  } catch (err) {
    if (err.statusCode) {
      return sendError(res, err.message, err.statusCode);
    }
    logger.error('getServicePOSummary error', { error: err.message, stack: err.stack });
    next(err);
  }
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
