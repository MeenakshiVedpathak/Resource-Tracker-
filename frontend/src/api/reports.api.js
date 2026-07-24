import apiClient from '@/services/apiClient';

export const reportsApi = {
  getMonthlyCostSummary: (params) =>
    apiClient.get('/reports/monthly-cost-summary', { params }).then((r) => r.data),
  getResourceAllocation: (params) =>
    apiClient.get('/reports/resource-allocation', { params }).then((r) => r.data),
  getServicePOSummary: (params) =>
    apiClient.get('/reports/service-po-summary', { params }).then((r) => r.data),
  getMonthlyResourceUtilization: (params) =>
    apiClient.get('/reports/monthly-resource-utilization', { params }).then((r) => r.data),
  getResourceProjectUtilization: (params) =>
    apiClient.get('/reports/resource-project-utilization-report', { params }).then((r) => r.data),
};
