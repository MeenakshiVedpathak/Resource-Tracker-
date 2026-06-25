import { createSlice } from '@reduxjs/toolkit';
import { STORAGE_KEYS } from '../../utils/constants';

// Hydrate from localStorage so Redux state survives page refresh
const storedUser = (() => {
  try {
    const raw = localStorage.getItem(STORAGE_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
})();

const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN) ?? null;

const initialState = {
  user: storedUser,
  token: storedToken,
  refreshToken: localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN) ?? null,
  isAuthenticated: !!(storedToken && storedUser),
  loading: false,
  error: null,
};

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    loginSuccess(state, action) {
      const { user, token, refreshToken } = action.payload;
      state.user = user;
      state.token = token;
      state.refreshToken = refreshToken ?? null;
      state.isAuthenticated = true;
      state.loading = false;
      state.error = null;

      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
      if (refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }
    },
    logout(state) {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;

      localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
      localStorage.removeItem(STORAGE_KEYS.USER);
    },
    setLoading(state, action) {
      state.loading = action.payload;
    },
    setError(state, action) {
      state.error = action.payload;
      state.loading = false;
    },
    updateUser(state, action) {
      state.user = { ...state.user, ...action.payload };
      localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(state.user));
    },
    refreshTokenSuccess(state, action) {
      const { token, refreshToken } = action.payload;
      state.token = token;
      if (refreshToken) state.refreshToken = refreshToken;

      localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
      if (refreshToken) {
        localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
      }
    },
  },
});

export const {
  loginSuccess,
  logout,
  setLoading,
  setError,
  updateUser,
  refreshTokenSuccess,
} = authSlice.actions;

// Selectors
export const selectAuth = (state) => state.auth;
export const selectUser = (state) => state.auth.user;
export const selectToken = (state) => state.auth.token;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;

export default authSlice.reducer;
