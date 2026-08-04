import apiClient from '@/services/apiClient';

// Employee self-service Work Log — drafts (status: 'pending') until an Admin runs "Sync
// Employee Work Logs" on the Admin Timesheet page, which promotes them to official Timesheet
// records (status: 'synced', read-only from then on). Scoped to the logged-in employee by the
// backend token, never by a client-supplied employee id.
//   GET  /employee-timesheets/calendar?month=&year=   -> [{ date, totalHours, hasEntries, futureDisabled }]
//   GET  /employee-timesheets/daily?date=
//     -> { date, service_pos: [{ service_po_id, service_po_name, hours, po_total_hrs, children }] }
//     (same shape as monthly-summary's per-day entry, just for one date — no individual entry
//     ids are exposed anymore, so entries can't be listed/edited/deleted one at a time)
//   GET  /employee-timesheets/monthly-summary?month=&year=
//     -> [{ date, service_pos: [{ service_po_id, service_po_name, hours, po_total_hrs, children }] }]
//   POST /employee-timesheets/entries — whole-day replace, not per-row create. Body is
//     { timesheet_date, entries: [{ service_po_id, sub_project_id?, hierarchy_node_id?, hours,
//     description }] }; any existing entry for that date not present in `entries` is deleted
//     server-side, so callers must send every row that should survive, not just edited ones.
//     `entries: []` clears the whole day. Always 200, never 409/201 — there's no create-vs-update
//     branch anymore.
//   PUT/DELETE /employee-timesheets/entries/:id — still available for single-row edits.
export const employeeWorkLogApi = {
  getCalendar: ({ month, year }) =>
    apiClient.get('/employee-timesheets/calendar', { params: { month, year } }).then((r) => r.data?.data ?? []),
  getDaily: (date) =>
    apiClient.get('/employee-timesheets/daily', { params: { date } }).then((r) => r.data?.data ?? null),
  getMonthlySummary: ({ month, year }) =>
    apiClient.get('/employee-timesheets/monthly-summary', { params: { month, year } }).then((r) => r.data?.data ?? []),
  saveDay: ({ timesheet_date, entries }) =>
    apiClient.post('/employee-timesheets/entries', { timesheet_date, entries }).then((r) => r.data),
  update: (id, payload) => apiClient.put(`/employee-timesheets/entries/${id}`, payload).then((r) => r.data),
  delete: (id) => apiClient.delete(`/employee-timesheets/entries/${id}`).then((r) => r.data),
};
