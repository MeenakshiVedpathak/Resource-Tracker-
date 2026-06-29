'use strict';

const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const monthlyCostController = require('../controllers/monthlyCostController');
const { handleMonthlyCostUpload } = require('../middlewares/upload');

/**
 * Role constants.
 * All write operations (create, update, delete, calculate) are restricted to
 * Finance and Management roles.
 */
const FINANCE_MANAGEMENT = ['Finance', 'Management'];

/**
 * @swagger
 * tags:
 *   name: MonthlyCosts
 *   description: Employee monthly cost management and bulk calculation
 */

// ─── All routes require authentication ────────────────────────────────────────
router.use(authenticate);

// ─── Bulk calculate (Finance, Management) — placed BEFORE /:id ─────────────────────
/**
 * POST /api/v1/monthly-costs/calculate
 * Recalculate total_cost for all employees in a month.
 * Must come before /:id route to avoid "calculate" being parsed as an id.
 */
router.post(
  '/calculate',
  authorize(FINANCE_MANAGEMENT),
  ...monthlyCostController.calculateForMonth
);

// ─── Excel Import (Finance, Management) — placed BEFORE /:id ───────────────────────────
/**
 * POST /api/v1/monthly-costs/import
 * Import bulk monthly cost records from an Excel (.xlsx) file.
 * Columns: Employee ID | Month Year | Salary Cost | Ops Cost | Total Cost | Billable Cost
 */
router.post(
  '/import',
  authorize(FINANCE_MANAGEMENT),
  handleMonthlyCostUpload,
  monthlyCostController.importFromExcel
);

// ─── Read routes — any authenticated role ─────────────────────────────────────

/**
 * GET /api/v1/monthly-costs
 * Paginated list with optional filters: employee_id, month, year.
 */
router.get('/', ...monthlyCostController.getAll);

/**
 * GET /api/v1/monthly-costs/:id
 * Single monthly cost record by primary key.
 */
router.get('/:id', monthlyCostController.getById);

// ─── Write routes — Finance, Management only ──────────────────────────────────

/**
 * POST /api/v1/monthly-costs
 * Create a new monthly cost entry with automatic cost formula calculation.
 */
router.post(
  '/',
  authorize(FINANCE_MANAGEMENT),
  ...monthlyCostController.create
);

/**
 * PUT /api/v1/monthly-costs/:id
 * Update a monthly cost record; derived fields are recalculated automatically.
 */
router.put(
  '/:id',
  authorize(FINANCE_MANAGEMENT),
  ...monthlyCostController.update
);

/**
 * DELETE /api/v1/monthly-costs/:id
 * Hard-delete a monthly cost record.
 */
router.delete(
  '/:id',
  authorize(FINANCE_MANAGEMENT),
  monthlyCostController.delete
);

module.exports = router;
