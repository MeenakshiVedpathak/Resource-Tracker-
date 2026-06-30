import apiClient from '@/services/apiClient';

export const servicePOsApi = {
  getAll: (params) => apiClient.get('/service-pos', { params }).then((r) => r.data),
  getActiveList: () => apiClient.get('/service-pos/active/list').then((r) => r.data?.data ?? []),
  getById: (id) => apiClient.get(`/service-pos/${id}`).then((r) => r.data?.data),
  create: (payload) => apiClient.post('/service-pos', payload).then((r) => r.data),
  update: (id, payload) => apiClient.put(`/service-pos/${id}`, payload).then((r) => r.data),
  close: (id) => apiClient.post(`/service-pos/${id}/close`).then((r) => r.data),
  allocate: (id, employeeIds) =>
    apiClient.post(`/service-pos/${id}/allocate`, { employee_ids: employeeIds }).then((r) => r.data),
  deallocate: (id, employeeId) =>
    apiClient.delete(`/service-pos/${id}/resources/${employeeId}`, { data: { is_delete: true } }).then((r) => r.data),
  delete: (id) => apiClient.delete(`/service-pos/${id}`).then((r) => r.data),
  getUtilisation: (id) => apiClient.get(`/service-pos/${id}/utilisation`).then((r) => r.data?.data),
};
