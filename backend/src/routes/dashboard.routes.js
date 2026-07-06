'use strict';

const express = require('express');
const router = express.Router();

const Joi = require('joi');
const authenticate = require('../middlewares/auth');
const { validate } = require('../middlewares/validateRequest');
const dashboardController = require('../controllers/dashboardController');

const statsQuerySchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).optional().messages({
    'number.min': 'month must be between 1 and 12.',
    'number.max': 'month must be between 1 and 12.',
  }),
  year: Joi.number().integer().min(2000).max(2100).optional().messages({
    'number.min': 'year must be between 2000 and 2100.',
    'number.max': 'year must be between 2000 and 2100.',
  }),
}).and('month', 'year');

const breakdownQuerySchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).optional().messages({
    'number.min': 'month must be between 1 and 12.',
    'number.max': 'month must be between 1 and 12.',
  }),
  year: Joi.number().integer().min(2000).max(2100).optional().messages({
    'number.min': 'year must be between 2000 and 2100.',
    'number.max': 'year must be between 2000 and 2100.',
  }),
  page: Joi.number().integer().min(1).optional(),
  limit: Joi.number().integer().min(1).max(100).optional(),
  search: Joi.string().trim().max(100).optional().allow(''),
  is_billable: Joi.boolean().optional(),
}).and('month', 'year');

const trendQuerySchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).optional().messages({
    'number.min': 'month must be between 1 and 12.',
    'number.max': 'month must be between 1 and 12.',
  }),
  year: Joi.number().integer().min(2000).max(2100).optional().messages({
    'number.min': 'year must be between 2000 and 2100.',
    'number.max': 'year must be between 2000 and 2100.',
  }),
  months: Joi.number().integer().min(2).max(24).optional().messages({
    'number.min': 'months must be between 2 and 24.',
    'number.max': 'months must be between 2 and 24.',
  }),
}).and('month', 'year');

/**
 * @swagger
 * tags:
 *   name: Dashboard
 *   description: Consolidated KPIs and analytics for the RUT Portal home screen
 */

/**
 * @swagger
 * /dashboard/stats:
 *   get:
 *     summary: Retrieve all dashboard statistics
 *     description: >
 *       Returns workforce counts, portfolio summary, current-month metrics,
 *       financial figures, monthly trend data, and a recent activity feed.
 *       All data points are fetched in parallel for minimal latency.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *         description: Optional month (1-12) to scope period-based stats to. Requires `year` to also be set. Defaults to the current month.
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *         description: Optional year to scope period-based stats to. Requires `month` to also be set. Defaults to the current year.
 *     responses:
 *       200:
 *         description: Dashboard statistics object
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 success:
 *                   type: boolean
 *                   example: true
 *                 message:
 *                   type: string
 *                   example: Dashboard statistics fetched successfully.
 *                 data:
 *                   type: object
 *                   properties:
 *                     as_of:
 *                       type: string
 *                       format: date-time
 *                     period:
 *                       type: object
 *                       properties:
 *                         month: { type: integer }
 *                         year:  { type: integer }
 *                     workforce:
 *                       type: object
 *                       properties:
 *                         total_employees:    { type: integer }
 *                         active_employees:   { type: integer }
 *                         inactive_employees: { type: integer }
 *                     portfolio:
 *                       type: object
 *                       properties:
 *                         total_clients: { type: integer }
 *                         active_pos:    { type: integer }
 *                         closed_pos:    { type: integer }
 *                         total_pos:     { type: integer }
 *                     current_month:
 *                       type: object
 *                       properties:
 *                         total_hours_logged:         { type: number }
 *                         billable_hours_logged:      { type: number }
 *                         non_billable_hours_logged:  { type: number }
 *                         overall_utilisation_pct:    { type: number, nullable: true }
 *                     financials:
 *                       type: object
 *                       properties:
 *                         total_po_value_current_year: { type: number }
 *                     charts:
 *                       type: object
 *                       properties:
 *                         monthly_hours_trend: { type: array, items: { type: object } }
 *                         top_pos_by_hours:    { type: array, items: { type: object } }
 *                     activity:
 *                       type: object
 *                       properties:
 *                         recent_timesheet_entries: { type: array, items: { type: object } }
 *       401:
 *         description: Unauthorized
 */
router.get('/stats', authenticate, validate(statsQuerySchema, 'query'), dashboardController.getStats);

/**
 * @swagger
 * /dashboard/employee-billable-breakdown:
 *   get:
 *     summary: Per-employee billable vs non-billable hour breakdown, with reasons
 *     description: >
 *       For each employee active in the selected month/year, returns billable_hours,
 *       non_billable_hours, billable_pct, and the contributing Service POs
 *       (with each PO's is_billable flag and hours) as the reason for the split.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Matches employee full name or employee code.
 *     responses:
 *       200:
 *         description: Paginated per-employee billable breakdown
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/employee-billable-breakdown',
  authenticate,
  validate(breakdownQuerySchema, 'query'),
  dashboardController.getEmployeeBillableBreakdown
);

/**
 * @swagger
 * /dashboard/po-billable-breakdown:
 *   get:
 *     summary: Per-Service-PO billable/non-billable classification, with reasons
 *     description: >
 *       For each Service PO, returns its is_billable flag, service type, category,
 *       hours logged in the selected month/year, and a human-readable reason string
 *       explaining the classification.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Matches Service PO name, code, or client name.
 *       - in: query
 *         name: is_billable
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Paginated per-Service-PO billable breakdown
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/po-billable-breakdown',
  authenticate,
  validate(breakdownQuerySchema, 'query'),
  dashboardController.getPOBillableBreakdown
);

/**
 * @swagger
 * /dashboard/top-employees-by-po:
 *   get:
 *     summary: Top 3 employees by hours logged, per Service PO
 *     description: >
 *       For each Service PO active in the selected month/year, returns its top 3
 *       employees ranked by hours logged. Paginated at the Service PO level.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Matches Service PO name, code, or client name.
 *       - in: query
 *         name: is_billable
 *         schema: { type: boolean }
 *     responses:
 *       200:
 *         description: Paginated list of Service POs with their top 3 employees
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/top-employees-by-po',
  authenticate,
  validate(breakdownQuerySchema, 'query'),
  dashboardController.getTopEmployeesByPO
);

/**
 * @swagger
 * /dashboard/billable-trend:
 *   get:
 *     summary: Billable vs non-billable hours trend, month over month, with reasons
 *     description: >
 *       Chart-ready time series of billable_hours, non_billable_hours, total_hours,
 *       and billable_pct across the last N calendar months (default 6, ending at the
 *       selected/current month). Every point after the first includes a `change`
 *       object comparing it to the immediately preceding month: billable_delta,
 *       non_billable_delta, and the top Service POs (billable_drivers /
 *       non_billable_drivers) that most contributed to that month's increase or
 *       decrease on each side, plus a human-readable reason_summary sentence.
 *     tags: [Dashboard]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *         description: Optional end-of-window month. Requires `year`. Defaults to the current month.
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *         description: Optional end-of-window year. Requires `month`. Defaults to the current year.
 *       - in: query
 *         name: months
 *         schema: { type: integer, minimum: 2, maximum: 24, default: 6 }
 *         description: Number of months to include in the trend, ending at month/year.
 *     responses:
 *       200:
 *         description: Billable/non-billable trend with month-over-month change reasons
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/billable-trend',
  authenticate,
  validate(trendQuerySchema, 'query'),
  dashboardController.getBillableTrend
);

module.exports = router;
