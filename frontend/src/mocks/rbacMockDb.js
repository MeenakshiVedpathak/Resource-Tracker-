// In-memory mock "backend" for the RBAC redesign spec (see rbacMockConfig.js for why this
// exists). Persisted to sessionStorage so a page refresh mid-demo doesn't lose state; a new
// browser tab/session starts fresh from the seed below.
import { ROLE_HIERARCHY, ROLE_NAMES, ROLE_CREATION_MATRIX, NO_COMPANY_ROLES } from '@/constants/roleHierarchy';
import { getAccessToken } from '@/services/apiClient';

const STORAGE_KEY = 'rbac_mock_db_v1';

// Every seeded account shares this password — documented in the final summary so the app is
// actually click-through testable per role.
export const MOCK_PASSWORD = 'Test@1234';
export const MOCK_OTP = '582194';

export const delay = (ms = 300) => new Promise((resolve) => setTimeout(resolve, ms));

const buildSeed = () => {
  const roles = ROLE_HIERARCHY.map((r, i) => ({
    id: i + 1,
    role_name: r.name,
    permission: r.name === ROLE_NAMES.EMPLOYEE ? 'Read' : 'Read & Write',
    status: 'active',
    hierarchy_rank: r.hierarchy_rank,
    inherits_role_id: null,
    is_original_data_visible: [ROLE_NAMES.HR, ROLE_NAMES.BU_ADMIN].includes(r.name),
    is_system: true,
    created_at: '2026-01-01T00:00:00.000Z',
  }));
  const roleId = (name) => roles.find((r) => r.role_name === name).id;
  // Project Admin / Service PO Admin "inherit Manager's capabilities" per spec §3.1, modeled as
  // a chain matching the hierarchy diagram: Project Admin -> Service PO Admin -> Manager.
  roles.find((r) => r.role_name === ROLE_NAMES.SERVICE_PO_ADMIN).inherits_role_id = roleId(ROLE_NAMES.PROJECT_ADMIN);
  roles.find((r) => r.role_name === ROLE_NAMES.PROJECT_ADMIN).inherits_role_id = roleId(ROLE_NAMES.MANAGER);

  const users = [
    { id: 1, company_id: null, employee_id: null, email: 'platformadmin@mock.test', password: MOCK_PASSWORD, role_id: roleId(ROLE_NAMES.PLATFORM_ADMIN), status: 'active', last_login: null },
    { id: 2, company_id: null, employee_id: null, email: 'admin@mock.test', password: MOCK_PASSWORD, role_id: roleId(ROLE_NAMES.ADMIN), status: 'active', last_login: null },
    { id: 3, company_id: null, employee_id: null, email: 'entityadmin@mock.test', password: MOCK_PASSWORD, role_id: roleId(ROLE_NAMES.ENTITY_ADMIN), status: 'active', last_login: null },
    { id: 4, company_id: 1, employee_id: null, email: 'buadmin@mock.test', password: MOCK_PASSWORD, role_id: roleId(ROLE_NAMES.BU_ADMIN), status: 'active', last_login: null },
    { id: 5, company_id: 1, employee_id: null, email: 'projectadmin@mock.test', password: MOCK_PASSWORD, role_id: roleId(ROLE_NAMES.PROJECT_ADMIN), status: 'active', last_login: null },
    { id: 6, company_id: 1, employee_id: null, email: 'servicepoadmin@mock.test', password: MOCK_PASSWORD, role_id: roleId(ROLE_NAMES.SERVICE_PO_ADMIN), status: 'active', last_login: null },
    { id: 7, company_id: 1, employee_id: null, email: 'manager@mock.test', password: MOCK_PASSWORD, role_id: roleId(ROLE_NAMES.MANAGER), status: 'active', last_login: null },
    { id: 8, company_id: 1, employee_id: null, email: 'hr@mock.test', password: MOCK_PASSWORD, role_id: roleId(ROLE_NAMES.HR), status: 'active', last_login: null },
    { id: 9, company_id: 1, employee_id: 1, email: 'employee@mock.test', password: MOCK_PASSWORD, role_id: roleId(ROLE_NAMES.EMPLOYEE), status: 'active', last_login: null },
    { id: 10, company_id: 1, employee_id: null, email: 'manager2@mock.test', password: MOCK_PASSWORD, role_id: roleId(ROLE_NAMES.MANAGER), status: 'active', last_login: null },
  ];

  const employees = [
    {
      id: 1, company_id: 1, employee_code: 'EMP-0001', full_name: 'Stage3 Smoketest Employee',
      designation: 'Software Engineer', total_experience: 3.5, company_experience: 1.0,
      resource_description: '', date_of_joining: '2025-01-15', date_of_leaving: null,
      status: 'active', primary_manager_user_id: 7, secondary_manager_user_id: null, linked_user_id: 9,
    },
    {
      id: 2, company_id: 1, employee_code: 'EMP-0002', full_name: 'Jordan Lee',
      designation: 'QA Engineer', total_experience: 2.0, company_experience: 2.0,
      resource_description: '', date_of_joining: '2024-06-01', date_of_leaving: null,
      status: 'active', primary_manager_user_id: 10, secondary_manager_user_id: null, linked_user_id: null,
    },
  ];

  return {
    meta: { nextIds: { users: 11, employees: 3, roles: roles.length + 1, teamMappings: 2, managerServicePoGrants: 1, employeeServicePoGrants: 1 } },
    roles,
    users,
    employees,
    teamMappings: [
      { id: 1, company_id: 1, service_po_admin_user_id: 6, manager_user_id: 7, status: 'active' },
    ],
    managerServicePoGrants: [],
    employeeServicePoGrants: [],
    otpStore: {},
  };
};

