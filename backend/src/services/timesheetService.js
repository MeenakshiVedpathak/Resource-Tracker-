'use strict';

const path = require('path');
const fs = require('fs');
const xlsx = require('xlsx');
const { Readable } = require('stream');
const { Op } = require('sequelize');
const { Employee, ServicePO, SubProject, sequelize } = require('../models');
const timesheetRepository = require('../repositories/timesheetRepository');
const timesheetImportRepository = require('../repositories/timesheetImportRepository');
const { createAuditLog } = require('../middlewares/auditLog');
const logger = require('../utils/logger');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

// ── Expected spreadsheet column headers (case-insensitive, trimmed) ───────────
const HEADER_MAP = {
  'resource name':    'resourceName',
  'employee name':    'resourceName',
  'name':             'resourceName',
  'service po name':  'servicePOName',
  'po name':          'servicePOName',
  'service po':       'servicePOName',
  'sub project':      'subProject',
  'sub-project':      'subProject',
  'subproject':       'subProject',
  'date':             'date',
  'timesheet date':   'date',
  'hours':            'hours',
  'hours logged':     'hours',
  'logged hours':     'hours',
};

/**
 * Normalise a raw header string to a canonical field key.
 * @param {string} header
 * @returns {string|null}
 */
function normaliseHeader(header) {
  if (!header) return null;
  const key = String(header).trim().toLowerCase();
  return HEADER_MAP[key] || null;
}

/**
 * Parse a date value that may arrive as:
 *  - JavaScript Date object (xlsx returns these for date-formatted cells)
 *  - Excel serial number (numeric)
 *  - ISO / locale date string
 *
 * Returns a YYYY-MM-DD string or null.
 * @param {*} raw
 * @returns {string|null}
 */
