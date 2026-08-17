import apiClient from '@/services/apiClient';

export const formsApi = {
  // Flat list of module + form rows (module rows have module_name: null), ordered by seq.
  getAll: (params) => apiClient.get('/forms', { params }).then((r) => r.data),
  // Module rows only (module_name: null), ordered by seq — source for the Module dropdown.
  getModules: (params) => apiClient.get('/forms/modules', { params }).then((r) => r.data?.data ?? []),
  getById: (id) => apiClient.get(`/forms/${id}`).then((r) => r.data?.data),
  // module_name: null (or omitted) creates a MODULE; a module name creates a FORM under it.
  // Never send seq — the server always computes the next slot.
  create: (payload) => apiClient.post('/forms', payload).then((r) => r.data),
  // Renaming a module cascades to its children server-side. Setting module_name on a form moves
  // it to a different module (appended at the end). A row can never switch between module/form.
  update: (id, payload) => apiClient.put(`/forms/${id}`, payload).then((r) => r.data),
  // Soft-deletes (deactivates). Deleting a module that still has forms under it returns 400.
  delete: (id) => apiClient.delete(`/forms/${id}`).then((r) => r.data),
  // Reorders modules only — items: [{ id, seq }].
  reorderModules: (items) => apiClient.patch('/forms/modules/reorder', { items }).then((r) => r.data),
  // Reorders forms within one module only — items: [{ id, seq }].
  reorderForms: (moduleName, items) =>
    apiClient.patch('/forms/reorder', { module_name: moduleName, items }).then((r) => r.data),
};
