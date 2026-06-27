import apiClient from '@/services/apiClient';

export const serviceTypesApi = {
  getAll: (params) => apiClient.get('/service-types', { params }).then((r) => r.data),
  getById: (id) => apiClient.get(`/service-types/${id}`).then((r) => r.data?.data),
  create: (payload) => apiClient.post('/service-types', payload).then((r) => r.data),
  update: (id, payload) => apiClient.put(`/service-types/${id}`, payload).then((r) => r.data),
  delete: (id) => apiClient.delete(`/service-types/${id}`).then((r) => r.data),
};
