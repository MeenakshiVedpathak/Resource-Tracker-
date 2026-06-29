'use strict';

const express = require('express');
const router = express.Router();

const authenticate = require('../middlewares/auth');
const authorize = require('../middlewares/authorize');
const { handleTimesheetUpload } = require('../middlewares/upload');
const timesheetController = require('../controllers/timesheetController');

/**
 * @swagger
 * tags:
 *   - name: Timesheets
 *     description: Timesheet entry management
 *   - name: Timesheet Import
 *     description: Excel / CSV bulk import with preview and confirm flow
 */

// ─────────────────────────────────────────────────────────────────────────────
// Import Routes  (must be declared BEFORE /:id to avoid route shadowing)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /timesheets/import/history:
 *   get:
 *     summary: List all timesheet import history records
 *     tags: [Timesheet Import]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *     responses:
 *       200:
 *         description: Paginated list of import history records
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/import/history',
  authenticate,
  timesheetController.getHistory
);

/**
 * @swagger
 * /timesheets/import/{id}:
 *   get:
 *     summary: Get a single import history record with its error rows
 *     tags: [Timesheet Import]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Import record including all error rows
 *       404:
 *         description: Import record not found
 */
router.get(
  '/import/:id',
  authenticate,
  timesheetController.getImportById
);

/**
 * @swagger
 * /timesheets/import/{id}/rows:
 *   get:
 *     summary: Get all timesheet rows created by a specific import
 *     tags: [Timesheet Import]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: List of timesheet rows for the import
 */
router.get(
  '/import/:id/rows',
  authenticate,
  authorize(['Finance', 'HR']),
  timesheetController.getImportRows
);

/**
 * @swagger
 * /timesheets/upload:
 *   post:
 *     summary: Upload a timesheet Excel or CSV file for preview
 *     description: >
 *       Parses the uploaded file, validates every row, persists an import history
 *       record with status=pending, and returns a preview of valid rows and errors.
 *       Call POST /confirm/{importId} to commit the valid rows.
 *     tags: [Timesheet Import]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         multipart/form-data:
 *           schema:
 *             type: object
 *             required: [file]
 *             properties:
 *               file:
 *                 type: string
 *                 format: binary
 *                 description: .xlsx or .csv file (max 10 MB)
 *     responses:
 *       200:
 *         description: Preview data with valid rows, error rows, and importId
 *       400:
 *         description: No file uploaded or invalid file type
 *       403:
 *         description: Forbidden — Finance or HR role required
 *       422:
 *         description: File could not be parsed
 */
router.post(
  '/upload',
  authenticate,
  authorize(['HR']),
  handleTimesheetUpload,
  timesheetController.upload
);

/**
 * @swagger
 * /timesheets/confirm/{importId}:
 *   post:
 *     summary: Confirm and commit a pending import
 *     description: >
 *       Re-validates the source file and bulk-inserts all valid rows into the
 *       timesheets table within a single transaction. The import history record
 *       is updated to status=completed on success or status=failed on error.
 *     tags: [Timesheet Import]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: importId
 *         required: true
 *         schema: { type: integer }
 *         description: ID returned by the /upload endpoint
 *     responses:
 *       200:
 *         description: Import committed; returns inserted row count
 *       404:
 *         description: Import record not found
 *       409:
 *         description: Import already confirmed or failed
 *       422:
 *         description: No valid rows after re-validation
 */
router.post(
  '/confirm/:importId',
  authenticate,
  authorize(['Finance', 'HR']),
  timesheetController.confirm
);

// ─────────────────────────────────────────────────────────────────────────────
// CRUD Routes
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @swagger
 * /timesheets:
 *   get:
 *     summary: List timesheet entries
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: query
 *         name: page
 *         schema: { type: integer, default: 1 }
 *       - in: query
 *         name: limit
 *         schema: { type: integer, default: 10 }
 *       - in: query
 *         name: startDate
 *         schema: { type: string, format: date }
 *         description: Filter entries from this date (inclusive)
 *       - in: query
 *         name: endDate
 *         schema: { type: string, format: date }
 *         description: Filter entries up to this date (inclusive)
 *       - in: query
 *         name: employeeId
 *         schema: { type: integer }
 *       - in: query
 *         name: poId
 *         schema: { type: integer }
 *       - in: query
 *         name: subProjectId
 *         schema: { type: integer }
 *       - in: query
 *         name: sortBy
 *         schema: { type: string, enum: [timesheet_date, hours_logged, created_at], default: timesheet_date }
 *       - in: query
 *         name: sortOrder
 *         schema: { type: string, enum: [ASC, DESC], default: DESC }
 *     responses:
 *       200:
 *         description: Paginated list of timesheet entries
 *       401:
 *         description: Unauthorized
 */
router.get(
  '/',
  authenticate,
  authorize(['Finance', 'HR', 'Management']),
  timesheetController.getAll
);

/**
 * @swagger
 * /timesheets/{id}:
 *   get:
 *     summary: Get a single timesheet entry by ID
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       200:
 *         description: Timesheet entry
 *       404:
 *         description: Not found
 */
router.get(
  '/:id',
  authenticate,
  timesheetController.getById
);

/**
 * @swagger
 * /timesheets:
 *   post:
 *     summary: Create a single timesheet entry (manual)
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [employee_id, service_po_id, timesheet_date, hours_logged]
 *             properties:
 *               employee_id:    { type: integer }
 *               service_po_id:  { type: integer }
 *               sub_project_id: { type: integer, nullable: true }
 *               timesheet_date: { type: string, format: date }
 *               hours_logged:   { type: number, minimum: 0 }
 *     responses:
 *       201:
 *         description: Timesheet entry created
 *       409:
 *         description: Duplicate entry for this employee/PO/date
 */
router.post(
  '/',
  authenticate,
  timesheetController.create
);

/**
 * @swagger
 * /timesheets/{id}:
 *   put:
 *     summary: Update a timesheet entry
 *     tags: [Timesheets]
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
 *               employee_id:    { type: integer }
 *               service_po_id:  { type: integer }
 *               sub_project_id: { type: integer, nullable: true }
 *               timesheet_date: { type: string, format: date }
 *               hours_logged:   { type: number, minimum: 0 }
 *     responses:
 *       200:
 *         description: Updated timesheet entry
 *       404:
 *         description: Not found
 *       409:
 *         description: Duplicate entry
 */
router.put(
  '/:id',
  authenticate,
  timesheetController.update
);

/**
 * @swagger
 * /timesheets/{id}:
 *   delete:
 *     summary: Delete a timesheet entry
 *     tags: [Timesheets]
 *     security:
 *       - bearerAuth: []
 *     parameters:
 *       - in: path
 *         name: id
 *         required: true
 *         schema: { type: integer }
 *     responses:
 *       204:
 *         description: Deleted successfully
 *       404:
 *         description: Not found
 *       403:
 *         description: Forbidden — Finance role required
 */
router.delete(
  '/:id',
  authenticate,
  authorize(['Finance']),
  timesheetController.deleteTimesheet
);

module.exports = router;
