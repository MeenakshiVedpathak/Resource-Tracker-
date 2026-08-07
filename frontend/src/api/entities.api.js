import apiClient from '@/services/apiClient';

// Entity Master — Entity Admin only. Backend scopes every call to the caller's own Entities;
// no company header applies here since an Entity Admin belongs to no company.
export const entitiesApi = {
  getAll: (params) => apiClient.get('/entities', { params }).then((r) => r.data),
  getById: (id) => apiClient.get(`/entities/${id}`).then((r) => r.data?.data),
  create: (payload) => apiClient.post('/entities', payload).then((r) => r.data),
  update: (id, payload) => apiClient.put(`/entities/${id}`, payload).then((r) => r.data),
  delete: (id) => apiClient.delete(`/entities/${id}`).then((r) => r.data),
};
