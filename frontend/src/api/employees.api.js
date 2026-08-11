import apiClient from '@/services/apiClient';
import { RBAC_MOCK_ENABLED } from '@/mocks/rbacMockConfig';
import {
  delay, getDb, persist, nextId, paginate, findEmployeeById, findUserById, findRoleByName,
  getCurrentMockUser, mockError, generateTemporaryPassword,
} from '@/mocks/rbacMockDb';

const serializeEmployeeFull = (employee) => employee && {
  ...employee,
  email: findUserById(employee.linked_user_id)?.email ?? null,
};

const mockGetAll = async (params) => {
  await delay();
  const result = paginate(getDb().employees, { ...params, searchFields: ['full_name', 'employee_code'] });
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
  if (getDb().users.some((u) => u.email.toLowerCase() === payload.email.toLowerCase())) {
    throw mockError(409, 'A user with this email already exists.');
  }

  const employeeRole = findRoleByName('Employee');
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

  const usedTemporaryPassword = !payload.password;
  const temporaryPassword = usedTemporaryPassword ? generateTemporaryPassword() : null;
  const user = {
    id: nextId('users'),
    company_id: employee.company_id,
    employee_id: employee.id,
    email: payload.email,
    password: payload.password || temporaryPassword,
    role_id: employeeRole.id,
    status: 'active',
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
      ...(usedTemporaryPassword ? { temporaryPassword } : {}),
    },
  };
};

const mockUpdate = async (id, payload) => {
  await delay();
  const employee = findEmployeeById(Number(id));
  if (!employee) throw mockError(404, 'Employee not found.');
  const { email, ...next } = { ...payload };
  if ('primary_manager_user_id' in next && next.primary_manager_user_id != null) {
    next.primary_manager_user_id = Number(next.primary_manager_user_id);
  }
  if ('secondary_manager_user_id' in next) {
    next.secondary_manager_user_id = next.secondary_manager_user_id == null ? null : Number(next.secondary_manager_user_id);
  }
  Object.assign(employee, next);

  // Email lives on the linked user record, not the employee — Object.assign above would
  // otherwise silently drop it (serializeEmployeeFull always re-derives email from the user).
  if (email) {
    const linkedUser = findUserById(employee.linked_user_id);
    const emailTaken = getDb().users.some(
      (u) => u.id !== linkedUser?.id && u.email.toLowerCase() === email.toLowerCase()
    );
    if (emailTaken) throw mockError(409, 'A user with this email already exists.');

    if (linkedUser) {
      linkedUser.email = email;
    } else {
      const employeeRole = findRoleByName('Employee');
      const user = {
        id: nextId('users'),
        company_id: employee.company_id,
        employee_id: employee.id,
        email,
        password: generateTemporaryPassword(),
        role_id: employeeRole.id,
        status: 'active',
        last_login: null,
      };
      getDb().users.push(user);
      employee.linked_user_id = user.id;
    }
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

export const employeesApi = {
  getAll: (params) => {
    if (RBAC_MOCK_ENABLED) return mockGetAll(params);
    return apiClient.get('/employees', { params }).then((r) => r.data);
  },

  getActiveList: () => {
    if (RBAC_MOCK_ENABLED) return mockGetActiveList();
    return apiClient.get('/employees/active/list').then((r) => r.data?.data ?? []);
  },

  getById: (id) => {
    if (RBAC_MOCK_ENABLED) return mockGetById(id);
    return apiClient.get(`/employees/${id}`).then((r) => r.data?.data);
  },

  create: (payload) => {
    if (RBAC_MOCK_ENABLED) return mockCreate(payload);
    return apiClient.post('/employees', payload).then((r) => r.data);
  },

  update: (id, payload) => {
    if (RBAC_MOCK_ENABLED) return mockUpdate(id, payload);
    return apiClient.put(`/employees/${id}`, payload).then((r) => r.data);
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