const load = () => {
  try {
    const raw = sessionStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    // fall through to a fresh seed
  }
  return buildSeed();
};

let db = load();

export const persist = () => {
  try {
    sessionStorage.setItem(STORAGE_KEY, JSON.stringify(db));
  } catch {
    // sessionStorage unavailable (private mode, quota) — mock still works for this page load
  }
};

export const resetMockDb = () => {
  db = buildSeed();
  persist();
};

export const getDb = () => db;

export const nextId = (collection) => {
  const id = db.meta.nextIds[collection];
  db.meta.nextIds[collection] += 1;
  return id;
};

// ── Lookups ──
export const findRoleById = (id) => db.roles.find((r) => r.id === id);
export const findRoleByName = (name) => db.roles.find((r) => r.role_name === name);
export const findUserById = (id) => db.users.find((u) => u.id === id);
export const findEmployeeById = (id) => db.employees.find((e) => e.id === id);

// The mock's "auth" — no real JWT, just `mock.<userId>` issued at login and decoded back here.
// Every mocked endpoint that needs to know "who is calling" reads it directly off localStorage
// rather than threading a token through every function (there's no real network hop to carry it
// on for a mock).
export const issueTokenFor = (userId) => `mock.${userId}.${Date.now()}`;
export const getCurrentMockUser = () => {
  const token = getAccessToken();
  if (!token?.startsWith('mock.')) return null;
  const userId = Number(token.split('.')[1]);
  return findUserById(userId) ?? null;
};

export const serializeRole = (role) => role && {
  id: role.id,
  role_name: role.role_name,
  permission: role.permission,
  status: role.status,
  hierarchy_rank: role.hierarchy_rank,
  inherits_role_id: role.inherits_role_id,
  is_original_data_visible: role.is_original_data_visible,
  is_system: role.is_system,
};

export const serializeUser = (user) => user && {
  id: user.id,
  company_id: user.company_id,
  employee_id: user.employee_id,
  email: user.email,
  role_id: user.role_id,
  status: user.status,
  role: serializeRole(findRoleById(user.role_id)),
};

export const serializeEmployee = (employee) => employee && {
  id: employee.id,
  company_id: employee.company_id,
  employee_code: employee.employee_code,
  full_name: employee.full_name,
  designation: employee.designation,
  status: employee.status,
};

// Full employee record (list/detail views) — includes manager fields + linked user, which the
// real spec's employee payload carries per §3.
export const serializeEmployeeFull = (employee) => employee && {
  ...employee,
  email: findUserById(employee.linked_user_id)?.email ?? null,
};

// One entry per role the user holds, primary first (§4) — additional roles are purely
// operational and never carry `is_original_data_visible` (that's a primary-role-only concept).
export const rolesForLoginResponse = (userId) => {
  const user = findUserById(userId);
  const role = findRoleById(user.role_id);
  const additionalRoles = (user.additional_role_ids ?? []).map(findRoleById).filter(Boolean);
  return [
    {
      id: role.id,
      name: role.role_name,
      permission: role.permission,
      hierarchyRank: role.hierarchy_rank,
      is_original_data_visible: role.is_original_data_visible,
    },
    ...additionalRoles.map((r) => ({
      id: r.id,
      name: r.role_name,
      permission: r.permission,
      hierarchyRank: r.hierarchy_rank,
    })),
  ];
};

