import apiClient from '@/services/apiClient';
import { RBAC_MOCK_ENABLED } from '@/mocks/rbacMockConfig';
import {
  delay, getDb, persist, nextId, paginate, findEmployeeById, findUserById, findRoleById, findRoleByName,
  getCurrentMockUser, assertCanAssignRole, assertValidAdditionalRole, mockError, generateTemporaryPassword,
} from '@/mocks/rbacMockDb';
import { usersApi } from '@/api/users.api';
import { ROLE_NAMES } from '@/constants/roleHierarchy';

// The real backend keeps Employees and Users as two separate resources — POST/PUT /employees
// has no role_ids/password/role fields at all (see bakend/src/validations/employeeValidation.js),
// and creating an Employee there never provisions a login on its own. So on the real backend,
// "manage login + role from Employee Master" is done here as a second call into the (pre-existing,
// unrelated-to-this-change) /users endpoints. NOTE: despite the local bakend/ schema still showing
// `email_id`, the live backend's POST /employees now validates a required `email` field too (error:
// "Email is required to create the Employees login account") — confirmed 2026-08-14 against the
// real deployed backend, which has moved ahead of what's checked into bakend/ here. `create` below
// sends `email` accordingly; `update`'s PUT /employees still sends `email_id` and hasn't been
// re-verified against the live backend.
const REAL_USER_LOOKUP_PARAMS = { limit: 200, status: 'all' };
// Used only to backfill a login for a pre-existing employee that never had one, when the admin
// assigns it a role via Employee Master's edit form (which collects a role but no password) —
// same fixed starter password the mock uses (see generateTemporaryPassword above).
const BACKFILL_PASSWORD = 'Gtt@1234';
// Real GET /employees has no role_id filter and returns no role data of its own (no User/Role
// join — see bakend/src/repositories/employeeRepository.js). This bounds how many employees the
// Role filter/column can consider on the real backend: enough for a typical company, but if a
// company has more than this many employees, matches past this bound silently won't be found —
// same bound the rest of this app already accepts for cross-referencing Users
// (useAssignableManagers/useUserByEmployeeId use the same 100-row real-backend page cap).
const REAL_ROLE_FILTER_SCAN_LIMIT = 100;

// GET /employees (real backend) has no role/user join at all — enrich each employee with its
// linked User's role by cross-referencing GET /users client-side, then reshape into the exact
// same { role, additionalRoles } shape serializeEmployeeFull already produces for the mock, so
// EmployeeList/EmployeeForm don't need to know which backend is live. The real GET /users
// response already returns `role` (primary) + `additionalRoles` (extras) directly — confirmed
// against a live response — so this is a straight passthrough, not a derived split.
const enrichWithRealRole = async (employees) => {
  if (!employees.length) return employees;
  const usersRes = await usersApi.getAll(REAL_USER_LOOKUP_PARAMS);
  const byEmployeeId = new Map(
    (usersRes?.data ?? []).filter((u) => u.employee_id != null).map((u) => [u.employee_id, u])
  );
  return employees.map((e) => {
    const u = byEmployeeId.get(e.id);
    return {
      ...e,
      email: e.email_id || u?.email || null,
      role_id: u?.role?.id ?? null,
      role: u?.role ?? null,
      additionalRoles: u?.additionalRoles ?? [],
    };
  });
};

// role_ids[0] is the primary role (drives hierarchy/scoping); role_ids[1:] are additional,
// purely-additive operational roles (§4) — same split users.api.js's mock uses.
const splitRoleIds = (roleIds) => {
  const [primaryRoleId, ...additionalRoleIds] = roleIds ?? [];
  return { primaryRoleId, additionalRoleIds };
};

