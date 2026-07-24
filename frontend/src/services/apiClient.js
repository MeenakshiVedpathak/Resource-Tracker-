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
    return config;
  },
  (error) => Promise.reject(error)
);

// ── Response interceptor: handle 401 + token rotation ──
apiClient.interceptors.response.use(
  (response) => response,
  async (error) => {
    const original = error.config;

    if (error.response?.status === 401 && !original._retry) {
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
  USER: 'rut_user',
  ROLES: 'rut_roles',
  ACCESSIBLE_FORMS: 'rut_accessible_forms',
  ORIGINAL_DATA_VISIBLE: 'rut_original_data_visible',
};

export const getAccessToken = () => localStorage.getItem(TOKEN_KEYS.ACCESS);
export const getRefreshToken = () => localStorage.getItem(TOKEN_KEYS.REFRESH);
export const getStoredUser = () => {
  try {
    const raw = localStorage.getItem(TOKEN_KEYS.USER);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
};

// Roles from login response: [{ id, name, permission }]
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

// Gates the Modified/Original hours-source toggle — derived from GET /roles/form-mappings/:userId
export const getStoredOriginalDataVisible = () =>
  localStorage.getItem(TOKEN_KEYS.ORIGINAL_DATA_VISIBLE) === 'true';

export const saveTokens = (accessToken, refreshToken) => {
  localStorage.setItem(TOKEN_KEYS.ACCESS, accessToken);
  localStorage.setItem(TOKEN_KEYS.REFRESH, refreshToken);
};

export const saveUser = (user) => {
  localStorage.setItem(TOKEN_KEYS.USER, JSON.stringify(user));
};

export const saveRoles = (roles) => {
  localStorage.setItem(TOKEN_KEYS.ROLES, JSON.stringify(roles ?? []));
};

export const saveAccessibleForms = (accessibleForms) => {
  localStorage.setItem(TOKEN_KEYS.ACCESSIBLE_FORMS, JSON.stringify(accessibleForms ?? {}));
};

export const saveOriginalDataVisible = (visible) => {
  localStorage.setItem(TOKEN_KEYS.ORIGINAL_DATA_VISIBLE, visible ? 'true' : 'false');
};

export const clearAuth = () => {
  localStorage.removeItem(TOKEN_KEYS.ACCESS);
  localStorage.removeItem(TOKEN_KEYS.REFRESH);
  localStorage.removeItem(TOKEN_KEYS.USER);
  localStorage.removeItem(TOKEN_KEYS.ROLES);
  localStorage.removeItem(TOKEN_KEYS.ACCESSIBLE_FORMS);
  localStorage.removeItem(TOKEN_KEYS.ORIGINAL_DATA_VISIBLE);
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
