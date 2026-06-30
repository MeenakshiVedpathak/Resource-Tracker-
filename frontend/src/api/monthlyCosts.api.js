import apiClient from '@/services/apiClient';

export const monthlyCostsApi = {
  getAll: (params) => apiClient.get('/monthly-costs', { params }).then((r) => r.data),
  getById: (id) => apiClient.get(`/monthly-costs/${id}`).then((r) => r.data?.data),
  create: (payload) => apiClient.post('/monthly-costs', payload).then((r) => r.data),
  update: (id, payload) => apiClient.put(`/monthly-costs/${id}`, payload).then((r) => r.data),
  delete: (id) => apiClient.delete(`/monthly-costs/${id}`, { data: { is_delete: true } }).then((r) => r.data),
  calculateForMonth: (month, year) =>
    apiClient.post('/monthly-costs/calculate', { month, year }).then((r) => r.data),
  import: (file) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient
      .post('/monthly-costs/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};
