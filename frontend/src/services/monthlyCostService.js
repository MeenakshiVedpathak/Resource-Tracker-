import api from './api';

const monthlyCostService = {
  /**
   * Fetch monthly cost records with optional filters.
   * @param {{ page?: number, limit?: number, month?: number, year?: number, employee_id?: number }} params
   */
  getAll: (params = {}) => api.get('/monthly-costs', { params }),

  /**
   * Fetch a single monthly cost record by ID.
   * @param {number|string} id
   */
  getById: (id) => api.get(`/monthly-costs/${id}`),

  /**
   * Create a monthly cost record.
   * @param {object} data
   */
  create: (data) => api.post('/monthly-costs', data),

  /**
   * Update a monthly cost record.
   * @param {number|string} id
   * @param {object} data
   */
  update: (id, data) => api.put(`/monthly-costs/${id}`, data),

  /**
   * Delete a monthly cost record.
   * @param {number|string} id
   */
  delete: (id) => api.delete(`/monthly-costs/${id}`),

  /**
   * Trigger server-side calculation for all employees for a given month/year.
   * @param {{ month: number, year: number }} payload
   */
  calculateForMonth: (payload) =>
    api.post('/monthly-costs/calculate', payload),

  /**
   * Import monthly costs from an uploaded spreadsheet.
   * @param {FormData} formData
   */
  importFromFile: (formData) =>
    api.post('/monthly-costs/import', formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    }),
};

export default monthlyCostService;
