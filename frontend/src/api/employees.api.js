import apiClient from '@/services/apiClient';

export const employeesApi = {
  getAll: (params) =>
    apiClient.get('/employees', { params }).then((r) => r.data),

  getActiveList: () =>
    apiClient.get('/employees/active/list').then((r) => r.data?.data ?? []),

  getById: (id) =>
    apiClient.get(`/employees/${id}`).then((r) => r.data?.data),

  create: (payload) =>
    apiClient.post('/employees', payload).then((r) => r.data),

  update: (id, payload) =>
    apiClient.put(`/employees/${id}`, payload).then((r) => r.data),

  delete: (id) =>
    apiClient.delete(`/employees/${id}`).then((r) => r.data),
};
