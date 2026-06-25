'use strict';

const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/auth');
const dashboardController = require('../controllers/dashboardController');

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
 *                         total_hours_logged:      { type: number }
 *                         overall_utilisation_pct: { type: number, nullable: true }
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
router.get('/stats', authenticate, dashboardController.getStats);

module.exports = router;
