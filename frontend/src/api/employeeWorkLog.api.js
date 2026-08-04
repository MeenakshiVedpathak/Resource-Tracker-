import apiClient from '@/services/apiClient';

// Employee self-service Work Log — drafts (status: 'pending') until an Admin runs "Sync
// Employee Work Logs" on the Admin Timesheet page, which promotes them to official Timesheet
// records (status: 'synced', read-only from then on). Scoped to the logged-in employee by the
// backend token, never by a client-supplied employee id.
//   GET  /employee-timesheets/calendar?month=&year=   -> [{ date, totalHours, hasEntries, futureDisabled }]
//   GET  /employee-timesheets/daily?date=             -> [WorkLogEntry]
//   GET  /employee-timesheets/monthly-summary?month=&year=
//     -> [{ date, service_pos: [{ service_po_id, service_po_name, hours, po_total_hrs, children }] }]
//   POST/PUT/DELETE /employee-timesheets/entries[/:id]
export const employeeWorkLogApi = {
  getCalendar: ({ month, year }) =>
    apiClient.get('/employee-timesheets/calendar', { params: { month, year } }).then((r) => r.data?.data ?? []),
  getDaily: (date) =>
    apiClient.get('/employee-timesheets/daily', { params: { date } }).then((r) => r.data?.data ?? []),
  getMonthlySummary: ({ month, year }) =>
    apiClient.get('/employee-timesheets/monthly-summary', { params: { month, year } }).then((r) => r.data?.data ?? []),
  create: (payload) => apiClient.post('/employee-timesheets/entries', payload).then((r) => r.data),
  update: (id, payload) => apiClient.put(`/employee-timesheets/entries/${id}`, payload).then((r) => r.data),
  delete: (id) => apiClient.delete(`/employee-timesheets/entries/${id}`).then((r) => r.data),
};
