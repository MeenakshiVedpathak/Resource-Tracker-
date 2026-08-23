import apiClient from '@/services/apiClient';
import { RBAC_MOCK_ENABLED } from '@/mocks/rbacMockConfig';
import {
  delay, getDb, persist, nextId, paginate, findEmployeeById, findRoleById, findRoleByName,
  getCurrentMockEmployee, assertCanAssignRole, assertValidAdditionalRole, assertAtMostOneSeniorRole,
  mockError, serializeEmployeeFull,
} from '@/mocks/rbacMockDb';
import { ROLE_NAMES, SENIOR_ROLE_NAMES } from '@/constants/roleHierarchy';

// Employee Identity Migration: login moved from a separate `users` table directly onto Employee
// Master. `role_ids`/`business_unit_ids`/`password` now live directly on the employee record —
// there is no more secondary /users call to orchestrate (the old two-call create/update dance,
// and the enrichWithRealRole cross-reference against GET /users, are both gone). ⚠️ The real
// backend's controller code for this contract hasn't been written yet (DB schema only, validated
// in an isolated test DB) — field names below (snake_case, matching this app's existing
// convention) and the exact GET /employees role-filter behavior are the agreed target, not a
// confirmed live contract. Confirm against the real Swagger/controller once implemented.

// Real GET /employees may or may not support server-side `role_id` filtering yet — this bounds
// how many employees the Role filter/column can consider if it doesn't: enough for a typical
// company, but a match past this bound silently won't be found. Same bound this app already
// accepted for the equivalent pre-migration workaround.
const REAL_ROLE_FILTER_SCAN_LIMIT = 100;

const resolveRoles = (roleIds, actorRoleObjects) => {
  const roles = (roleIds ?? []).map((rid) => findRoleById(Number(rid))).filter(Boolean);
  if (!roles.length) throw mockError(422, 'Select at least one role.');
  assertAtMostOneSeniorRole(roleIds);

  const seniorRole = roles.find((r) => SENIOR_ROLE_NAMES.includes(r.role_name));
  const actorSeniorRoleName = (actorRoleObjects ?? []).map((r) => r.role_name).find((n) => SENIOR_ROLE_NAMES.includes(n));

  roles.forEach((r) => {
    if (r.role_name === ROLE_NAMES.EMPLOYEE) return; // always allowed, per the standing HR bypass
    if (r === seniorRole) {
      if (actorSeniorRoleName) assertCanAssignRole(actorSeniorRoleName, r.role_name);
    } else {
      assertValidAdditionalRole(r.role_name);
    }
  });

  return roles;
};

