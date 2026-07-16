import apiClient from '@/services/apiClient';

export const dashboardApi = {
  getStats: (params) =>
    apiClient.get('/dashboard/stats', { params }).then((r) => r.data?.data ?? {}),

  getEmployeeBillableBreakdown: (params) =>
    apiClient.get('/dashboard/employee-billable-breakdown', { params }).then((r) => r.data),

  getTopEmployeesByPO: (params) =>
    apiClient.get('/dashboard/top-employees-by-po', { params }).then((r) => r.data),

  getAnalytics: (params) =>
    apiClient.get('/dashboard/analytics', { params }).then((r) => r.data?.data ?? {}),

  getAnalytics2: (params) =>
    apiClient.get('/dashboard/analytics2', { params }).then((r) => r.data?.data ?? {}),
};
