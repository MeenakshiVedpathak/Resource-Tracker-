import apiClient from '@/services/apiClient';

export const reportsApi = {
  getEmployeeHourlyRate: (params) =>
    apiClient.get('/reports/employee-hourly-rate', { params }).then((r) => r.data),
  getMonthlyCostSummary: (params) =>
    apiClient.get('/reports/monthly-cost-summary', { params }).then((r) => r.data),
  getTimesheetSummary: (params) =>
    apiClient.get('/reports/timesheet-summary', { params }).then((r) => r.data),
  getServicePOUtilisation: (params) =>
    apiClient.get('/reports/service-po-utilisation', { params }).then((r) => r.data),
  getSubProjectHours: (params) =>
    apiClient.get('/reports/sub-project-hours', { params }).then((r) => r.data),
  getResourceAllocation: (params) =>
    apiClient.get('/reports/resource-allocation', { params }).then((r) => r.data),
  getOperationalCost: (params) =>
    apiClient.get('/reports/operational-cost-breakdown', { params }).then((r) => r.data),
  getMonthlyUtilization: (params) =>
    apiClient.get('/reports/employee-utilization-summary', { params }).then((r) => r.data),
};
