import apiClient from '@/services/apiClient';

export const dashboardApi = {
  getStats: () =>
    apiClient.get('/dashboard/stats').then((r) => r.data?.data ?? {}),
};
