import apiClient from '@/services/apiClient';

export const timesheetsApi = {
  getAll: (params) => apiClient.get('/timesheets', { params }).then((r) => r.data),
  getById: (id) => apiClient.get(`/timesheets/${id}`).then((r) => r.data?.data),
  create: (payload) => apiClient.post('/timesheets', payload).then((r) => r.data),
  update: (id, payload) => apiClient.put(`/timesheets/${id}`, payload).then((r) => r.data),
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
  confirm: (importId) =>
    apiClient.post(`/timesheets/confirm/${importId}`).then((r) => r.data),
  getHistory: (params) =>
    apiClient.get('/timesheets/import/history', { params }).then((r) => r.data),
  getImportById: (id) =>
    apiClient.get(`/timesheets/import/${id}`).then((r) => r.data?.data),
  getImportRows: (id) =>
    apiClient.get(`/timesheets/import/${id}/rows`).then((r) => r.data),
  deleteImports: (ids) =>
    apiClient.delete('/timesheets', { data: { ids } }).then((r) => r.data),
};