// Validates and resolves a role_ids array against the actor's Role Creation Matrix, returning
// the target primary role plus the additional role rows to store on the linked user.
//
// Employee Master always allows assigning the plain Employee role, regardless of the actor's own
// tier — the Role Creation Matrix's HR entry is deliberately empty ("HR creates Employee via the
// dedicated Employee-creation flow, not the generic Users screen", see roleHierarchy.js), which
// used to be enforced by the old Employee form hardcoding role_id to Employee with no picker at
// all. Every role beyond plain Employee still goes through the real matrix (users.api.js's mock
// keeps the strict, non-bypassed check for the same matrix, unaffected by this).
const resolveRoles = (roleIds, actor) => {
  const { primaryRoleId, additionalRoleIds } = splitRoleIds(roleIds);
  const targetRole = findRoleById(Number(primaryRoleId));
  if (!targetRole) throw mockError(422, 'Invalid role.');
  if (actor && targetRole.role_name !== ROLE_NAMES.EMPLOYEE) {
    assertCanAssignRole(findRoleById(actor.role_id).role_name, targetRole.role_name);
  }
  const additionalRoles = additionalRoleIds.map((rid) => findRoleById(Number(rid))).filter(Boolean);
  additionalRoles.forEach((r) => assertValidAdditionalRole(r.role_name));
  return { targetRole, additionalRoles };
};

const serializeEmployeeFull = (employee) => {
  if (!employee) return null;
  const linkedUser = findUserById(employee.linked_user_id);
  const role = linkedUser ? findRoleById(linkedUser.role_id) : null;
  const additionalRoles = (linkedUser?.additional_role_ids ?? []).map(findRoleById).filter(Boolean);
  return {
    ...employee,
    email: linkedUser?.email ?? null,
    role_id: linkedUser?.role_id ?? null,
    role: role && { id: role.id, role_name: role.role_name },
    additionalRoles: additionalRoles.map((r) => ({ id: r.id, role_name: r.role_name })),
  };
};

const mockGetAll = async (params) => {
  await delay();
  const result = paginate(getDb().employees, {
    ...params,
    searchFields: ['full_name', 'employee_code'],
    filter: (e) => {
      if (params?.role_id) {
        const linkedUser = findUserById(e.linked_user_id);
        if (!linkedUser || linkedUser.role_id !== Number(params.role_id)) return false;
      }
      return true;
    },
  });
  return { success: true, message: 'OK', data: result.data.map(serializeEmployeeFull), meta: result.meta };
};

const mockGetActiveList = async () => {
  await delay();
  return getDb().employees.filter((e) => e.status === 'active').map(serializeEmployeeFull);
};

const mockGetById = async (id) => {
  await delay();
  return serializeEmployeeFull(findEmployeeById(Number(id)));
};

const mockCreate = async (payload) => {
  await delay();
  const actor = getCurrentMockUser();
  if (!payload.email) throw mockError(422, 'Email is required.');
  if (!payload.password) throw mockError(422, 'Password is required.');
  if (getDb().users.some((u) => u.email.toLowerCase() === payload.email.toLowerCase())) {
    throw mockError(409, 'A user with this email already exists.');
  }

  // The Employee form always sends role_ids now — the Employee-role fallback only covers
  // programmatic callers (e.g. import) that don't.
  const roleIds = payload.role_ids?.length ? payload.role_ids : [findRoleByName('Employee').id];
  const { targetRole, additionalRoles } = resolveRoles(roleIds, actor);

  const employee = {
    id: nextId('employees'),
    company_id: actor?.company_id ?? 1,
    employee_code: payload.employee_code,
    full_name: payload.full_name,
    designation: payload.designation ?? null,
    total_experience: payload.total_experience ?? null,
    company_experience: payload.company_experience ?? null,
    resource_description: payload.resource_description ?? '',
    date_of_joining: payload.date_of_joining,
    date_of_leaving: payload.date_of_leaving ?? null,
    status: payload.status ?? 'active',
    primary_manager_user_id: payload.primary_manager_user_id ? Number(payload.primary_manager_user_id) : null,
    secondary_manager_user_id: payload.secondary_manager_user_id ? Number(payload.secondary_manager_user_id) : null,
    is_timesheet_approval_required: payload.is_timesheet_approval_required ?? true,
    linked_user_id: null,
  };
  getDb().employees.push(employee);

  const user = {
    id: nextId('users'),
    company_id: employee.company_id,
    employee_id: employee.id,
    email: payload.email,
    password: payload.password,
    role_id: targetRole.id,
    additional_role_ids: additionalRoles.map((r) => r.id),
    status: payload.status ?? 'active',
    last_login: null,
  };
  getDb().users.push(user);
  employee.linked_user_id = user.id;
  persist();

  return {
    success: true,
    message: 'Employee created successfully.',
    data: {
      employee: { id: employee.id, employee_code: employee.employee_code, full_name: employee.full_name, company_id: employee.company_id, status: employee.status },
      user: { id: user.id, email: user.email, role_id: user.role_id, employee_id: employee.id, company_id: user.company_id, status: user.status },
    },
  };
};

