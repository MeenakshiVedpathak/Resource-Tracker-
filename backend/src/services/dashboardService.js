'use strict';

const dashboardRepo = require('../repositories/dashboardRepository');
const logger = require('../utils/logger');
const dateHelper = require('../helpers/dateHelper');
const { getPaginationParams, getPaginationMeta } = require('../utils/pagination');

const round2 = (n) => Math.round(parseFloat(n || 0) * 100) / 100;

/**
 * Resolve month/year from query, defaulting to the current period.
 * @param {object} query
 * @returns {{ month: number, year: number }}
 */
function resolvePeriod(query = {}) {
  return {
    month: query.month ? parseInt(query.month, 10) : dateHelper.getCurrentMonth(),
    year: query.year ? parseInt(query.year, 10) : dateHelper.getCurrentYear(),
  };
}

/**
 * Dashboard Service
 * Calls all repository methods in parallel and assembles the combined stats object.
 */

/**
 * Assemble the full dashboard stats payload.
 * All repository queries run concurrently via Promise.all to minimise latency.
 *
 * @param {object} [query]      - req.query
 * @param {number} [query.month] - Optional 1-12 month override; defaults to the current month.
 * @param {number} [query.year]  - Optional year override; defaults to the current year.
 * @returns {Promise<object>}
 */
async function getDashboardStats(query = {}) {
  const { month: currentMonth, year: currentYear } = resolvePeriod(query);

  logger.info('Dashboard: fetching all stats', { currentMonth, currentYear });

  const [
    totalEmployees,
    activeEmployees,
    totalClients,
    activePOs,
    closedPOs,
    currentMonthHours,
    billableSplit,
    overallUtilisation,
    totalRevenue,
    recentActivity,
    topPOs,
    monthlyTrend,
  ] = await Promise.all([
    dashboardRepo.getTotalEmployees(),
    dashboardRepo.getActiveEmployees(),
    dashboardRepo.getTotalClients(),
    dashboardRepo.getActivePOs(),
    dashboardRepo.getClosedPOs(),
    dashboardRepo.getCurrentMonthHours(currentMonth, currentYear),
    dashboardRepo.getCurrentMonthBillableSplit(currentMonth, currentYear),
    dashboardRepo.getOverallUtilisation(currentMonth, currentYear),
    dashboardRepo.getTotalRevenue(currentYear),
    dashboardRepo.getRecentTimesheetActivity(),
    dashboardRepo.getTopPOsByHours(),
    dashboardRepo.getMonthlyHoursTrend(),
  ]);

  const inactiveEmployees = totalEmployees - activeEmployees;

  return {
    as_of: dateHelper.nowISO(),
    period: {
      month: currentMonth,
      year: currentYear,
    },

    // ── Workforce ──────────────────────────────────────────────────────────────
    workforce: {
      total_employees: totalEmployees,
      active_employees: activeEmployees,
      inactive_employees: inactiveEmployees,
    },

    // ── Clients & POs ──────────────────────────────────────────────────────────
    portfolio: {
      total_clients: totalClients,
      active_pos: activePOs,
      closed_pos: closedPOs,
      total_pos: activePOs + closedPOs,
    },

    // ── Current month metrics ─────────────────────────────────────────────────
    current_month: {
      total_hours_logged: currentMonthHours,
      billable_hours_logged: billableSplit.billable_hours,
      non_billable_hours_logged: billableSplit.non_billable_hours,
      overall_utilisation_pct: overallUtilisation,
    },

    // ── Financial ─────────────────────────────────────────────────────────────
    financials: {
      total_po_value_current_year: totalRevenue,
    },

    // ── Trend & activity data (for charts / feeds) ────────────────────────────
    charts: {
      monthly_hours_trend: monthlyTrend,
      top_pos_by_hours: topPOs,
    },

    activity: {
      recent_timesheet_entries: recentActivity,
    },
  };
}

/**
 * Per-employee billable vs non-billable hour breakdown for a month/year,
 * with the contributing Service POs as the "reason" for the split.
 *
 * @param {object} query - { month, year, page, limit, search }
 * @returns {Promise<{ data: object[], meta: object, period: object }>}
 */
