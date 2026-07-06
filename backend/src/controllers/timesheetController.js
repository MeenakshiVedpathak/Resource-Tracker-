'use strict';

const timesheetService = require('../services/timesheetService');
const { createAuditLog, getIpAddress } = require('../middlewares/auditLog');
const {
  sendSuccess,
  sendCreated,
  sendNoContent,
  sendPaginated,
  sendNotFound,
  sendError,
} = require('../utils/response');
const logger = require('../utils/logger');

// ── Helper: standardise error handling across handlers ───────────────────────
function handleError(next, err, context) {
  logger.error(`TimesheetController error [${context}]`, {
    message: err.message,
    stack: err.stack,
  });
  // Surface known HTTP errors; delegate the rest to the global handler
  if (err.statusCode) {
    err.status = err.statusCode;
  }
  next(err);
}

// ── Import Handlers ───────────────────────────────────────────────────────────

/**
 * POST /api/v1/timesheets/upload
 *
 * Accepts a multipart file upload (field: "file"), parses and validates
 * all rows, persists an import history record, and returns a preview
 * of valid and error rows.
 *
 * The file is already on disk courtesy of the handleTimesheetUpload middleware.
 */
const upload = async (req, res, next) => {
  try {
    const { path: filePath, originalname, mimetype } = req.file;
    const userId = req.userId;

    const month = parseInt(req.body.month, 10);
    const year  = parseInt(req.body.year,  10);

    if (!month || month < 1 || month > 12) {
      return sendError(res, 'month is required and must be between 1 and 12.', 422);
    }
    if (!year || year < 2000) {
      return sendError(res, 'year is required and must be 2000 or later.', 422);
    }

    const result = await timesheetService.previewImport(
      filePath,
      originalname,
      userId,
      mimetype,
      month,
      year
    );

    return sendSuccess(
      res,
      result,
      result.canConfirm
        ? `Preview ready. ${result.validRows} valid row(s), ${result.errorRows} error(s). Call POST /confirm/${result.importId} to import.`
        : `No valid rows found. ${result.errorRows} error(s). Please correct the file and re-upload.`,
      200
    );
  } catch (err) {
    return handleError(next, err, 'upload');
  }
};

/**
 * POST /api/v1/timesheets/confirm/:importId
 *
 * Confirms a pending import: re-validates the source file and bulk-inserts
 * all valid rows into the timesheets table.
 */
const confirm = async (req, res, next) => {
  try {
    const importId = parseInt(req.params.importId, 10);
    if (isNaN(importId) || importId < 1) {
      return sendError(res, 'Invalid importId parameter.', 400);
    }

    const result = await timesheetService.confirmImport(
      importId,
      req.userId,
      getIpAddress(req)
    );

    return sendSuccess(
      res,
      result,
      `Import #${importId} completed. ${result.insertedRows} timesheet row(s) inserted.`,
      200
    );
  } catch (err) {
    return handleError(next, err, 'confirm');
  }
};

/**
 * GET /api/v1/timesheets/import/history
 *
 * Returns a paginated list of all past import operations.
 */
const getHistory = async (req, res, next) => {
  try {
    const { data, meta } = await timesheetService.getImportHistory(req.query);
    return sendPaginated(res, data, meta, 'Import history fetched successfully.');
  } catch (err) {
    return handleError(next, err, 'getHistory');
  }
};

/**
 * GET /api/v1/timesheets/import/:id
 *
 * Returns a single import history record, including all error rows.
 */
const getImportById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return sendError(res, 'Invalid import ID.', 400);
    }

    const record = await timesheetService.getImportById(id);
    return sendSuccess(res, record, 'Import record fetched successfully.');
  } catch (err) {
    return handleError(next, err, 'getImportById');
  }
};

/**
 * GET /api/v1/timesheets/import/:id/rows
 *
 * Returns all timesheet rows inserted as part of the given import.
 */
