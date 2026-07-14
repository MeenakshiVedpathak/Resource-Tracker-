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
