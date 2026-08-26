import apiClient from '@/services/apiClient';

// Backs the Employee's "mapped projects" list used by the Timesheet Project dropdown
// (GET /employee-timesheets/projects) — distinct from the existing servicePOs.api.js
// allocate/deallocate resource-planning mechanism.
export const employeeServicePOMappingApi = {
  create: (employeeId, servicePOId) =>
    apiClient
      .post('/employee-servicepo-mapping', { employee_id: employeeId, service_po_id: servicePOId })
      .then((r) => r.data),
  delete: (id) => apiClient.delete(`/employee-servicepo-mapping/${id}`).then((r) => r.data),
  activate: (id) => apiClient.put(`/employee-servicepo-mapping/${id}/activate`).then((r) => r.data),
  deactivate: (id) => apiClient.put(`/employee-servicepo-mapping/${id}/deactivate`).then((r) => r.data),
  getByEmployee: (employeeId, status) =>
    apiClient
      .get(`/employee-servicepo-mapping/employee/${employeeId}`, { params: status ? { status } : {} })
      .then((r) => r.data?.data ?? []),
  getByServicePO: (servicePOId, status) =>
    apiClient
      .get(`/employee-servicepo-mapping/service-po/${servicePOId}`, { params: status ? { status } : {} })
      .then((r) => r.data?.data ?? []),
  // Employee Master's "Manage Service PO Mapping" action — backend pre-filters eligible POs by
  // the employee's BU (or returns the whole tenant + `unrestricted: true` for Service PO
  // Admin/Delivery Head), so the frontend just renders what comes back.
  getOptions: (employeeId) =>
    apiClient.get(`/employee-servicepo-mapping/employee/${employeeId}/options`).then((r) => r.data?.data),
  // Replaces the full mapped set in one call — always send every checked id, not a diff.
  saveMapping: (employeeId, servicePoIds) =>
    apiClient
      .put(`/employee-servicepo-mapping/employee/${employeeId}`, { service_po_ids: servicePoIds })
      .then((r) => r.data),
};
