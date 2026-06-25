import api from './api';

const employeeService = {
  /**
   * Fetch a paginated, filterable list of employees.
   * @param {{ page?: number, limit?: number, search?: string, status?: string, designation?: string }} params
   */
  getAll: (params = {}) => api.get('/employees', { params }),

  /**
   * Fetch a single employee by ID.
   * @param {number|string} id
   */
  getById: (id) => api.get(`/employees/${id}`),

  /**
   * Create a new employee record.
   * @param {object} data
   */
  create: (data) => api.post('/employees', data),

  /**
   * Update an existing employee record.
   * @param {number|string} id
   * @param {object} data
   */
  update: (id, data) => api.put(`/employees/${id}`, data),

  /**
   * Soft-delete (or deactivate) an employee.
   * @param {number|string} id
   */
  delete: (id) => api.delete(`/employees/${id}`),

  /**
   * Fetch all active employees (for dropdowns/selectors).
   */
  getActive: () => api.get('/employees/active'),
};

export default employeeService;
