import { useQuery } from '@tanstack/react-query';
import { dashboardApi } from '@/api/dashboard.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useDashboard = () =>
  useQuery({
    queryKey: QUERY_KEYS.DASHBOARD_STATS,
    queryFn: dashboardApi.getStats,
    staleTime: 1000 * 60 * 2,
  });
