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
 * "Active" = not yet closed out: in-progress, on-hold, or pending
 * (service_pos.status has no literal 'active' value — see ServicePO model).
 * @returns {Promise<number>}
 */
async function getActivePOs() {
  const [result] = await sequelize.query(
    "SELECT COUNT(*) AS total FROM service_pos WHERE status IN ('in-progress', 'on-hold', 'pending')",
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
 * Billable vs non-billable hours logged in the given calendar month,
 * classified by the Service PO's is_billable flag.
 *
 * @param {number} month - 1-12
 * @param {number} year
 * @returns {Promise<{ billable_hours: number, non_billable_hours: number }>}
 */
async function getCurrentMonthBillableSplit(month, year) {
  const [result] = await sequelize.query(
    `SELECT
       COALESCE(SUM(CASE WHEN sp.is_billable = true  THEN t.hours_logged END), 0) AS billable_hours,
       COALESCE(SUM(CASE WHEN sp.is_billable = false THEN t.hours_logged END), 0) AS non_billable_hours
     FROM timesheets t
     INNER JOIN service_pos sp ON sp.id = t.service_po_id
     WHERE EXTRACT(MONTH FROM t.timesheet_date) = :month
       AND EXTRACT(YEAR  FROM t.timesheet_date) = :year`,
    {
      replacements: { month, year },
      type: QueryTypes.SELECT,
    }
  );
  return {
    billable_hours: parseFloat(result.billable_hours) || 0,
    non_billable_hours: parseFloat(result.non_billable_hours) || 0,
  };
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
     WHERE sp.status IN ('in-progress', 'on-hold', 'pending')
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
     WHERE status IN ('in-progress', 'on-hold', 'pending', 'completed', 'closed')
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

/**
 * Per-employee billable/non-billable hour breakdown for a given month/year,
 * plus the per-Service-PO detail rows that explain WHY each employee's hours
 * landed in each bucket (each PO's is_billable flag + hours contributed).
 * Paginated at the employee level.
 *
 * @param {object} filters
 * @param {number} filters.month
 * @param {number} filters.year
 * @param {string} [filters.search]   - matches employee full_name or employee_code
 * @param {number} filters.limit
 * @param {number} filters.offset
 * @returns {Promise<{ rows: object[], count: number }>}
 */
async function getEmployeeBillableBreakdown(filters) {
  const { month, year, search, limit, offset } = filters;

  const replacements = { month: parseInt(month, 10), year: parseInt(year, 10), limit, offset };
  const searchCondition = search ? 'AND (e.full_name ILIKE :search OR e.employee_code ILIKE :search)' : '';
  if (search) replacements.search = `%${search}%`;

  const countQuery = `
    SELECT COUNT(DISTINCT e.id) AS total
    FROM timesheets t
    INNER JOIN employees e ON e.id = t.employee_id
    WHERE EXTRACT(MONTH FROM t.timesheet_date) = :month
      AND EXTRACT(YEAR  FROM t.timesheet_date) = :year
      AND e.is_deleted = false
      AND e.status = 'active'
      ${searchCondition}
  `;

  const dataQuery = `
    WITH emp_page AS (
      SELECT DISTINCT e.id AS employee_id, e.full_name
      FROM timesheets t
      INNER JOIN employees e ON e.id = t.employee_id
      WHERE EXTRACT(MONTH FROM t.timesheet_date) = :month
        AND EXTRACT(YEAR  FROM t.timesheet_date) = :year
        AND e.is_deleted = false
        AND e.status = 'active'
        ${searchCondition}
      ORDER BY e.full_name
      LIMIT :limit OFFSET :offset
    )
    SELECT
      e.id                AS employee_id,
      e.employee_code,
      e.full_name,
      e.designation,
      sp.id               AS service_po_id,
      sp.service_po_code,
      sp.service_po_name,
      sp.is_billable,
      st.service_type_name,
      ROUND(SUM(t.hours_logged)::NUMERIC, 2) AS hours
    FROM timesheets t
    INNER JOIN employees e      ON e.id  = t.employee_id
    INNER JOIN emp_page ep      ON ep.employee_id = e.id
    INNER JOIN service_pos sp   ON sp.id = t.service_po_id
    INNER JOIN service_types st ON st.id = sp.service_type_id
    WHERE EXTRACT(MONTH FROM t.timesheet_date) = :month
      AND EXTRACT(YEAR  FROM t.timesheet_date) = :year
    GROUP BY e.id, e.employee_code, e.full_name, e.designation,
             sp.id, sp.service_po_code, sp.service_po_name, sp.is_billable, st.service_type_name
    ORDER BY e.full_name, hours DESC
  `;

  const [rows, countResult] = await Promise.all([
    sequelize.query(dataQuery, { replacements, type: QueryTypes.SELECT }),
    sequelize.query(countQuery, { replacements, type: QueryTypes.SELECT }),
  ]);

  return { rows, count: parseInt(countResult[0].total, 10) };
}

/**
 * Per-Service-PO billable/non-billable classification for a given month/year,
 * with the service type/category context that explains the classification,
 * and the hours actually logged against that PO in the period.
 *
 * @param {object} filters
 * @param {number} filters.month
 * @param {number} filters.year
 * @param {string} [filters.search]      - matches PO name, PO code, or client name
 * @param {boolean} [filters.isBillable]
 * @param {number} filters.limit
 * @param {number} filters.offset
 * @returns {Promise<{ rows: object[], count: number }>}
 */
async function getPOBillableBreakdown(filters) {
  const { month, year, search, isBillable, limit, offset } = filters;

  const replacements = { month: parseInt(month, 10), year: parseInt(year, 10), limit, offset };
  const conditions = ["sp.is_deleted = false"];

  if (search) {
    conditions.push('(sp.service_po_name ILIKE :search OR sp.service_po_code ILIKE :search OR c.client_name ILIKE :search)');
    replacements.search = `%${search}%`;
  }
  if (isBillable !== undefined) {
    conditions.push('sp.is_billable = :isBillable');
    replacements.isBillable = isBillable;
  }
  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM service_pos sp
    INNER JOIN clients c        ON c.id  = sp.client_id
    INNER JOIN service_types st ON st.id = sp.service_type_id
    ${whereClause}
  `;

  const dataQuery = `
    SELECT
      sp.id                AS service_po_id,
      sp.service_po_code,
      sp.service_po_name,
      sp.is_billable,
      sp.status,
      c.id                 AS client_id,
      c.client_name,
      st.service_type_name,
      sc.name              AS category_name,
      COALESCE(ROUND(SUM(t.hours_logged)::NUMERIC, 2), 0) AS hours_logged
    FROM service_pos sp
    INNER JOIN clients c         ON c.id  = sp.client_id
    INNER JOIN service_types st  ON st.id = sp.service_type_id
    LEFT JOIN service_categories sc ON sc.id = st.service_category_id
    LEFT JOIN timesheets t
      ON  t.service_po_id = sp.id
      AND EXTRACT(MONTH FROM t.timesheet_date) = :month
      AND EXTRACT(YEAR  FROM t.timesheet_date) = :year
    ${whereClause}
    GROUP BY sp.id, sp.service_po_code, sp.service_po_name, sp.is_billable, sp.status,
             c.id, c.client_name, st.service_type_name, sc.name
    ORDER BY sp.service_po_name ASC
    LIMIT :limit OFFSET :offset
  `;

  const [rows, countResult] = await Promise.all([
    sequelize.query(dataQuery, { replacements, type: QueryTypes.SELECT }),
    sequelize.query(countQuery, { replacements, type: QueryTypes.SELECT }),
  ]);

  return { rows, count: parseInt(countResult[0].total, 10) };
}

/**
 * Top 3 employees by hours logged, per Service PO, for a given month/year.
 * Paginated at the Service-PO level.
 *
 * @param {object} filters
 * @param {number} filters.month
 * @param {number} filters.year
 * @param {string} [filters.search]      - matches PO name, PO code, or client name
 * @param {boolean} [filters.isBillable]
 * @param {number} filters.limit
 * @param {number} filters.offset
 * @returns {Promise<{ rows: object[], count: number }>}
 */
async function getTopEmployeesByPO(filters) {
  const { month, year, search, isBillable, limit, offset } = filters;

  const replacements = { month: parseInt(month, 10), year: parseInt(year, 10), limit, offset };
  const conditions = [
    'EXTRACT(MONTH FROM t.timesheet_date) = :month',
    'EXTRACT(YEAR  FROM t.timesheet_date) = :year',
  ];

  if (search) {
    conditions.push('(sp.service_po_name ILIKE :search OR sp.service_po_code ILIKE :search OR c.client_name ILIKE :search)');
    replacements.search = `%${search}%`;
  }
  if (isBillable !== undefined) {
    conditions.push('sp.is_billable = :isBillable');
    replacements.isBillable = isBillable;
  }
  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM (
      SELECT sp.id
      FROM timesheets t
      INNER JOIN service_pos sp ON sp.id = t.service_po_id
      INNER JOIN clients c      ON c.id  = sp.client_id
      ${whereClause}
      GROUP BY sp.id
      HAVING COALESCE(SUM(t.hours_logged), 0) > 0
    ) sub
  `;

  const dataQuery = `
    WITH po_page AS (
      SELECT sp.id AS service_po_id
      FROM timesheets t
      INNER JOIN service_pos sp ON sp.id = t.service_po_id
      INNER JOIN clients c      ON c.id  = sp.client_id
      ${whereClause}
      GROUP BY sp.id
      HAVING COALESCE(SUM(t.hours_logged), 0) > 0
      ORDER BY sp.id
      LIMIT :limit OFFSET :offset
    ),
    ranked AS (
      SELECT
        sp.id                AS service_po_id,
        sp.service_po_code,
        sp.service_po_name,
        sp.is_billable,
        c.client_name,
        e.id                 AS employee_id,
        e.employee_code,
        e.full_name,
        ROUND(SUM(t.hours_logged)::NUMERIC, 2) AS hours,
        ROW_NUMBER() OVER (
          PARTITION BY sp.id ORDER BY SUM(t.hours_logged) DESC
        ) AS rn
      FROM timesheets t
      INNER JOIN po_page pp     ON pp.service_po_id = t.service_po_id
      INNER JOIN service_pos sp ON sp.id = t.service_po_id
      INNER JOIN clients c      ON c.id  = sp.client_id
      INNER JOIN employees e    ON e.id  = t.employee_id
      WHERE EXTRACT(MONTH FROM t.timesheet_date) = :month
        AND EXTRACT(YEAR  FROM t.timesheet_date) = :year
      GROUP BY sp.id, sp.service_po_code, sp.service_po_name, sp.is_billable, c.client_name,
               e.id, e.employee_code, e.full_name
      HAVING COALESCE(SUM(t.hours_logged), 0) > 0
    )
    SELECT * FROM ranked
    WHERE rn <= 3
    ORDER BY service_po_name ASC, rn ASC
  `;

  const [rows, countResult] = await Promise.all([
    sequelize.query(dataQuery, { replacements, type: QueryTypes.SELECT }),
    sequelize.query(countQuery, { replacements, type: QueryTypes.SELECT }),
  ]);

  return { rows, count: parseInt(countResult[0].total, 10) };
}

/**
 * Billable vs non-billable hours per Service PO, per calendar month, across a
 * date window. Used to build the billable/non-billable trend chart and to
 * diff consecutive months to explain WHY the totals moved (which POs/service
 * types gained or lost hours).
 *
 * @param {object} filters
 * @param {string} filters.windowStart - YYYY-MM-DD, first day of the earliest month
 * @param {string} filters.windowEnd   - YYYY-MM-DD, last day of the latest month
 * @returns {Promise<object[]>} rows: { year, month, service_po_id, service_po_name, is_billable, service_type_name, hours }
 */
async function getBillableTrendDetail(filters) {
  const { windowStart, windowEnd } = filters;

  return sequelize.query(
    `SELECT
       EXTRACT(YEAR  FROM t.timesheet_date)::int AS year,
       EXTRACT(MONTH FROM t.timesheet_date)::int AS month,
       sp.id                as service_po_id,
       sp.service_po_name,
       sp.is_billable,
       st.service_type_name,
       ROUND(SUM(t.hours_logged)::NUMERIC, 2) AS hours
     FROM timesheets t
     INNER JOIN service_pos sp   ON sp.id = t.service_po_id
     INNER JOIN service_types st ON st.id = sp.service_type_id
     WHERE t.timesheet_date >= :windowStart
       AND t.timesheet_date <= :windowEnd
     GROUP BY year, month, sp.id, sp.service_po_name, sp.is_billable, st.service_type_name
     ORDER BY year, month`,
    {
      replacements: { windowStart, windowEnd },
      type: QueryTypes.SELECT,
    }
  );
}

module.exports = {
  getTotalEmployees,
  getActiveEmployees,
  getTotalClients,
  getActivePOs,
  getClosedPOs,
  getCurrentMonthHours,
  getCurrentMonthBillableSplit,
  getEmployeeBillableBreakdown,
  getPOBillableBreakdown,
  getTopEmployeesByPO,
  getBillableTrendDetail,
  getOverallUtilisation,
  getTotalRevenue,
  getRecentTimesheetActivity,
  getTopPOsByHours,
  getMonthlyHoursTrend,
};
