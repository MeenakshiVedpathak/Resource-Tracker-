import { createSlice, createSelector } from '@reduxjs/toolkit';
import {
  clearAuth, getAccessToken, getRefreshToken, getStoredUser, saveTokens, saveUser,
  getStoredRoles, saveRoles, getStoredAccessibleForms, saveAccessibleForms,
  getStoredOriginalDataVisible, saveOriginalDataVisible,
  getStoredCompany, saveCompany,
  getStoredEmployee, saveEmployee,
  getStoredMappedBus, saveMappedBus,
  getStoredSelectedBuId, saveSelectedBuId,
} from '@/services/apiClient';
import { ROLE_NAMES } from '@/constants/roleHierarchy';

const initialState = {
  user: getStoredUser(),
  accessToken: getAccessToken(),
  refreshToken: getRefreshToken(),
  isAuthenticated: !!getAccessToken(),
  // RBAC: roles held by the logged-in user — [{ id, name, permission: 'Read'|'Read & Write' }]
  roles: getStoredRoles(),
  // RBAC: module -> [{ id, name }] accessible-forms map from POST /roles/forms
  accessibleForms: getStoredAccessibleForms(),
  // False only in the brief window right after a fresh login, while accessibleForms has been
  // cleared and the authoritative POST /roles/forms fetch is still in flight — lets
  // ProtectedRoute show a loader instead of misreading "not loaded yet" as "not authorized".
  // True by default (including on a hard refresh) since the localStorage-restored map above is
  // usable immediately; MainLayout's useSyncAccessibleForms silently refreshes it regardless.
  accessibleFormsLoaded: true,
  // Gates the Modified/Original hours-source toggle — from GET /roles/form-mappings/:userId
  isOriginalDataVisible: getStoredOriginalDataVisible(),
  // Multi-tenancy retrofit: the logged-in user's company, once the backend sends one on login.
  // `null` for every user today (no backend support yet) — see services/apiClient.js.
  company: getStoredCompany(),
  // RBAC redesign: login's sibling `employee` object — null for any account with no linked
  // Employee (every Admin/Manager-tier account that isn't also staff).
  employee: getStoredEmployee(),
  // BU Head spec §8/§9: BUs mapped to a BU Head login — [] for every other role.
  mappedBus: getStoredMappedBus(),
  // BU Head spec §10-§12: the currently-selected BU, global across the app.
  selectedBuId: getStoredSelectedBuId(),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, employee, accessToken, refreshToken, roles, company, mapped_bu: mappedBu } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;
      saveTokens(accessToken, refreshToken);
      saveUser(user);

      // `employee` is the login response's sibling object — null for any account with no
      // linked Employee (see §2.1 of the RBAC spec).
      const nextEmployee = employee ?? null;
      state.employee = nextEmployee;
      saveEmployee(nextEmployee);

      // `company` is optional and absent from today's real login response — defaults to null
      // (no fabricated tenant data) until the backend actually sends one.
      const nextCompany = company ?? null;
      state.company = nextCompany;
      saveCompany(nextCompany);

      // Roles are re-issued on every login, so always overwrite (never merge with stale ones).
      const nextRoles = roles ?? [];
      state.roles = nextRoles;
      saveRoles(nextRoles);

      // BU Head spec §8-§10: `mapped_bu` is absent/[] for every non-BU-Head login. Auto-select
      // the first mapped BU on login — the user must not need to pick one manually every time.
      const nextMappedBus = mappedBu ?? [];
      state.mappedBus = nextMappedBus;
      saveMappedBus(nextMappedBus);
      const nextSelectedBuId = nextMappedBus[0]?.id ?? null;
      state.selectedBuId = nextSelectedBuId;
      saveSelectedBuId(nextSelectedBuId);

      // Accessible forms are role-derived — clear the previous user's cache until the
      // post-login fetch (Step 3) repopulates it for the new roles.
      state.accessibleForms = {};
      saveAccessibleForms({});
      state.accessibleFormsLoaded = false;

      state.isOriginalDataVisible = false;
      saveOriginalDataVisible(false);
    },
    setTokens: (state, action) => {
      const { accessToken, refreshToken } = action.payload;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      saveTokens(accessToken, refreshToken);
    },
    setUser: (state, action) => {
      state.user = action.payload;
      saveUser(action.payload);
    },
    // Refreshed on silent token rotation — same roles shape as login, re-issued as-is.
    setRoles: (state, action) => {
      const nextRoles = action.payload ?? [];
      state.roles = nextRoles;
      saveRoles(nextRoles);
    },
    setAccessibleForms: (state, action) => {
      const forms = action.payload ?? {};
      state.accessibleForms = forms;
      saveAccessibleForms(forms);
      state.accessibleFormsLoaded = true;
    },
    setIsOriginalDataVisible: (state, action) => {
      const visible = !!action.payload;
      state.isOriginalDataVisible = visible;
      saveOriginalDataVisible(visible);
    },
    setCompany: (state, action) => {
      const company = action.payload ?? null;
      state.company = company;
      saveCompany(company);
    },
    // BU Head spec §12: switching BU updates the global selection — no re-login, no full page
    // reload. Client-side belt-and-suspenders (§18): only accepts an id that's actually one of
    // this BU Head's mapped BUs; real enforcement still lives server-side (§13 — the backend
    // 403s an unmapped BU regardless of what the frontend sends).
    setSelectedBu: (state, action) => {
      const buId = action.payload;
      if (!state.mappedBus.some((bu) => bu.id === buId)) return;
      state.selectedBuId = buId;
      saveSelectedBuId(buId);
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.roles = [];
      state.accessibleForms = {};
      state.accessibleFormsLoaded = true;
      state.isOriginalDataVisible = false;
      state.company = null;
      state.employee = null;
      state.mappedBus = [];
      state.selectedBuId = null;
      clearAuth();
    },
  },
});