// module -> [{ id, name }], matching the shape POST /roles/forms already returns and Sidebar's
// buildNavGroups already consumes — see constants/rbacForms.js FORM_NAMES for the exact strings.
const FORMS_BY_ROLE = {
  [ROLE_NAMES.PLATFORM_ADMIN]: {},
  [ROLE_NAMES.ADMIN]: { 'Entity Management': [{ id: 101, name: 'Entity Master' }, { id: 102, name: 'BU Admin Master' }] },
  [ROLE_NAMES.ENTITY_ADMIN]: { 'Entity Management': [{ id: 101, name: 'Entity Master' }, { id: 102, name: 'BU Admin Master' }] },
  [ROLE_NAMES.BU_ADMIN]: {
    Administration: [{ id: 103, name: 'Roles' }, { id: 104, name: 'Forms' }],
    People: [{ id: 105, name: 'Employees' }, { id: 106, name: 'Users' }],
  },
  [ROLE_NAMES.PROJECT_ADMIN]: {},
  [ROLE_NAMES.SERVICE_PO_ADMIN]: {},
  [ROLE_NAMES.MANAGER]: {},
  [ROLE_NAMES.HR]: { People: [{ id: 105, name: 'Employees' }] },
  // Previously static/always-on regardless of mapping — now seeded here like every other
  // role's forms, since Employee screens are formName-gated too (see routes/index.jsx).
  [ROLE_NAMES.EMPLOYEE]: {
    Core: [{ id: 401, name: 'Employee Dashboard' }],
    'Work Log': [{ id: 402, name: 'My Work Log' }, { id: 403, name: 'Monthly Summary' }],
    Report: [{ id: 404, name: 'PO Wise Report' }],
  },
};

export const formsForRoleName = (roleName) => FORMS_BY_ROLE[roleName] ?? {};

export const isNoCompanyRole = (roleName) => NO_COMPANY_ROLES.includes(roleName);

export const roleMatrixError = (actorRoleName, targetRoleName) => {
  const allowed = ROLE_CREATION_MATRIX[actorRoleName] ?? [];
  return `"${actorRoleName}" cannot assign role "${targetRoleName}". Allowed roles: ${allowed.join(', ') || 'none'}.`;
};

export const assertCanAssignRole = (actorRoleName, targetRoleName) => {
  const allowed = ROLE_CREATION_MATRIX[actorRoleName] ?? [];
  if (!allowed.includes(targetRoleName)) {
    const err = new Error(roleMatrixError(actorRoleName, targetRoleName));
    err.mockStatus = 403;
    throw err;
  }
};

// Mimics the axios error shape (`err.response.data.message`/`.status`) so existing
// extractApiError()/extractFieldErrors() callers work unchanged against mock failures.
export const mockError = (status, message) => {
  const err = new Error(message);
  err.response = { status, data: { success: false, message } };
  return err;
};

// Generic in-memory list -> paginated envelope, shared by every mocked list endpoint (Roles,
// Users, Employees, Entity Admins). `searchFields` are checked case-insensitively as substrings;
// `sortBy`/`sortOrder`("asc"/"desc"/"ASC"/"DESC") sort in place on a copy.
export const paginate = (list, { page = 1, limit = 10, search, searchFields = [], status, sortBy, sortOrder, filter } = {}) => {
  let rows = [...list];
  if (filter) rows = rows.filter(filter);
  if (status && status !== 'all') rows = rows.filter((r) => r.status === status);
  if (search) {
    const q = String(search).toLowerCase();
    rows = rows.filter((r) => searchFields.some((f) => String(r[f] ?? '').toLowerCase().includes(q)));
  }
  if (sortBy) {
    const dir = String(sortOrder ?? 'asc').toLowerCase() === 'desc' ? -1 : 1;
    rows.sort((a, b) => (a[sortBy] > b[sortBy] ? 1 : a[sortBy] < b[sortBy] ? -1 : 0) * dir);
  }
  const total = rows.length;
  const pageNum = Number(page) || 1;
  const perPage = Number(limit) || 10;
  const start = (pageNum - 1) * perPage;
  const data = rows.slice(start, start + perPage);
  return { data, meta: { page: pageNum, limit: perPage, current_page: pageNum, per_page: perPage, total } };
};

// Fixed default rather than a random string, per product decision — every employee added
// without an explicit password gets this same starter password instead of a one-off generated one.
export const generateTemporaryPassword = () => 'Gtt@1234';
