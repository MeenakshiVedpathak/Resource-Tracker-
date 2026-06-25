'use strict';

const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const { validate } = require('../middlewares/validateRequest');
const {
  createRoleSchema,
  updateRoleSchema,
} = require('../validations/roleValidation');
const roleController = require('../controllers/roleController');

/**
 * @swagger
 * tags:
 *   name: Roles
 *   description: Role management (Management only for write operations)
 */

/**
 * @swagger
 * /roles:
 *   get:
 *     summary: List all roles
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: status
 *         schema: { type: string, enum: [active, inactive, all], default: active }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search on role_name
 *       - in: query
 *         name: sort_by
 *         schema: { type: string, default: role_name }
 *       - in: query
 *         name: sort_order
 *         schema: { type: string, enum: [ASC, DESC], default: ASC }
 *     responses:
 *       200:
 *         description: Role list
 */
router.get(
  '/',
  authenticate,
  roleController.getAll
);

/**
 * @swagger
 * /roles/{id}:
 *   get:
 *     summary: Get a single role by ID
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Role record
 *       404:
 *         description: Not found
 */
router.get(
  '/:id',
  authenticate,
  roleController.getById
);

/**
 * @swagger
 * /roles:
 *   post:
 *     summary: Create a new role (Management only)
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             $ref: '#/components/schemas/CreateRole'
 *     responses:
 *       201:
 *         description: Role created
 *       409:
 *         description: Role name already exists
 *       422:
 *         description: Validation error
 */
router.post(
  '/',
  authenticate,
  authorize(['Management']),
  validate(createRoleSchema),
  roleController.create
);

/**
 * @swagger
 * /roles/{id}:
 *   put:
 *     summary: Update a role (Management only)
 *     tags: [Roles]
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
 *             $ref: '#/components/schemas/UpdateRole'
 *     responses:
 *       200:
 *         description: Role updated
 *       404:
 *         description: Not found
 *       409:
 *         description: Role name conflict
 */
router.put(
  '/:id',
  authenticate,
  authorize(['Management']),
  validate(updateRoleSchema),
  roleController.update
);

/**
 * @swagger
 * /roles/{id}:
 *   delete:
 *     summary: Deactivate a role (Management only)
 *     tags: [Roles]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Role deactivated
 *       404:
 *         description: Not found
 *       409:
 *         description: Role has active users assigned — cannot deactivate
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['Management']),
  roleController.delete
);

module.exports = router;
