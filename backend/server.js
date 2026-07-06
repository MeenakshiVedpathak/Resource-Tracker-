'use strict';

require('dotenv').config();

const app = require('./src/app');
const logger = require('./src/utils/logger');
const { sequelize } = require('./src/config/database');

const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';

// NOTE: SSL/HTTPS is terminated by IIS. Node always listens on plain HTTP.
console.log(`[startup] NODE_ENV=${NODE_ENV}  PORT=${PORT}`);

let server;

async function startServer() {
  try {
    await sequelize.authenticate();
    logger.info('Database connection established successfully.');
    console.log('[startup] Database connection OK');

    if (NODE_ENV === 'development') {
      await sequelize.sync({ alter: false });
      logger.info('Database models synchronized.');
    }

    server = app.listen(PORT, () => {
      const msg = `RUT Portal API running on port ${PORT} [${NODE_ENV}]`;
      logger.info(msg);
      console.log(`[startup] ${msg}`);
    });

    server.on('error', (err) => {
      const msg = err.code === 'EADDRINUSE'
        ? `Port ${PORT} is already in use.`
        : `Server error: ${err.message}`;
      logger.error(msg);
      console.error(`[startup] ERROR: ${msg}`);
      process.exit(1);
    });

  } catch (err) {
    logger.error('Failed to start server:', err);
    console.error('[startup] FATAL:', err.message);
    process.exit(1);
  }
}

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

    setTimeout(() => {
      logger.error('Graceful shutdown timed out. Forcing exit.');
      process.exit(1);
    }, 10000);
  } else {
    process.exit(0);
  }
}

process.on('SIGTERM', () => gracefulShutdown('SIGTERM'));
process.on('SIGINT',  () => gracefulShutdown('SIGINT'));

process.on('uncaughtException', (err) => {
  logger.error('Uncaught Exception:', err);
  console.error('[runtime] Uncaught Exception:', err.message);
  gracefulShutdown('uncaughtException');
});

process.on('unhandledRejection', (reason) => {
  logger.error('Unhandled Rejection:', reason);
  console.error('[runtime] Unhandled Rejection:', reason);
  gracefulShutdown('unhandledRejection');
});

startServer();
