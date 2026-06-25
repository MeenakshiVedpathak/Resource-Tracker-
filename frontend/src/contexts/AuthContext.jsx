import React, {
  createContext,
  useContext,
  useReducer,
  useEffect,
  useCallback,
} from 'react';
import { STORAGE_KEYS } from '../utils/constants';

// ===========================================================================
// State shape
// ===========================================================================
const initialState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: true, // true while we hydrate from localStorage
};

// ===========================================================================
// Action types
// ===========================================================================
const AUTH_ACTIONS = {
  LOGIN_SUCCESS: 'LOGIN_SUCCESS',
  LOGOUT: 'LOGOUT',
  SET_LOADING: 'SET_LOADING',
  UPDATE_USER: 'UPDATE_USER',
  REFRESH_TOKEN: 'REFRESH_TOKEN',
};

// ===========================================================================
// Reducer
// ===========================================================================
function authReducer(state, action) {
  switch (action.type) {
    case AUTH_ACTIONS.SET_LOADING:
      return { ...state, loading: action.payload };

    case AUTH_ACTIONS.LOGIN_SUCCESS:
      return {
        ...state,
        user: action.payload.user,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken ?? null,
        isAuthenticated: true,
        loading: false,
      };

    case AUTH_ACTIONS.LOGOUT:
      return {
        ...initialState,
        loading: false,
      };

    case AUTH_ACTIONS.UPDATE_USER:
      return {
        ...state,
        user: { ...state.user, ...action.payload },
      };

    case AUTH_ACTIONS.REFRESH_TOKEN:
      return {
        ...state,
        token: action.payload.token,
        refreshToken: action.payload.refreshToken ?? state.refreshToken,
      };

    default:
      return state;
  }
}

// ===========================================================================
// Context
// ===========================================================================
export const AuthContext = createContext(null);

// ===========================================================================
// Provider
// ===========================================================================
export function AuthProvider({ children }) {
  const [state, dispatch] = useReducer(authReducer, initialState);

  // -------------------------------------------------------------------------
  // Hydrate session from localStorage on mount
  // -------------------------------------------------------------------------
  useEffect(() => {
    const storedToken = localStorage.getItem(STORAGE_KEYS.ACCESS_TOKEN);
    const storedRefresh = localStorage.getItem(STORAGE_KEYS.REFRESH_TOKEN);
    const storedUser = localStorage.getItem(STORAGE_KEYS.USER);

    if (storedToken && storedUser) {
      try {
        const parsedUser = JSON.parse(storedUser);
        dispatch({
          type: AUTH_ACTIONS.LOGIN_SUCCESS,
          payload: {
            user: parsedUser,
            token: storedToken,
            refreshToken: storedRefresh,
          },
        });
      } catch {
        // Corrupted storage — clear and continue as unauthenticated
        localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
        localStorage.removeItem(STORAGE_KEYS.USER);
        dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
      }
    } else {
      dispatch({ type: AUTH_ACTIONS.SET_LOADING, payload: false });
    }
  }, []);

  // -------------------------------------------------------------------------
  // login — persists tokens and user to localStorage
  // -------------------------------------------------------------------------
  const login = useCallback((user, token, refreshToken = null) => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    localStorage.setItem(STORAGE_KEYS.USER, JSON.stringify(user));
    if (refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
    dispatch({
      type: AUTH_ACTIONS.LOGIN_SUCCESS,
      payload: { user, token, refreshToken },
    });
  }, []);

  // -------------------------------------------------------------------------
  // logout — clears storage and resets state
  // -------------------------------------------------------------------------
  const logout = useCallback(() => {
    localStorage.removeItem(STORAGE_KEYS.ACCESS_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.REFRESH_TOKEN);
    localStorage.removeItem(STORAGE_KEYS.USER);
    dispatch({ type: AUTH_ACTIONS.LOGOUT });
  }, []);

  // -------------------------------------------------------------------------
  // updateUser — patch stored user fields (e.g. after profile edit)
  // -------------------------------------------------------------------------
  const updateUser = useCallback((updates) => {
    dispatch({ type: AUTH_ACTIONS.UPDATE_USER, payload: updates });
    // Keep localStorage in sync
    const stored = localStorage.getItem(STORAGE_KEYS.USER);
    if (stored) {
      try {
        const current = JSON.parse(stored);
        localStorage.setItem(
          STORAGE_KEYS.USER,
          JSON.stringify({ ...current, ...updates })
        );
      } catch {
        // ignore
      }
    }
  }, []);

  // -------------------------------------------------------------------------
  // refreshAccessToken — store new tokens after a token-refresh API call
  // -------------------------------------------------------------------------
  const refreshAccessToken = useCallback((token, refreshToken = null) => {
    localStorage.setItem(STORAGE_KEYS.ACCESS_TOKEN, token);
    if (refreshToken) {
      localStorage.setItem(STORAGE_KEYS.REFRESH_TOKEN, refreshToken);
    }
    dispatch({
      type: AUTH_ACTIONS.REFRESH_TOKEN,
      payload: { token, refreshToken },
    });
  }, []);

  // -------------------------------------------------------------------------
  // hasRole — accepts a single role string or an array of role strings
  // -------------------------------------------------------------------------
  const hasRole = useCallback(
    (roles) => {
      if (!state.user?.role) return false;
      const allowed = Array.isArray(roles) ? roles : [roles];
      return allowed.includes(state.user.role);
    },
    [state.user]
  );

  // -------------------------------------------------------------------------
  // hasPermission — check against role-level permission key
  // -------------------------------------------------------------------------
  const hasPermission = useCallback(
    (permission) => {
      if (!state.user?.role) return false;
      // Management has wildcard access
      if (state.user.role === 'Management') return true;
      const { ROLE_PERMISSIONS } = require('../utils/constants');
      const perms = ROLE_PERMISSIONS[state.user.role] ?? [];
      return perms.includes('*') || perms.includes(permission);
    },
    [state.user]
  );

  const value = {
    // State
    user: state.user,
    token: state.token,
    isAuthenticated: state.isAuthenticated,
    loading: state.loading,
    // Actions
    login,
    logout,
    updateUser,
    refreshAccessToken,
    // Helpers
    hasRole,
    hasPermission,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// ===========================================================================
// Hook
// ===========================================================================
export function useAuthContext() {
  const context = useContext(AuthContext);
  if (!context) {
    throw new Error('useAuthContext must be used within an AuthProvider');
  }
  return context;
}