const mockGetAll = async (params) => {
  await delay();
  const result = paginate(getDb().employees, {
    ...params,
    searchFields: ['full_name', 'employee_code'],
    filter: (e) => {
      if (params?.role_id) {
        const targetId = Number(params.role_id);
        if (!(e.role_ids ?? []).includes(targetId)) return false;
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
  const db = getDb();
  if (!payload.email) throw mockError(422, 'Email is required.');
  if (!payload.password) throw mockError(422, 'Password is required.');
  if (db.employees.some((e) => e.email.toLowerCase() === payload.email.toLowerCase())) {
    throw mockError(409, 'An employee with this email already exists.');
  }

  const actor = getCurrentMockEmployee();
  const actorRoleObjects = (actor?.role_ids ?? []).map(findRoleById).filter(Boolean);
  const roleIds = payload.role_ids?.length ? payload.role_ids : [findRoleByName(ROLE_NAMES.EMPLOYEE).id];
  resolveRoles(roleIds, actorRoleObjects);

  const employee = {
    id: nextId('employees'),
    employee_code: payload.employee_code,
    full_name: payload.full_name,
    email: payload.email,
    password: payload.password,
    designation: payload.designation ?? null,
    total_experience: payload.total_experience ?? null,
    company_experience: payload.company_experience ?? null,
    resource_description: payload.resource_description ?? '',
    date_of_joining: payload.date_of_joining,
    date_of_leaving: payload.date_of_leaving ?? null,
    status: payload.status ?? 'active',
    role_ids: roleIds.map(Number),
    // Business Units are no longer picked on the create form itself — they start empty and are
    // assigned afterwards via Employee List's "Map Roles & Business Units" table action.
    business_unit_ids: (payload.business_unit_ids ?? []).map(Number),
    primary_manager_employee_id: payload.primary_manager_employee_id ? Number(payload.primary_manager_employee_id) : null,
    secondary_manager_employee_id: payload.secondary_manager_employee_id ? Number(payload.secondary_manager_employee_id) : null,
    is_timesheet_approval_required: payload.is_timesheet_approval_required ?? true,
  };
  db.employees.push(employee);
  persist();

  return { success: true, message: 'Employee created successfully.', data: serializeEmployeeFull(employee) };
};

const mockUpdate = async (id, payload) => {
  await delay();
  const employee = findEmployeeById(Number(id));
  if (!employee) throw mockError(404, 'Employee not found.');

  const { role_ids, business_unit_ids, email, primary_manager_employee_id, secondary_manager_employee_id, ...next } = { ...payload };

  if (email) {
    const emailTaken = getDb().employees.some(
      (e) => e.id !== employee.id && e.email.toLowerCase() === email.toLowerCase()
    );
    if (emailTaken) throw mockError(409, 'An employee with this email already exists.');
    employee.email = email;
  }

  if (role_ids != null) {
    const actor = getCurrentMockEmployee();
    const actorRoleObjects = (actor?.role_ids ?? []).map(findRoleById).filter(Boolean);
    resolveRoles(role_ids, actorRoleObjects);
    employee.role_ids = role_ids.map(Number);
  }

  if (business_unit_ids != null) {
    if (!Array.isArray(business_unit_ids) || business_unit_ids.length === 0) {
      throw mockError(422, 'Select at least one business unit.');
    }
    employee.business_unit_ids = business_unit_ids.map(Number);
  }

  if ('primary_manager_employee_id' in payload) {
    employee.primary_manager_employee_id = primary_manager_employee_id != null ? Number(primary_manager_employee_id) : null;
  }
  if ('secondary_manager_employee_id' in payload) {
    employee.secondary_manager_employee_id = secondary_manager_employee_id != null ? Number(secondary_manager_employee_id) : null;
  }

  Object.assign(employee, next);
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

// Real GET /employees may not support server-side role filtering yet — scan a bounded batch and
// filter/re-paginate client-side against the `roles` the endpoint returns inline on each row.
const realGetAllByRole = async (roleId, employeeParams) => {
  const { status, search } = employeeParams;
  const batchRes = await apiClient
    .get('/employees', { params: { page: 1, limit: REAL_ROLE_FILTER_SCAN_LIMIT, status, search } })
    .then((r) => r.data);
  const targetId = Number(roleId);
  const matches = (batchRes?.data ?? []).filter((e) => (e.roles ?? []).some((r) => r.id === targetId));

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
    return apiClient.get('/employees', { params: employeeParams }).then((r) => r.data);
  },

  getActiveList: () => {
    if (RBAC_MOCK_ENABLED) return mockGetActiveList();
    return apiClient.get('/employees/active/list').then((r) => r.data?.data ?? []);
  },

  getById: async (id) => {
    if (RBAC_MOCK_ENABLED) return mockGetById(id);
    return apiClient.get(`/employees/${id}`).then((r) => r.data?.data);
  },

  // Powers the Employee List row action's "Map Roles & Business Units" dialog. GET /employees
  // (list) doesn't carry role/BU data, so the dialog can't seed its checkboxes from row data —
  // this dedicated endpoint reads the same employee_roles/employee_business_units tables the
  // existing detail GET and PUT already use, just scoped to one employee.
  getMappings: async (id) => {
    if (RBAC_MOCK_ENABLED) {
      await delay();
      const employee = findEmployeeById(Number(id));
      if (!employee) throw mockError(404, 'Employee not found.');
      return {
        employee_id: employee.id,
        role_ids: employee.role_ids ?? [],
        business_unit_ids: employee.business_unit_ids ?? [],
      };
    }
    return apiClient.get(`/employees/${id}/mappings`).then((r) => r.data?.data);
  },

  // Posts role_ids/business_unit_ids/password directly to /employees — no second call to
  // provision a login, since the employee IS the login now.
  create: (payload) => {
    if (RBAC_MOCK_ENABLED) return mockCreate(payload);
    return apiClient.post('/employees', payload).then((r) => r.data);
  },

  // Sending role_ids/business_unit_ids at all replaces the entire respective set — the backend
  // does the add/keep/remove reconciliation server-side against the full array sent, not a diff
  // the frontend computes (per the confirmed update semantics).
  update: (id, payload) => {
    if (RBAC_MOCK_ENABLED) return mockUpdate(id, payload);
    return apiClient.put(`/employees/${id}`, payload).then((r) => r.data);
  },

  delete: (id) => {
    if (RBAC_MOCK_ENABLED) return mockDelete(id);
    return apiClient.delete(`/employees/${id}`, { data: { is_delete: true } }).then((r) => r.data);
  },

  // ⚠️ Guessed contract, mirroring the retired PUT /users/:id/reset-password shape exactly,
  // just re-targeted at the employee directly (there's no more separate User id to look up) —
  // confirm once the real controller code lands.
  resetPassword: (id, newPassword, confirmPassword) => {
    if (RBAC_MOCK_ENABLED) {
      return (async () => {
        await delay();
        if (newPassword !== confirmPassword) throw mockError(422, 'Passwords do not match.');
        const employee = findEmployeeById(Number(id));
        if (!employee) throw mockError(404, 'Employee not found.');
        employee.password = newPassword;
        persist();
        return { success: true, message: 'Password reset successfully.' };
      })();
    }
    return apiClient.put(`/employees/${id}/reset-password`, { new_password: newPassword, confirm_password: confirmPassword }).then((r) => r.data);
  },

  // Service PO's Delivery Head dropdown — a real, freshly-shipped backend feature unrelated to
  // this migration, so this always hits the real backend regardless of RBAC_MOCK_ENABLED.
  getEligibleDeliveryHeads: () =>
    apiClient.get('/employees/eligible-delivery-heads').then((r) => r.data),

  // Unaffected by this migration — always hits the real backend.
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