function parseDate(raw) {
  if (!raw) return null;

  // xlsx can return a JS Date
  if (raw instanceof Date) {
    if (isNaN(raw.getTime())) return null;
    return raw.toISOString().slice(0, 10);
  }

  // Excel serial number
  if (typeof raw === 'number') {
    const jsDate = xlsx.SSF.parse_date_code(raw);
    if (!jsDate) return null;
    const y = jsDate.y;
    const m = String(jsDate.m).padStart(2, '0');
    const d = String(jsDate.d).padStart(2, '0');
    return `${y}-${m}-${d}`;
  }

  // String attempt — try to detect common formats
  const str = String(raw).trim();
  if (!str) return null;

  // ISO: 2025-07-15
  if (/^\d{4}-\d{2}-\d{2}$/.test(str)) return str;

  // DD/MM/YYYY or DD-MM-YYYY
  const dmy = str.match(/^(\d{1,2})[\/\-](\d{1,2})[\/\-](\d{4})$/);
  if (dmy) {
    const [, d, m, y] = dmy;
    return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
  }

  // MM/DD/YYYY
  const mdy = str.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdy) {
    const [, m, d, y] = mdy;
    // Ambiguous: treat month <= 12 as MM/DD, else DD/MM
    if (parseInt(m, 10) <= 12) {
      return `${y}-${String(m).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }
  }

  // Last resort: let Date constructor try
  const attempt = new Date(str);
  if (!isNaN(attempt.getTime())) {
    return attempt.toISOString().slice(0, 10);
  }

  return null;
}

/**
 * Parse an uploaded .xlsx or .csv file and return a normalised array of row objects.
 * Each object has: { resourceName, servicePOName, subProject, date, hours }
 *
 * @param {string} filePath  - Absolute path to the uploaded file
 * @param {string} mimetype  - MIME type from multer
 * @returns {Promise<object[]>}
 */
const parseFile = async (filePath, mimetype) => {
  const ext = path.extname(filePath).toLowerCase();

  // ── CSV via xlsx (handles both .csv and .xlsx) ────────────────────────────
  const workbook = xlsx.readFile(filePath, {
    cellDates: true,
    dateNF: 'yyyy-mm-dd',
    raw: false,
  });

  const sheetName = workbook.SheetNames[0];
  if (!sheetName) {
    throw Object.assign(new Error('The uploaded file contains no worksheets.'), { statusCode: 422 });
  }

  const sheet = workbook.Sheets[sheetName];
  // Convert to array-of-arrays to manually handle headers
  const rawRows = xlsx.utils.sheet_to_json(sheet, { header: 1, defval: '' });

  if (!rawRows || rawRows.length < 2) {
    throw Object.assign(
      new Error('The file has no data rows. Ensure the first row contains headers and subsequent rows contain data.'),
      { statusCode: 422 }
    );
  }

  // Build header index map
  const headerRow = rawRows[0];
  const fieldIndex = {};
  headerRow.forEach((cell, idx) => {
    const fieldName = normaliseHeader(cell);
    if (fieldName && !(fieldName in fieldIndex)) {
      fieldIndex[fieldName] = idx;
    }
  });

  const requiredFields = ['resourceName', 'servicePOName', 'date', 'hours'];
  const missingHeaders = requiredFields.filter((f) => !(f in fieldIndex));
  if (missingHeaders.length > 0) {
    throw Object.assign(
      new Error(
        `Missing required column(s): ${missingHeaders.join(', ')}. ` +
        `Expected headers: "Resource Name", "Service PO Name", "Date", "Hours".`
      ),
      { statusCode: 422 }
    );
  }

  const dataRows = rawRows.slice(1);
  const parsed = [];

  dataRows.forEach((row, i) => {
    // Skip entirely empty rows
    if (row.every((cell) => cell === '' || cell === null || cell === undefined)) {
      return;
    }

    const get = (field) => {
      const idx = fieldIndex[field];
      return idx !== undefined ? row[idx] : undefined;
    };

    parsed.push({
      rowNumber: i + 2, // +2: 1-based + skip header
      resourceName:  String(get('resourceName') ?? '').trim(),
      servicePOName: String(get('servicePOName') ?? '').trim(),
      subProject:    String(get('subProject') ?? '').trim(),
      date:          parseDate(get('date')),
      hoursRaw:      get('hours'),
      hours:         parseFloat(get('hours')) || 0,
    });
  });

  return parsed;
};

/**
 * Validate a parsed array of rows against the database.
 *
 * For each row checks:
 *  1. Required fields present
 *  2. Date is valid
 *  3. Hours > 0 and <= 24
 *  4. Employee exists by full_name (case-insensitive) and is active
 *  5. Service PO exists by service_po_name (case-insensitive) and is active
 *  6. Sub-project (if provided) exists and belongs to the resolved PO
 *  7. No duplicate entry exists in the timesheets table
 *
 * @param {object[]} rows - Output from parseFile()
 * @returns {Promise<{ validRows: object[], errorRows: object[] }>}
 */
const validateRows = async (rows) => {
  const validRows = [];
  const errorRows = [];

  // Pre-fetch all active employees and POs to minimise N+1 queries
  const [allEmployees, allPOs] = await Promise.all([
    Employee.findAll({
      where: { status: 'active' },
      attributes: ['id', 'full_name', 'status'],
    }),
    ServicePO.findAll({
      where: { status: 'active' },
      attributes: ['id', 'service_po_name', 'status'],
      include: [
        {
          model: SubProject,
          as: 'subProjects',
          attributes: ['id', 'sub_project_name', 'status'],
          required: false,
        },
      ],
    }),
  ]);

  // Build lookup maps (lower-cased name -> record)
  const employeeMap = new Map();
  allEmployees.forEach((e) => {
    employeeMap.set(e.full_name.trim().toLowerCase(), e);
  });

  const poMap = new Map();
  allPOs.forEach((po) => {
    poMap.set(po.service_po_name.trim().toLowerCase(), po);
  });

  for (const row of rows) {
    const errors = [];
    const { rowNumber, resourceName, servicePOName, subProject, date, hours } = row;

    // 1. Required fields
    if (!resourceName) errors.push('Resource Name is required.');
    if (!servicePOName) errors.push('Service PO Name is required.');
    if (!date) errors.push('Date is missing or could not be parsed. Expected format: YYYY-MM-DD or DD/MM/YYYY.');

    // 2. Hours validation
    const numericHours = parseFloat(hours);
    if (isNaN(numericHours) || numericHours <= 0) {
      errors.push('Hours must be a positive number greater than 0.');
    } else if (numericHours > 24) {
      errors.push('Hours cannot exceed 24 per entry.');
    }

    // 3. Date validity
    if (date && !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
      errors.push(`Date "${date}" is not a valid date.`);
    }

    let employee = null;
    let po = null;
    let subProjectRecord = null;

    // 4. Employee lookup
    if (resourceName) {
      employee = employeeMap.get(resourceName.toLowerCase());
      if (!employee) {
        errors.push(`Employee "${resourceName}" was not found in the system.`);
      }
    }

    // 5. Service PO lookup
    if (servicePOName) {
      po = poMap.get(servicePOName.toLowerCase());
      if (!po) {
        errors.push(`Service PO "${servicePOName}" was not found or is not active.`);
      }
    }

    // 6. Sub-project lookup (optional)
    if (subProject && po) {
      const spLower = subProject.toLowerCase();
      subProjectRecord = (po.subProjects || []).find(
        (sp) => sp.sub_project_name.trim().toLowerCase() === spLower
      );
      if (!subProjectRecord) {
        errors.push(
          `Sub-project "${subProject}" was not found under Service PO "${servicePOName}".`
        );
      }
    }

    // 7. Duplicate check (only if all core IDs resolved and date is valid)
    if (errors.length === 0 && employee && po && date) {
      const existing = await timesheetRepository.checkDuplicate(employee.id, po.id, date);
      if (existing) {
        errors.push(
          `A timesheet entry already exists for "${resourceName}" on "${date}" under "${servicePOName}".`
        );
      }
    }

    if (errors.length > 0) {
      errorRows.push({
        rowNumber,
        row: {
          resourceName,
          servicePOName,
          subProject,
          date,
          hours,
        },
        errors,
      });
    } else {
      validRows.push({
        rowNumber,
        employeeId:   employee.id,
        poId:         po.id,
        subProjectId: subProjectRecord ? subProjectRecord.id : null,
        date,
        hours:        numericHours,
        // Original display data for preview
        resourceName,
        servicePOName,
        subProjectName: subProjectRecord ? subProjectRecord.sub_project_name : null,
      });
    }
  }

  return { validRows, errorRows };
};

/**
 * Parse the file, validate all rows, persist an import history record
 * (status = 'pending'), store any error rows, and return a preview object.
 *
 * @param {string} filePath
 * @param {string} fileName   - Original file name
 * @param {number} userId     - Authenticated user ID
 * @param {string} mimetype
 * @returns {Promise<{ importId, totalRows, validRows, errorRows, preview }>}
 */
const previewImport = async (filePath, fileName, userId, mimetype) => {
  logger.info('Timesheet import preview started', { userId, fileName });

  // 1. Parse file
  let parsedRows;
  try {
    parsedRows = await parseFile(filePath, mimetype);
  } catch (err) {
    logger.error('Timesheet file parse error', { error: err.message, fileName });
    throw err;
  }

  // 2. Validate
  const { validRows, errorRows } = await validateRows(parsedRows);

  // 3. Create import history record (status = pending)
  const importRecord = await timesheetImportRepository.createImportHistory({
    imported_by: userId,
    file_name:   fileName,
    file_path:   filePath,
    total_rows:  parsedRows.length,
    valid_rows:  validRows.length,
    error_rows:  errorRows.length,
    status:      'pending',
  });

  // 4. Persist error rows if any
  if (errorRows.length > 0) {
    const errorInserts = errorRows.map((e) => ({
      import_id:     importRecord.id,
      row_number:    e.rowNumber,
      row_data:      e.row,
      error_message: e.errors.join(' | '),
    }));
    await timesheetImportRepository.createImportErrors(errorInserts);
  }

  logger.info('Timesheet import preview complete', {
    importId:   importRecord.id,
    totalRows:  parsedRows.length,
    validRows:  validRows.length,
    errorRows:  errorRows.length,
  });

  return {
    importId:  importRecord.id,
    fileName,
    totalRows: parsedRows.length,
    validRows: validRows.length,
    errorRows: errorRows.length,
    preview:   validRows,
    errors:    errorRows,
    canConfirm: validRows.length > 0,
  };
};

/**
 * Confirm a pending import: bulk-insert all valid rows and mark the
 * import history record as completed.
 *
 * Uses a database transaction so the operation is all-or-nothing.
 *
 * @param {number} importId
 * @param {number} userId
 * @param {string} [ipAddress]
 * @returns {Promise<{ importId, insertedRows }>}
 */
const confirmImport = async (importId, userId, ipAddress = null) => {
  // 1. Load the pending import record
  const importRecord = await timesheetImportRepository.findImportById(importId);

  if (!importRecord) {
    const err = new Error(`Import record #${importId} not found.`);
    err.statusCode = 404;
    throw err;
  }

  if (importRecord.status !== 'pending') {
    const err = new Error(
      `Import #${importId} has already been ${importRecord.status}. Only pending imports can be confirmed.`
    );
    err.statusCode = 409;
    throw err;
  }

  if (importRecord.valid_rows === 0) {
    const err = new Error(
      'This import has no valid rows. Nothing to insert.'
    );
    err.statusCode = 422;
    throw err;
  }

  // 2. Re-parse the original file and re-validate to get current valid rows
  //    (guards against race conditions between preview and confirm)
  let parsedRows;
  try {
    parsedRows = await parseFile(importRecord.file_path, null);
  } catch (err) {
    await timesheetImportRepository.updateImportHistory(importId, { status: 'failed' });
    throw err;
  }

  const { validRows, errorRows } = await validateRows(parsedRows);

  if (validRows.length === 0) {
    await timesheetImportRepository.updateImportHistory(importId, {
      status:     'failed',
      valid_rows: 0,
      error_rows: errorRows.length,
    });
    const err = new Error('Re-validation found no valid rows. Import aborted.');
    err.statusCode = 422;
    throw err;
  }

  // 3. Mark as processing
  await timesheetImportRepository.updateImportHistory(importId, { status: 'processing' });

  // 4. Bulk-insert inside a transaction
  const t = await sequelize.transaction();

  try {
    const records = validRows.map((row) => ({
      employee_id:    row.employeeId,
      service_po_id:  row.poId,
      sub_project_id: row.subProjectId || null,
      timesheet_date: row.date,
      hours_logged:   row.hours,
      created_by:     importId, // batch marker — links inserted rows to this import
      updated_by:     userId,
    }));

    const inserted = await timesheetRepository.bulkCreate(records, t);

    // 5. Update history: completed
    await timesheetImportRepository.updateImportHistory(importId, {
      status:     'completed',
      valid_rows: inserted.length,
      error_rows: errorRows.length,
    });

    // Persist any new error rows found on re-validation
    if (errorRows.length > 0) {
      const errorInserts = errorRows.map((e) => ({
        import_id:     importId,
        row_number:    e.rowNumber,
        row_data:      e.row,
        error_message: e.errors.join(' | '),
      }));
      await timesheetImportRepository.createImportErrors(errorInserts);
    }

    await t.commit();

    // 6. Audit log (non-blocking)
    createAuditLog(
      userId,
      'IMPORT',
      'timesheets',
      importId,
      null,
      { importId, insertedRows: inserted.length },
      ipAddress
    );

    logger.info('Timesheet import confirmed', {
      importId,
      userId,
      insertedRows: inserted.length,
    });

    return {
      importId,
      insertedRows: inserted.length,
      errorRows:    errorRows.length,
    };
  } catch (err) {
    await t.rollback();
    await timesheetImportRepository.updateImportHistory(importId, { status: 'failed' });
    logger.error('Timesheet import confirm failed', {
      importId,
      error: err.message,
    });
    throw err;
  }
};

