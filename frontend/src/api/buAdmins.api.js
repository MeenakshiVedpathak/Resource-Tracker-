import apiClient from '@/services/apiClient';

// BU Admin Master — Entity Admin only, view/edit/activate-deactivate only. There is currently no
// create flow anywhere in the app: BU creation (companies.api.js) no longer bundles a BU Admin.
export const buAdminsApi = {
  getAll: (params) => apiClient.get('/bu-admins', { params }).then((r) => r.data),
  getById: (id) => apiClient.get(`/bu-admins/${id}`).then((r) => r.data?.data),
  update: (id, payload) => apiClient.put(`/bu-admins/${id}`, payload).then((r) => r.data),
  updateStatus: (id, status) => apiClient.patch(`/bu-admins/${id}/status`, { status }).then((r) => r.data),
};
