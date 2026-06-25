import api from './api';

const reportService = {
  /**
   * Report 1 — Employee Hourly Rate
   * Cost per employee broken down by month/year.
   * @param {{ month: number, year: number, employee_id?: number, page?: number, limit?: number }} params
   */
  getEmployeeHourlyRate: (params = {}) =>
    api.get('/reports/employee-hourly-rate', { params }),

  /**
   * Report 2 — Monthly Cost Summary
   * Aggregated salary + ops costs for all employees for a given month.
   * @param {{ month: number, year: number }} params
   */
  getMonthlyCostSummary: (params = {}) =>
    api.get('/reports/monthly-cost-summary', { params }),

  /**
   * Report 3 — Timesheet Summary
   * Hours logged per employee / PO / sub-project.
   * @param {{ month?: number, year?: number, employee_id?: number, service_po_id?: number, from_date?: string, to_date?: string }} params
   */
  getTimesheetSummary: (params = {}) =>
    api.get('/reports/timesheet-summary', { params }),

  /**
   * Report 4 — Service PO Utilisation
   * Man-hours consumed vs. expected per PO.
   * @param {{ service_po_id?: number, client_id?: number, status?: string, from_date?: string, to_date?: string }} params
   */
  getServicePOUtilisation: (params = {}) =>
    api.get('/reports/service-po-utilisation', { params }),

  /**
   * Report 5 — Sub-Project Hours
   * Hours breakdown per sub-project within a PO.
   * @param {{ service_po_id?: number, sub_project_id?: number, month?: number, year?: number }} params
   */
  getSubProjectHours: (params = {}) =>
    api.get('/reports/sub-project-hours', { params }),

  /**
   * Report 6 — Resource Allocation
   * Which employees are allocated to which POs.
   * @param {{ employee_id?: number, service_po_id?: number, client_id?: number }} params
   */
  getResourceAllocation: (params = {}) =>
    api.get('/reports/resource-allocation', { params }),

  /**
   * Report 7 — Operational Cost Breakdown
   * Ops cost distributed per employee for a month/year.
   * @param {{ month: number, year: number, employee_id?: number }} params
   */
  getOperationalCostBreakdown: (params = {}) =>
    api.get('/reports/operational-cost-breakdown', { params }),

  /**
   * Export any report as an Excel file.
   * @param {string} reportType  e.g. 'employee-hourly-rate'
   * @param {object} params
   */
  exportReport: (reportType, params = {}) =>
    api.get(`/reports/${reportType}/export`, {
      params,
      responseType: 'blob',
    }),
};

export default reportService;