const mockUpdate = async (id, payload) => {
  await delay();
  const employee = findEmployeeById(Number(id));
  if (!employee) throw mockError(404, 'Employee not found.');
  const { email, role_ids, ...next } = { ...payload };
  if ('primary_manager_user_id' in next && next.primary_manager_user_id != null) {
    next.primary_manager_user_id = Number(next.primary_manager_user_id);
  }
  if ('secondary_manager_user_id' in next) {
    next.secondary_manager_user_id = next.secondary_manager_user_id == null ? null : Number(next.secondary_manager_user_id);
  }
  Object.assign(employee, next);

  const actor = getCurrentMockUser();
  let linkedUser = findUserById(employee.linked_user_id);
  let justCreatedUser = false;

  // Email lives on the linked user record, not the employee — Object.assign above would
  // otherwise silently drop it (serializeEmployeeFull always re-derives email from the user).
  if (email) {
    const emailTaken = getDb().users.some(
      (u) => u.id !== linkedUser?.id && u.email.toLowerCase() === email.toLowerCase()
    );
    if (emailTaken) throw mockError(409, 'A user with this email already exists.');

    if (linkedUser) {
      linkedUser.email = email;
    } else {
      const roleIds = role_ids?.length ? role_ids : [findRoleByName('Employee').id];
      const { targetRole, additionalRoles } = resolveRoles(roleIds, actor);
      linkedUser = {
        id: nextId('users'),
        company_id: employee.company_id,
        employee_id: employee.id,
        email,
        password: generateTemporaryPassword(),
        role_id: targetRole.id,
        additional_role_ids: additionalRoles.map((r) => r.id),
        status: 'active',
        last_login: null,
      };
      getDb().users.push(linkedUser);
      employee.linked_user_id = linkedUser.id;
      justCreatedUser = true;
    }
  }

  // Sending role_ids at all replaces the entire role set (primary + additional together) on the
  // linked user, same semantics as users.api.js's mockUpdate (§4) — skipped when the branch above
  // just created the linked user, since these role_ids were already applied there.
  if (role_ids != null && linkedUser && !justCreatedUser) {
    const [primaryRoleId, ...additionalRoleIds] = role_ids;
    if (Number(primaryRoleId) !== linkedUser.role_id) {
      const targetRole = findRoleById(Number(primaryRoleId));
      if (!targetRole) throw mockError(422, 'Invalid role.');
      if (actor && targetRole.role_name !== ROLE_NAMES.EMPLOYEE) {
        assertCanAssignRole(findRoleById(actor.role_id).role_name, targetRole.role_name);
      }
    }
    const additionalRoles = additionalRoleIds.map((rid) => findRoleById(Number(rid))).filter(Boolean);
    additionalRoles.forEach((r) => assertValidAdditionalRole(r.role_name));
    linkedUser.role_id = Number(primaryRoleId);
    linkedUser.additional_role_ids = additionalRoles.map((r) => r.id);
  }

  persist();
  return { success: true, message: 'Employee updated successfully.', data: serializeEmployeeFull(employee) };
};

const mockDelete = async (id) => {
  await delay();
  const employee = findEmployeeById(Number(id));
  if (!employee) throw mockError(404, 'Employee not found.');
  employee.status = 'inactive';
  persist();
  return { success: true, message: 'Employee deleted successfully.' };
};

// Real GET /employees can't filter by role_id server-side — scan a bounded batch, enrich with
// role, filter client-side, then re-paginate the matches ourselves using the page/limit the
// caller actually asked for.
const realGetAllByRole = async (roleId, employeeParams) => {
  const { status, search } = employeeParams;
  const batchRes = await apiClient
    .get('/employees', { params: { page: 1, limit: REAL_ROLE_FILTER_SCAN_LIMIT, status, search } })
    .then((r) => r.data);
  const enriched = await enrichWithRealRole(batchRes?.data ?? []);
  const matches = enriched.filter((e) => e.role_id === Number(roleId));

  const page = Number(employeeParams.page) || 1;
  const limit = Number(employeeParams.limit) || 10;
  const start = (page - 1) * limit;
  const total = matches.length;
  return {
    success: true,
    message: batchRes?.message ?? 'OK',
    data: matches.slice(start, start + limit),
    meta: { total, page, limit, totalPages: Math.ceil(total / limit) || 0, hasNext: page * limit < total, hasPrev: page > 1 },
  };
};

