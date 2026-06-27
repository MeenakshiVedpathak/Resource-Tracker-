import { createSlice } from '@reduxjs/toolkit';
import { clearAuth, getAccessToken, getRefreshToken, getStoredUser, saveTokens, saveUser } from '@/services/apiClient';

const initialState = {
  user: getStoredUser(),
  accessToken: getAccessToken(),
  refreshToken: getRefreshToken(),
  isAuthenticated: !!getAccessToken(),
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    setCredentials: (state, action) => {
      const { user, accessToken, refreshToken } = action.payload;
      state.user = user;
      state.accessToken = accessToken;
      state.refreshToken = refreshToken;
      state.isAuthenticated = true;
      saveTokens(accessToken, refreshToken);
      saveUser(user);
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
    logout: (state) => {
      state.user = null;
      state.accessToken = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      clearAuth();
    },
  },
});

export const { setCredentials, setTokens, setUser, logout } = authSlice.actions;

const EMPTY_PERMISSIONS = [];
const EMPTY_ROLES = [];

export const selectCurrentUser = (state) => state.auth.user;
export const selectAccessToken = (state) => state.auth.accessToken;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;

// Returns array of role name strings — handles roles[] array, single role object, or string
export const selectUserRoles = (state) => {
  const user = state.auth.user;
  if (!user) return EMPTY_ROLES;
  if (Array.isArray(user.roles) && user.roles.length > 0)
    return user.roles.map((r) => r.role_name ?? r).filter(Boolean);
  if (user.role?.role_name) return [user.role.role_name];
  if (typeof user.role === 'string') return [user.role];
  return EMPTY_ROLES;
};

// Returns first role name for display purposes
export const selectUserRole = (state) => selectUserRoles(state)[0] ?? null;
export const selectUserPermissions = (state) => state.auth.user?.permissions ?? EMPTY_PERMISSIONS;

export default authSlice.reducer;
