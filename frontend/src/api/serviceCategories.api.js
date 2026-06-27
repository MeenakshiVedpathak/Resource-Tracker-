import apiClient from '@/services/apiClient';

export const serviceCategoriesApi = {
  getAll: (params) => apiClient.get('/service-categories', { params }).then((r) => r.data),
  getById: (id) => apiClient.get(`/service-categories/${id}`).then((r) => r.data?.data),
  create: (payload) => apiClient.post('/service-categories', payload).then((r) => r.data),
  update: (id, payload) => apiClient.put(`/service-categories/${id}`, payload).then((r) => r.data),
  delete: (id) => apiClient.delete(`/service-categories/${id}`).then((r) => r.data),
};
