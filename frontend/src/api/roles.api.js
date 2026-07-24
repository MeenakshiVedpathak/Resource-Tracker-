import apiClient from '@/services/apiClient';

export const rolesApi = {
  getAll: (params) => apiClient.get('/roles', { params }).then((r) => r.data),
  getById: (id) => apiClient.get(`/roles/${id}`).then((r) => r.data?.data),
  create: (payload) => apiClient.post('/roles', payload).then((r) => r.data),
  update: (id, payload) => apiClient.put(`/roles/${id}`, payload).then((r) => r.data),
  delete: (id) => apiClient.delete(`/roles/${id}`, { data: { is_delete: true } }).then((r) => r.data),

  // RBAC: menu/navigation source of truth — always pass the roleIds from the logged-in
  // user's own stored roles, never a client-tampered list.
  //
  // ⚠️ The endpoint returns ALL active forms grouped by module, each with a `status`
  // boolean (true = mapped to one of the given roleIds, false = not) — it does NOT
  // pre-filter to only what's granted (confirmed against a real payload where unmapped
  // forms like "User Role Mapping"/"Sub-Projects" came back with status:false). Filter
  // to status===true and strip the flag here so every consumer (Sidebar, ProtectedRoute)
  // keeps getting the clean { id, name } "menu" shape it expects.
  getAccessibleForms: (roleIds) =>
    apiClient.post('/roles/forms', { roleIds }).then((r) => {
      const raw = r.data?.data ?? {};
      return Object.fromEntries(
        Object.entries(raw)
          .map(([moduleName, forms]) => [
            moduleName,
            (forms ?? [])
              .filter((f) => f.status === true)
              .map(({ id, name }) => ({ id, name })),
          ])
          .filter(([, forms]) => forms.length > 0)
      );
    }),

  // Same endpoint, raw — used by the Role Form Mapping admin checklist, which needs the
  // status flag intact (to know which checkboxes start checked) rather than a pre-filtered
  // "only what's granted" list.
  getFormsChecklist: (roleIds) =>
    apiClient.post('/roles/forms', { roleIds }).then((r) => r.data?.data ?? {}),

  // RBAC: User <-> Role mapping
  getUserMappings: (userId) =>
    apiClient.get(`/roles/user-mappings/${userId}`).then((r) => r.data?.data ?? []),
  addUserMapping: (payload) =>
    apiClient.post('/roles/user-mappings', payload).then((r) => r.data),
  replaceUserMappings: (userId, roleIds) =>
    apiClient.put(`/roles/user-mappings/${userId}`, { role_ids: roleIds }).then((r) => r.data),
  removeUserMapping: (userId, roleId) =>
    apiClient.delete(`/roles/user-mappings/${userId}/${roleId}`).then((r) => r.data),

  // RBAC: Role <-> Form mapping
  getRoleFormMappings: (roleId) =>
    apiClient.get(`/roles/form-mappings/${roleId}`).then((r) => r.data?.data ?? []),
  // Legacy add/remove pair — the backend now implements these as status:true/false
  // wrappers around setFormMapping below. Kept only as a fallback reference.
  addRoleFormMapping: (payload) =>
    apiClient.post('/roles/form-mappings', payload).then((r) => r.data),
  removeRoleFormMapping: (roleId, formId) =>
    apiClient.delete(`/roles/form-mappings/${roleId}/${formId}`).then((r) => r.data),
  // Primary way to map/unmap a form on a role — explicit status flag.
  setFormMapping: ({ roleId, formId, status }) =>
    apiClient.post('/roles/forms/mapping', { roleId, formId, status }).then((r) => r.data),
};
