import apiClient from '@/services/apiClient';

export const dashboardApi = {
  getStats: (params) =>
    apiClient.get('/dashboard/stats', { params }).then((r) => r.data?.data ?? {}),

  getEmployeeBillableBreakdown: (params) =>
    apiClient.get('/dashboard/employee-billable-breakdown', { params }).then((r) => r.data),

  getTopEmployeesByPO: (params) =>
    apiClient.get('/dashboard/top-employees-by-po', { params }).then((r) => r.data),
};
