import { createSlice, createSelector } from '@reduxjs/toolkit';
import {
  clearAuth, getAccessToken, getRefreshToken, getStoredUser, saveTokens, saveUser,
  getStoredRoles, saveRoles, getStoredAccessibleForms, saveAccessibleForms,
  getStoredOriginalDataVisible, saveOriginalDataVisible,
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
  // Gates the Modified/Original hours-source toggle — from GET /roles/form-mappings/:userId
  isOriginalDataVisible: getStoredOriginalDataVisible(),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, accessToken, refreshToken, roles } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;
      saveTokens(accessToken, refreshToken);
      saveUser(user);

      // Roles are re-issued on every login, so always overwrite (never merge with stale ones).
      const nextRoles = roles ?? [];
      state.roles = nextRoles;
      saveRoles(nextRoles);

      // Accessible forms are role-derived — clear the previous user's cache until the
      // post-login fetch (Step 3) repopulates it for the new roles.
      state.accessibleForms = {};
      saveAccessibleForms({});

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
    },
    setIsOriginalDataVisible: (state, action) => {
      const visible = !!action.payload;
      state.isOriginalDataVisible = visible;
      saveOriginalDataVisible(visible);
    },
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.roles = [];
      state.accessibleForms = {};
      state.isOriginalDataVisible = false;
      clearAuth();
    },
  },
});

export const {
  setCredentials, setTokens, setUser, setRoles, setAccessibleForms, setIsOriginalDataVisible, logout,
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

// Gates the Modified/Original hours-source toggle in Reports & Dashboard
export const selectIsOriginalDataVisible = (state) => !!state.auth.isOriginalDataVisible;

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
