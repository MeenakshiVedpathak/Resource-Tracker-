'use strict';

const multer = require('multer');
const path = require('path');
const fs = require('fs');

// ── Upload Directory ──────────────────────────────────────────────────────────
const UPLOAD_DIR = path.resolve(__dirname, '../uploads/timesheets');

// Ensure upload directory exists at startup
if (!fs.existsSync(UPLOAD_DIR)) {
  fs.mkdirSync(UPLOAD_DIR, { recursive: true });
}

// ── Allowed MIME Types & Extensions ──────────────────────────────────────────
const ALLOWED_MIME_TYPES = new Set([
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet', // .xlsx
  'application/vnd.ms-excel',                                          // .xls (legacy)
  'text/csv',                                                           // .csv
  'application/csv',
  'text/plain',                                                         // some OS send .csv as text/plain
]);

const ALLOWED_EXTENSIONS = new Set(['.xlsx', '.csv']);

const MAX_FILE_SIZE_BYTES = 10 * 1024 * 1024; // 10 MB

// ── Disk Storage Configuration ────────────────────────────────────────────────
const timesheetStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, UPLOAD_DIR);
  },

  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname).toLowerCase();
    const baseName = path
      .basename(file.originalname, ext)
      .replace(/[^a-z0-9_\-]/gi, '_') // sanitize original name
      .toLowerCase()
      .slice(0, 60); // cap length

    const datePrefix = new Date()
      .toISOString()
      .replace(/[:T.Z]/g, '-')
      .slice(0, 19); // "2025-07-15-09-30-00"

    const userId = req.userId ? `_u${req.userId}` : '';
    const uniqueSuffix = `${datePrefix}${userId}_${baseName}${ext}`;

    cb(null, uniqueSuffix);
  },
});

// ── File Filter ───────────────────────────────────────────────────────────────
const timesheetFileFilter = (req, file, cb) => {
  const ext = path.extname(file.originalname).toLowerCase();
  const mime = file.mimetype.toLowerCase();

  if (ALLOWED_EXTENSIONS.has(ext) && ALLOWED_MIME_TYPES.has(mime)) {
    return cb(null, true);
  }

  // Allow .csv with application/octet-stream (common in some browsers/OS)
  if (ext === '.csv' && mime === 'application/octet-stream') {
    return cb(null, true);
  }

  const err = new multer.MulterError('LIMIT_UNEXPECTED_FILE', file.fieldname);
  err.message = `Invalid file type. Only .xlsx and .csv files are accepted. Received: "${ext || mime}".`;
  cb(err, false);
};

// ── Multer Instance: Excel / CSV Upload ───────────────────────────────────────
const uploadExcel = multer({
  storage: timesheetStorage,
  fileFilter: timesheetFileFilter,
  limits: {
    fileSize: MAX_FILE_SIZE_BYTES,
    files: 1,
  },
});

// ── Convenience middleware wrappers ───────────────────────────────────────────

/**
 * Single file upload for timesheet import.
 * Field name: "file"
 * Usage: router.post('/import', authenticate, uploadExcel.single('file'), handler)
 */
const uploadTimesheetSingle = uploadExcel.single('file');

/**
 * Wraps multer upload in a promise that passes MulterError to next()
 * instead of throwing, so the global errorHandler can catch it.
 */
const handleTimesheetUpload = (req, res, next) => {
  uploadTimesheetSingle(req, res, (err) => {
    if (err) {
      // Pass to global error handler (multer or general error)
      return next(err);
    }
    if (!req.file) {
      return res.status(400).json({
        success: false,
        code: 'NO_FILE',
        message: 'No file was uploaded. Please attach a .xlsx or .csv file in the "file" field.',
      });
    }
    next();
  });
};

module.exports = {
  uploadExcel,
  handleTimesheetUpload,
  UPLOAD_DIR,
};