async function getEmployeeBillableBreakdown(query = {}) {
  const { month, year } = resolvePeriod(query);
  const { page, limit, offset } = getPaginationParams(query);

  logger.info('Dashboard: getEmployeeBillableBreakdown', { month, year, page, limit });

  const { rows, count } = await dashboardRepo.getEmployeeBillableBreakdown({
    month,
    year,
    search: query.search || null,
    limit,
    offset,
  });

  // Group the flat employee x PO rows into one object per employee.
  const empMap = new Map();
  for (const row of rows) {
    if (!empMap.has(row.employee_id)) {
      empMap.set(row.employee_id, {
        employee_id: row.employee_id,
        employee_code: row.employee_code,
        full_name: row.full_name,
        designation: row.designation,
        billable_hours: 0,
        non_billable_hours: 0,
        total_hours: 0,
        billable_pct: 0,
        billable_reasons: [],
        non_billable_reasons: [],
      });
    }

    const emp = empMap.get(row.employee_id);
    const hours = parseFloat(row.hours) || 0;
    const reason = {
      service_po_id: row.service_po_id,
      service_po_code: row.service_po_code,
      service_po_name: row.service_po_name,
      service_type_name: row.service_type_name,
      hours: round2(hours),
    };

    if (row.is_billable) {
      emp.billable_hours += hours;
      emp.billable_reasons.push(reason);
    } else {
      emp.non_billable_hours += hours;
      emp.non_billable_reasons.push(reason);
    }
  }

  const data = Array.from(empMap.values()).map((emp) => {
    const total = emp.billable_hours + emp.non_billable_hours;
    const billablePct = total > 0 ? round2((emp.billable_hours / total) * 100) : 0;

    const summaryParts = [];
    if (emp.billable_reasons.length) {
      summaryParts.push(
        `Billable: ${emp.billable_reasons.map((r) => `${r.service_po_name} (${r.hours}h)`).join(', ')}`
      );
    }
    if (emp.non_billable_reasons.length) {
      summaryParts.push(
        `Non-billable: ${emp.non_billable_reasons.map((r) => `${r.service_po_name} (${r.hours}h)`).join(', ')}`
      );
    }

    return {
      ...emp,
      billable_hours: round2(emp.billable_hours),
      non_billable_hours: round2(emp.non_billable_hours),
      total_hours: round2(total),
      billable_pct: billablePct,
      reason_summary: `${billablePct}% billable (${round2(emp.billable_hours)}h of ${round2(total)}h). ${summaryParts.join('. ')}.`,
    };
  });

  const meta = getPaginationMeta(count, page, limit);

  return { data, meta, period: { month, year } };
}

/**
 * Per-Service-PO billable/non-billable classification for a month/year,
 * with the service type/category context that explains the classification.
 *
 * @param {object} query - { month, year, page, limit, search, is_billable }
 * @returns {Promise<{ data: object[], meta: object, period: object }>}
 */
async function getPOBillableBreakdown(query = {}) {
  const { month, year } = resolvePeriod(query);
  const { page, limit, offset } = getPaginationParams(query);

  const isBillable = query.is_billable !== undefined
    ? query.is_billable === 'true' || query.is_billable === true
    : undefined;

  logger.info('Dashboard: getPOBillableBreakdown', { month, year, page, limit });

  const { rows, count } = await dashboardRepo.getPOBillableBreakdown({
    month,
    year,
    search: query.search || null,
    isBillable,
    limit,
    offset,
  });

  const data = rows.map((row) => {
    const category = row.category_name ? ` under category "${row.category_name}"` : '';
    const reason = row.is_billable
      ? `Billable — classified as service type "${row.service_type_name}"${category}.`
      : `Non-billable — classified as service type "${row.service_type_name}"${category}.`;

    return {
      service_po_id: row.service_po_id,
      service_po_code: row.service_po_code,
      service_po_name: row.service_po_name,
      client_name: row.client_name,
      status: row.status,
      is_billable: row.is_billable,
      service_type_name: row.service_type_name,
      category_name: row.category_name,
      hours_logged: round2(row.hours_logged),
      reason,
    };
  });

  const meta = getPaginationMeta(count, page, limit);

  return { data, meta, period: { month, year } };
}

/**
 * Top 3 employees by hours logged, per Service PO, for a month/year.
 *
 * @param {object} query - { month, year, page, limit, search, is_billable }
 * @returns {Promise<{ data: object[], meta: object, period: object }>}
 */
