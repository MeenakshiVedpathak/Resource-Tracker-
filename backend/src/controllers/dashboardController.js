'use strict';

const dashboardService = require('../services/dashboardService');
const { sendSuccess, sendPaginated } = require('../utils/response');
const logger = require('../utils/logger');

/**
 * Dashboard Controller
 */

/**
 * GET /api/v1/dashboard/stats
 * Returns a single consolidated object with all KPIs, chart data, and activity feed.
 *
 * @param {import('express').Request}  req
 * @param {import('express').Response} res
 * @param {import('express').NextFunction} next
 */
async function getStats(req, res, next) {
  try {
    const stats = await dashboardService.getDashboardStats(req.query);
    return sendSuccess(res, stats, 'Dashboard statistics fetched successfully.');
  } catch (err) {
    logger.error('Dashboard getStats error', {
      error: err.message,
      stack: err.stack,
      userId: req.userId,
    });
    next(err);
  }
}

/**
 * GET /api/v1/dashboard/employee-billable-breakdown
 * Per-employee billable vs non-billable hours for a month/year, with the
 * contributing Service POs as the reason for the split.
 */
async function getEmployeeBillableBreakdown(req, res, next) {
  try {
    const { data, meta, period } = await dashboardService.getEmployeeBillableBreakdown(req.query);
    return sendPaginated(res, data, { ...meta, period }, 'Employee billable breakdown fetched successfully.');
  } catch (err) {
    logger.error('Dashboard getEmployeeBillableBreakdown error', { error: err.message, stack: err.stack, userId: req.userId });
    next(err);
  }
}

/**
 * GET /api/v1/dashboard/po-billable-breakdown
 * Per-Service-PO billable/non-billable classification with the service
 * type/category reason behind it.
 */
async function getPOBillableBreakdown(req, res, next) {
  try {
    const { data, meta, period } = await dashboardService.getPOBillableBreakdown(req.query);
    return sendPaginated(res, data, { ...meta, period }, 'Service PO billable breakdown fetched successfully.');
  } catch (err) {
    logger.error('Dashboard getPOBillableBreakdown error', { error: err.message, stack: err.stack, userId: req.userId });
    next(err);
  }
}

/**
 * GET /api/v1/dashboard/top-employees-by-po
 * Top 3 employees by hours logged, per Service PO, for a month/year.
 */
async function getTopEmployeesByPO(req, res, next) {
  try {
    const { data, meta, period } = await dashboardService.getTopEmployeesByPO(req.query);
    return sendPaginated(res, data, { ...meta, period }, 'Top employees by Service PO fetched successfully.');
  } catch (err) {
    logger.error('Dashboard getTopEmployeesByPO error', { error: err.message, stack: err.stack, userId: req.userId });
    next(err);
  }
}

/**
 * GET /api/v1/dashboard/billable-trend
 * Billable vs non-billable hours trend across the last N months, with each
 * month's change vs the prior month broken down by the Service POs that
 * drove the increase/decrease on each side.
 */
async function getBillableTrend(req, res, next) {
  try {
    const result = await dashboardService.getBillableTrend(req.query);
    return sendSuccess(res, result, 'Billable trend fetched successfully.');
  } catch (err) {
    logger.error('Dashboard getBillableTrend error', { error: err.message, stack: err.stack, userId: req.userId });
    next(err);
  }
}

module.exports = {
  getStats,
  getEmployeeBillableBreakdown,
  getPOBillableBreakdown,
  getTopEmployeesByPO,
  getBillableTrend,
};
