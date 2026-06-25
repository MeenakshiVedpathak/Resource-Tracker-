'use strict';

const { Sequelize } = require('sequelize');
const logger = require('../utils/logger');

const {
  DB_HOST,
  DB_PORT,
  DB_NAME,
  DB_USER,
  DB_PASSWORD,
  NODE_ENV,
} = process.env;

const sequelize = new Sequelize(DB_NAME, DB_USER, DB_PASSWORD, {
  host: DB_HOST || 'localhost',
  port: parseInt(DB_PORT, 10) || 5432,
  dialect: 'postgres',
  logging: NODE_ENV === 'development'
    ? (sql, timing) => logger.debug(`[SQL] ${sql}${timing ? ` (${timing}ms)` : ''}`)
    : false,
  benchmark: NODE_ENV === 'development',

  pool: {
    max: 10,          // Maximum number of connections in pool
    min: 2,           // Minimum number of connections in pool
    acquire: 30000,   // Maximum time (ms) to acquire a connection before throwing error
    idle: 10000,      // Time (ms) a connection can be idle before being released
    evict: 1000,      // Time interval (ms) to run eviction checks
  },

  dialectOptions: {
    ssl: NODE_ENV === 'production'
      ? { require: true, rejectUnauthorized: false }
      : false,
    statement_timeout: 30000,       // 30s query timeout
    idle_in_transaction_session_timeout: 60000,
  },

  define: {
    underscored: true,          // Use snake_case column names
    timestamps: true,
    createdAt: 'created_at',
    updatedAt: 'updated_at',
    freezeTableName: true,      // Do not pluralize table names
  },

  timezone: '+00:00',           // Store timestamps in UTC
});

/**
 * Test the database connection.
 * Called at server startup; rejects on failure so the process exits cleanly.
 */
async function connectDatabase() {
  try {
    await sequelize.authenticate();
    logger.info(`Database connected: ${DB_NAME}@${DB_HOST}:${DB_PORT || 5432}`);
    return sequelize;
  } catch (err) {
    logger.error('Unable to connect to the database:', err);
    throw err;
  }
}

/**
 * Sync all models with the database.
 * Use { alter: true } in development only — never { force: true } in production.
 *
 * @param {object} [options={}]
 */
async function syncDatabase(options = {}) {
  try {
    await sequelize.sync(options);
    logger.info('Database models synchronized successfully.');
  } catch (err) {
    logger.error('Database sync failed:', err);
    throw err;
  }
}

module.exports = {
  sequelize,
  Sequelize,
  connectDatabase,
  syncDatabase,
};
