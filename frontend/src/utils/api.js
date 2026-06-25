import axios from 'axios';

// ---------------------------------------------------------------------------
// Axios instance
// ---------------------------------------------------------------------------
const api = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 30000,
  headers: {
    'Content-Type': 'application/json',
  },
});

// ---------------------------------------------------------------------------
// Request interceptor — attach JWT
// ---------------------------------------------------------------------------
api.interceptors.request.use(
  (config) => {
    const token = localStorage.getItem('rut_access_token');
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
  },
  (error) => Promise.reject(error)
);

// ---------------------------------------------------------------------------
// Response interceptor — normalise data, handle 401
// ---------------------------------------------------------------------------
api.interceptors.response.use(
  (response) => {
    // Unwrap the standard { success, data, message } envelope when present
    if (response.data && typeof response.data === 'object' && 'data' in response.data) {
      return response.data;
    }
    return response.data;
  },
  (error) => {
    if (error.response) {
      const { status } = error.response;

      if (status === 401) {
        // Token expired or invalid — clear session and redirect
        localStorage.removeItem('rut_access_token');
        localStorage.removeItem('rut_refresh_token');
        localStorage.removeItem('rut_user');
        window.location.href = '/login';
        return Promise.reject(new Error('Session expired. Please log in again.'));
      }

      // Forward the server error message when available
      const serverMessage =
        error.response.data?.message ||
        error.response.data?.error ||
        `Request failed with status ${status}`;
      return Promise.reject(new Error(serverMessage));
    }

    if (error.request) {
      return Promise.reject(
        new Error('No response from server. Check your network connection.')
      );
    }

    return Promise.reject(error);
  }
);

// ---------------------------------------------------------------------------
// Multipart helper (file uploads)
// ---------------------------------------------------------------------------
export const apiUpload = axios.create({
  baseURL: import.meta.env.VITE_API_URL || 'http://localhost:5000/api',
  timeout: 120000,
});

apiUpload.interceptors.request.use((config) => {
  const token = localStorage.getItem('rut_access_token');
  if (token) {
    config.headers.Authorization = `Bearer ${token}`;
  }
  // Let the browser set the correct Content-Type boundary for multipart
  delete config.headers['Content-Type'];
  return config;
});

apiUpload.interceptors.response.use(
  (response) => response.data,
  (error) => {
    const message =
      error.response?.data?.message || error.message || 'Upload failed';
    return Promise.reject(new Error(message));
  }
);

// ===========================================================================
// Auth
// ===========================================================================
export const authApi = {
  login: (credentials) => api.post('/auth/login', credentials),
  logout: () => api.post('/auth/logout'),
  refreshToken: (refreshToken) => api.post('/auth/refresh', { refreshToken }),
  getMe: () => api.get('/auth/me'),
  changePassword: (data) => api.put('/auth/change-password', data),
};

// ===========================================================================
// Users
// ===========================================================================
export const usersApi = {
  getAll: (params) => api.get('/users', { params }),
  getById: (id) => api.get(`/users/${id}`),
  create: (data) => api.post('/users', data),
  update: (id, data) => api.put(`/users/${id}`, data),
  delete: (id) => api.delete(`/users/${id}`),
  updateStatus: (id, status) => api.patch(`/users/${id}/status`, { status }),
};

// ===========================================================================
// Employees
// ===========================================================================
export const employeesApi = {
  getAll: (params) => api.get('/employees', { params }),
  getById: (id) => api.get(`/employees/${id}`),
  create: (data) => api.post('/employees', data),
  update: (id, data) => api.put(`/employees/${id}`, data),
  delete: (id) => api.delete(`/employees/${id}`),
  updateStatus: (id, status) => api.patch(`/employees/${id}/status`, { status }),
  getDropdown: () => api.get('/employees/dropdown'),
};

// ===========================================================================
// Roles
// ===========================================================================
export const rolesApi = {
  getAll: (params) => api.get('/roles', { params }),
  getById: (id) => api.get(`/roles/${id}`),
  create: (data) => api.post('/roles', data),
  update: (id, data) => api.put(`/roles/${id}`, data),
  delete: (id) => api.delete(`/roles/${id}`),
};

// ===========================================================================
// Clients
// ===========================================================================
export const clientsApi = {
  getAll: (params) => api.get('/clients', { params }),
  getById: (id) => api.get(`/clients/${id}`),
  create: (data) => api.post('/clients', data),
  update: (id, data) => api.put(`/clients/${id}`, data),
  delete: (id) => api.delete(`/clients/${id}`),
  updateStatus: (id, status) => api.patch(`/clients/${id}/status`, { status }),
  getDropdown: () => api.get('/clients/dropdown'),
};