async function getTopEmployeesByPO(query = {}) {
  const { month, year } = resolvePeriod(query);
  const { page, limit, offset } = getPaginationParams(query);

  const isBillable = query.is_billable !== undefined
    ? query.is_billable === 'true' || query.is_billable === true
    : undefined;

  logger.info('Dashboard: getTopEmployeesByPO', { month, year, page, limit });

  const { rows, count } = await dashboardRepo.getTopEmployeesByPO({
    month,
    year,
    search: query.search || null,
    isBillable,
    limit,
    offset,
  });

  // Group the flat (PO, employee, rank) rows into one object per PO.
  const poMap = new Map();
  for (const row of rows) {
    if (!poMap.has(row.service_po_id)) {
      poMap.set(row.service_po_id, {
        service_po_id: row.service_po_id,
        service_po_code: row.service_po_code,
        service_po_name: row.service_po_name,
        client_name: row.client_name,
        is_billable: row.is_billable,
        top_employees: [],
      });
    }
    poMap.get(row.service_po_id).top_employees.push({
      employee_id: row.employee_id,
      employee_code: row.employee_code,
      full_name: row.full_name,
      hours: round2(row.hours),
    });
  }

  const data = Array.from(poMap.values());
  const meta = getPaginationMeta(count, page, limit);

  return { data, meta, period: { month, year } };
}

const MONTH_LABELS = [
  '', 'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
  'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec',
];

/**
 * Build the chronological list of { year, month } periods ending at
 * (endMonth, endYear) inclusive, going back `monthsBack` months.
 *
 * @param {number} endMonth
 * @param {number} endYear
 * @param {number} monthsBack
 * @returns {{ periods: {year:number, month:number}[], windowStart: string, windowEnd: string }}
 */
function buildMonthWindow(endMonth, endYear, monthsBack) {
  const periods = [];
  for (let i = monthsBack - 1; i >= 0; i--) {
    const d = new Date(endYear, endMonth - 1 - i, 1);
    periods.push({ year: d.getFullYear(), month: d.getMonth() + 1 });
  }

  const first = periods[0];
  const last = periods[periods.length - 1];
  const windowStart = `${first.year}-${String(first.month).padStart(2, '0')}-01`;
  const lastDay = new Date(last.year, last.month, 0); // day 0 of next month = last day of `last.month`
  const windowEnd = `${lastDay.getFullYear()}-${String(lastDay.getMonth() + 1).padStart(2, '0')}-${String(lastDay.getDate()).padStart(2, '0')}`;

  return { periods, windowStart, windowEnd };
}

/**
 * Top-N POs by absolute hour movement between two periods, for one side
 * (billable or non-billable) of the split.
 *
 * @param {Map<number, {service_po_name:string, is_billable:boolean, hours:number}>} prevPOs
 * @param {Map<number, {service_po_name:string, is_billable:boolean, hours:number}>} curPOs
 * @param {boolean} isBillableSide
 * @param {number} [topN=3]
 * @returns {object[]} [{ service_po_id, service_po_name, previous_hours, current_hours, delta }]
 */
function computeDrivers(prevPOs, curPOs, isBillableSide, topN = 3) {
  const ids = new Set();
  for (const [id, po] of prevPOs) if (po.is_billable === isBillableSide) ids.add(id);
  for (const [id, po] of curPOs) if (po.is_billable === isBillableSide) ids.add(id);

  const drivers = [];
  for (const id of ids) {
    const prev = prevPOs.get(id);
    const cur = curPOs.get(id);
    const previousHours = round2(prev ? prev.hours : 0);
    const currentHours = round2(cur ? cur.hours : 0);
    const delta = round2(currentHours - previousHours);
    if (delta === 0) continue;
    drivers.push({
      service_po_id: id,
      service_po_name: (cur || prev).service_po_name,
      previous_hours: previousHours,
      current_hours: currentHours,
      delta,
    });
  }

  drivers.sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta));
  return drivers.slice(0, topN);
}

/**
 * Format a delta as "increased/decreased/unchanged" clause for the summary sentence.
 */
function describeDelta(delta) {
  const abs = Math.abs(delta);
  if (delta === 0) return 'unchanged';
  return delta > 0 ? `increased by ${abs}h` : `decreased by ${abs}h`;
}

