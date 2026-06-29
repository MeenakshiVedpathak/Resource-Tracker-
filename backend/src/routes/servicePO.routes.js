'use strict';

/**
 * @swagger
 * tags:
 *   name: ServicePOs
 *   description: Service Purchase Order management and resource allocation
 */

const express = require('express');
const router = express.Router();

const servicePOController = require('../controllers/servicePOController');
const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const { validate } = require('../middlewares/validateRequest');
const {
  createServicePOSchema,
  updateServicePOSchema,
  allocateResourcesSchema,
  listServicePOsQuerySchema,
} = require('../validations/servicePOValidation');

// Convenience role arrays
const VIEW_ROLES = ['HR', 'Finance', 'Management', 'Division Head', 'Project Manager'];
const WRITE_ROLES = ['Finance', 'Management'];
const ALLOCATE_ROLES = ['HR', 'Project Manager', 'Management'];
const DEALLOCATE_ROLES = ['HR', 'Project Manager'];

// ─── Active PO list (before /:id to prevent route collision) ─────────────────
/**
 * @swagger
 * /service-pos/active/list:
 *   get:
 *     summary: Get all active Service POs (dropdown list)
 *     tags: [ServicePOs]
 *     security:
 *       - bearerAuth: []
 *     responses:
 *       200:
 *         description: Active Service POs returned
 */
router.get(
  '/active/list',
  authenticate,
  servicePOController.getActivePOs
);

// ─── List all Service POs ─────────────────────────────────────────────────────
/**
 * @swagger
 * /service-pos:
 *   get:
 *     summary: List Service POs with pagination and filters
 *     tags: [ServicePOs]
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
 *         name: status
 *         schema: { type: string, enum: [active, inactive, completed, on-hold, all], default: active }
 *       - in: query
 *         name: client_id
 *         schema: { type: integer }
 *       - in: query
 *         name: service_type_id
 *         schema: { type: integer }
 *       - in: query
 *         name: is_billable
 *         schema: { type: boolean }
 *       - in: query
 *         name: search
 *         schema: { type: string }
 *         description: Search by service_po_name or service_po_code
 *       - in: query
 *         name: start_date_from
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: start_date_to
 *         schema: { type: string, format: date }
 *       - in: query
 *         name: sort_by
 *         schema: { type: string, enum: [service_po_name, service_po_code, start_date, end_date, po_value, created_at] }
 *       - in: query
 *         name: sort_order
 *         schema: { type: string, enum: [ASC, DESC], default: DESC }
 *     responses:
 *       200:
 *         description: Paginated list of Service POs
 */
router.get(
  '/',
  authenticate,
  authorize(VIEW_ROLES),
  validate(listServicePOsQuerySchema, 'query'),
  servicePOController.getAllServicePOs
);

// ─── Get single Service PO ────────────────────────────────────────────────────
/**
 * @swagger
 * /service-pos/{id}:
 *   get:
 *     summary: Get a single Service PO with full details and allocated employees
 *     tags: [ServicePOs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Service PO detail
 *       404:
 *         description: Service PO not found
 */
router.get(
  '/:id',
  authenticate,
  servicePOController.getServicePOById
);

// ─── Create Service PO ────────────────────────────────────────────────────────
/**
 * @swagger
 * /service-pos:
 *   post:
 *     summary: Create a new Service PO
 *     tags: [ServicePOs]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [service_po_name, client_id, service_type_id, start_date, end_date]
 *             properties:
 *               service_po_name:
 *                 type: string
 *               client_id:
 *                 type: integer
 *               service_type_id:
 *                 type: integer
 *               po_value:
 *                 type: number
 *               start_date:
 *                 type: string
 *                 format: date
 *               end_date:
 *                 type: string
 *                 format: date
 *               expected_man_hours:
 *                 type: number
 *               is_billable:
 *                 type: boolean
 *               account_manager:
 *                 type: string
 *                 maxLength: 100
 *                 description: Name of the account manager for this PO
 *               service_description:
 *                 type: string
 *                 description: Detailed description of the service
 *               invoice_frequency:
 *                 type: string
 *                 enum: [monthly, milestone-based, internal-no-invoice, poc, yearly-amc]
 *                 description: How often the client is invoiced
 *               invoice_amount:
 *                 type: number
 *                 description: Invoice amount for billing
 *     responses:
 *       201:
 *         description: Service PO created
 *       422:
 *         description: Validation error
 */
