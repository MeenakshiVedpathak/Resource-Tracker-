import apiClient from '@/services/apiClient';

export const subProjectsApi = {
  getAll: (params) => apiClient.get('/sub-projects', { params }).then((r) => r.data),
  getByPO: (poId) => apiClient.get(`/sub-projects/by-po/${poId}`).then((r) => r.data?.data ?? []),
  getById: (id) => apiClient.get(`/sub-projects/${id}`).then((r) => r.data?.data),
  create: (payload) => apiClient.post('/sub-projects', payload).then((r) => r.data),
  update: (id, payload) => apiClient.put(`/sub-projects/${id}`, payload).then((r) => r.data),
  delete: (id) => apiClient.delete(`/sub-projects/${id}`, { data: { is_delete: true } }).then((r) => r.data),
};
