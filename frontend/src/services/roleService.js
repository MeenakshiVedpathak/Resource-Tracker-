import api from './api';

const roleService = {
  /**
   * Fetch all roles.
   * @param {{ status?: string }} params
   */
  getAll: (params = {}) => api.get('/roles', { params }),

  /**
   * Fetch a single role by ID.
   * @param {number|string} id
   */
  getById: (id) => api.get(`/roles/${id}`),

  /**
   * Create a new role.
   * @param {{ role_name: string, status?: string }} data
   */
  create: (data) => api.post('/roles', data),

  /**
   * Update a role.
   * @param {number|string} id
   * @param {object} data
   */
  update: (id, data) => api.put(`/roles/${id}`, data),

  /**
   * Delete a role.
   * @param {number|string} id
   */
  delete: (id) => api.delete(`/roles/${id}`),
};

export default roleService;
