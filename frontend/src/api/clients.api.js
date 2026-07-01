import apiClient from '@/services/apiClient';

export const clientsApi = {
  getAll: (params) => apiClient.get('/clients', { params }).then((r) => r.data),
  getActiveList: () => apiClient.get('/clients/active/list').then((r) => r.data?.data ?? []),
  getById: (id) => apiClient.get(`/clients/${id}`).then((r) => r.data?.data),
  create: (payload) => apiClient.post('/clients', payload).then((r) => r.data),
  update: (id, payload) => apiClient.put(`/clients/${id}`, payload).then((r) => r.data),
  delete: (id) => apiClient.delete(`/clients/${id}`, { data: { is_delete: true } }).then((r) => r.data),
  import: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/clients/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then((r) => r.data);
  },
};
