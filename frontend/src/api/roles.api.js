import apiClient from '@/services/apiClient';

export const rolesApi = {
  getAll: (params) => apiClient.get('/roles', { params }).then((r) => r.data),
  getById: (id) => apiClient.get(`/roles/${id}`).then((r) => r.data?.data),
  create: (payload) => apiClient.post('/roles', payload).then((r) => r.data),
  update: (id, payload) => apiClient.put(`/roles/${id}`, payload).then((r) => r.data),
  delete: (id) => apiClient.delete(`/roles/${id}`, { data: { is_delete: true } }).then((r) => r.data),
};
