import apiClient from '@/services/apiClient';

export const managerMappingsApi = {
  getAll: () => apiClient.get('/manager-mappings').then((r) => r.data?.data ?? []),
  create: (mappedUserId) =>
    apiClient.post('/manager-mappings', { mapped_user_id: mappedUserId }).then((r) => r.data),
  delete: (id) => apiClient.delete(`/manager-mappings/${id}`).then((r) => r.data),
};
