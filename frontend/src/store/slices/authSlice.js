import { createSlice, createSelector } from '@reduxjs/toolkit';
import {
  clearAuth, getAccessToken, getRefreshToken, getStoredUser, saveTokens, saveUser,
  getStoredRoles, saveRoles, getStoredAccessibleForms, saveAccessibleForms,
  getStoredOriginalDataVisible, saveOriginalDataVisible,
  getStoredCompany, saveCompany,
  getStoredLoginType, saveLoginType,
} from '@/services/apiClient';

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
  // Dynamic login: 'employee' | 'user' from the login response — discriminates the Employee
  // self-service area from the existing RBAC-driven User/Admin app. `null` until the backend
  // actually sends this field.
  loginType: getStoredLoginType(),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, accessToken, refreshToken, roles, company, loginType } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;
      saveTokens(accessToken, refreshToken);
      saveUser(user);

      const nextLoginType = loginType ?? null;
      state.loginType = nextLoginType;
      saveLoginType(nextLoginType);

      // `company` is optional and absent from today's real login response — defaults to null
      // (no fabricated tenant data) until the backend actually sends one.
      const nextCompany = company ?? null;
      state.company = nextCompany;
      saveCompany(nextCompany);

      // Roles are re-issued on every login, so always overwrite (never merge with stale ones).
      const nextRoles = roles ?? [];
      state.roles = nextRoles;
      saveRoles(nextRoles);

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
      state.loginType = null;
      clearAuth();
    },
  },
});

export const {
  setCredentials, setTokens, setUser, setRoles, setAccessibleForms, setIsOriginalDataVisible,
  setCompany, logout,
} = authSlice.actions;

const EMPTY_PERMISSIONS = [];
const EMPTY_ROLES = [];
const EMPTY_FORMS = {};

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

// Authoritative Platform Admin flag from POST /auth/login's user object (`is_platform_admin`) —
// a user-level flag, independent of the company-scoped Role/Form RBAC system entirely (a Platform
// Admin has no roles/company at all).
export const selectIsPlatformAdmin = (state) => !!state.auth.user?.is_platform_admin;

// Dynamic login: true when the login response's `loginType` was 'employee' — routes into the
// Employee self-service area (dashboard/timesheet) instead of the RBAC-driven User/Admin app.
export const selectIsEmployee = (state) => state.auth.loginType === 'employee';

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