/**
 * Return a paginated list of all import history records.
 * @param {object} query - Express req.query
 * @returns {Promise<{ data, meta }>}
 */
const getImportHistory = async (query = {}) => {
  const { page, limit, offset } = getPaginationParams(query);
  const { rows, count } = await timesheetImportRepository.findAllImports({ limit, offset });
  return {
    data: rows,
    meta: getPaginationMeta(count, page, limit),
  };
};

/**
 * Return a single import history record with its error rows.
 * @param {number} id
 * @returns {Promise<TimesheetImportHistory>}
 */
const getImportById = async (id) => {
  const record = await timesheetImportRepository.findImportById(id);
  if (!record) {
    const err = new Error(`Import record #${id} not found.`);
    err.statusCode = 404;
    throw err;
  }
  return record;
};

// ── Single-record CRUD helpers used by timesheetController ───────────────────

/**
 * Create a single timesheet entry (manual entry path).
 * @param {object} data  - { employee_id, service_po_id, sub_project_id?, timesheet_date, hours_logged, created_by }
 * @returns {Promise<Timesheet>}
 */
const createTimesheet = async (data) => {
  const duplicate = await timesheetRepository.checkDuplicate(
    data.employee_id,
    data.service_po_id,
    data.timesheet_date
  );
  if (duplicate) {
    const err = new Error(
      `A timesheet entry already exists for employee #${data.employee_id} on ${data.timesheet_date} under PO #${data.service_po_id}.`
    );
    err.statusCode = 409;
    throw err;
  }
  return timesheetRepository.create(data);
};