const getImportRows = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return sendError(res, 'Invalid import ID.', 400);
    }

    const rows = await timesheetService.getImportRows(id);
    return sendSuccess(res, rows, 'Imported timesheet rows fetched successfully.');
  } catch (err) {
    return handleError(next, err, 'getImportRows');
  }
};

// ── CRUD Handlers ─────────────────────────────────────────────────────────────

/**
 * GET /api/v1/timesheets
 *
 * Query params: page, limit, startDate, endDate, employeeId, poId, subProjectId,
 *               sortBy, sortOrder
 */
const getAll = async (req, res, next) => {
  try {
    const { data, meta } = await timesheetService.getAllTimesheets(req.query);
    return sendPaginated(res, data, meta, 'Timesheets fetched successfully.');
  } catch (err) {
    return handleError(next, err, 'getAll');
  }
};

/**
 * GET /api/v1/timesheets/:id
 */
const getById = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return sendError(res, 'Invalid timesheet ID.', 400);
    }

    const record = await timesheetService.getTimesheetById(id);
    return sendSuccess(res, record, 'Timesheet fetched successfully.');
  } catch (err) {
    return handleError(next, err, 'getById');
  }
};

/**
 * POST /api/v1/timesheets
 *
 * Body: { employee_id, service_po_id, sub_project_id?, timesheet_date, hours_logged }
 */
const create = async (req, res, next) => {
  try {
    const data = {
      employee_id:    req.body.employee_id,
      service_po_id:  req.body.service_po_id,
      sub_project_id: req.body.sub_project_id || null,
      timesheet_date: req.body.timesheet_date,
      hours_logged:   req.body.hours_logged,
      created_by:     req.userId,
      updated_by:     req.userId,
    };

    const timesheet = await timesheetService.createTimesheet(data);

    createAuditLog(
      req.userId,
      'CREATE',
      'timesheets',
      timesheet.id,
      null,
      timesheet.toJSON(),
      getIpAddress(req)
    );

    return sendCreated(res, timesheet, 'Timesheet entry created successfully.');
  } catch (err) {
    return handleError(next, err, 'create');
  }
};

/**
 * PUT /api/v1/timesheets/:id
 *
 * Body: partial timesheet fields
 */
const update = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return sendError(res, 'Invalid timesheet ID.', 400);
    }

    const data = {
      ...(req.body.employee_id   !== undefined && { employee_id:   req.body.employee_id }),
      ...(req.body.service_po_id !== undefined && { service_po_id: req.body.service_po_id }),
      ...(req.body.sub_project_id !== undefined && { sub_project_id: req.body.sub_project_id }),
      ...(req.body.timesheet_date !== undefined && { timesheet_date: req.body.timesheet_date }),
      ...(req.body.hours_logged   !== undefined && { hours_logged:   req.body.hours_logged }),
      updated_by: req.userId,
    };

    const timesheet = await timesheetService.updateTimesheet(id, data);

    createAuditLog(
      req.userId,
      'UPDATE',
      'timesheets',
      id,
      null,
      timesheet.toJSON(),
      getIpAddress(req)
    );

    return sendSuccess(res, timesheet, 'Timesheet entry updated successfully.');
  } catch (err) {
    return handleError(next, err, 'update');
  }
};

/**
 * DELETE /api/v1/timesheets/:id
 */
const deleteTimesheet = async (req, res, next) => {
  try {
    const id = parseInt(req.params.id, 10);
    if (isNaN(id) || id < 1) {
      return sendError(res, 'Invalid timesheet ID.', 400);
    }

    await timesheetService.deleteTimesheet(id);

    createAuditLog(
      req.userId,
      'DELETE',
      'timesheets',
      id,
      null,
      null,
      getIpAddress(req)
    );

    return sendNoContent(res);
  } catch (err) {
    return handleError(next, err, 'deleteTimesheet');
  }
};

module.exports = {
  upload,
  confirm,
  getHistory,
  getImportById,
  getImportRows,
  getAll,
  getById,
  create,
  update,
  deleteTimesheet,
};
