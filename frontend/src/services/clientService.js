import api from './api';

const clientService = {
  /**
   * Fetch all clients with optional filters.
   * @param {{ page?: number, limit?: number, search?: string, status?: string, industry?: string }} params
   */
  getAll: (params = {}) => api.get('/clients', { params }),

  /**
   * Fetch a single client by ID.
   * @param {number|string} id
   */
  getById: (id) => api.get(`/clients/${id}`),

  /**
   * Create a new client.
   * @param {object} data
   */
  create: (data) => api.post('/clients', data),

  /**
   * Update a client.
   * @param {number|string} id
   * @param {object} data
   */
  update: (id, data) => api.put(`/clients/${id}`, data),

  /**
   * Delete / deactivate a client.
   * @param {number|string} id
   */
  delete: (id) => api.delete(`/clients/${id}`),

  /**
   * Fetch only active clients (for dropdowns).
   */
  getActive: () => api.get('/clients/active'),
};

export default clientService;
