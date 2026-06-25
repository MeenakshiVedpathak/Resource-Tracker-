'use strict';

const monthlyCostService = require('../services/monthlyCostService');
const { validate } = require('../middlewares/validateRequest');
const {
  createMonthlyCostSchema,
  updateMonthlyCostSchema,
  listMonthlyCostsQuerySchema,
} = require('../validations/monthlyCostValidation');
const {
  sendSuccess,
  sendCreated,
  sendPaginated,
  sendNotFound,
  sendError,
} = require('../utils/response');
const { getIpAddress } = require('../middlewares/auditLog');
const logger = require('../utils/logger');
const Joi = require('joi');

/**
 * Monthly Cost Controller
 * HTTP layer — delegates all business logic to monthlyCostService.
 */

// ─── GET /monthly-costs ───────────────────────────────────────────────────────
/**
 * @swagger
 * /monthly-costs:
 *   get:
 *     summary: List monthly cost records (paginated)
 *     tags: [MonthlyCosts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 20 }
 *       - in: query
 *         name: employee_id
 *         schema: { type: integer }
 *       - in: query
 *         name: month
 *         schema: { type: integer, minimum: 1, maximum: 12 }
 *       - in: query
 *         name: year
 *         schema: { type: integer }
 *       - in: query
 *         name: sort_by
 *         schema: { type: string, enum: [year, month, salary_cost, total_cost, created_at] }
 *       - in: query
 *         name: sort_order
 *         schema: { type: string, enum: [ASC, DESC] }
 *     responses:
 *       200:
 *         description: Paginated monthly cost list
 */
const getAll = [
  validate(listMonthlyCostsQuerySchema, 'query'),
  async (req, res) => {
    try {
      const { data, meta } = await monthlyCostService.getAll(req.query);
      return sendPaginated(res, data, meta, 'Monthly cost records fetched successfully.');
    } catch (error) {
      logger.error('MonthlyCostController.getAll error', { error: error.message });
      return sendError(res, error.message, error.statusCode || 500);
    }
  },
];

// ─── GET /monthly-costs/:id ───────────────────────────────────────────────────
/**
 * @swagger
 * /monthly-costs/{id}:
 *   get:
 *     summary: Get a monthly cost record by ID
 *     tags: [MonthlyCosts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Monthly cost record
 *       404:
 *         description: Not found
 */
const getById = async (req, res) => {
  try {
    const record = await monthlyCostService.getById(req.params.id);
    return sendSuccess(res, record, 'Monthly cost record fetched successfully.');
  } catch (error) {
    logger.error('MonthlyCostController.getById error', { id: req.params.id, error: error.message });
    if (error.statusCode === 404) {
      return sendNotFound(res, 'Monthly cost record');
    }
    return sendError(res, error.message, error.statusCode || 500);
  }
};

// ─── POST /monthly-costs ──────────────────────────────────────────────────────
/**
 * @swagger
 * /monthly-costs:
 *   post:
 *     summary: Create a monthly cost record
 *     tags: [MonthlyCosts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employee_id, month, year, salary_cost]
 *             properties:
 *               employee_id:
 *                 type: integer
 *               month:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *               year:
 *                 type: integer
 *               salary_cost:
 *                 type: number
 *               ops_cost:
 *                 type: number
 *               billable_cost:
 *                 type: number
 *               working_hours:
 *                 type: integer
 *                 description: Monthly working hours for per-hour rate calculation (default 176)
 *     responses:
 *       201:
 *         description: Record created with calculated costs
 *       400:
 *         description: Validation error
 *       404:
 *         description: Employee not found
 *       409:
 *         description: Duplicate record for employee + month + year
 */
const create = [
  validate(createMonthlyCostSchema),
  async (req, res) => {
    try {
      const record = await monthlyCostService.create(
        req.body,
        req.userId,
        getIpAddress(req)
      );
      return sendCreated(res, record, 'Monthly cost record created successfully.');
    } catch (error) {
      logger.error('MonthlyCostController.create error', { error: error.message, body: req.body });
      return sendError(res, error.message, error.statusCode || 500);
    }
  },
];

