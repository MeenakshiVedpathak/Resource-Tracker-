import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { timesheetsApi } from '@/api/timesheets.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useTimesheets = (params, options = {}) =>
  useQuery({
    queryKey: QUERY_KEYS.TIMESHEETS(params),
    queryFn: () => timesheetsApi.getAll(params),
    placeholderData: (prev) => prev,
    ...options,
  });

export const useTimesheet = (id) =>
  useQuery({
    queryKey: QUERY_KEYS.TIMESHEET(id),
    queryFn: () => timesheetsApi.getById(id),
    enabled: !!id,
  });

export const useTimesheetHistory = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.TIMESHEET_IMPORT_HISTORY(params),
    queryFn: () => timesheetsApi.getHistory(params),
    placeholderData: (prev) => prev,
  });

export const useCreateTimesheet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: timesheetsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheets'] }),
  });
};

export const useBulkUpdateModifiedHours = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ timesheetImportId, timesheets }) =>
      timesheetsApi.bulkUpdateModifiedHours(timesheetImportId, timesheets),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheets'] }),
  });
};

export const usePublishImport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (timesheetImportId) => timesheetsApi.publishImport(timesheetImportId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheets'] }),
  });
};

export const useDeleteTimesheet = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: timesheetsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheets'] }),
  });
};

export const useTimesheetImportRows = (id) =>
  useQuery({
    queryKey: QUERY_KEYS.TIMESHEET_IMPORT_ROWS(id),
    queryFn: () => timesheetsApi.getImportRows(id),
    enabled: !!id,
  });

export const useUploadTimesheets = () =>
  useMutation({
    mutationFn: (file) => timesheetsApi.upload(file),
  });

// Preview only — no cache invalidation here, that happens on useConfirmImport below.
export const useSyncEmployeeWorkLogs = () =>
  useMutation({
    mutationFn: ({ month, year, buId = null }) => timesheetsApi.syncEmployeeWorkLogs(month, year, buId),
  });

export const useConfirmImport = () => {
  const qc = useQueryClient();
  return useMutation({
    // Accepts either a bare importId (the Excel-upload flow) or { importId, buId } (the Work Log
    // sync flow, which pins the confirm to the same BU its preview was generated against).
    mutationFn: (arg) => {
      const { importId, buId } =
        typeof arg === 'object' && arg !== null ? arg : { importId: arg, buId: null };
      return timesheetsApi.confirm(importId, buId);
    },
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheets'] }),
  });
};

export const useDeleteTimesheetImport = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (importId) => timesheetsApi.deleteImports([importId]),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheets'] }),
  });
};

export const useDeleteTimesheetImports = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (importIds) => timesheetsApi.deleteImports(importIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['timesheets'] }),
  });
};