export const {
  setCredentials, setTokens, setUser, setRoles, setAccessibleForms, setIsOriginalDataVisible,
  setCompany, setSelectedBu, logout,
} = authSlice.actions;

const EMPTY_PERMISSIONS = [];
const EMPTY_ROLES = [];
const EMPTY_FORMS = {};
const EMPTY_MAPPED_BUS = [];

export const selectCurrentUser = (state) => state.auth.user;
export const selectAccessToken = (state) => state.auth.accessToken;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;

// Full role objects from login: [{ id, name, permission }] — the RBAC source of truth
export const selectAuthRoles = (state) => state.auth.roles ?? EMPTY_ROLES;
export const selectAuthRoleIds = createSelector([selectAuthRoles], (roles) => roles.map((r) => r.id));

// module -> [{ id, name }]
export const selectAccessibleForms = (state) => state.auth.accessibleForms ?? EMPTY_FORMS;
export const selectAccessibleFormsLoaded = (state) => state.auth.accessibleFormsLoaded ?? true;

// Gates the Modified/Original hours-source toggle in Reports & Dashboard
export const selectIsOriginalDataVisible = (state) => !!state.auth.isOriginalDataVisible;

// Multi-tenancy retrofit — null for every user until the backend sends a real company
export const selectCurrentCompany = (state) => state.auth.company ?? null;
export const selectCompanyId = (state) => state.auth.company?.id ?? null;

// RBAC redesign: login's sibling `employee` object — null for any account with no linked
// Employee.
export const selectCurrentEmployee = (state) => state.auth.employee ?? null;

// BU Head spec §9-§12: [] / null for every non-BU-Head login.
export const selectMappedBus = (state) => state.auth.mappedBus ?? EMPTY_MAPPED_BUS;
export const selectSelectedBuId = (state) => state.auth.selectedBuId ?? null;

// A user's single role now carries `hierarchy_rank` directly (see selectAuthRoles) — this is
// the RBAC redesign's replacement for role-name arrays where a numeric comparison is more useful
// (e.g. "is this actor senior enough to do X").
export const selectHierarchyRank = (state) => state.auth.roles?.[0]?.hierarchyRank ?? null;

// Platform Admin is now just the top of the role hierarchy, not a separate user-level flag —
// derived from the single role every login returns.
export const selectIsPlatformAdmin = (state) => state.auth.roles?.[0]?.name === 'Platform Admin';

// An Employee login is identified by its role name — every account authenticates identically
// now (no more separate `loginType`). Checks ANY held role, not just the first: an account can
// hold Employee alongside another role (e.g. Employee + Manager), and it must still pass this
// to reach Employee self-service routes (ProtectedRoute's `employeeOnly` gate).
export const selectIsEmployee = (state) => (state.auth.roles ?? EMPTY_ROLES).some((r) => r.name === 'Employee');

// True only when Employee is the account's SOLE role. MainLayout uses this (not selectIsEmployee)
// to decide whether to bounce a user straight to the Employee dashboard — a genuinely multi-role
// account (Employee + Manager) must still be able to reach MainLayout for its other role's
// screens, not just the Employee-only ones.
export const selectIsEmployeeOnly = (state) => {
  const roles = state.auth.roles ?? EMPTY_ROLES;
  return roles.length > 0 && roles.every((r) => r.name === 'Employee');
};

// Returns array of role name strings — prefers the RBAC roles[] from login, falling back to the
// legacy user.roles/user.role shape so any pre-RBAC session data still resolves.
export const selectUserRoles = createSelector(
  [selectAuthRoles, (state) => state.auth.user],
  (authRoles, user) => {
    if (authRoles.length > 0) return authRoles.map((r) => r.name).filter(Boolean);
    if (!user) return EMPTY_ROLES;
    if (Array.isArray(user.roles) && user.roles.length > 0)
      return user.roles.map((r) => r.role_name ?? r).filter(Boolean);
    if (user.role?.role_name) return [user.role.role_name];
    if (typeof user.role === 'string') return [user.role];
    return EMPTY_ROLES;
  }
);

// Returns first role name for display purposes
export const selectUserRole = (state) => selectUserRoles(state)[0] ?? null;
export const selectUserPermissions = (state) => state.auth.user?.permissions ?? EMPTY_PERMISSIONS;

// true if any held role carries "Read & Write" — the basis for all Create/Edit/Delete gating
export const selectHasWriteAccess = createSelector(
  [selectAuthRoles],
  (roles) => roles.some((r) => r.permission === 'Read & Write')
);

export default authSlice.reducer;
