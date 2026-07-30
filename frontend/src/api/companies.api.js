import apiClient from '@/services/apiClient';

// Company Management — Platform Admin only. Unlike every other resource in api/, these calls never
// carry an X-Company-Id header (apiClient's interceptor only attaches one when the logged-in user
// has a company, and a Platform Admin never does — they manage all companies, not one).
export const companiesApi = {
  getAll: (params) => apiClient.get('/companies', { params }).then((r) => r.data),
  getById: (id) => apiClient.get(`/companies/${id}`).then((r) => r.data?.data),
  // Bootstraps the company's first admin account: { company_code, company_name, admin_email, admin_password }
  create: (payload) => apiClient.post('/companies', payload).then((r) => r.data),
  // Only company_name/status are accepted here — company_code/admin_email/admin_password are
  // create-only per the backend contract.
  update: (id, payload) => apiClient.patch(`/companies/${id}`, payload).then((r) => r.data),
};
