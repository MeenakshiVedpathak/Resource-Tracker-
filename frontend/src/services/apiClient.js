import axios from 'axios';

const BASE_URL = import.meta.env.VITE_API_BASE_URL;

// ── Plain axios for refresh (bypasses interceptor to prevent infinite loop) ──
const plainAxios = axios.create({ baseURL: BASE_URL });

// ── Main API client ──
const apiClient = axios.create({
  baseURL: BASE_URL,
  timeout: 30000,
  headers: { 'Content-Type': 'application/json' },
});

// ── Token refresh state ──
let isRefreshing = false;
let failedQueue = [];

const processQueue = (error, token = null) => {
  failedQueue.forEach(({ resolve, reject }) => {
    if (error) reject(error);
    else resolve(token);
  });
  failedQueue = [];
};

// ── Request interceptor: attach access token ──
apiClient.interceptors.request.use(
  (config) => {
    const token = getAccessToken();
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    // Employee Identity Migration: every employee now carries businessUnits[] (0/1/many) instead
    // of a single `company` — the currently-active BU (auto-selected on login, switchable via
    // UserMenu) drives this header uniformly. Absent for an employee with no BU (Platform
    // Admin/Admin/Entity Admin) since activeBuId is null for them.
    const activeBuId = getStoredActiveBuId();
    if (activeBuId != null) {
      config.headers['X-Company-Id'] = activeBuId;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 + token rotation ──
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    // RBAC mock: a mock session's access token (`mock.<userId>.<ts>`, see rbacMockDb.js) is
    // never valid against the real backend — any still-unmocked endpoint (AI Copilot widget,
    // notifications polling, etc.) legitimately 401s here even though the mock session itself
    // is fine. Without this guard, that single unrelated 401 would trigger the refresh-token
    // dance below (which also 401s against the real backend) and hard-logout the mock session
    // via `handleLogout()` — wiping the demo out from under an otherwise-working screen.
    const isMockSession = getAccessToken()?.startsWith('mock.');

    // Public auth endpoints (login, forgot/reset-password, etc.) return 401 for "wrong
    // credentials," not "your session expired" — running the refresh/logout dance on them
    // wipes local state and hard-redirects to /login before the caller's own catch block
    // (e.g. Login.jsx's showError) ever gets to render the real message.
    const isPublicAuthRequest = original?.url?.startsWith('/auth/') && original.url !== '/auth/profile' && original.url !== '/auth/change-password';

    // Role-Based Login: these mean the access token itself is structurally broken for this
    // session (a loginTicket sent as a Bearer token, or the role this session was scoped to got
    // deactivated mid-session) — retrying the refresh dance can't fix either, so skip straight to
    // logout instead of burning a refresh call that would just 401 again.
    const errorCode = error.response?.data?.code;
    const isRoleScopingError = errorCode === 'ROLE_SELECTION_REQUIRED' || errorCode === 'ROLE_NO_LONGER_ACTIVE';

    if (error.response?.status === 401 && isRoleScopingError && !isMockSession) {
      handleLogout();
      return Promise.reject(error);
    }

    if (error.response?.status === 401 && !original._retry && !isMockSession && !isPublicAuthRequest) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          failedQueue.push({ resolve, reject });
        })
          .then((token) => {
            original.headers.Authorization = `Bearer ${token}`;
            return apiClient(original);
          })
          .catch((err) => Promise.reject(err));
      }

      original._retry = true;
      isRefreshing = true;

      const refreshToken = getRefreshToken();

      if (!refreshToken) {
        isRefreshing = false;
        handleLogout();
        return Promise.reject(error);
      }

      try {
        const { data } = await plainAxios.post('/auth/refresh-token', { refresh_token: refreshToken });
        // ⚠️ `roles`/`forms` keys here are a guess — per the "refresh-token has the same
        // roles+forms shape as login" API reference. Guarded with `if (...)` below so a
        // wrong/absent key name is a no-op, not a crash.
        const { accessToken, refreshToken: newRefreshToken, roles, forms } = data.data;

        saveTokens(accessToken, newRefreshToken);
        if (refreshDataCallback && (roles || forms)) refreshDataCallback({ roles, forms });
        processQueue(null, accessToken);

        original.headers.Authorization = `Bearer ${accessToken}`;
        return apiClient(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        handleLogout();
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

// ── Token storage helpers (localStorage) ──
const TOKEN_KEYS = {
  ACCESS: 'rut_access_token',
  REFRESH: 'rut_refresh_token',
  ROLES: 'rut_roles',
  ACCESSIBLE_FORMS: 'rut_accessible_forms',
  EMPLOYEE: 'rut_employee',
  AI_COPILOT_CONVERSATION: 'rut_ai_copilot_conversation',
  BUSINESS_UNITS: 'rut_business_units',
  ACTIVE_BU_ID: 'rut_active_bu_id',
};

export const getAccessToken = () => localStorage.getItem(TOKEN_KEYS.ACCESS);
export const getRefreshToken = () => localStorage.getItem(TOKEN_KEYS.REFRESH);

// Roles from login response: [{ id, name, permission, hierarchyRank }]
export const getStoredRoles = () => {
  try {
    const raw = localStorage.getItem(TOKEN_KEYS.ROLES);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

// Accessible-forms map from POST /roles/forms: { [moduleName]: [{ id, name }] }
export const getStoredAccessibleForms = () => {
  try {
    const raw = localStorage.getItem(TOKEN_KEYS.ACCESSIBLE_FORMS);
    return raw ? JSON.parse(raw) : {};
  } catch {
    return {};
  }
};

// Employee Identity Migration: login's sole identity object — null only before the first login.
export const getStoredEmployee = () => {
  try {
    const raw = localStorage.getItem(TOKEN_KEYS.EMPLOYEE);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

export const saveTokens = (accessToken, refreshToken) => {
  localStorage.setItem(TOKEN_KEYS.ACCESS, accessToken);
  localStorage.setItem(TOKEN_KEYS.REFRESH, refreshToken);
};

export const saveRoles = (roles) => {
  localStorage.setItem(TOKEN_KEYS.ROLES, JSON.stringify(roles ?? []));
};

export const saveAccessibleForms = (accessibleForms) => {
  localStorage.setItem(TOKEN_KEYS.ACCESSIBLE_FORMS, JSON.stringify(accessibleForms ?? {}));
};

export const saveEmployee = (employee) => {
  if (employee) {
    localStorage.setItem(TOKEN_KEYS.EMPLOYEE, JSON.stringify(employee));
  } else {
    localStorage.removeItem(TOKEN_KEYS.EMPLOYEE);
  }
};

// Employee Identity Migration: every employee's `businessUnits[]` — always present, possibly [].
export const getStoredBusinessUnits = () => {
  try {
    const raw = localStorage.getItem(TOKEN_KEYS.BUSINESS_UNITS);
    return raw ? JSON.parse(raw) : [];
  } catch {
    return [];
  }
};

export const saveBusinessUnits = (businessUnits) => {
  localStorage.setItem(TOKEN_KEYS.BUSINESS_UNITS, JSON.stringify(businessUnits ?? []));
};

// The currently-active BU, global across the whole app — drives the X-Company-Id header.
export const getStoredActiveBuId = () => {
  const raw = localStorage.getItem(TOKEN_KEYS.ACTIVE_BU_ID);
  return raw ? Number(raw) : null;
};

export const saveActiveBuId = (buId) => {
  if (buId != null) {
    localStorage.setItem(TOKEN_KEYS.ACTIVE_BU_ID, String(buId));
  } else {
    localStorage.removeItem(TOKEN_KEYS.ACTIVE_BU_ID);
  }
};

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEYS.ACCESS);
  localStorage.removeItem(TOKEN_KEYS.REFRESH);
  localStorage.removeItem(TOKEN_KEYS.ROLES);
  localStorage.removeItem(TOKEN_KEYS.ACCESSIBLE_FORMS);
  localStorage.removeItem(TOKEN_KEYS.EMPLOYEE);
  localStorage.removeItem(TOKEN_KEYS.AI_COPILOT_CONVERSATION);
  localStorage.removeItem(TOKEN_KEYS.BUSINESS_UNITS);
  localStorage.removeItem(TOKEN_KEYS.ACTIVE_BU_ID);
};

// ── Logout handler (avoids circular dependency with store) ──
let logoutCallback = null;

export const registerLogoutCallback = (cb) => {
  logoutCallback = cb;
};

const handleLogout = () => {
  clearAuth();
  if (logoutCallback) logoutCallback();
};

// ── Silent token-refresh data handler (same circular-dependency workaround) ──
// Lets the interceptor push updated roles/forms into the Redux store without
// importing the store directly.
let refreshDataCallback = null;

export const registerRefreshDataCallback = (cb) => {
  refreshDataCallback = cb;
};

// Field-level validation errors (422, Joi) -> { field: message } for RHF's setError.
// ⚠️ Exact error envelope shape unconfirmed beyond "errors[].field" — written defensively so an
// unexpected shape just yields {} and falls back to the generic toast in extractApiError.
export const extractFieldErrors = (error) => {
  const errors = error?.response?.data?.errors;
  if (!Array.isArray(errors)) return {};
  return Object.fromEntries(
    errors
      .filter((e) => e?.field && e?.message)
      .map((e) => [e.field, e.message])
  );
};

// ── API error normalizer ──
export const extractApiError = (error) => {
  if (error?.response?.data) {
    const { message, errors } = error.response.data;
    if (errors?.length) {
      return errors.map((e) => e.message).join(', ');
    }
    return message || 'An unexpected error occurred.';
  }
  if (error?.message === 'Network Error') {
    return 'Unable to connect to server. Please check your connection.';
  }
  return error?.message || 'An unexpected error occurred.';
};

export default apiClient;