router.post(
  '/',
  authenticate,
  authorize(WRITE_ROLES),
  validate(createServicePOSchema),
  servicePOController.createServicePO
);

// ─── Update Service PO ────────────────────────────────────────────────────────
/**
 * @swagger
 * /service-pos/{id}:
 *   put:
 *     summary: Update an existing Service PO
 *     tags: [ServicePOs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               service_po_name:    { type: string }
 *               client_id:          { type: integer }
 *               service_type_id:    { type: integer }
 *               po_value:           { type: number }
 *               start_date:         { type: string, format: date }
 *               end_date:           { type: string, format: date }
 *               expected_man_hours: { type: number }
 *               is_billable:        { type: boolean }
 *               account_manager:
 *                 type: string
 *                 maxLength: 100
 *               service_description:
 *                 type: string
 *               invoice_frequency:
 *                 type: string
 *                 enum: [monthly, milestone-based, internal-no-invoice, poc, yearly-amc]
 *               invoice_amount:
 *                 type: number
 *                 description: Invoice amount for billing
 *     responses:
 *       200:
 *         description: Service PO updated
 *       400:
 *         description: PO is closed or cancelled
 *       404:
 *         description: Service PO not found
 */
router.put(
  '/:id',
  authenticate,
  authorize(WRITE_ROLES),
  validate(updateServicePOSchema),
  servicePOController.updateServicePO
);

// ─── Close Service PO ─────────────────────────────────────────────────────────
/**
 * @swagger
 * /service-pos/{id}/close:
 *   post:
 *     summary: Close a Service PO (status transitions active -> closed)
 *     tags: [ServicePOs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Service PO closed
 *       400:
 *         description: Invalid status transition
 */
router.post(
  '/:id/close',
  authenticate,
  authorize(WRITE_ROLES),
  servicePOController.closeServicePO
);

// ─── Allocate resources ───────────────────────────────────────────────────────
/**
 * @swagger
 * /service-pos/{id}/allocate:
 *   post:
 *     summary: Allocate employees to a Service PO
 *     tags: [ServicePOs]
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
 *             required: [employee_ids]
 *             properties:
 *               employee_ids:
 *                 type: array
 *                 items:
 *                   type: integer
 *                 minItems: 1
 *                 maxItems: 100
 *     responses:
 *       200:
 *         description: Resources allocated
 *       400:
 *         description: PO not active or employee inactive
 *       404:
 *         description: PO or employee not found
 */
router.post(
  '/:id/allocate',
  authenticate,
  authorize(ALLOCATE_ROLES),
  validate(allocateResourcesSchema),
  servicePOController.allocateResources
);

// ─── Deallocate a resource ────────────────────────────────────────────────────
/**
 * @swagger
 * /service-pos/{id}/resources/{employeeId}:
 *   delete:
 *     summary: Remove an employee from a Service PO
 *     tags: [ServicePOs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *         description: Service PO ID
 *       - in: path
 *         name: employeeId
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Resource removed
 *       404:
 *         description: PO or allocation not found
 */
router.delete(
  '/:id/resources/:employeeId',
  authenticate,
  authorize(DEALLOCATE_ROLES),
  servicePOController.deallocateResource
);

// ─── Get utilisation ──────────────────────────────────────────────────────────
/**
 * @swagger
 * /service-pos/{id}/utilisation:
 *   get:
 *     summary: Get utilisation data for a Service PO
 *     tags: [ServicePOs]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Utilisation breakdown with percentage, logged hours, and remaining hours
 */
router.get(
  '/:id/utilisation',
  authenticate,
  servicePOController.getUtilisation
);

module.exports = router;