// ─── PUT /monthly-costs/:id ───────────────────────────────────────────────────
/**
 * @swagger
 * /monthly-costs/{id}:
 *   put:
 *     summary: Update a monthly cost record (recalculates derived fields)
 *     tags: [MonthlyCosts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *     responses:
 *       200:
 *         description: Record updated with recalculated costs
 *       404:
 *         description: Not found
 *       409:
 *         description: Duplicate conflict
 */
const update = [
  validate(updateMonthlyCostSchema),
  async (req, res) => {
    try {
      const record = await monthlyCostService.update(
        req.params.id,
        req.body,
        req.userId,
        getIpAddress(req)
      );
      return sendSuccess(res, record, 'Monthly cost record updated successfully.');
    } catch (error) {
      logger.error('MonthlyCostController.update error', { id: req.params.id, error: error.message });
      if (error.statusCode === 404) {
        return sendNotFound(res, 'Monthly cost record');
      }
      return sendError(res, error.message, error.statusCode || 500);
    }
  },
];

// ─── DELETE /monthly-costs/:id ────────────────────────────────────────────────
/**
 * @swagger
 * /monthly-costs/{id}:
 *   delete:
 *     summary: Delete a monthly cost record
 *     tags: [MonthlyCosts]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Record deleted
 *       404:
 *         description: Not found
 */
const deleteCost = async (req, res) => {
  try {
    await monthlyCostService.delete(
      req.params.id,
      req.userId,
      getIpAddress(req)
    );
    return sendSuccess(res, null, 'Monthly cost record deleted successfully.');
  } catch (error) {
    logger.error('MonthlyCostController.delete error', { id: req.params.id, error: error.message });
    if (error.statusCode === 404) {
      return sendNotFound(res, 'Monthly cost record');
    }
    return sendError(res, error.message, error.statusCode || 500);
  }
};

// ─── POST /monthly-costs/calculate ───────────────────────────────────────────
/**
 * @swagger
 * /monthly-costs/calculate:
 *   post:
 *     summary: Bulk recalculate ops_cost_per_employee and total_cost for a month
 *     tags: [MonthlyCosts]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [month, year]
 *             properties:
 *               month:
 *                 type: integer
 *                 minimum: 1
 *                 maximum: 12
 *               year:
 *                 type: integer
 *               working_hours:
 *                 type: integer
 *                 description: Monthly working hours used for per-hour rate (default 176)
 *     responses:
 *       200:
 *         description: Bulk calculation completed
 *       404:
 *         description: No records found for the given month/year
 */

// Joi schema for calculate endpoint
const calculateSchema = Joi.object({
  month: Joi.number().integer().min(1).max(12).required().messages({
    'number.base': 'Month must be a number.',
    'number.min': 'Month must be between 1 and 12.',
    'number.max': 'Month must be between 1 and 12.',
    'any.required': 'Month is required.',
  }),
  year: Joi.number().integer().min(2020).max(2100).required().messages({
    'number.base': 'Year must be a number.',
    'number.min': 'Year must be 2020 or later.',
    'any.required': 'Year is required.',
  }),
  working_hours: Joi.number().integer().min(1).max(744).default(176).messages({
    'number.base': 'Working hours must be a number.',
    'number.min': 'Working hours must be at least 1.',
    'number.max': 'Working hours cannot exceed 744 (31 days × 24 hours).',
  }),
});

const calculateForMonth = [
  validate(calculateSchema),
  async (req, res) => {
    try {
      const { month, year, working_hours } = req.body;
      const result = await monthlyCostService.calculateForMonth(
        month,
        year,
        req.userId,
        getIpAddress(req),
        working_hours
      );
      return sendSuccess(
        res,
        result,
        `Bulk cost calculation completed for ${month}/${year}. ${result.updated} record(s) updated.`
      );
    } catch (error) {
      logger.error('MonthlyCostController.calculateForMonth error', { error: error.message, body: req.body });
      if (error.statusCode === 404) {
        return sendNotFound(res, `Monthly cost records for ${req.body.month}/${req.body.year}`);
      }
      return sendError(res, error.message, error.statusCode || 500);
    }
  },
];

module.exports = {
  getAll,
  getById,
  create,
  update,
  delete: deleteCost,
  calculateForMonth,
};
