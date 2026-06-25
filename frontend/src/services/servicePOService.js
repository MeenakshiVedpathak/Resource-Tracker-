import api from './api';

const servicePOService = {
  /**
   * Fetch all service POs with optional filters.
   * @param {{ page?: number, limit?: number, search?: string, status?: string, client_id?: number, service_type_id?: number }} params
   */
  getAll: (params = {}) => api.get('/service-pos', { params }),

  /**
   * Fetch a single service PO by ID (includes resources and sub-projects).
   * @param {number|string} id
   */
  getById: (id) => api.get(`/service-pos/${id}`),

  /**
   * Create a new service PO.
   * @param {object} data
   */
  create: (data) => api.post('/service-pos', data),

  /**
   * Update a service PO.
   * @param {number|string} id
   * @param {object} data
   */
  update: (id, data) => api.put(`/service-pos/${id}`, data),

  /**
   * Delete a service PO.
   * @param {number|string} id
   */
  delete: (id) => api.delete(`/service-pos/${id}`),

  /**
   * Allocate one or more employees to a service PO.
   * @param {number|string} id
   * @param {{ employee_ids: number[] }} payload
   */
  allocateResources: (id, payload) =>
    api.post(`/service-pos/${id}/resources`, payload),

  /**
   * Remove a single employee allocation from a service PO.
   * @param {number|string} poId
   * @param {number|string} employeeId
   */
  deallocateResource: (poId, employeeId) =>
    api.delete(`/service-pos/${poId}/resources/${employeeId}`),

  /**
   * Close (mark as inactive) a service PO.
   * @param {number|string} id
   */
  closePO: (id) => api.put(`/service-pos/${id}/close`),

  /**
   * Fetch utilisation metrics for a service PO.
   * @param {number|string} id
   * @param {{ month?: number, year?: number }} params
   */
  getUtilisation: (id, params = {}) =>
    api.get(`/service-pos/${id}/utilisation`, { params }),

  /**
   * Fetch all active service POs (for dropdowns).
   */
  getActive: () => api.get('/service-pos/active'),
};

export default servicePOService;
