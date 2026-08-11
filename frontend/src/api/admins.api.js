import apiClient from '@/services/apiClient';
import { RBAC_MOCK_ENABLED } from '@/mocks/rbacMockConfig';
import {
  delay, getDb, persist, nextId, paginate, findUserById, findRoleByName, mockError,
} from '@/mocks/rbacMockDb';

const isAdmin = (user) => findRoleByName('Admin').id === user.role_id;

const serialize = (user) => user && {
  id: user.id,
  email: user.email,
  status: user.status,
  role_id: user.role_id,
  company_id: user.company_id,
};

// Platform Admin only (§6.1).
const mockCreate = async (payload) => {
  await delay();
  if (getDb().users.some((u) => u.email.toLowerCase() === payload.email.toLowerCase())) {
    throw mockError(409, 'A user with this email already exists.');
  }
  const adminRole = findRoleByName('Admin');
  const user = {
    id: nextId('users'),
    company_id: null,
    employee_id: null,
    email: payload.email,
    password: payload.password,
    role_id: adminRole.id,
    status: 'active',
    last_login: null,
  };
  getDb().users.push(user);
  persist();
  return { success: true, message: 'Admin created successfully.', data: serialize(user) };
};

const mockGetAll = async (params) => {
  await delay();
  const result = paginate(getDb().users.filter(isAdmin), { ...params, searchFields: ['email'] });
  return { success: true, message: 'OK', data: result.data.map(serialize), meta: result.meta };
};

const mockGetById = async (id) => {
  await delay();
  const user = findUserById(Number(id));
  if (!user || !isAdmin(user)) throw mockError(404, 'Admin not found.');
  return serialize(user);
};

const mockUpdate = async (id, payload) => {
  await delay();
  const user = findUserById(Number(id));
  if (!user || !isAdmin(user)) throw mockError(404, 'Admin not found.');
  Object.assign(user, payload);
  persist();
  return { success: true, message: 'Admin updated successfully.', data: serialize(user) };
};

const mockUpdateStatus = async (id, status) => {
  await delay();
  const user = findUserById(Number(id));
  if (!user || !isAdmin(user)) throw mockError(404, 'Admin not found.');
  user.status = status;
  persist();
  return { success: true, message: 'Status updated successfully.', data: serialize(user) };
};

export const adminsApi = {
  create: (payload) => {
    if (RBAC_MOCK_ENABLED) return mockCreate(payload);
    return apiClient.post('/admins', payload).then((r) => r.data);
  },
  getAll: (params) => {
    if (RBAC_MOCK_ENABLED) return mockGetAll(params);
    return apiClient.get('/admins', { params }).then((r) => r.data);
  },
  getById: (id) => {
    if (RBAC_MOCK_ENABLED) return mockGetById(id);
    return apiClient.get(`/admins/${id}`).then((r) => r.data?.data);
  },
  update: (id, payload) => {
    if (RBAC_MOCK_ENABLED) return mockUpdate(id, payload);
    return apiClient.put(`/admins/${id}`, payload).then((r) => r.data);
  },
  updateStatus: (id, status) => {
    if (RBAC_MOCK_ENABLED) return mockUpdateStatus(id, status);
    return apiClient.patch(`/admins/${id}/status`, { status }).then((r) => r.data);
  },
};
