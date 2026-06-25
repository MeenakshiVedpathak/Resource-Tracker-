'use strict';

const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

/**
 * Report Repository
 * All queries use raw SQL via sequelize.query for complex aggregations
 * and JOINs that are cumbersome to express cleanly through the ORM.
 */

/**
 * Get employee hourly rate by joining employees with monthly_costs.
 * per_hour_rate = total_cost / (standard working hours in the month)
 * We use 160 hrs/month (20 working days × 8 hrs) as the standard divisor.
 *
 * @param {object} filters
 * @param {number} filters.month
 * @param {number} filters.year
 * @param {number} [filters.employeeId]
 * @param {string} [filters.search]       - Searches employee name / code
 * @param {string} [filters.sortBy]
 * @param {string} [filters.sortOrder]
 * @param {number} filters.limit
 * @param {number} filters.offset
 * @returns {{ rows: object[], count: number }}
 */
async function getEmployeeHourlyRate(filters) {
  const {
    month,
    year,
    employeeId,
    search,
    sortBy = 'e.full_name',
    sortOrder = 'ASC',
    limit,
    offset,
  } = filters;

  const STANDARD_HOURS = 160;
  const allowedSortColumns = [
    'e.full_name', 'e.employee_code', 'e.designation',
    'mc.salary_cost', 'mc.total_cost', 'per_hour_rate',
  ];
  const safeSort = allowedSortColumns.includes(sortBy) ? sortBy : 'e.full_name';
  const safeOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const replacements = { month, year, limit, offset, stdHours: STANDARD_HOURS };
  const conditions = ['mc.month = :month', 'mc.year = :year', 'e.status = \'active\''];

  if (employeeId) {
    conditions.push('e.id = :employeeId');
    replacements.employeeId = employeeId;
  }
  if (search) {
    conditions.push('(e.full_name ILIKE :search OR e.employee_code ILIKE :search)');
    replacements.search = `%${search}%`;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT
      e.id                                          AS employee_id,
      e.employee_code,
      e.full_name,
      e.designation,
      e.total_experience,
      e.company_experience,
      mc.month,
      mc.year,
      mc.salary_cost,
      mc.ops_cost,
      mc.total_cost,
      mc.billable_cost,
      mc.ops_cost_per_employee,
      CASE
        WHEN mc.total_cost IS NOT NULL AND mc.total_cost > 0
          THEN ROUND((mc.total_cost / :stdHours)::numeric, 2)
        ELSE 0
      END                                           AS per_hour_rate
    FROM employees e
    INNER JOIN monthly_costs mc ON mc.employee_id = e.id
    ${whereClause}
    ORDER BY ${safeSort} ${safeOrder}
    LIMIT :limit OFFSET :offset
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM employees e
    INNER JOIN monthly_costs mc ON mc.employee_id = e.id
    ${whereClause}
  `;

  const [rows, countResult] = await Promise.all([
    sequelize.query(dataQuery, { replacements, type: QueryTypes.SELECT }),
    sequelize.query(countQuery, { replacements, type: QueryTypes.SELECT }),
  ]);

  return { rows, count: parseInt(countResult[0].total, 10) };
}

/**
 * Get monthly cost summary grouped by month/year.
 *
 * @param {object} filters
 * @param {number} [filters.year]
 * @param {number} [filters.month]
 * @param {number} filters.limit
 * @param {number} filters.offset
 * @param {string} [filters.sortBy]
 * @param {string} [filters.sortOrder]
 * @returns {{ rows: object[], count: number }}
 */
async function getMonthlyCostSummary(filters) {
  const {
    year,
    month,
    sortBy = 'year',
    sortOrder = 'DESC',
    limit,
    offset,
  } = filters;

  const allowedSortColumns = ['year', 'month', 'total_salary_cost', 'total_ops_cost', 'total_cost', 'employee_count'];
  const safeSort = allowedSortColumns.includes(sortBy) ? sortBy : 'year';
  const safeOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const replacements = { limit, offset };
  const conditions = [];

  if (year) {
    conditions.push('mc.year = :year');
    replacements.year = year;
  }
  if (month) {
    conditions.push('mc.month = :month');
    replacements.month = month;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT
      mc.year,
      mc.month,
      TO_CHAR(TO_DATE(mc.month::text, 'MM'), 'Month') AS month_name,
      COUNT(DISTINCT mc.employee_id)                   AS employee_count,
      ROUND(SUM(mc.salary_cost)::numeric, 2)           AS total_salary_cost,
      ROUND(SUM(mc.ops_cost)::numeric, 2)              AS total_ops_cost,
      ROUND(SUM(mc.total_cost)::numeric, 2)            AS total_cost,
      ROUND(SUM(mc.billable_cost)::numeric, 2)         AS total_billable_cost,
      ROUND(AVG(mc.ops_cost_per_employee)::numeric, 2) AS avg_ops_cost_per_employee
    FROM monthly_costs mc
    ${whereClause}
    GROUP BY mc.year, mc.month
    ORDER BY ${safeSort} ${safeOrder}
    LIMIT :limit OFFSET :offset
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM (
      SELECT mc.year, mc.month
      FROM monthly_costs mc
      ${whereClause}
      GROUP BY mc.year, mc.month
    ) sub
  `;

  const [rows, countResult] = await Promise.all([
    sequelize.query(dataQuery, { replacements, type: QueryTypes.SELECT }),
    sequelize.query(countQuery, { replacements, type: QueryTypes.SELECT }),
  ]);

  return { rows, count: parseInt(countResult[0].total, 10) };
}

/**
 * Get timesheet summary joined with employees and service POs.
 *
 * @param {object} filters
 * @param {string} [filters.startDate]    - ISO date string YYYY-MM-DD
 * @param {string} [filters.endDate]
 * @param {number} [filters.employeeId]
 * @param {number} [filters.poId]
 * @param {string} [filters.search]       - Employee name / code / PO name
 * @param {string} [filters.sortBy]
 * @param {string} [filters.sortOrder]
 * @param {number} filters.limit
 * @param {number} filters.offset
 * @returns {{ rows: object[], count: number }}
 */
async function getTimesheetSummary(filters) {
  const {
    startDate,
    endDate,
    employeeId,
    poId,
    search,
    sortBy = 't.timesheet_date',
    sortOrder = 'DESC',
    limit,
    offset,
  } = filters;

  const allowedSortColumns = [
    't.timesheet_date', 'e.full_name', 'e.employee_code',
    'sp.service_po_name', 'total_hours', 'entry_count',
  ];
  const safeSort = allowedSortColumns.includes(sortBy) ? sortBy : 't.timesheet_date';
  const safeOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const replacements = { limit, offset };
  const conditions = [];

  if (startDate) {
    conditions.push('t.timesheet_date >= :startDate');
    replacements.startDate = startDate;
  }
  if (endDate) {
    conditions.push('t.timesheet_date <= :endDate');
    replacements.endDate = endDate;
  }
  if (employeeId) {
    conditions.push('t.employee_id = :employeeId');
    replacements.employeeId = employeeId;
  }
  if (poId) {
    conditions.push('t.service_po_id = :poId');
    replacements.poId = poId;
  }
  if (search) {
    conditions.push('(e.full_name ILIKE :search OR e.employee_code ILIKE :search OR sp.service_po_name ILIKE :search OR sp.service_po_code ILIKE :search)');
    replacements.search = `%${search}%`;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT
      t.id                              AS timesheet_id,
      t.timesheet_date,
      t.hours_logged,
      e.id                              AS employee_id,
      e.employee_code,
      e.full_name,
      e.designation,
      sp.id                             AS service_po_id,
      sp.service_po_code,
      sp.service_po_name,
      sp.is_billable,
      c.client_name,
      subp.id                           AS sub_project_id,
      subp.sub_project_code,
      subp.sub_project_name,
      st.service_type_name
    FROM timesheets t
    INNER JOIN employees e  ON e.id  = t.employee_id
    INNER JOIN service_pos sp ON sp.id = t.service_po_id
    INNER JOIN clients c    ON c.id  = sp.client_id
    INNER JOIN service_types st ON st.id = sp.service_type_id
    LEFT  JOIN sub_projects subp ON subp.id = t.sub_project_id
    ${whereClause}
    ORDER BY ${safeSort} ${safeOrder}
    LIMIT :limit OFFSET :offset
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM timesheets t
    INNER JOIN employees e    ON e.id  = t.employee_id
    INNER JOIN service_pos sp ON sp.id = t.service_po_id
    INNER JOIN clients c      ON c.id  = sp.client_id
    INNER JOIN service_types st ON st.id = sp.service_type_id
    LEFT  JOIN sub_projects subp ON subp.id = t.sub_project_id
    ${whereClause}
  `;

  const [rows, countResult] = await Promise.all([
    sequelize.query(dataQuery, { replacements, type: QueryTypes.SELECT }),
    sequelize.query(countQuery, { replacements, type: QueryTypes.SELECT }),
  ]);

  return { rows, count: parseInt(countResult[0].total, 10) };
}

/**
 * Get Service PO utilisation — actual hours logged vs expected man hours.
 *
 * @param {object} filters
 * @param {string} [filters.startDate]
 * @param {string} [filters.endDate]
 * @param {number} [filters.poId]
 * @param {string} [filters.status]        - active | closed | all
 * @param {string} [filters.search]
 * @param {string} [filters.sortBy]
 * @param {string} [filters.sortOrder]
 * @param {number} filters.limit
 * @param {number} filters.offset
 * @returns {{ rows: object[], count: number }}
 */
async function getServicePOUtilisation(filters) {
  const {
    startDate,
    endDate,
    poId,
    status,
    search,
    sortBy = 'utilisation_pct',
    sortOrder = 'DESC',
    limit,
    offset,
  } = filters;

  const allowedSortColumns = [
    'sp.service_po_code', 'sp.service_po_name', 'actual_hours',
    'sp.expected_man_hours', 'utilisation_pct', 'sp.start_date', 'sp.end_date',
  ];
  const safeSort = allowedSortColumns.includes(sortBy) ? sortBy : 'utilisation_pct';
  const safeOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const replacements = { limit, offset };
  const conditions = [];

  if (poId) {
    conditions.push('sp.id = :poId');
    replacements.poId = poId;
  }
  if (status && status !== 'all') {
    conditions.push('sp.status = :status');
    replacements.status = status;
  }
  if (search) {
    conditions.push('(sp.service_po_name ILIKE :search OR sp.service_po_code ILIKE :search OR c.client_name ILIKE :search)');
    replacements.search = `%${search}%`;
  }

  // Date filters apply to timesheet entries only (using a conditional SUM)
  const tsDateFilter = [];
  if (startDate) {
    tsDateFilter.push('t.timesheet_date >= :startDate');
    replacements.startDate = startDate;
  }
  if (endDate) {
    tsDateFilter.push('t.timesheet_date <= :endDate');
    replacements.endDate = endDate;
  }
  const tsDateCondition = tsDateFilter.length
    ? `AND ${tsDateFilter.join(' AND ')}`
    : '';

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT
      sp.id                                                     AS service_po_id,
      sp.service_po_code,
      sp.service_po_name,
      sp.status,
      sp.is_billable,
      sp.start_date,
      sp.end_date,
      sp.po_value,
      sp.expected_man_hours,
      c.id                                                      AS client_id,
      c.client_name,
      st.service_type_name,
      COALESCE(SUM(CASE WHEN t.id IS NOT NULL ${tsDateCondition} THEN t.hours_logged ELSE 0 END), 0) AS actual_hours,
      CASE
        WHEN sp.expected_man_hours IS NOT NULL AND sp.expected_man_hours > 0
          THEN ROUND(
            (COALESCE(SUM(CASE WHEN t.id IS NOT NULL ${tsDateCondition} THEN t.hours_logged ELSE 0 END), 0)
             / sp.expected_man_hours * 100)::numeric, 2)
        ELSE NULL
      END                                                       AS utilisation_pct,
      COUNT(DISTINCT t.employee_id)                             AS distinct_resources
    FROM service_pos sp
    INNER JOIN clients c       ON c.id  = sp.client_id
    INNER JOIN service_types st ON st.id = sp.service_type_id
    LEFT  JOIN timesheets t    ON t.service_po_id = sp.id
    ${whereClause}
    GROUP BY sp.id, sp.service_po_code, sp.service_po_name, sp.status,
             sp.is_billable, sp.start_date, sp.end_date, sp.po_value,
             sp.expected_man_hours, c.id, c.client_name, st.service_type_name
    ORDER BY ${safeSort} ${safeOrder}
    LIMIT :limit OFFSET :offset
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM service_pos sp
    INNER JOIN clients c       ON c.id  = sp.client_id
    INNER JOIN service_types st ON st.id = sp.service_type_id
    ${whereClause}
  `;

  const [rows, countResult] = await Promise.all([
    sequelize.query(dataQuery, { replacements, type: QueryTypes.SELECT }),
    sequelize.query(countQuery, { replacements, type: QueryTypes.SELECT }),
  ]);

  return { rows, count: parseInt(countResult[0].total, 10) };
}

/**
 * Get hours logged per sub-project.
 *
 * @param {object} filters
 * @param {number} [filters.poId]
 * @param {string} [filters.startDate]
 * @param {string} [filters.endDate]
 * @param {string} [filters.status]
 * @param {string} [filters.search]
 * @param {string} [filters.sortBy]
 * @param {string} [filters.sortOrder]
 * @param {number} filters.limit
 * @param {number} filters.offset
 * @returns {{ rows: object[], count: number }}
 */
async function getSubProjectHours(filters) {
  const {
    poId,
    startDate,
    endDate,
    status,
    search,
    sortBy = 'total_hours',
    sortOrder = 'DESC',
    limit,
    offset,
  } = filters;

  const allowedSortColumns = [
    'subp.sub_project_code', 'subp.sub_project_name', 'total_hours',
    'entry_count', 'subp.start_date', 'subp.end_date', 'sp.service_po_name',
  ];
  const safeSort = allowedSortColumns.includes(sortBy) ? sortBy : 'total_hours';
  const safeOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const replacements = { limit, offset };
  const conditions = [];

  if (poId) {
    conditions.push('subp.service_po_id = :poId');
    replacements.poId = poId;
  }
  if (status && status !== 'all') {
    conditions.push('subp.status = :status');
    replacements.status = status;
  }
  if (search) {
    conditions.push('(subp.sub_project_name ILIKE :search OR subp.sub_project_code ILIKE :search OR sp.service_po_name ILIKE :search)');
    replacements.search = `%${search}%`;
  }

  const tsConditions = [];
  if (startDate) {
    tsConditions.push('t.timesheet_date >= :startDate');
    replacements.startDate = startDate;
  }
  if (endDate) {
    tsConditions.push('t.timesheet_date <= :endDate');
    replacements.endDate = endDate;
  }
  const tsWhere = tsConditions.length ? `AND ${tsConditions.join(' AND ')}` : '';

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT
      subp.id                                                  AS sub_project_id,
      subp.sub_project_code,
      subp.sub_project_name,
      subp.description,
      subp.status,
      subp.start_date,
      subp.end_date,
      sp.id                                                    AS service_po_id,
      sp.service_po_code,
      sp.service_po_name,
      c.client_name,
      COALESCE(SUM(CASE WHEN t.id IS NOT NULL ${tsWhere} THEN t.hours_logged ELSE 0 END), 0) AS total_hours,
      COUNT(CASE WHEN t.id IS NOT NULL ${tsWhere} THEN 1 END) AS entry_count,
      COUNT(DISTINCT CASE WHEN t.id IS NOT NULL ${tsWhere} THEN t.employee_id END) AS distinct_resources
    FROM sub_projects subp
    INNER JOIN service_pos sp ON sp.id = subp.service_po_id
    INNER JOIN clients c      ON c.id  = sp.client_id
    LEFT  JOIN timesheets t   ON t.sub_project_id = subp.id
    ${whereClause}
    GROUP BY subp.id, subp.sub_project_code, subp.sub_project_name,
             subp.description, subp.status, subp.start_date, subp.end_date,
             sp.id, sp.service_po_code, sp.service_po_name, c.client_name
    ORDER BY ${safeSort} ${safeOrder}
    LIMIT :limit OFFSET :offset
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM sub_projects subp
    INNER JOIN service_pos sp ON sp.id = subp.service_po_id
    INNER JOIN clients c      ON c.id  = sp.client_id
    ${whereClause}
  `;

  const [rows, countResult] = await Promise.all([
    sequelize.query(dataQuery, { replacements, type: QueryTypes.SELECT }),
    sequelize.query(countQuery, { replacements, type: QueryTypes.SELECT }),
  ]);

  return { rows, count: parseInt(countResult[0].total, 10) };
}

/**
 * Get resource allocation — which employees are assigned to which POs.
 *
 * @param {object} filters
 * @param {number} [filters.employeeId]
 * @param {number} [filters.poId]
 * @param {string} [filters.status]       - PO status filter
 * @param {string} [filters.search]
 * @param {string} [filters.sortBy]
 * @param {string} [filters.sortOrder]
 * @param {number} filters.limit
 * @param {number} filters.offset
 * @returns {{ rows: object[], count: number }}
 */
async function getResourceAllocation(filters) {
  const {
    employeeId,
    poId,
    status,
    search,
    sortBy = 'e.full_name',
    sortOrder = 'ASC',
    limit,
    offset,
  } = filters;

  const allowedSortColumns = [
    'e.full_name', 'e.employee_code', 'e.designation',
    'sp.service_po_name', 'sp.start_date', 'sp.end_date', 'c.client_name',
  ];
  const safeSort = allowedSortColumns.includes(sortBy) ? sortBy : 'e.full_name';
  const safeOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const replacements = { limit, offset };
  const conditions = [];

  if (employeeId) {
    conditions.push('e.id = :employeeId');
    replacements.employeeId = employeeId;
  }
  if (poId) {
    conditions.push('sp.id = :poId');
    replacements.poId = poId;
  }
  if (status && status !== 'all') {
    conditions.push('sp.status = :status');
    replacements.status = status;
  }
  if (search) {
    conditions.push('(e.full_name ILIKE :search OR e.employee_code ILIKE :search OR sp.service_po_name ILIKE :search OR c.client_name ILIKE :search)');
    replacements.search = `%${search}%`;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT
      spr.id                                   AS allocation_id,
      spr.created_at                           AS allocated_at,
      e.id                                     AS employee_id,
      e.employee_code,
      e.full_name,
      e.designation,
      e.total_experience,
      e.company_experience,
      e.status                                 AS employee_status,
      sp.id                                    AS service_po_id,
      sp.service_po_code,
      sp.service_po_name,
      sp.status                                AS po_status,
      sp.is_billable,
      sp.start_date                            AS po_start_date,
      sp.end_date                              AS po_end_date,
      c.id                                     AS client_id,
      c.client_name,
      st.service_type_name,
      COALESCE(SUM(t.hours_logged), 0)         AS total_hours_logged
    FROM service_po_resources spr
    INNER JOIN employees e    ON e.id  = spr.employee_id
    INNER JOIN service_pos sp ON sp.id = spr.service_po_id
    INNER JOIN clients c      ON c.id  = sp.client_id
    INNER JOIN service_types st ON st.id = sp.service_type_id
    LEFT  JOIN timesheets t   ON t.employee_id = spr.employee_id
                              AND t.service_po_id = spr.service_po_id
    ${whereClause}
    GROUP BY spr.id, spr.created_at, e.id, e.employee_code, e.full_name,
             e.designation, e.total_experience, e.company_experience, e.status,
             sp.id, sp.service_po_code, sp.service_po_name, sp.status, sp.is_billable,
             sp.start_date, sp.end_date, c.id, c.client_name, st.service_type_name
    ORDER BY ${safeSort} ${safeOrder}
    LIMIT :limit OFFSET :offset
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM service_po_resources spr
    INNER JOIN employees e    ON e.id  = spr.employee_id
    INNER JOIN service_pos sp ON sp.id = spr.service_po_id
    INNER JOIN clients c      ON c.id  = sp.client_id
    INNER JOIN service_types st ON st.id = sp.service_type_id
    ${whereClause}
  `;

  const [rows, countResult] = await Promise.all([
    sequelize.query(dataQuery, { replacements, type: QueryTypes.SELECT }),
    sequelize.query(countQuery, { replacements, type: QueryTypes.SELECT }),
  ]);

  return { rows, count: parseInt(countResult[0].total, 10) };
}

/**
 * Get operational cost breakdown per employee per month.
 *
 * @param {object} filters
 * @param {number} [filters.year]
 * @param {number} [filters.month]
 * @param {number} [filters.employeeId]
 * @param {string} [filters.search]
 * @param {string} [filters.sortBy]
 * @param {string} [filters.sortOrder]
 * @param {number} filters.limit
 * @param {number} filters.offset
 * @returns {{ rows: object[], count: number }}
 */
async function getOperationalCostBreakdown(filters) {
  const {
    year,
    month,
    employeeId,
    search,
    sortBy = 'mc.year',
    sortOrder = 'DESC',
    limit,
    offset,
  } = filters;

  const allowedSortColumns = [
    'mc.year', 'mc.month', 'e.full_name', 'e.employee_code',
    'mc.salary_cost', 'mc.ops_cost', 'mc.total_cost', 'mc.billable_cost',
  ];
  const safeSort = allowedSortColumns.includes(sortBy) ? sortBy : 'mc.year';
  const safeOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const replacements = { limit, offset };
  const conditions = [];

  if (year) {
    conditions.push('mc.year = :year');
    replacements.year = year;
  }
  if (month) {
    conditions.push('mc.month = :month');
    replacements.month = month;
  }
  if (employeeId) {
    conditions.push('e.id = :employeeId');
    replacements.employeeId = employeeId;
  }
  if (search) {
    conditions.push('(e.full_name ILIKE :search OR e.employee_code ILIKE :search)');
    replacements.search = `%${search}%`;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT
      mc.id                                  AS cost_id,
      mc.year,
      mc.month,
      TO_CHAR(TO_DATE(mc.month::text, 'MM'), 'Month') AS month_name,
      e.id                                   AS employee_id,
      e.employee_code,
      e.full_name,
      e.designation,
      mc.salary_cost,
      mc.ops_cost,
      mc.ops_cost_per_employee,
      mc.total_cost,
      mc.billable_cost,
      CASE
        WHEN mc.total_cost > 0
          THEN ROUND((mc.salary_cost / mc.total_cost * 100)::numeric, 2)
        ELSE 0
      END AS salary_pct_of_total,
      CASE
        WHEN mc.total_cost > 0
          THEN ROUND((mc.ops_cost / mc.total_cost * 100)::numeric, 2)
        ELSE 0
      END AS ops_pct_of_total,
      CASE
        WHEN mc.total_cost > 0
          THEN ROUND((mc.billable_cost / mc.total_cost * 100)::numeric, 2)
        ELSE 0
      END AS billable_pct_of_total
    FROM monthly_costs mc
    INNER JOIN employees e ON e.id = mc.employee_id
    ${whereClause}
    ORDER BY ${safeSort} ${safeOrder}, mc.month ${safeOrder}
    LIMIT :limit OFFSET :offset
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM monthly_costs mc
    INNER JOIN employees e ON e.id = mc.employee_id
    ${whereClause}
  `;

  const [rows, countResult] = await Promise.all([
    sequelize.query(dataQuery, { replacements, type: QueryTypes.SELECT }),
    sequelize.query(countQuery, { replacements, type: QueryTypes.SELECT }),
  ]);

  return { rows, count: parseInt(countResult[0].total, 10) };
}

module.exports = {
  getEmployeeHourlyRate,
  getMonthlyCostSummary,
  getTimesheetSummary,
  getServicePOUtilisation,
  getSubProjectHours,
  getResourceAllocation,
  getOperationalCostBreakdown,
};
