import apiClient from '@/services/apiClient';

export const rolesApi = {
  getAll: (params) => apiClient.get('/roles', { params }).then((r) => r.data),
  getById: (id) => apiClient.get(`/roles/${id}`).then((r) => r.data?.data),
  create: (payload) => apiClient.post('/roles', payload).then((r) => r.data),
  update: (id, payload) => apiClient.put(`/roles/${id}`, payload).then((r) => r.data),
  // Hard delete — no request body. Backend blocks it (409) if the role is assigned to any
  // user, so no soft-delete `is_delete` flag here unlike other masters' delete calls.
  delete: (id) => apiClient.delete(`/roles/${id}`).then((r) => r.data),

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
  // Bulk replace — give it every form_id that should be active for the role; the backend
  // activates those and soft-unmaps everything else in one transaction. Replaces the old
  // one-request-per-checkbox POST/DELETE pair entirely.
  replaceRoleFormMappings: (roleId, formIds) =>
    apiClient.put(`/roles/form-mappings/${roleId}`, { form_ids: formIds }).then((r) => r.data),
};