function formatDrivers(drivers) {
  if (!drivers.length) return '';
  return drivers
    .map((d) => `${d.service_po_name} (${d.delta > 0 ? '+' : ''}${d.delta}h)`)
    .join(', ');
}

/**
 * Billable vs non-billable hours trend across the last N months, with each
 * month's change vs the immediately preceding month broken down by the
 * specific Service POs that drove the increase/decrease on each side.
 *
 * @param {object} query - { month, year, months }
 *   month/year: optional end period, defaults to current month. Must be given together.
 *   months: optional lookback window size, default 6, clamped 2-24.
 * @returns {Promise<{ trend: object[], months: number, period: object }>}
 */
async function getBillableTrend(query = {}) {
  const { month: endMonth, year: endYear } = resolvePeriod(query);
  const monthsBack = Math.min(24, Math.max(2, query.months ? parseInt(query.months, 10) : 6));

  const { periods, windowStart, windowEnd } = buildMonthWindow(endMonth, endYear, monthsBack);

  logger.info('Dashboard: getBillableTrend', { endMonth, endYear, monthsBack, windowStart, windowEnd });

  const rows = await dashboardRepo.getBillableTrendDetail({ windowStart, windowEnd });

  // Group flat rows into one bucket per period, each holding a per-PO hours map.
  const periodMap = new Map();
  for (const p of periods) {
    periodMap.set(`${p.year}-${p.month}`, {
      billable_hours: 0,
      non_billable_hours: 0,
      pos: new Map(), // service_po_id -> { service_po_name, is_billable, hours }
    });
  }
  for (const row of rows) {
    const key = `${row.year}-${row.month}`;
    const bucket = periodMap.get(key);
    if (!bucket) continue; // outside the requested window (shouldn't happen)

    const hours = parseFloat(row.hours) || 0;
    if (row.is_billable) bucket.billable_hours += hours;
    else bucket.non_billable_hours += hours;

    bucket.pos.set(row.service_po_id, {
      service_po_name: row.service_po_name,
      is_billable: row.is_billable,
      hours,
    });
  }

  const trend = periods.map((p, idx) => {
    const key = `${p.year}-${p.month}`;
    const bucket = periodMap.get(key);
    const label = `${MONTH_LABELS[p.month]} ${p.year}`;

    const billable_hours = round2(bucket.billable_hours);
    const non_billable_hours = round2(bucket.non_billable_hours);
    const total_hours = round2(billable_hours + non_billable_hours);
    const billable_pct = total_hours > 0 ? round2((billable_hours / total_hours) * 100) : 0;

    let change = null;
    if (idx > 0) {
      const prevPeriod = periods[idx - 1];
      const prevBucket = periodMap.get(`${prevPeriod.year}-${prevPeriod.month}`);
      const prevLabel = `${MONTH_LABELS[prevPeriod.month]} ${prevPeriod.year}`;

      const billable_delta = round2(billable_hours - round2(prevBucket.billable_hours));
      const non_billable_delta = round2(non_billable_hours - round2(prevBucket.non_billable_hours));

      const billable_drivers = computeDrivers(prevBucket.pos, bucket.pos, true);
      const non_billable_drivers = computeDrivers(prevBucket.pos, bucket.pos, false);

      const billableSentence = `Billable hours ${describeDelta(billable_delta)} vs ${prevLabel}` +
        (billable_drivers.length ? `, driven by: ${formatDrivers(billable_drivers)}.` : '.');
      const nonBillableSentence = `Non-billable hours ${describeDelta(non_billable_delta)} vs ${prevLabel}` +
        (non_billable_drivers.length ? `, driven by: ${formatDrivers(non_billable_drivers)}.` : '.');

      change = {
        vs_label: prevLabel,
        billable_delta,
        non_billable_delta,
        billable_drivers,
        non_billable_drivers,
        reason_summary: `${billableSentence} ${nonBillableSentence}`,
      };
    }

    return {
      year: p.year,
      month: p.month,
      label,
      billable_hours,
      non_billable_hours,
      total_hours,
      billable_pct,
      change,
    };
  });

  return {
    trend,
    months: monthsBack,
    period: { month: endMonth, year: endYear },
  };
}

module.exports = {
  getDashboardStats,
  getEmployeeBillableBreakdown,
  getPOBillableBreakdown,
  getTopEmployeesByPO,
  getBillableTrend,
};
