'use strict';

const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const { validate } = require('../middlewares/validateRequest');
const {
  createEmployeeSchema,
  updateEmployeeSchema,
} = require('../validations/employeeValidation');
const employeeController = require('../controllers/employeeController');

/**
 * @swagger
 * tags:
 *   name: Employees
 *   description: Employee management endpoints
 */

/**
 * @swagger
 * /employees/active/list:
 *   get:
 *     summary: Get all active employees (lightweight list for dropdowns)
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active employee list
 */
// NOTE: This specific route must be declared BEFORE /:id to avoid "active" being
// parsed as an id parameter.
router.get(
  '/active/list',
  authenticate,
  employeeController.getActiveEmployees
);

/**
 * @swagger
 * /employees:
 *   get:
 *     summary: List employees with pagination, search, and filters
 *     tags: [Employees]
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
 *         name: search
 *         schema: { type: string }
 *         description: Search on full_name, employee_code, designation
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive, all], default: active }
 *       - in: query
 *         name: designation
 *         schema: { type: string }
 *       - in: query
 *         name: sort_by
 *         schema: { type: string, default: full_name }
 *       - in: query
 *         name: sort_order
 *         schema: { type: string, enum: [ASC, DESC], default: ASC }
 *     responses:
 *       200:
 *         description: Paginated employee list
 */
router.get(
  '/',
  authenticate,
  authorize(['HR', 'Management', 'Division Head']),
  employeeController.getAll
);

/**
 * @swagger
 * /employees/{id}:
 *   get:
 *     summary: Get a single employee by ID
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Employee record
 *       404:
 *         description: Not found
 */
router.get(
  '/:id',
  authenticate,
  employeeController.getById
);

/**
 * @swagger
 * /employees:
 *   post:
 *     summary: Create a new employee
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateEmployee'
 *     responses:
 *       201:
 *         description: Employee created
 *       409:
 *         description: Duplicate employee code
 *       422:
 *         description: Validation error
 */
router.post(
  '/',
  authenticate,
  authorize(['HR']),
  validate(createEmployeeSchema),
  employeeController.create
);

/**
 * @swagger
 * /employees/{id}:
 *   put:
 *     summary: Update an employee
 *     tags: [Employees]
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
 *             $ref: '#/components/schemas/UpdateEmployee'
 *     responses:
 *       200:
 *         description: Employee updated
 *       404:
 *         description: Not found
 *       409:
 *         description: Duplicate employee code
 */
router.put(
  '/:id',
  authenticate,
  authorize(['HR']),
  validate(updateEmployeeSchema),
  employeeController.update
);

/**
 * @swagger
 * /employees/{id}:
 *   delete:
 *     summary: Deactivate an employee (soft delete)
 *     tags: [Employees]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Employee deactivated
 *       404:
 *         description: Not found
 *       409:
 *         description: Employee allocated to active PO — cannot deactivate
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['HR']),
  employeeController.delete
);

module.exports = router;
