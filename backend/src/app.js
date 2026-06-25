'use strict';

const express = require('express');
const helmet = require('helmet');
const cors = require('cors');
const rateLimit = require('express-rate-limit');
const swaggerUi = require('swagger-ui-express');
const swaggerJsdoc = require('swagger-jsdoc');
const path = require('path');

const logger = require('./utils/logger');
const { sendError } = require('./utils/response');

// ─── Route Imports ────────────────────────────────────────────────────────────
const authRoutes = require('./routes/authRoutes');
const employeeRoutes = require('./routes/employee.routes');
const userRoutes = require('./routes/user.routes');
const roleRoutes = require('./routes/role.routes');
const clientRoutes = require('./routes/client.routes');
const servicePORoutes = require('./routes/servicePO.routes');
const subProjectRoutes = require('./routes/subProject.routes');
const monthlyCostRoutes = require('./routes/monthlyCost.routes');
const timesheetRoutes = require('./routes/timesheet.routes');
const reportRoutes = require('./routes/report.routes');
const dashboardRoutes = require('./routes/dashboard.routes');
const notificationRoutes = require('./routes/notification.routes');

const app = express();

// ─── Security Middleware ──────────────────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: 'cross-origin' },
}));

app.use(cors({
  origin: process.env.CORS_ORIGIN || '*',
  methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
  credentials: true,
}));

// ─── Rate Limiting ────────────────────────────────────────────────────────────
const limiter = rateLimit({
  windowMs: parseInt(process.env.RATE_LIMIT_WINDOW_MS, 10) || 15 * 60 * 1000, // 15 minutes
  max: parseInt(process.env.RATE_LIMIT_MAX, 10) || 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: {
    success: false,
    message: 'Too many requests from this IP. Please try again after 15 minutes.',
  },
  skip: (req) => req.path === '/health',
});

app.use(limiter);

// ─── Body Parsing ─────────────────────────────────────────────────────────────
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));

// ─── Static Uploads ───────────────────────────────────────────────────────────
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// ─── Request Logger ───────────────────────────────────────────────────────────
app.use((req, _res, next) => {
  logger.http(`${req.method} ${req.originalUrl} - IP: ${req.ip}`);
  next();
});

// ─── Swagger / OpenAPI ────────────────────────────────────────────────────────
const swaggerOptions = {
  definition: {
    openapi: '3.0.0',
    info: {
      title: 'RUT Portal API',
      version: '1.0.0',
      description: 'Resource Utilization Tracking System — REST API Documentation',
      contact: {
        name: 'RUT Portal Support',
        email: 'support@rutportal.com',
      },
    },
    servers: [
      {
        url: `http://localhost:${process.env.PORT || 5000}/api/v1`,
        description: 'Development server',
      },
    ],
    components: {
      securitySchemes: {
        bearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'JWT',
        },
      },
    },
    security: [{ bearerAuth: [] }],
  },
  apis: [
    path.join(__dirname, 'routes', '*.js'),
    path.join(__dirname, 'models', '*.js'),
  ],
};

const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  customSiteTitle: 'RUT Portal API Docs',
  swaggerOptions: { persistAuthorization: true },
}));

// ─── Health Check ─────────────────────────────────────────────────────────────
app.get('/health', (_req, res) => {
  res.status(200).json({
    success: true,
    message: 'RUT Portal API is running',
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'development',
    version: '1.0.0',
  });
});

// ─── API Routes ───────────────────────────────────────────────────────────────
const API_PREFIX = '/api/v1';

app.use(`${API_PREFIX}/auth`, authRoutes);
app.use(`${API_PREFIX}/employees`, employeeRoutes);
app.use(`${API_PREFIX}/users`, userRoutes);
app.use(`${API_PREFIX}/roles`, roleRoutes);
app.use(`${API_PREFIX}/clients`, clientRoutes);
app.use(`${API_PREFIX}/service-pos`, servicePORoutes);
app.use(`${API_PREFIX}/sub-projects`, subProjectRoutes);
app.use(`${API_PREFIX}/monthly-costs`, monthlyCostRoutes);
app.use(`${API_PREFIX}/timesheets`, timesheetRoutes);
app.use(`${API_PREFIX}/reports`, reportRoutes);
app.use(`${API_PREFIX}/dashboard`, dashboardRoutes);
app.use(`${API_PREFIX}/notifications`, notificationRoutes);

// ─── 404 Handler ──────────────────────────────────────────────────────────────
app.use((req, res) => {
  sendError(res, `Route not found: ${req.method} ${req.originalUrl}`, 404);
});

// ─── Global Error Handler ─────────────────────────────────────────────────────
// eslint-disable-next-line no-unused-vars
app.use((err, req, res, _next) => {
  logger.error('Unhandled error:', {
    message: err.message,
    stack: err.stack,
    method: req.method,
    url: req.originalUrl,
    ip: req.ip,
  });

  // Sequelize validation errors
  if (err.name === 'SequelizeValidationError' || err.name === 'SequelizeUniqueConstraintError') {
    const errors = err.errors
      ? err.errors.map((e) => ({ field: e.path, message: e.message }))
      : [];
    return sendError(res, 'Validation error', 422, errors);
  }

  // JWT errors
  if (err.name === 'JsonWebTokenError') {
    return sendError(res, 'Invalid token', 401);
  }
  if (err.name === 'TokenExpiredError') {
    return sendError(res, 'Token has expired', 401);
  }

  // Multer errors
  if (err.code === 'LIMIT_FILE_SIZE') {
    return sendError(res, 'File size exceeds the allowed limit', 413);
  }

  // Joi validation errors
  if (err.isJoi) {
    const errors = err.details.map((d) => ({ field: d.path.join('.'), message: d.message }));
    return sendError(res, 'Validation error', 422, errors);
  }

  const statusCode = err.statusCode || err.status || 500;
  const message = process.env.NODE_ENV === 'production' && statusCode === 500
    ? 'An internal server error occurred'
    : err.message || 'Internal server error';

  sendError(res, message, statusCode);
});

module.exports = app;
