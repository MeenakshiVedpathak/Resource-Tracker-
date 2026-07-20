import { useQuery } from '@tanstack/react-query';
import { reportsApi } from '@/api/reports.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useEmployeeHourlyRate = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.REPORT_HOURLY_RATE(params),
    queryFn: () => reportsApi.getEmployeeHourlyRate(params),
    enabled: !!(params?.month && params?.year),
    staleTime: 0,
    placeholderData: (prev) => prev,
  });

export const useMonthlyCostSummary = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.REPORT_MONTHLY_COST_SUMMARY(params),
    queryFn: () => reportsApi.getMonthlyCostSummary(params),
    staleTime: 0,
    placeholderData: (prev) => prev,
  });

export const useTimesheetSummary = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.REPORT_TIMESHEET_SUMMARY(params),
    queryFn: () => reportsApi.getTimesheetSummary(params),
    staleTime: 0,
    placeholderData: (prev) => prev,
  });

export const useServicePOUtilisationReport = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.REPORT_PO_UTILISATION(params),
    queryFn: () => reportsApi.getServicePOUtilisation(params),
    staleTime: 0,
    placeholderData: (prev) => prev,
  });

export const useSubProjectHours = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.REPORT_SUB_PROJECT_HOURS(params),
    queryFn: () => reportsApi.getSubProjectHours(params),
    staleTime: 0,
    placeholderData: (prev) => prev,
  });

export const useResourceAllocationReport = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.REPORT_RESOURCE_ALLOCATION(params),
    queryFn: () => reportsApi.getResourceAllocation(params),
    staleTime: 0,
    placeholderData: (prev) => prev,
  });

export const useOperationalCost = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.REPORT_OPERATIONAL_COST(params),
    queryFn: () => reportsApi.getOperationalCost(params),
    staleTime: 0,
    placeholderData: (prev) => prev,
  });

export const useMonthlyUtilization = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.REPORT_MONTHLY_UTILIZATION(params),
    queryFn: () => reportsApi.getMonthlyUtilization(params),
    enabled: !!(params?.month && params?.year),
    staleTime: 0,
    placeholderData: (prev) => prev,
  });

export const useServicePOResourceReport = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.REPORT_SERVICE_PO_RESOURCE(params),
    queryFn: () => reportsApi.getResourceAllocation(params),
    staleTime: 0,
    placeholderData: (prev) => prev,
  });

export const useServicePOSummary = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.REPORT_SERVICE_PO_SUMMARY(params),
    queryFn: () => reportsApi.getServicePOSummary(params),
    enabled: !!(params?.month && params?.year),
    staleTime: 0,
    placeholderData: (prev) => prev,
  });

/*
 * TEMPORARY frontend workaround: the backend's `summary` totals are computed
 * only from the current page's rows instead of the full filtered set (a
 * backend bug — flagged separately, not fixed here since backend is owned by
 * another developer). Until that's fixed server-side, walk every page
 * (capped at the API's own page-size ceiling of 100) and sum each page's
 * summary fields client-side to get a correct grand total.
 */
const PO_SUMMARY_PAGE_LIMIT = 100;
const MAX_SUMMARY_PAGES = 50; // safety cap: 5,000 records: far beyond any realistic PO count

export const useServicePOSummaryTotals = (filterParams) => {
  const { page: _page, limit: _limit, ...baseParams } = filterParams ?? {};
  return useQuery({
    queryKey: QUERY_KEYS.REPORT_SERVICE_PO_SUMMARY_TOTALS(baseParams),
    queryFn: async () => {
      const first = await reportsApi.getServicePOSummary({ ...baseParams, page: 1, limit: PO_SUMMARY_PAGE_LIMIT });
      const total = first?.meta?.total ?? 0;
      const totalPages = Math.min(MAX_SUMMARY_PAGES, Math.max(1, Math.ceil(total / PO_SUMMARY_PAGE_LIMIT)));
      const summaries = [first?.data?.summary].filter(Boolean);

      for (let p = 2; p <= totalPages; p++) {
        const res = await reportsApi.getServicePOSummary({ ...baseParams, page: p, limit: PO_SUMMARY_PAGE_LIMIT });
        if (res?.data?.summary) summaries.push(res.data.summary);
      }

      return summaries.reduce((acc, s) => {
        Object.keys(s).forEach((key) => { acc[key] = (acc[key] ?? 0) + (Number(s[key]) || 0); });
        return acc;
      }, {});
    },
    enabled: !!(baseParams?.month && baseParams?.year),
    staleTime: 0,
    placeholderData: (prev) => prev,
  });
};

export const useMonthlyResourceUtilization = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.REPORT_MONTHLY_RESOURCE_UTILIZATION(params),
    queryFn: () => reportsApi.getMonthlyResourceUtilization(params),
    enabled: !!(params?.month && params?.year),
    staleTime: 0,
    placeholderData: (prev) => prev,
  });

export const useResourceProjectUtilization = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.REPORT_RESOURCE_PROJECT_UTILIZATION(params),
    queryFn: () => reportsApi.getResourceProjectUtilization(params),
    enabled: !!(params?.month && params?.year),
    staleTime: 0,
    placeholderData: (prev) => prev,
  });