// ===========================================================================
// Service Types
// ===========================================================================
export const serviceTypesApi = {
  getAll: (params) => api.get('/service-types', { params }),
  getById: (id) => api.get(`/service-types/${id}`),
  create: (data) => api.post('/service-types', data),
  update: (id, data) => api.put(`/service-types/${id}`, data),
  delete: (id) => api.delete(`/service-types/${id}`),
};

// ===========================================================================
// Service POs
// ===========================================================================
export const servicePoApi = {
  getAll: (params) => api.get('/service-pos', { params }),
  getById: (id) => api.get(`/service-pos/${id}`),
  create: (data) => api.post('/service-pos', data),
  update: (id, data) => api.put(`/service-pos/${id}`, data),
  delete: (id) => api.delete(`/service-pos/${id}`),
  updateStatus: (id, status) => api.patch(`/service-pos/${id}/status`, { status }),
  getResources: (id) => api.get(`/service-pos/${id}/resources`),
  addResource: (id, data) => api.post(`/service-pos/${id}/resources`, data),
  removeResource: (id, employeeId) =>
    api.delete(`/service-pos/${id}/resources/${employeeId}`),
  getDropdown: () => api.get('/service-pos/dropdown'),
};

// ===========================================================================
// Sub Projects
// ===========================================================================
export const subProjectsApi = {
  getAll: (params) => api.get('/sub-projects', { params }),
  getById: (id) => api.get(`/sub-projects/${id}`),
  create: (data) => api.post('/sub-projects', data),
  update: (id, data) => api.put(`/sub-projects/${id}`, data),
  delete: (id) => api.delete(`/sub-projects/${id}`),
  updateStatus: (id, status) => api.patch(`/sub-projects/${id}/status`, { status }),
  getByServicePo: (servicePoId) =>
    api.get('/sub-projects', { params: { service_po_id: servicePoId } }),
};

// ===========================================================================
// Monthly Costs
// ===========================================================================
export const monthlyCostsApi = {
  getAll: (params) => api.get('/monthly-costs', { params }),
  getById: (id) => api.get(`/monthly-costs/${id}`),
  create: (data) => api.post('/monthly-costs', data),
  update: (id, data) => api.put(`/monthly-costs/${id}`, data),
  delete: (id) => api.delete(`/monthly-costs/${id}`),
  getByMonth: (month, year) =>
    api.get('/monthly-costs', { params: { month, year } }),
  bulkImport: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiUpload.post('/monthly-costs/import', formData);
  },
};

// ===========================================================================
// Timesheets
// ===========================================================================
export const timesheetsApi = {
  getAll: (params) => api.get('/timesheets', { params }),
  getById: (id) => api.get(`/timesheets/${id}`),
  create: (data) => api.post('/timesheets', data),
  update: (id, data) => api.put(`/timesheets/${id}`, data),
  delete: (id) => api.delete(`/timesheets/${id}`),
  bulkImport: (file) => {
    const formData = new FormData();
    formData.append('file', file);
    return apiUpload.post('/timesheets/import', formData);
  },
  getImportHistory: (params) => api.get('/timesheets/import-history', { params }),
  getImportErrors: (importId) =>
    api.get(`/timesheets/import-history/${importId}/errors`),
  exportTemplate: () =>
    api.get('/timesheets/template', { responseType: 'blob' }),
};

// ===========================================================================
// Reports
// ===========================================================================
export const reportsApi = {
  getUtilizationSummary: (params) =>
    api.get('/reports/utilization-summary', { params }),
  getResourceUtilization: (params) =>
    api.get('/reports/resource-utilization', { params }),
  getProjectCost: (params) => api.get('/reports/project-cost', { params }),
  getBillableVsNonBillable: (params) =>
    api.get('/reports/billable-vs-nonbillable', { params }),
  getMonthlyTrend: (params) => api.get('/reports/monthly-trend', { params }),
  exportReport: (type, params) =>
    api.get(`/reports/export/${type}`, { params, responseType: 'blob' }),
  getDashboardStats: () => api.get('/reports/dashboard-stats'),
};

// ===========================================================================
// Notifications
// ===========================================================================
export const notificationsApi = {
  getAll: (params) => api.get('/notifications', { params }),
  getUnread: () => api.get('/notifications/unread'),
  markAsRead: (id) => api.patch(`/notifications/${id}/read`),
  markAllRead: () => api.patch('/notifications/read-all'),
  delete: (id) => api.delete(`/notifications/${id}`),
};

// ===========================================================================
// Audit Logs
// ===========================================================================
export const auditLogsApi = {
  getAll: (params) => api.get('/audit-logs', { params }),
  getById: (id) => api.get(`/audit-logs/${id}`),
};

export default api;
