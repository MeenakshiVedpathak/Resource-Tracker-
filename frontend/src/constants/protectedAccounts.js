// Company Admin accounts are the tenant's designated admin and are protected from deletion,
// edits, status changes, and role reassignment everywhere in the UI, regardless of the acting
// user's own role/permission — this is a client-side safety net on top of whatever the backend
// itself enforces.
export const PROTECTED_ROLE_NAME = 'Company Admin';

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
