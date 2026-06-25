'use strict';

const dashboardService = require('../services/dashboardService');
const { sendSuccess } = require('../utils/response');
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
    const stats = await dashboardService.getDashboardStats();
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

module.exports = {
  getStats,
};
