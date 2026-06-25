'use strict';

const dashboardRepo = require('../repositories/dashboardRepository');
const logger = require('../utils/logger');

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
  const now = new Date();
  const currentMonth = now.getMonth() + 1; // getMonth() is 0-based
  const currentYear = now.getFullYear();

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
  ]);

  const inactiveEmployees = totalEmployees - activeEmployees;

  return {
    as_of: now.toISOString(),
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
    },

    activity: {
      recent_timesheet_entries: recentActivity,
    },
  };
}

module.exports = {
  getDashboardStats,
};
