import apiClient from '@/services/apiClient';
import { RBAC_MOCK_ENABLED } from '@/mocks/rbacMockConfig';
import {
  delay, getDb, persist, nextId, paginate, findUserById, findRoleById, findEmployeeById,
  getCurrentMockUser, assertCanAssignRole, mockError,
} from '@/mocks/rbacMockDb';
import { NO_COMPANY_ROLES, MANAGER_TIER_ROLES, ADDITIONAL_ROLE_NAMES } from '@/constants/roleHierarchy';

// Multi-role support (§4): senior tiers can only ever be someone's one primary role.
const assertValidAdditionalRole = (roleName) => {
  if (!ADDITIONAL_ROLE_NAMES.includes(roleName)) {
    throw mockError(
      400,
      `"${roleName}" cannot be held as an additional role — only Project Admin, Service PO Admin, Manager, HR, or Employee may be assigned as additional roles.`
    );
  }
};

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

const mockGetById = async (id) => {
  await delay();
  return serializeUserFull(findUserById(Number(id)));
};

// role_ids[0] is the primary role (drives hierarchy/scoping); role_ids[1:] are additional,
// purely-additive operational roles (§4). A bare `role_id` is still accepted as a single-role
// fallback for any caller that hasn't moved to the array shape yet.
const splitRoleIds = (payload) => payload.role_ids ?? (payload.role_id != null ? [payload.role_id] : []);

const mockCreate = async (payload) => {
  await delay();
  const actor = getCurrentMockUser();
  const [primaryRoleId, ...additionalRoleIds] = splitRoleIds(payload);
  const targetRole = findRoleById(Number(primaryRoleId));
  if (!targetRole) throw mockError(422, 'Invalid role.');
  if (actor) assertCanAssignRole(findRoleById(actor.role_id).role_name, targetRole.role_name);
  const additionalRoles = additionalRoleIds.map((rid) => findRoleById(Number(rid))).filter(Boolean);
  additionalRoles.forEach((r) => assertValidAdditionalRole(r.role_name));
  if (getDb().users.some((u) => u.email.toLowerCase() === payload.email.toLowerCase())) {
    throw mockError(409, 'A user with this email already exists.');
  }
  const user = {
    id: nextId('users'),
    company_id: NO_COMPANY_ROLES.includes(targetRole.role_name) ? null : (actor?.company_id ?? 1),
    employee_id: payload.employee_id ?? null,
    email: payload.email,
    password: payload.password,
    role_id: targetRole.id,
    additional_role_ids: additionalRoles.map((r) => r.id),
    status: payload.status ?? 'active',
    last_login: null,
  };
  getDb().users.push(user);
  persist();
  return { success: true, message: 'User created successfully.', data: serializeUserFull(user) };
};

const mockUpdate = async (id, payload) => {
  await delay();
  const user = findUserById(Number(id));
  if (!user) throw mockError(404, 'User not found.');
  // Sending role_ids at all replaces the entire role set (primary + additional together) —
  // omitting it entirely leaves both untouched (§4).
  if (payload.role_ids != null) {
    const [primaryRoleId, ...additionalRoleIds] = payload.role_ids;
    if (Number(primaryRoleId) !== user.role_id) {
      const actor = getCurrentMockUser();
      const targetRole = findRoleById(Number(primaryRoleId));
      if (!targetRole) throw mockError(422, 'Invalid role.');
      if (actor) assertCanAssignRole(findRoleById(actor.role_id).role_name, targetRole.role_name);
    }
    const additionalRoles = additionalRoleIds.map((rid) => findRoleById(Number(rid))).filter(Boolean);
    additionalRoles.forEach((r) => assertValidAdditionalRole(r.role_name));
    user.role_id = Number(primaryRoleId);
    user.additional_role_ids = additionalRoles.map((r) => r.id);
  }
  const { role_ids, role_id, ...rest } = payload;
  Object.assign(user, rest);
  persist();
  return { success: true, message: 'User updated successfully.', data: serializeUserFull(user) };
};

const mockDelete = async (id) => {
  await delay();
  const user = findUserById(Number(id));
  if (!user) throw mockError(404, 'User not found.');
  getDb().users = getDb().users.filter((u) => u.id !== user.id);
  persist();
  return { success: true, message: 'User deleted successfully.' };
};

const mockChangePassword = async (id, oldPassword, newPassword) => {
  await delay();
  const user = findUserById(Number(id));
  if (!user) throw mockError(404, 'User not found.');
  if (user.password !== oldPassword) throw mockError(401, 'Current password is incorrect.');
  user.password = newPassword;
  persist();
  return { success: true, message: 'Password changed successfully.' };
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
  getAll: (params) => {
    if (RBAC_MOCK_ENABLED) return mockGetAll(params);
    return apiClient.get('/users', { params }).then((r) => r.data);
  },
  getById: (id) => {
    if (RBAC_MOCK_ENABLED) return mockGetById(id);
    return apiClient.get(`/users/${id}`).then((r) => r.data?.data);
  },
  create: (payload) => {
    if (RBAC_MOCK_ENABLED) return mockCreate(payload);
    return apiClient.post('/users', payload).then((r) => r.data);
  },
  update: (id, payload) => {
    if (RBAC_MOCK_ENABLED) return mockUpdate(id, payload);
    return apiClient.put(`/users/${id}`, payload).then((r) => r.data);
  },
  delete: (id) => {
    if (RBAC_MOCK_ENABLED) return mockDelete(id);
    return apiClient.delete(`/users/${id}`, { data: { is_delete: true } }).then((r) => r.data);
  },

  // Self-service or an admin who knows the old password — always requires it to match.
  changePassword: (id, oldPassword, newPassword) => {
    if (RBAC_MOCK_ENABLED) return mockChangePassword(id, oldPassword, newPassword);
    return apiClient.put(`/users/${id}/change-password`, { old_password: oldPassword, new_password: newPassword }).then((r) => r.data);
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
