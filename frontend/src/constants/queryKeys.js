export const QUERY_KEYS = {
  // Auth
  AUTH_PROFILE: ['auth', 'profile'],

  // Dashboard
  DASHBOARD_STATS: ['dashboard', 'stats'],

  // Employees
  EMPLOYEES: (params) => ['employees', params],
  EMPLOYEES_ACTIVE: ['employees', 'active'],
  EMPLOYEE: (id) => ['employees', id],

  // Users
  USERS: (params) => ['users', params],
  USER: (id) => ['users', id],

  // Roles
  ROLES: (params) => ['roles', params],
  ROLE: (id) => ['roles', id],

  // Clients
  CLIENTS: (params) => ['clients', params],
  CLIENTS_ACTIVE: ['clients', 'active'],
  CLIENT: (id) => ['clients', id],

  // Service POs
  SERVICE_POS: (params) => ['service-pos', params],
  SERVICE_POS_ACTIVE: ['service-pos', 'active'],
  SERVICE_PO: (id) => ['service-pos', id],
  SERVICE_PO_UTILISATION: (id) => ['service-pos', id, 'utilisation'],

  // Sub-Projects
  SUB_PROJECTS: (params) => ['sub-projects', params],
  SUB_PROJECTS_BY_PO: (poId) => ['sub-projects', 'by-po', poId],
  SUB_PROJECT: (id) => ['sub-projects', id],

  // Monthly Costs
  MONTHLY_COSTS: (params) => ['monthly-costs', params],
  MONTHLY_COST: (id) => ['monthly-costs', id],

  // Timesheets
  TIMESHEETS: (params) => ['timesheets', params],
  TIMESHEET: (id) => ['timesheets', id],
  TIMESHEET_IMPORT_HISTORY: (params) => ['timesheets', 'import', 'history', params],
  TIMESHEET_IMPORT: (id) => ['timesheets', 'import', id],
  TIMESHEET_IMPORT_ROWS: (id) => ['timesheets', 'import', id, 'rows'],

  // Reports
  REPORT_HOURLY_RATE: (params) => ['reports', 'hourly-rate', params],
  REPORT_MONTHLY_COST_SUMMARY: (params) => ['reports', 'monthly-cost-summary', params],
  REPORT_TIMESHEET_SUMMARY: (params) => ['reports', 'timesheet-summary', params],
  REPORT_PO_UTILISATION: (params) => ['reports', 'po-utilisation', params],
  REPORT_SUB_PROJECT_HOURS: (params) => ['reports', 'sub-project-hours', params],
  REPORT_RESOURCE_ALLOCATION: (params) => ['reports', 'resource-allocation', params],
  REPORT_OPERATIONAL_COST: (params) => ['reports', 'operational-cost', params],
  REPORT_MONTHLY_UTILIZATION: (params) => ['reports', 'monthly-utilization', params],
  REPORT_SERVICE_PO_RESOURCE: (params) => ['reports', 'service-po-resource', params],

  // Notifications
  NOTIFICATIONS: (params) => ['notifications', params],
};
