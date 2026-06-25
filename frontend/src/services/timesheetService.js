import api from './api';

const timesheetService = {
  /**
   * Fetch all timesheet entries with filters.
   * @param {{ page?: number, limit?: number, employee_id?: number, service_po_id?: number, sub_project_id?: number, from_date?: string, to_date?: string, month?: number, year?: number }} params
   */
  getAll: (params = {}) => api.get('/timesheets', { params }),

  /**
   * Fetch a single timesheet entry by ID.
   * @param {number|string} id
   */
  getById: (id) => api.get(`/timesheets/${id}`),

  /**
   * Create a manual timesheet entry.
   * @param {object} data
   */
  create: (data) => api.post('/timesheets', data),

  /**
   * Update a timesheet entry.
   * @param {number|string} id
   * @param {object} data
   */
  update: (id, data) => api.put(`/timesheets/${id}`, data),

  /**
   * Delete a timesheet entry.
   * @param {number|string} id
   */
  delete: (id) => api.delete(`/timesheets/${id}`),

  /**
   * Upload an Excel/CSV file for staged import.
   * Returns a preview payload with valid rows and any errors.
   * @param {FormData} formData  Must include field "file".
   */
  upload: (formData) =>
    api.post('/timesheets/import/upload', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
      timeout: 60000,
    }),

  /**
   * Confirm (commit) a staged import identified by importId.
   * @param {number|string} importId
   */
  confirmImport: (importId) =>
    api.post(`/timesheets/import/${importId}/confirm`),

  /**
   * Discard a staged import.
   * @param {number|string} importId
   */
  cancelImport: (importId) =>
    api.delete(`/timesheets/import/${importId}`),

  /**
   * Fetch the history of all import jobs.
   * @param {{ page?: number, limit?: number, status?: string }} params
   */
  getImportHistory: (params = {}) =>
    api.get('/timesheets/import/history', { params }),

  /**
   * Fetch row-level errors for a specific import job.
   * @param {number|string} importId
   */
  getImportErrors: (importId) =>
    api.get(`/timesheets/import/${importId}/errors`),
};

export default timesheetService;