export const employeesApi = {
  getAll: async (params) => {
    if (RBAC_MOCK_ENABLED) return mockGetAll(params);
    const { role_id, ...employeeParams } = params ?? {};
    if (role_id) return realGetAllByRole(role_id, employeeParams);
    const employeesRes = await apiClient.get('/employees', { params: employeeParams }).then((r) => r.data);
    const data = await enrichWithRealRole(employeesRes?.data ?? []);
    return { ...employeesRes, data };
  },

  getActiveList: () => {
    if (RBAC_MOCK_ENABLED) return mockGetActiveList();
    return apiClient.get('/employees/active/list').then((r) => r.data?.data ?? []);
  },

  getById: async (id) => {
    if (RBAC_MOCK_ENABLED) return mockGetById(id);
    const employee = await apiClient.get(`/employees/${id}`).then((r) => r.data?.data);
    if (!employee) return employee;
    const [enriched] = await enrichWithRealRole([employee]);
    return enriched;
  },

  // Creates the Employee record, then provisions its login/role via POST /users (see the
  // module comment above — the real /employees endpoint has no fields for either). If the
  // second call fails, the Employee still exists with no login; re-opening it in Edit and
  // saving a Role again will backfill one (see `update` below).
  create: async (payload) => {
    if (RBAC_MOCK_ENABLED) return mockCreate(payload);
    const { role_ids, password, email, ...employeeFields } = payload;
    const employeeRes = await apiClient.post('/employees', { ...employeeFields, email }).then((r) => r.data);
    const employeeId = employeeRes?.data?.id;
    if (employeeId) {
      await apiClient.post('/users', {
        email,
        password,
        confirm_password: password,
        role_ids,
        employee_id: employeeId,
        status: employeeFields.status ?? 'active',
      });
    }
    return employeeRes;
  },

  // Updates the Employee record, then the linked User's role/email via PUT /users/:id — found
  // by scanning GET /users for this employee_id, since GET /employees doesn't return one. An
  // employee with no login yet gets one backfilled here (BACKFILL_PASSWORD) the first time a
  // Role is saved for it.
  update: async (id, payload) => {
    if (RBAC_MOCK_ENABLED) return mockUpdate(id, payload);
    const { role_ids, email, ...employeeFields } = payload;
    const employeeBody = { ...employeeFields };
    if (email !== undefined) employeeBody.email_id = email;
    const employeeRes = await apiClient.put(`/employees/${id}`, employeeBody).then((r) => r.data);

    if (role_ids != null || email) {
      const usersRes = await usersApi.getAll(REAL_USER_LOOKUP_PARAMS);
      const linkedUser = (usersRes?.data ?? []).find((u) => u.employee_id === Number(id));

      if (linkedUser) {
        const userPayload = {};
        if (role_ids != null) userPayload.role_ids = role_ids;
        if (email) userPayload.email = email;
        if (Object.keys(userPayload).length) {
          await apiClient.put(`/users/${linkedUser.id}`, userPayload);
        }
      } else if (email && role_ids?.length) {
        await apiClient.post('/users', {
          email,
          password: BACKFILL_PASSWORD,
          confirm_password: BACKFILL_PASSWORD,
          role_ids,
          employee_id: Number(id),
          status: employeeFields.status ?? 'active',
        });
      }
    }

    return employeeRes;
  },

  delete: (id) => {
    if (RBAC_MOCK_ENABLED) return mockDelete(id);
    return apiClient.delete(`/employees/${id}`, { data: { is_delete: true } }).then((r) => r.data);
  },

  // Service PO's Delivery Head dropdown — a real, freshly-shipped backend feature unrelated to
  // the RBAC redesign mock, so this always hits the real backend regardless of RBAC_MOCK_ENABLED.
  getEligibleDeliveryHeads: () =>
    apiClient.get('/employees/eligible-delivery-heads').then((r) => r.data),

  // Unaffected by the RBAC redesign — always hits the real backend.
  import: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiClient.post('/employees/import', formData, {
      headers: {
        'Content-Type': 'multipart/form-data',
      },
    }).then((r) => r.data);
  },
};
