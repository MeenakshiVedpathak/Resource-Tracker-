import apiClient from '@/services/apiClient';
import { RBAC_MOCK_ENABLED } from '@/mocks/rbacMockConfig';
import {
  delay, getDb, paginate, findUserById, findRoleById, findEmployeeById,
  getCurrentMockUser, mockError, persist,
} from '@/mocks/rbacMockDb';
import { MANAGER_TIER_ROLES } from '@/constants/roleHierarchy';

const serializeUserFull = (user) => {
  if (!user) return null;
  const role = findRoleById(user.role_id);
  const employee = user.employee_id ? findEmployeeById(user.employee_id) : null;
  const additionalRoles = (user.additional_role_ids ?? [])
    .map((rid) => findRoleById(rid))
    .filter(Boolean)
    .map((r) => ({ id: r.id, role_name: r.role_name, permission: r.permission, hierarchy_rank: r.hierarchy_rank }));
  return {
    id: user.id,
    company_id: user.company_id,
    employee_id: user.employee_id,
    email: user.email,
    status: user.status,
    last_login: user.last_login,
    role_id: user.role_id,
    role: role && { id: role.id, role_name: role.role_name, permission: role.permission, hierarchy_rank: role.hierarchy_rank },
    additionalRoles,
    roles: role ? [{ id: role.id, role_name: role.role_name, permission: role.permission }, ...additionalRoles] : additionalRoles,
    employee: employee && { id: employee.id, full_name: employee.full_name },
  };
};

const mockGetAll = async (params) => {
  await delay();
  const roleNameFilter = params?.role_name
    ? (Array.isArray(params.role_name) ? params.role_name : [params.role_name])
    : null;
  const result = paginate(getDb().users, {
    ...params,
    searchFields: ['email'],
    filter: (u) => {
      if (params?.role_id && u.role_id !== Number(params.role_id)) return false;
      if (roleNameFilter && !roleNameFilter.includes(findRoleById(u.role_id)?.role_name)) return false;
      return true;
    },
  });
  return { success: true, message: 'OK', data: result.data.map(serializeUserFull), meta: result.meta };
};

const SENIOR_RESET_ROLES = ['HR', 'Platform Admin', 'Admin', 'Entity Admin', 'BU Admin'];

const mockResetPassword = async (id, newPassword, confirmPassword) => {
  await delay();
  if (newPassword !== confirmPassword) throw mockError(422, 'Passwords do not match.');
  const actor = getCurrentMockUser();
  const actorRoleName = actor && findRoleById(actor.role_id).role_name;
  if (!actorRoleName || !SENIOR_RESET_ROLES.includes(actorRoleName)) {
    throw mockError(403, 'You are not permitted to reset this account\'s password.');
  }
  const user = findUserById(Number(id));
  if (!user) throw mockError(404, 'User not found.');
  user.password = newPassword;
  persist();
  return { success: true, message: 'Password reset successfully.' };
};

export const usersApi = {
  // Backs Employee Master's Role filter/column and its manager pickers — the standalone Users
  // CRUD screen (create/update/delete a User directly) was retired in favor of managing all of
  // that from Employee Master (employees.api.js), which owns creating/updating the linked User.
  getAll: (params) => {
    if (RBAC_MOCK_ENABLED) return mockGetAll(params);
    return apiClient.get('/users', { params }).then((r) => r.data);
  },

  // HR/senior-admin resets someone's forgotten password — no old password required (§2.6).
  resetPassword: (id, newPassword, confirmPassword) => {
    if (RBAC_MOCK_ENABLED) return mockResetPassword(id, newPassword, confirmPassword);
    return apiClient.put(`/users/${id}/reset-password`, { new_password: newPassword, confirm_password: confirmPassword }).then((r) => r.data);
  },
};

// Manager-tier Users for Employee's primary/secondary manager pickers (§3.1) — a role
// "inheriting" Manager's capabilities counts (Service PO Admin, Project Admin).
export const managerCandidatesParams = { role_name: MANAGER_TIER_ROLES, status: 'active', limit: 200 };
