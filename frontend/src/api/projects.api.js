import apiClient from '@/services/apiClient';

export const projectsApi = {
  getAll: (params) => apiClient.get('/projects', { params }).then((r) => r.data),
  getActiveList: () => apiClient.get('/projects/active/list').then((r) => r.data?.data ?? []),
  getById: (id) => apiClient.get(`/projects/${id}`).then((r) => r.data?.data),
  create: (payload) => apiClient.post('/projects', payload).then((r) => r.data),
  update: (id, payload) => apiClient.put(`/projects/${id}`, payload).then((r) => r.data),
  delete: (id) => apiClient.delete(`/projects/${id}`).then((r) => r.data),
};
