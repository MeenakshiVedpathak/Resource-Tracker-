import api from './api';

const subProjectService = {
  /**
   * Fetch all sub-projects with optional filters.
   * @param {{ page?: number, limit?: number, search?: string, status?: string }} params
   */
  getAll: (params = {}) => api.get('/sub-projects', { params }),

  /**
   * Fetch a single sub-project by ID.
   * @param {number|string} id
   */
  getById: (id) => api.get(`/sub-projects/${id}`),

  /**
   * Create a new sub-project.
   * @param {object} data
   */
  create: (data) => api.post('/sub-projects', data),

  /**
   * Update a sub-project.
   * @param {number|string} id
   * @param {object} data
   */
  update: (id, data) => api.put(`/sub-projects/${id}`, data),

  /**
   * Delete a sub-project.
   * @param {number|string} id
   */
  delete: (id) => api.delete(`/sub-projects/${id}`),

  /**
   * Fetch all sub-projects belonging to a specific service PO.
   * @param {number|string} servicePOId
   * @param {{ status?: string }} params
   */
  getByPO: (servicePOId, params = {}) =>
    api.get(`/service-pos/${servicePOId}/sub-projects`, { params }),
};

export default subProjectService;
