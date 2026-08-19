import apiClient from '@/services/apiClient';

// Company Management — Entity Admin only (Entity Admin tier). Unlike every other resource in
// api/, these calls never carry an X-Company-Id header (apiClient's interceptor only attaches
// one when the logged-in user has a company, and an Entity Admin never does — they own Entities,
// not a single company). Create now requires entity_id; GET is scoped server-side to Companies
// under the caller's own Entities.
export const companiesApi = {
  getAll: (params) => apiClient.get('/companies', { params }).then((r) => r.data),
  getById: (id) => apiClient.get(`/companies/${id}`).then((r) => r.data?.data),
  // Bootstraps the company's first admin account, who is also created as an Employee (single
  // atomic call — the backend creates Company + Employee + User + both BU Admin/Employee role
  // assignments in one transaction; the frontend never orchestrates these as separate calls).
  // Payload: { company: { entity_id, company_code, company_name }, admin: { admin_email,
  // admin_password }, employee: { employee_code, full_name, email, designation, ... } }.
  // ⚠️ As of this writing the real backend's POST /companies only accepts the old flat
  // { company_code, company_name, admin_email, admin_password } shape and does not yet create an
  // Employee or assign a second role — this envelope is the agreed frontend/backend contract to
  // build toward, not something already live. See companyController.js/companyValidation.js on
  // the backend side once it's updated.
  create: (payload) => apiClient.post('/companies', payload).then((r) => r.data),
  // Only company_name/status are accepted here — company_code/admin_email/admin_password are
  // create-only per the backend contract.
  update: (id, payload) => apiClient.patch(`/companies/${id}`, payload).then((r) => r.data),
};
