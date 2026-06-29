'use strict';

const { sequelize } = require('../models');
const { QueryTypes } = require('sequelize');

/**
 * Report Repository
 * All queries use raw SQL via sequelize.query for complex aggregations
 * and JOINs that are cumbersome to express cleanly through the ORM.
 */

const formatMonthYear = (month, year) => (
  `${parseInt(year, 10)}-${String(parseInt(month, 10)).padStart(2, '0')}`
);

const MONTH_YEAR_SQL = {
  year: "split_part(mc.month_year, '-', 1)::int",
  month: "split_part(mc.month_year, '-', 2)::int",
  monthName: "TO_CHAR(TO_DATE(split_part(mc.month_year, '-', 2), 'MM'), 'Month')",
};

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

  const replacements = {
    monthYear: formatMonthYear(month, year),
    limit,
    offset,
    stdHours: STANDARD_HOURS,
  };
  const conditions = ["e.status = 'active'"];

  if (employeeId) {
    conditions.push('e.id = :employeeId');
    replacements.employeeId = employeeId;
  }
  if (search) {
    conditions.push('(e.full_name ILIKE :search OR e.employee_code ILIKE :search)');
    replacements.search = `%${search}%`;
  }

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const dataQuery = `
    SELECT
      e.id                                          AS employee_id,
      e.employee_code,
      e.full_name,
      e.designation,
      e.total_experience,
      e.company_experience,
      :monthYear                                    AS month_year,
      mc.salary_cost,
      mc.ops_cost,
      mc.total_cost,
      mc.billable_cost,
      CASE
        WHEN mc.total_cost IS NOT NULL AND mc.total_cost > 0
          THEN ROUND((mc.total_cost / :stdHours)::numeric, 2)
        ELSE 0
      END                                           AS per_hour_rate
    FROM employees e
    LEFT JOIN monthly_costs mc
           ON mc.employee_id = e.id
          AND mc.month_year  = :monthYear
    ${whereClause}
    ORDER BY ${safeSort} ${safeOrder}
    LIMIT :limit OFFSET :offset
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM employees e
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

  const allowedSortColumns = ['year', 'month', 'month_year', 'total_salary_cost', 'total_ops_cost', 'total_cost', 'employee_count'];
  const sortColumnMap = {
    year: 'year',
    month: 'month',
    month_year: 'mc.month_year',
  };
  const safeSort = allowedSortColumns.includes(sortBy)
    ? (sortColumnMap[sortBy] || sortBy)
    : 'year';
  const safeOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const replacements = { limit, offset };
  const conditions = [];

  if (year) {
    conditions.push('mc.month_year LIKE :yearPattern');
    replacements.year = year;
    replacements.yearPattern = `${parseInt(year, 10)}-%`;
  }
  if (month) {
    if (year) {
      conditions.push('mc.month_year = :monthYear');
      replacements.monthYear = formatMonthYear(month, year);
    } else {
      conditions.push('mc.month_year LIKE :monthPattern');
      replacements.monthPattern = `%-${String(parseInt(month, 10)).padStart(2, '0')}`;
    }
    replacements.month = month;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT
      ${MONTH_YEAR_SQL.year}                          AS year,
      ${MONTH_YEAR_SQL.month}                         AS month,
      ${MONTH_YEAR_SQL.monthName}                     AS month_name,
      COUNT(DISTINCT mc.employee_id)                   AS employee_count,
      ROUND(SUM(mc.salary_cost)::numeric, 2)           AS total_salary_cost,
      ROUND(SUM(mc.ops_cost)::numeric, 2)              AS total_ops_cost,
      ROUND(SUM(mc.total_cost)::numeric, 2)            AS total_cost,
      ROUND(SUM(mc.billable_cost)::numeric, 2)         AS total_billable_cost
    FROM monthly_costs mc
    ${whereClause}
    GROUP BY mc.month_year
    ORDER BY ${safeSort} ${safeOrder}
    LIMIT :limit OFFSET :offset
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM (
      SELECT mc.month_year
      FROM monthly_costs mc
      ${whereClause}
      GROUP BY mc.month_year
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
 * Get resource allocation — employee-PO pairs derived from actual timesheet entries.
 * Derives allocations from timesheets (distinct employee+PO combinations) so that
 * data appears even when service_po_resources has not been separately populated.
 * month/year filter the timesheet date range; omitting them returns all-time totals.
 *
 * @param {object} filters
 * @param {number} [filters.employeeId]
 * @param {number} [filters.poId]
 * @param {number} [filters.month]        - Filter timesheet entries to this month
 * @param {number} [filters.year]         - Filter timesheet entries to this year
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
    month,
    year,
    status,
    search,
    sortBy = 'e.full_name',
    sortOrder = 'ASC',
    limit,
    offset,
  } = filters;

  const allowedSortColumns = [
    'e.full_name', 'e.employee_code', 'e.designation',
    'sp.service_po_name', 'sp.start_date', 'sp.end_date',
    'c.client_name', 'total_hours_logged',
  ];
  const safeSort = allowedSortColumns.includes(sortBy) ? sortBy : 'e.full_name';
  const safeOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const replacements = { limit, offset };
  const conditions = ["e.status = 'active'"];

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

  // Date filter applied to timesheet join (does not exclude the employee-PO pair,
  // only scopes the hours aggregation to the selected period)
  const tsDateConditions = [];
  if (month) {
    tsDateConditions.push('EXTRACT(MONTH FROM t.timesheet_date) = :month');
    replacements.month = parseInt(month, 10);
  }
  if (year) {
    tsDateConditions.push('EXTRACT(YEAR FROM t.timesheet_date) = :year');
    replacements.year = parseInt(year, 10);
  }
  const tsDateFilter = tsDateConditions.length ? `AND ${tsDateConditions.join(' AND ')}` : '';

  const whereClause = `WHERE ${conditions.join(' AND ')}`;

  const dataQuery = `
    SELECT
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
      COALESCE(SUM(CASE WHEN t.id IS NOT NULL ${tsDateFilter} THEN t.hours_logged ELSE 0 END), 0) AS total_hours_logged
    FROM timesheets t
    INNER JOIN employees e    ON e.id  = t.employee_id
    INNER JOIN service_pos sp ON sp.id = t.service_po_id
    INNER JOIN clients c      ON c.id  = sp.client_id
    INNER JOIN service_types st ON st.id = sp.service_type_id
    ${whereClause}
    GROUP BY e.id, e.employee_code, e.full_name,
             e.designation, e.total_experience, e.company_experience, e.status,
             sp.id, sp.service_po_code, sp.service_po_name, sp.status, sp.is_billable,
             sp.start_date, sp.end_date, c.id, c.client_name, st.service_type_name
    ORDER BY ${safeSort} ${safeOrder}
    LIMIT :limit OFFSET :offset
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM (
      SELECT t.employee_id, t.service_po_id
      FROM timesheets t
      INNER JOIN employees e    ON e.id  = t.employee_id
      INNER JOIN service_pos sp ON sp.id = t.service_po_id
      INNER JOIN clients c      ON c.id  = sp.client_id
      INNER JOIN service_types st ON st.id = sp.service_type_id
      ${whereClause}
      GROUP BY t.employee_id, t.service_po_id
    ) sub
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
    sortBy = 'mc.month_year',
    sortOrder = 'DESC',
    limit,
    offset,
  } = filters;

  const allowedSortColumns = [
    'mc.month_year', 'year', 'month', 'e.full_name', 'e.employee_code',
    'mc.salary_cost', 'mc.ops_cost', 'mc.total_cost', 'mc.billable_cost',
  ];
  const sortColumnMap = {
    year: 'year',
    month: 'month',
    'mc.year': 'year',
    'mc.month': 'month',
  };
  const safeSort = allowedSortColumns.includes(sortBy)
    ? (sortColumnMap[sortBy] || sortBy)
    : 'mc.month_year';
  const safeOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const replacements = { limit, offset };
  const conditions = [];

  if (year) {
    conditions.push('mc.month_year LIKE :yearPattern');
    replacements.year = year;
    replacements.yearPattern = `${parseInt(year, 10)}-%`;
  }
  if (month) {
    if (year) {
      conditions.push('mc.month_year = :monthYear');
      replacements.monthYear = formatMonthYear(month, year);
    } else {
      conditions.push('mc.month_year LIKE :monthPattern');
      replacements.monthPattern = `%-${String(parseInt(month, 10)).padStart(2, '0')}`;
    }
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
      ${MONTH_YEAR_SQL.year}              AS year,
      ${MONTH_YEAR_SQL.month}             AS month,
      ${MONTH_YEAR_SQL.monthName}         AS month_name,
      e.id                                   AS employee_id,
      e.employee_code,
      e.full_name,
      e.designation,
      mc.salary_cost,
      mc.ops_cost,
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
    ORDER BY ${safeSort} ${safeOrder}, mc.month_year ${safeOrder}
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

/**
 * Employee Utilization Summary Report
 *
 * One row per active employee for the given month/year.
 * Non-billable hours are pivoted into five category columns derived from
 * service_types.service_type_name (case-insensitive keyword matching with
 * priority ordering so no hours are double-counted):
 *   leaves → team_management → lnd → internal_support → others
 *
 * @param {object} filters
 * @param {number} filters.month
 * @param {number} filters.year
 * @param {number} [filters.employeeId]
 * @param {string} [filters.search]
 * @param {string} [filters.sortBy]
 * @param {string} [filters.sortOrder]
 * @param {number} filters.limit
 * @param {number} filters.offset
 * @returns {{ rows: object[], count: number }}
 */
async function getEmployeeUtilizationSummary(filters) {
  const {
    month,
    year,
    employeeId,
    search,
    sortBy = 'full_name',
    sortOrder = 'ASC',
    limit,
    offset,
  } = filters;

  const MONTHLY_CAPACITY = 176;

  const allowedSortColumns = [
    'full_name', 'designation', 'total_experience', 'company_experience',
    'billable_total', 'non_billable_total', 'total_utilization_excl_leaves_pct',
    'leaves_hours', 'lnd_hours', 'internal_support_hours', 'team_management_hours',
    'others_hours',
  ];
  const safeSort = allowedSortColumns.includes(sortBy) ? sortBy : 'full_name';
  const safeOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const replacements = {
    month: parseInt(month, 10),
    year: parseInt(year, 10),
    limit,
    offset,
    monthlyCapacity: MONTHLY_CAPACITY,
  };

  const empConditions = ["e.status = 'active'"];
  if (employeeId) {
    empConditions.push('e.id = :employeeId');
    replacements.employeeId = employeeId;
  }
  if (search) {
    empConditions.push('(e.full_name ILIKE :search OR e.employee_code ILIKE :search)');
    replacements.search = `%${search}%`;
  }
  const empWhere = `WHERE ${empConditions.join(' AND ')}`;

  const dataQuery = `
    WITH categorized AS (
      SELECT
        e.id              AS employee_id,
        e.full_name,
        e.designation,
        e.total_experience,
        e.company_experience,
        t.hours_logged,
        sp.is_billable,
        c.client_name,
        CASE
          WHEN t.id IS NULL                                              THEN NULL
          WHEN sp.is_billable = true                                     THEN 'billable'
          WHEN st.service_type_name ILIKE '%leave%'
            OR st.service_type_name ILIKE '%vacation%'
            OR st.service_type_name ILIKE '%holiday%'                  THEN 'leaves'
          WHEN st.service_type_name ILIKE '%team management%'
            OR st.service_type_name ILIKE '%management%'               THEN 'team_management'
          WHEN st.service_type_name ILIKE '%l&d%'
            OR st.service_type_name ILIKE '%learning%'
            OR st.service_type_name ILIKE '%training%'
            OR st.service_type_name ILIKE '%development%'              THEN 'lnd'
          WHEN st.service_type_name ILIKE '%internal support%'
            OR st.service_type_name ILIKE '%internal%'
            OR st.service_type_name ILIKE '%hr%'
            OR st.service_type_name ILIKE '%marketing%'
            OR st.service_type_name ILIKE '%finance%'
            OR st.service_type_name ILIKE '%admin%'                    THEN 'internal_support'
          ELSE 'others'
        END AS nb_category
      FROM employees e
      LEFT JOIN timesheets t
            ON  t.employee_id = e.id
           AND  EXTRACT(MONTH FROM t.timesheet_date) = :month
           AND  EXTRACT(YEAR  FROM t.timesheet_date) = :year
      LEFT JOIN service_pos sp   ON sp.id = t.service_po_id
      LEFT JOIN service_types st ON st.id = sp.service_type_id
      LEFT JOIN clients c        ON c.id  = sp.client_id
      ${empWhere}
    )
    SELECT
      employee_id,
      full_name,
      designation,
      total_experience,
      company_experience,
      :monthlyCapacity                                                                   AS monthly_capacity,
      :monthlyCapacity                                                                   AS monthly_billing_capacity,
      NULLIF(STRING_AGG(DISTINCT CASE WHEN is_billable = true AND client_name IS NOT NULL
                                      THEN client_name END, ', '), '')                  AS clients,
      COALESCE(SUM(CASE WHEN nb_category = 'internal_support' THEN hours_logged END), 0) AS internal_support_hours,
      COALESCE(SUM(CASE WHEN nb_category = 'team_management'  THEN hours_logged END), 0) AS team_management_hours,
      COALESCE(SUM(CASE WHEN nb_category = 'leaves'           THEN hours_logged END), 0) AS leaves_hours,
      COALESCE(SUM(CASE WHEN nb_category = 'lnd'              THEN hours_logged END), 0) AS lnd_hours,
      COALESCE(SUM(CASE WHEN nb_category = 'others'           THEN hours_logged END), 0) AS others_hours,
      COALESCE(SUM(CASE WHEN is_billable = true               THEN hours_logged END), 0) AS billable_total,
      COALESCE(SUM(CASE WHEN is_billable = false              THEN hours_logged END), 0) AS non_billable_total,
      COALESCE(SUM(CASE WHEN is_billable = true               THEN hours_logged END), 0)
        + COALESCE(SUM(CASE WHEN is_billable = false          THEN hours_logged END), 0)
        - COALESCE(SUM(CASE WHEN nb_category = 'leaves'       THEN hours_logged END), 0) AS total_utilization_excl_leaves_pct
    FROM categorized
    GROUP BY employee_id, full_name, designation, total_experience, company_experience
    ORDER BY ${safeSort} ${safeOrder}
    LIMIT :limit OFFSET :offset
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM employees e
    ${empWhere}
  `;

  const [rows, countResult] = await Promise.all([
    sequelize.query(dataQuery, { replacements, type: QueryTypes.SELECT }),
    sequelize.query(countQuery, { replacements, type: QueryTypes.SELECT }),
  ]);

  return { rows, count: parseInt(countResult[0].total, 10) };
}

/**
 * Service PO Summary Report
 *
 * One row per Service PO showing client info, PO details, hours delivered
 * before the selected month, available hours, and monthly billable amount
 * (hours logged this month × employee hourly rate) for billable POs.
 *
 * @param {object} filters
 * @param {number} filters.month           - required
 * @param {number} filters.year            - required
 * @param {string} [filters.status]        - PO status filter (active|closed|all)
 * @param {number} [filters.clientId]
 * @param {boolean} [filters.isBillable]
 * @param {string} [filters.search]        - client_name or service_po_name
 * @param {string} [filters.sortBy]
 * @param {string} [filters.sortOrder]
 * @param {number} filters.limit
 * @param {number} filters.offset
 * @returns {{ rows: object[], count: number }}
 */
async function getServicePOSummary(filters) {
  const {
    month,
    year,
    status,
    clientId,
    isBillable,
    search,
    sortBy = 'c.client_name',
    sortOrder = 'ASC',
    limit,
    offset,
  } = filters;

  const STANDARD_HOURS = 176;

  const allowedSortColumns = [
    'c.client_name', 'sp.service_po_name', 'sp.start_date', 'sp.end_date',
    'sp.po_value', 'sp.expected_man_hours', 'hours_delivered_before_month',
    'available_hours', 'monthly_billable_amount', 'sp.status',
  ];
  const safeSort = allowedSortColumns.includes(sortBy) ? sortBy : 'c.client_name';
  const safeOrder = sortOrder.toUpperCase() === 'DESC' ? 'DESC' : 'ASC';

  const monthNum  = parseInt(month, 10);
  const yearNum   = parseInt(year, 10);
  const monthYear = formatMonthYear(month, year);

  const replacements = { monthNum, yearNum, monthYear, stdHours: STANDARD_HOURS, limit, offset };
  const conditions = [];

  if (status && status !== 'all') {
    conditions.push('sp.status = :status');
    replacements.status = status;
  }
  if (clientId) {
    conditions.push('sp.client_id = :clientId');
    replacements.clientId = clientId;
  }
  if (isBillable !== undefined) {
    conditions.push('sp.is_billable = :isBillable');
    replacements.isBillable = isBillable;
  }
  if (search) {
    conditions.push('(c.client_name ILIKE :search OR sp.service_po_name ILIKE :search OR sp.service_po_code ILIKE :search)');
    replacements.search = `%${search}%`;
  }

  const whereClause = conditions.length ? `WHERE ${conditions.join(' AND ')}` : '';

  const dataQuery = `
    SELECT
      sp.id                                                              AS service_po_id,
      sp.service_po_code,
      sp.service_po_name,
      sp.service_description,
      sp.start_date,
      sp.end_date,
      sp.status,
      sp.is_billable,
      sp.invoice_frequency,
      sp.po_value,
      sp.account_manager,
      sp.expected_man_hours,
      c.id                                                               AS client_id,
      c.client_name,
      st.service_type_name                                               AS service_type,
      COALESCE(prev.hours_delivered, 0)                                  AS hours_delivered_before_month,
      COALESCE(sp.expected_man_hours, 0) - COALESCE(prev.hours_delivered, 0) AS available_hours,
      CASE
        WHEN sp.is_billable = true
          THEN ROUND(COALESCE(curr.billable_amount, 0)::numeric, 2)
        ELSE NULL
      END                                                                AS monthly_billable_amount
    FROM service_pos sp
    INNER JOIN clients c        ON c.id  = sp.client_id
    INNER JOIN service_types st ON st.id = sp.service_type_id
    LEFT JOIN (
      SELECT service_po_id, SUM(hours_logged) AS hours_delivered
      FROM timesheets
      WHERE timesheet_date < MAKE_DATE(:yearNum, :monthNum, 1)
      GROUP BY service_po_id
    ) prev ON prev.service_po_id = sp.id
    LEFT JOIN (
      SELECT
        t.service_po_id,
        SUM(t.hours_logged * COALESCE(mc.total_cost, 0) / :stdHours) AS billable_amount
      FROM timesheets t
      LEFT JOIN monthly_costs mc
             ON mc.employee_id = t.employee_id
            AND mc.month_year  = :monthYear
      WHERE EXTRACT(MONTH FROM t.timesheet_date) = :monthNum
        AND EXTRACT(YEAR  FROM t.timesheet_date) = :yearNum
      GROUP BY t.service_po_id
    ) curr ON curr.service_po_id = sp.id
    ${whereClause}
    ORDER BY ${safeSort} ${safeOrder}, sp.service_po_name ASC
    LIMIT :limit OFFSET :offset
  `;

  const countQuery = `
    SELECT COUNT(*) AS total
    FROM service_pos sp
    INNER JOIN clients c        ON c.id  = sp.client_id
    INNER JOIN service_types st ON st.id = sp.service_type_id
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
  getEmployeeUtilizationSummary,
  getServicePOSummary,
};
