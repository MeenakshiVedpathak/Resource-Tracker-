'use strict';

/**
 * @swagger
 * tags:
 *   name: ServiceTypes
 *   description: Service type reference data endpoints
 */

const express = require('express');
const router = express.Router();

const serviceTypeController = require('../controllers/serviceTypeController');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const { validate } = require('../middlewares/validateRequest');
const Joi = require('joi');

// ─── Inline validation schemas (service types are simple) ─────────────────────

const createServiceTypeSchema = Joi.object({
  service_type_name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Service type name must be at least 2 characters.',
      'string.max': 'Service type name cannot exceed 100 characters.',
      'string.empty': 'Service type name is required.',
      'any.required': 'Service type name is required.',
    }),
});

const updateServiceTypeSchema = Joi.object({
  service_type_name: Joi.string()
    .trim()
    .min(2)
    .max(100)
    .required()
    .messages({
      'string.min': 'Service type name must be at least 2 characters.',
      'string.max': 'Service type name cannot exceed 100 characters.',
      'any.required': 'Service type name is required.',
    }),
});

const listServiceTypeQuerySchema = Joi.object({
  search: Joi.string().trim().max(100).optional().allow(''),
});

// ─── Routes ───────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /service-types:
 *   get:
 *     summary: Get all service types
 *     tags: [ServiceTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *     responses:
 *       200:
 *         description: List of service types
 */
router.get(
  '/',
  authenticate,
  validate(listServiceTypeQuerySchema, 'query'),
  serviceTypeController.getAllServiceTypes
);

/**
 * @swagger
 * /service-types/{id}:
 *   get:
 *     summary: Get a single service type by ID
 *     tags: [ServiceTypes]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Service type record
 *       404:
 *         description: Not found
 */
router.get(
  '/:id',
  authenticate,
  serviceTypeController.getServiceTypeById
);

/**
 * @swagger
 * /service-types:
 *   post:
 *     summary: Create a new service type
 *     tags: [ServiceTypes]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [service_type_name]
 *             properties:
 *               service_type_name:
 *                 type: string
 *     responses:
 *       201:
 *         description: Service type created
 *       409:
 *         description: Name already exists
 */
router.post(
  '/',
  authenticate,
  authorize(['Finance', 'Management']),
  validate(createServiceTypeSchema),
  serviceTypeController.createServiceType
);

/**
 * @swagger
 * /service-types/{id}:
 *   put:
 *     summary: Update a service type
 *     tags: [ServiceTypes]
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
 *             required: [service_type_name]
 *             properties:
 *               service_type_name:
 *                 type: string
 *     responses:
 *       200:
 *         description: Service type updated
 *       404:
 *         description: Not found
 */
router.put(
  '/:id',
  authenticate,
  authorize(['Finance', 'Management']),
  validate(updateServiceTypeSchema),
  serviceTypeController.updateServiceType
);

module.exports = router;
