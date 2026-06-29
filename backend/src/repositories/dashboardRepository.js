'use strict';

const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

/**
 * Dashboard Repository
 * Individual focused queries — each returns a single scalar or a small result set.
 * Designed to be called in parallel by the service layer (Promise.all).
 */

/**
 * Total employees ever registered (regardless of status).
 * @returns {Promise<number>}
 */
async function getTotalEmployees() {
  const [result] = await sequelize.query(
    'SELECT COUNT(*) AS total FROM employees',
    { type: QueryTypes.SELECT }
  );
  return parseInt(result.total, 10);
}

/**
 * Active employees count.
 * @returns {Promise<number>}
 */
async function getActiveEmployees() {
  const [result] = await sequelize.query(
    "SELECT COUNT(*) AS total FROM employees WHERE status = 'active'",
    { type: QueryTypes.SELECT }
  );
  return parseInt(result.total, 10);
}

/**
 * Total clients (all statuses).
 * @returns {Promise<number>}
 */
async function getTotalClients() {
  const [result] = await sequelize.query(
    'SELECT COUNT(*) AS total FROM clients',
    { type: QueryTypes.SELECT }
  );
  return parseInt(result.total, 10);
}

/**
 * Active Service POs count.
 * @returns {Promise<number>}
 */
async function getActivePOs() {
  const [result] = await sequelize.query(
    "SELECT COUNT(*) AS total FROM service_pos WHERE status = 'active'",
    { type: QueryTypes.SELECT }
  );
  return parseInt(result.total, 10);
}

/**
 * Closed Service POs count.
 * @returns {Promise<number>}
 */
async function getClosedPOs() {
  const [result] = await sequelize.query(
    "SELECT COUNT(*) AS total FROM service_pos WHERE status = 'closed'",
    { type: QueryTypes.SELECT }
  );
  return parseInt(result.total, 10);
}

/**
 * Total hours logged in the given calendar month.
 *
 * @param {number} month - 1-12
 * @param {number} year
 * @returns {Promise<number>}
 */
async function getCurrentMonthHours(month, year) {
  const [result] = await sequelize.query(
    `SELECT COALESCE(SUM(hours_logged), 0) AS total_hours
     FROM timesheets
     WHERE EXTRACT(MONTH FROM timesheet_date) = :month
       AND EXTRACT(YEAR  FROM timesheet_date) = :year`,
    {
      replacements: { month, year },
      type: QueryTypes.SELECT,
    }
  );
  return parseFloat(result.total_hours) || 0;
}

/**
 * Overall utilisation percentage for the given month/year:
 *   SUM(actual hours logged on active POs) / SUM(expected_man_hours of those POs) * 100
 *
 * Only POs that have expected_man_hours set are included in the denominator.
 *
 * @param {number} month
 * @param {number} year
 * @returns {Promise<number|null>} Rounded to 2 decimal places, or null if no data
 */
async function getOverallUtilisation(month, year) {
  const [result] = await sequelize.query(
    `SELECT
       COALESCE(SUM(t.hours_logged), 0)         AS actual_hours,
       COALESCE(SUM(sp.expected_man_hours), 0)  AS expected_hours
     FROM service_pos sp
     LEFT JOIN timesheets t
       ON  t.service_po_id = sp.id
       AND EXTRACT(MONTH FROM t.timesheet_date) = :month
       AND EXTRACT(YEAR  FROM t.timesheet_date) = :year
     WHERE sp.status = 'active'
       AND sp.expected_man_hours IS NOT NULL
       AND sp.expected_man_hours > 0`,
    {
      replacements: { month, year },
      type: QueryTypes.SELECT,
    }
  );

  const actual = parseFloat(result.actual_hours) || 0;
  const expected = parseFloat(result.expected_hours) || 0;

  if (expected === 0) return null;
  return Math.round((actual / expected) * 100 * 100) / 100;
}

/**
 * Total PO value (revenue) for the given year across active and closed POs.
 *
 * @param {number} year
 * @returns {Promise<number>}
 */
async function getTotalRevenue(year) {
  const [result] = await sequelize.query(
    `SELECT COALESCE(SUM(po_value), 0) AS total_revenue
     FROM service_pos
     WHERE status IN ('active', 'closed')
       AND EXTRACT(YEAR FROM start_date) = :year`,
    {
      replacements: { year },
      type: QueryTypes.SELECT,
    }
  );
  return parseFloat(result.total_revenue) || 0;
}

/**
 * Recent timesheet activity — last 5 distinct employees who logged hours.
 * Used by dashboard to show a live "activity feed".
 *
 * @returns {Promise<object[]>}
 */
async function getRecentTimesheetActivity() {
  return sequelize.query(
    `SELECT DISTINCT ON (t.employee_id)
       e.employee_code,
       e.full_name,
       e.designation,
       t.timesheet_date,
       t.hours_logged,
       sp.service_po_name
     FROM timesheets t
     INNER JOIN employees e    ON e.id  = t.employee_id
     INNER JOIN service_pos sp ON sp.id = t.service_po_id
     ORDER BY t.employee_id, t.timesheet_date DESC
     LIMIT 5`,
    { type: QueryTypes.SELECT }
  );
}

/**
 * Top 5 POs by hours logged (all time).
 * @returns {Promise<object[]>}
 */
async function getTopPOsByHours() {
  return sequelize.query(
    `SELECT
       sp.id,
       sp.service_po_code,
       sp.service_po_name,
       c.client_name,
       sp.expected_man_hours,
       COALESCE(SUM(t.hours_logged), 0) AS total_hours_logged
     FROM service_pos sp
     INNER JOIN clients c  ON c.id  = sp.client_id
     LEFT  JOIN timesheets t ON t.service_po_id = sp.id
     GROUP BY sp.id, sp.service_po_code, sp.service_po_name, c.client_name, sp.expected_man_hours
     ORDER BY total_hours_logged DESC
     LIMIT 5`,
    { type: QueryTypes.SELECT }
  );
}

/**
 * Monthly hours trend for the last 6 months (for sparkline / chart).
 * @returns {Promise<object[]>}
 */
async function getMonthlyHoursTrend() {
  return sequelize.query(
    `SELECT
       EXTRACT(YEAR  FROM timesheet_date)::int AS year,
       EXTRACT(MONTH FROM timesheet_date)::int AS month,
       TO_CHAR(timesheet_date, 'Mon YYYY')     AS label,
       ROUND(SUM(hours_logged)::numeric, 2)   AS total_hours
     FROM timesheets
     WHERE timesheet_date >= (CURRENT_DATE - INTERVAL '6 months')
     GROUP BY year, month, label
     ORDER BY year ASC, month ASC`,
    { type: QueryTypes.SELECT }
  );
}

module.exports = {
  getTotalEmployees,
  getActiveEmployees,
  getTotalClients,
  getActivePOs,
  getClosedPOs,
  getCurrentMonthHours,
  getOverallUtilisation,
  getTotalRevenue,
  getRecentTimesheetActivity,
  getTopPOsByHours,
  getMonthlyHoursTrend,
};
