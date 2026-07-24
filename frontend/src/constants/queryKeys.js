export const QUERY_KEYS = {
  // Auth
  AUTH_PROFILE: ['auth', 'profile'],

  // Dashboard
  DASHBOARD_STATS: (params) => ['dashboard', 'stats', params],
  DASHBOARD_EMPLOYEE_BILLABLE: (params) => ['dashboard', 'employee-billable-breakdown', params],
  DASHBOARD_TOP_EMPLOYEES_BY_PO: (params) => ['dashboard', 'top-employees-by-po', params],

  // AI Insights
  AI_INSIGHTS: (params) => ['ai-insights', params],

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
  ACCESSIBLE_FORMS: (roleIds) => ['roles', 'forms', [...roleIds].sort()],
  USER_ROLE_MAPPINGS: (userId) => ['roles', 'user-mappings', userId],
  ROLE_FORM_MAPPINGS: (roleId) => ['roles', 'form-mappings', roleId],

  // Forms (Form Master)
  FORMS: (params) => ['forms', params],
  FORM: (id) => ['forms', id],

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

  // Service Types
  SERVICE_TYPES: (params) => ['service-types', params],
  SERVICE_TYPE: (id) => ['service-types', id],

  // Service Categories
  SERVICE_CATEGORIES: (params) => ['service-categories', params],
  SERVICE_CATEGORY: (id) => ['service-categories', id],

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
  REPORT_MONTHLY_COST_SUMMARY: (params) => ['reports', 'monthly-cost-summary', params],
  REPORT_RESOURCE_ALLOCATION: (params) => ['reports', 'resource-allocation', params],
  REPORT_SERVICE_PO_RESOURCE: (params) => ['reports', 'service-po-resource', params],
  REPORT_SERVICE_PO_SUMMARY: (params) => ['reports', 'service-po-summary', params],
  REPORT_SERVICE_PO_SUMMARY_TOTALS: (params) => ['reports', 'service-po-summary-totals', params],
  REPORT_MONTHLY_RESOURCE_UTILIZATION: (params) => ['reports', 'monthly-resource-utilization', params],
  REPORT_RESOURCE_PROJECT_UTILIZATION: (params) => ['reports', 'resource-project-utilization', params],

  // Notifications
  NOTIFICATIONS: (params) => ['notifications', params],
};
