import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeWorkLogApi } from '@/api/employeeWorkLog.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

// One row per day in the month: { date, totalHours, hasEntries, futureDisabled }. totalHours
// here is pending+synced combined — the calendar aggregate doesn't expose a per-day
// pending/synced breakdown, so this view intentionally doesn't distinguish them (see plan).
export const useEmployeeCalendar = (month, year) =>
  useQuery({
    queryKey: QUERY_KEYS.EMPLOYEE_WORKLOG_CALENDAR(month, year),
    queryFn: () => employeeWorkLogApi.getCalendar({ month, year }),
    placeholderData: (prev) => prev,
  });

// Fetched on demand for whichever date is selected.
export const useEmployeeDailyWorkLog = (date) =>
  useQuery({
    queryKey: QUERY_KEYS.EMPLOYEE_WORKLOG_DAILY(date),
    queryFn: () => employeeWorkLogApi.getDaily(date),
    enabled: !!date,
    placeholderData: (prev) => prev,
  });

export const useEmployeeMonthlySummary = (month, year) =>
  useQuery({
    queryKey: QUERY_KEYS.EMPLOYEE_WORKLOG_MONTHLY_SUMMARY(month, year),
    queryFn: () => employeeWorkLogApi.getMonthlySummary({ month, year }),
  });

export const useCreateWorkLogEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: employeeWorkLogApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee-worklog'] }),
  });
};

export const useUpdateWorkLogEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, payload }) => employeeWorkLogApi.update(id, payload),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee-worklog'] }),
  });
};

export const useDeleteWorkLogEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: employeeWorkLogApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee-worklog'] }),
  });
};
