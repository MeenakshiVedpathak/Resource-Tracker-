'use strict';

const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const reportController = require('../controllers/reportController');

/**
 * @swagger
 * tags:
 *   name: Reports
 *   description: Analytics and reporting endpoints for the RUT Portal
 */

/**
 * @swagger
 * /reports/employee-hourly-rate:
 *   get:
 *     summary: Employee hourly cost rate for a given month/year
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: month
 *         required: true
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *         description: Month number (1-12)
 *       - in: query
 *         name: year
 *         required: true
 *         schema: { type: integer }
 *         description: Four-digit year
 *       - in: query
 *         name: employeeId
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by employee name or code
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [e.full_name, e.employee_code, e.designation, mc.salary_cost, mc.total_cost, per_hour_rate] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [ASC, DESC] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated employee hourly rate records
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 *       422:
 *         description: Validation error – month and year are required
 */
router.get(
  '/employee-hourly-rate',
  authenticate,
  authorize(['Finance', 'Management']),
  reportController.getEmployeeHourlyRate
);

/**
 * @swagger
 * /reports/monthly-cost-summary:
 *   get:
 *     summary: Aggregated cost summary grouped by month and year
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *       - in: query
 *         name: month
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [year, month, total_salary_cost, total_ops_cost, total_cost, employee_count] }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [ASC, DESC] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated monthly cost summary with page-level totals
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/monthly-cost-summary',
  authenticate,
  authorize(['Finance', 'Management']),
  reportController.getMonthlyCostSummary
);

/**
 * @swagger
 * /reports/timesheet-summary:
 *   get:
 *     summary: Timesheet entries with employee and PO details
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: employeeId
 *         schema: { type: integer }
 *       - in: query
 *         name: poId
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by employee name, code, PO name or code
 *       - in: query
 *         name: sortBy
 *         schema: { type: string }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [ASC, DESC] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated timesheet records
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/timesheet-summary',
  authenticate,
  authorize(['Finance', 'Management', 'HR', 'Division Head']),
  reportController.getTimesheetSummary
);

/**
 * @swagger
 * /reports/service-po-utilisation:
 *   get:
 *     summary: Actual vs expected hours utilisation per Service PO
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: poId
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, closed, all] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [ASC, DESC] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated PO utilisation data with status classification
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/service-po-utilisation',
  authenticate,
  authorize(['Finance', 'Management', 'Project Manager']),
  reportController.getServicePOUtilisation
);

/**
 * @swagger
 * /reports/sub-project-hours:
 *   get:
 *     summary: Hours logged per sub-project
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: poId
 *         schema: { type: integer }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, closed, all] }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [ASC, DESC] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated sub-project hours
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/sub-project-hours',
  authenticate,
  authorize(['Finance', 'Management', 'Project Manager']),
  reportController.getSubProjectHours
);

/**
 * @swagger
 * /reports/resource-allocation:
 *   get:
 *     summary: Employee-to-PO allocation with hours logged
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: employeeId
 *         schema: { type: integer }
 *       - in: query
 *         name: poId
 *         schema: { type: integer }
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, closed, all] }
 *         description: Filter by PO status
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [ASC, DESC] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated resource allocation records
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/resource-allocation',
  authenticate,
  authorize(['HR', 'Management', 'Division Head']),
  reportController.getResourceAllocation
);

/**
 * @swagger
 * /reports/operational-cost-breakdown:
 *   get:
 *     summary: Per-employee salary and operational cost breakdown
 *     tags: [Reports]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *       - in: query
 *         name: month
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *       - in: query
 *         name: employeeId
 *         schema: { type: integer }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [ASC, DESC] }
 *       - in: query
 *         name: page
 *         schema: { type: integer, minimum: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, minimum: 1, maximum: 100 }
 *     responses:
 *       200:
 *         description: Paginated cost breakdown with page-level totals
 *       401:
 *         description: Unauthorized
 *       403:
 *         description: Forbidden
 */
router.get(
  '/operational-cost-breakdown',
  authenticate,
  authorize(['Finance', 'Management']),
  reportController.getOperationalCostBreakdown
);

module.exports = router;
