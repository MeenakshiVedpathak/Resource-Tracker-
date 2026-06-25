import api from './api';

const userService = {
  /**
   * Fetch all users with optional filters.
   * @param {{ page?: number, limit?: number, search?: string, status?: string, role_id?: number }} params
   */
  getAll: (params = {}) => api.get('/users', { params }),

  /**
   * Fetch a single user by ID.
   * @param {number|string} id
   */
  getById: (id) => api.get(`/users/${id}`),

  /**
   * Create a new portal user.
   * @param {object} data
   */
  create: (data) => api.post('/users', data),

  /**
   * Update an existing user.
   * @param {number|string} id
   * @param {object} data
   */
  update: (id, data) => api.put(`/users/${id}`, data),

  /**
   * Deactivate / delete a user.
   * @param {number|string} id
   */
  delete: (id) => api.delete(`/users/${id}`),

  /**
   * Reset a user's password (admin action).
   * @param {number|string} id
   * @param {{ newPassword: string }} payload
   */
  resetPassword: (id, payload) => api.put(`/users/${id}/reset-password`, payload),
};

export default userService;
