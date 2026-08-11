// BU Admin accounts are a Company's designated first admin (created alongside the Company
// itself, §6.3) and are protected from deletion, edits, status changes, and role reassignment
// everywhere in the UI, regardless of the acting user's own role/permission — a client-side
// safety net on top of whatever the backend itself enforces. (Renamed from the old "Company
// Admin" role, which no longer exists under the RBAC redesign's 9-role hierarchy — BU Admin is
// the closest equivalent.)
export const PROTECTED_ROLE_NAME = 'BU Admin';

// User records come back from the API with either a single `role` object or a `roles` array
// (see UserForm/UserList role-resolution) — check both shapes.
const getRoleNames = (user) => {
  if (!user) return [];
  const fromRoles = Array.isArray(user.roles) && user.roles.length > 0
    ? user.roles.map((r) => r.role_name ?? r.name)
    : [];
  const fromRole = user.role?.role_name ? [user.role.role_name] : [];
  return [...fromRoles, ...fromRole];
};

export const isProtectedAccount = (user) => getRoleNames(user).includes(PROTECTED_ROLE_NAME);
