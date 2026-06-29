'use strict';

require('dotenv').config();

const app = require('./src/app');
const logger = require('./src/utils/logger');
const { sequelize } = require('./src/config/database');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

let server;

async function startServer() {
  try {
    // Authenticate and sync database
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');

    // In development, sync models (alter: true is safe for dev; never use force: true in prod)
    if (NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
      logger.info('Database models synchronized.');
    }

    server = app.listen(PORT, () => {
      logger.info(`RUT Portal API server running on port ${PORT} [${NODE_ENV}]`);
      logger.info(`Swagger docs available at https://633b17xt-5555.inc1.devtunnels.ms/api-docs`);
      logger.info(`Health check available at http://localhost:${PORT}/health`);
    });

    server.on('error', (err) => {
      if (err.code === 'EADDRINUSE') {
        logger.error(`Port ${PORT} is already in use. Exiting.`);
      } else {
        logger.error('Server error:', err);
      }
      process.exit(1);
    });

  } catch (err) {
    logger.error('Failed to start server:', err);
    process.exit(1);
  }
}

// Graceful shutdown handler
function gracefulShutdown(signal) {
  logger.info(`Received ${signal}. Shutting down gracefully...`);

  if (server) {
    server.close(async () => {
      logger.info('HTTP server closed.');

      try {
        await sequelize.close();
        logger.info('Database connection closed.');
      } catch (err) {
        logger.error('Error closing database connection:', err);
      }

      logger.info('Shutdown complete.');
      process.exit(0);
    });

    // Force exit if graceful shutdown takes too long
    setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT', () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason, promise) => {
  logger.error('Unhandled Rejection at:', promise, 'reason:', reason);
  gracefulShutdown('unhandledRejection');
});

startServer();
