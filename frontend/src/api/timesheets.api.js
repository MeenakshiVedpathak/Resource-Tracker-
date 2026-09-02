import apiClient, { explicitBuScope } from '@/services/apiClient';

export const timesheetsApi = {
  getAll: (params) => apiClient.get('/timesheets', { params }).then((r) => r.data),
  getById: (id) => apiClient.get(`/timesheets/${id}`).then((r) => r.data?.data),
  create: (payload) => apiClient.post('/timesheets', payload).then((r) => r.data),
  delete: (id) => apiClient.delete(`/timesheets/${id}`, { data: { is_delete: true } }).then((r) => r.data),
  upload: (file, month, year) => {
    const form = new FormData();
    form.append('file', file);
    if (month) form.append('month', month);
    if (year) form.append('year', year);
    return apiClient
      .post('/timesheets/upload', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data?.data);
  },
  // `buId` pins the confirm to the same BU the preview/import was generated against (the Work Log
  // sync flow passes it); the Excel-upload flow calls this with just an importId, so it defaults to
  // null and leaves the interceptor's global-BU header untouched.
  confirm: (importId, buId = null) =>
    apiClient.post(`/timesheets/confirm/${importId}`, null, explicitBuScope(buId ?? undefined)).then((r) => r.data),
  getHistory: (params) =>
    apiClient.get('/timesheets/import/history', { params }).then((r) => r.data),
  getImportById: (id) =>
    apiClient.get(`/timesheets/import/${id}`).then((r) => r.data?.data),
  getImportRows: (id) =>
    apiClient.get(`/timesheets/import/${id}/rows`).then((r) => r.data),
  deleteImports: (ids) =>
    apiClient.delete('/timesheets', { data: { ids } }).then((r) => r.data),
  bulkUpdateModifiedHours: (timesheetImportId, timesheets) =>
    apiClient.put(`/timesheets/import/${timesheetImportId}/hours`, { timesheets }).then((r) => r.data),
  publishImport: (timesheetImportId) =>
    apiClient.put(`/timesheets/import/${timesheetImportId}/publish`).then((r) => r.data),
  // Preview call — returns the same shape as upload()'s preview response. Confirming reuses
  // the existing confirm() above, since both sources feed the same import pipeline.
  //
  // BU-scoped exactly like the Monthly Costs import: the chosen id rides X-Company-Id (via
  // explicitBuScope) and also goes in the body as business_unit_id, both carrying the same id so
  // the backend can read either. A null id (a single-BU user, or an unscoped Platform/Entity Admin)
  // sends neither and leaves the interceptor's global-BU header untouched.
  syncEmployeeWorkLogs: (month, year, buId = null) => {
    const body = { month, year };
    if (buId != null) body.business_unit_id = buId;
    return apiClient
      .post('/timesheets/sync-employee-worklogs', body, explicitBuScope(buId ?? undefined))
      .then((r) => r.data?.data);
  },
};
