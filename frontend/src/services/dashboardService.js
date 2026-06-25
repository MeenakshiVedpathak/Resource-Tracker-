import api from './api';

const dashboardService = {
  /**
   * Fetch aggregated dashboard statistics.
   * @param {{ month?: number, year?: number }} params
   */
  getStats: (params = {}) => api.get('/dashboard/stats', { params }),

  /**
   * Fetch recent activity feed for the dashboard.
   * @param {{ limit?: number }} params
   */
  getRecentActivity: (params = {}) =>
    api.get('/dashboard/recent-activity', { params }),
};

export default dashboardService;
