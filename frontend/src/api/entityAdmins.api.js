import apiClient from '@/services/apiClient';

// Platform Admin only. No GET/list endpoint exists — creation is one-shot and self-serve from
// there (the new Entity Admin logs in and creates their own Entities).
export const entityAdminsApi = {
  create: (payload) => apiClient.post('/entity-admins', payload).then((r) => r.data),
};
