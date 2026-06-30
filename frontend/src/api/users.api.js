import apiClient from '@/services/apiClient';

export const usersApi = {
  getAll: (params) => apiClient.get('/users', { params }).then((r) => r.data),
  getById: (id) => apiClient.get(`/users/${id}`).then((r) => r.data?.data),
  create: (payload) => apiClient.post('/users', payload).then((r) => r.data),
  update: (id, payload) => apiClient.put(`/users/${id}`, payload).then((r) => r.data),
  delete: (id) => apiClient.delete(`/users/${id}`, { data: { is_delete: true } }).then((r) => r.data),
};
