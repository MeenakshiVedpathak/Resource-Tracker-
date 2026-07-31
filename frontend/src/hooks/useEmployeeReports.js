import { useQuery } from '@tanstack/react-query';
import { employeeReportsApi } from '@/api/employeeReports.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

// JSON-view queries only — export-button clicks (excel/csv/pdf) are plain async calls made
// directly against employeeReportsApi from the page, not cached here (a file download isn't
// cacheable "data").
export const useEmployeeDailyReport = (date) =>
  useQuery({
    queryKey: QUERY_KEYS.EMPLOYEE_REPORT_DAILY(date),
    queryFn: () => employeeReportsApi.getDaily({ date, format: 'json' }),
    enabled: !!date,
  });

export const useEmployeeMonthlyReport = (month, year) =>
  useQuery({
    queryKey: QUERY_KEYS.EMPLOYEE_REPORT_MONTHLY(month, year),
    queryFn: () => employeeReportsApi.getMonthly({ month, year, format: 'json' }),
    enabled: !!month && !!year,
  });

export const useEmployeeRangeReport = (startDate, endDate) =>
  useQuery({
    queryKey: QUERY_KEYS.EMPLOYEE_REPORT_RANGE(startDate, endDate),
    queryFn: () => employeeReportsApi.getRange({ startDate, endDate, format: 'json' }),
    enabled: !!startDate && !!endDate,
  });