/**
 * Update an existing timesheet entry.
 * Re-checks for duplicates when the date, employee, or PO changes.
 * @param {number} id
 * @param {object} data
 * @returns {Promise<Timesheet>}
 */
const updateTimesheet = async (id, data) => {
  const existing = await timesheetRepository.findById(id);
  if (!existing) {
    const err = new Error(`Timesheet #${id} not found.`);
    err.statusCode = 404;
    throw err;
  }

  // Only check duplicate if key fields changed
  const checkEmpId  = data.employee_id   ?? existing.employee_id;
  const checkPoId   = data.service_po_id ?? existing.service_po_id;
  const checkDate   = data.timesheet_date ?? existing.timesheet_date;

  const duplicate = await timesheetRepository.checkDuplicate(checkEmpId, checkPoId, checkDate, id);
  if (duplicate) {
    const err = new Error(
      `A timesheet entry already exists for employee #${checkEmpId} on ${checkDate} under PO #${checkPoId}.`
    );
    err.statusCode = 409;
    throw err;
  }

  return timesheetRepository.update(id, data);
};

/**
 * Delete a timesheet entry.
 * @param {number} id
 * @returns {Promise<void>}
 */
const deleteTimesheet = async (id) => {
  const rows = await timesheetRepository.deleteById(id);
  if (rows === 0) {
    const err = new Error(`Timesheet #${id} not found.`);
    err.statusCode = 404;
    throw err;
  }
};

/**
 * Fetch paginated timesheets with filters.
 * @param {object} query - Express req.query
 * @returns {Promise<{ data, meta }>}
 */
const getAllTimesheets = async (query = {}) => {
  const { page, limit, offset } = getPaginationParams(query);
  const { startDate, endDate, employeeId, poId, subProjectId, sortBy, sortOrder } = query;

  const { rows, count } = await timesheetRepository.findAll(
    { startDate, endDate, employeeId, poId, subProjectId },
    { limit, offset },
    { sortBy, sortOrder }
  );

  return {
    data: rows,
    meta: getPaginationMeta(count, page, limit),
  };
};

/**
 * Fetch a single timesheet by ID.
 * @param {number} id
 * @returns {Promise<Timesheet>}
 */
const getTimesheetById = async (id) => {
  const record = await timesheetRepository.findById(id);
  if (!record) {
    const err = new Error(`Timesheet #${id} not found.`);
    err.statusCode = 404;
    throw err;
  }
  return record;
};

module.exports = {
  parseFile,
  validateRows,
  previewImport,
  confirmImport,
  getImportHistory,
  getImportById,
  createTimesheet,
  updateTimesheet,
  deleteTimesheet,
  getAllTimesheets,
  getTimesheetById,
};
