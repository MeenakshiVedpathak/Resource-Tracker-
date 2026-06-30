'use strict';

const dashboardRepo = require('../repositories/dashboardRepository');
const logger = require('../utils/logger');
const dateHelper = require('../helpers/dateHelper');

/**
 * Dashboard Service
 * Calls all repository methods in parallel and assembles the combined stats object.
 */

/**
 * Assemble the full dashboard stats payload.
 * All repository queries run concurrently via Promise.all to minimise latency.
 *
 * @returns {Promise<object>}
 */
async function getDashboardStats() {
  const currentMonth = dateHelper.getCurrentMonth();
  const currentYear = dateHelper.getCurrentYear();

  logger.info('Dashboard: fetching all stats', { currentMonth, currentYear });

  const [
    totalEmployees,
    activeEmployees,
    totalClients,
    activePOs,
    closedPOs,
    currentMonthHours,
    overallUtilisation,
    totalRevenue,
    recentActivity,
    topPOs,
    monthlyTrend,
    nonBillableTrend,
    nonBillableBreakdown,
    topClientsBillable,
    topClientsNonBillable,
  ] = await Promise.all([
    dashboardRepo.getTotalEmployees(),
    dashboardRepo.getActiveEmployees(),
    dashboardRepo.getTotalClients(),
    dashboardRepo.getActivePOs(),
    dashboardRepo.getClosedPOs(),
    dashboardRepo.getCurrentMonthHours(currentMonth, currentYear),
    dashboardRepo.getOverallUtilisation(currentMonth, currentYear),
    dashboardRepo.getTotalRevenue(currentYear),
    dashboardRepo.getRecentTimesheetActivity(),
    dashboardRepo.getTopPOsByHours(),
    dashboardRepo.getMonthlyHoursTrend(),
    dashboardRepo.getMonthlyNonBillableTrend(),
    dashboardRepo.getCurrentMonthNonBillableBreakdown(currentMonth, currentYear),
    dashboardRepo.getTopClientsByBillableHours(currentMonth, currentYear),
    dashboardRepo.getTopClientsByNonBillableHours(currentMonth, currentYear),
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
      non_billable_trend: nonBillableTrend,
      non_billable_breakdown: nonBillableBreakdown,
      top_clients_billable: topClientsBillable,
      top_clients_non_billable: topClientsNonBillable,
    },

    activity: {
      recent_timesheet_entries: recentActivity,
    },
  };
}

module.exports = {
  getDashboardStats,
};
