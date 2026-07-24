import apiClient from '@/services/apiClient';

export const formsApi = {
  getAll: (params) => apiClient.get('/forms', { params }).then((r) => r.data),
  getById: (id) => apiClient.get(`/forms/${id}`).then((r) => r.data?.data),
  create: (payload) => apiClient.post('/forms', payload).then((r) => r.data),
  update: (id, payload) => apiClient.put(`/forms/${id}`, payload).then((r) => r.data),
  delete: (id) => apiClient.delete(`/forms/${id}`, { data: { is_delete: true } }).then((r) => r.data),
};
