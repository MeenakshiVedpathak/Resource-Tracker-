// BU Admin accounts are a Company's designated first admin (created alongside the Company
// itself, §6.3) and are protected from deletion, edits, status changes, and role reassignment
// everywhere in the UI, regardless of the acting user's own role/permission — a client-side
// safety net on top of whatever the backend itself enforces. (Renamed from the old "Company
// Admin" role, which no longer exists under the RBAC redesign's 9-role hierarchy — BU Admin is
// the closest equivalent.)
export const PROTECTED_ROLE_NAME = 'BU Admin';

// User/Employee records carry a primary `role` object plus an `additionalRoles` array (see
// EmployeeForm/EmployeeList role-resolution) — check both. BU Admin is a senior tier so it can
// only ever be a primary role in practice, but check additionalRoles too for safety.
const getRoleNames = (user) => {
  if (!user) return [];
  const fromAdditional = Array.isArray(user.additionalRoles)
    ? user.additionalRoles.map((r) => r.role_name ?? r.name)
    : [];
  const fromRole = user.role?.role_name ? [user.role.role_name] : [];
  return [...fromAdditional, ...fromRole];
};

export const isProtectedAccount = (user) => getRoleNames(user).includes(PROTECTED_ROLE_NAME);
