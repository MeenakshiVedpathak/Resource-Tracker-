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
  ELIGIBLE_DELIVERY_HEADS: ['employees', 'eligible-delivery-heads'],
  EMPLOYEE: (id) => ['employees', id],

  // Users
  USERS: (params) => ['users', params],

  // Roles
  ROLES: (params) => ['roles', params],
  ROLE: (id) => ['roles', id],
  ACCESSIBLE_FORMS: (roleIds) => ['roles', 'forms', [...roleIds].sort()],
  ROLE_FORM_MAPPINGS: (roleId) => ['roles', 'form-mappings', roleId],

  // Forms (Form Master)
  FORMS: (params) => ['forms', params],
  FORM: (id) => ['forms', id],
  FORM_MODULES: (params) => ['forms', 'modules', params],

  // Clients
  CLIENTS: (params) => ['clients', params],
  CLIENTS_ACTIVE: ['clients', 'active'],
  CLIENT: (id) => ['clients', id],

  // Projects
  PROJECTS: (params) => ['projects', params],
  PROJECTS_ACTIVE: ['projects', 'active'],
  PROJECTS_BY_CLIENT: (clientId) => ['projects', 'by-client', clientId],
  PROJECT: (id) => ['projects', id],

  // Team Mapping (Service PO Admin self-service)
  TEAM_MAPPINGS: ['team-mappings'],
  TEAM_MAPPING_AVAILABLE_MANAGERS: ['team-mappings', 'available-managers'],
  TEAM_MAPPING_SERVICE_PO_GRANTS: ['team-mappings', 'service-po-grants'],

  // My Team (Manager self-service)
  MY_TEAM_EMPLOYEES: ['my-team', 'employees'],
  MY_TEAM_SERVICE_POS: ['my-team', 'service-pos'],
  MY_TEAM_APPROVAL_SUMMARY: (params) => ['my-team', 'approval-summary', params],

  // Admins (Platform Admin -> Admin)
  ADMINS: (params) => ['admins', params],

  // Entity Admins (Admin tier)
  ENTITY_ADMINS: (params) => ['entity-admins', params],
  ENTITY_ADMIN: (id) => ['entity-admins', id],

  // Companies — now Entity Admin scoped
  COMPANIES: (params) => ['companies', params],
  COMPANY: (id) => ['companies', id],

  // Entities (Entity Admin tier)
  ENTITIES: (params) => ['entities', params],
  ENTITIES_ACTIVE: ['entities', 'active'],
  ENTITY: (id) => ['entities', id],

  // BU Admins (Entity Admin tier)
  BU_ADMINS: (params) => ['bu-admins', params],
  BU_ADMIN: (id) => ['bu-admins', id],

  // Service POs
  SERVICE_POS: (params) => ['service-pos', params],
  SERVICE_POS_ACTIVE: ['service-pos', 'active'],
  SERVICE_PO: (id) => ['service-pos', id],
  SERVICE_PO_UTILISATION: (id) => ['service-pos', id, 'utilisation'],
  SERVICE_PO_HIERARCHY: (id) => ['service-pos', id, 'hierarchy'],

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

  // Service PO Monthly Budget (Invoice Master)
  SERVICE_PO_MONTHLY_BUDGET_SERVICE_POS: ['service-po-monthly-budget', 'service-pos'],
  SERVICE_PO_MONTHLY_BUDGET_LIST: (month, year) => ['service-po-monthly-budget', 'list', month, year],
  SERVICE_PO_MONTHLY_BUDGET_YEAR_LIST: (year) => ['service-po-monthly-budget', 'year-list', year],
  SERVICE_PO_MONTHLY_BUDGET_RECORD: (servicePoId, month, year) =>
    ['service-po-monthly-budget', 'record', servicePoId, month, year],

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
  REPORT_INVOICE_PO_SUMMARY: (params) => ['reports', 'invoice-po-summary', params],
  REPORT_INVOICE_PO_SUMMARY_TOTALS: (params) => ['reports', 'invoice-po-summary-totals', params],
  REPORT_MONTHLY_RESOURCE_UTILIZATION: (params) => ['reports', 'monthly-resource-utilization', params],
  REPORT_RESOURCE_PROJECT_UTILIZATION: (params) => ['reports', 'resource-project-utilization', params],
  REPORT_CLIENT_SERVICE_PO_HOURS: (params) => ['reports', 'client-service-po-hours', params],

  // Notifications
  NOTIFICATIONS: (params) => ['notifications', params],

  // Employee self-service Work Log (draft/synced two-stage model)
  EMPLOYEE_WORKLOG_CALENDAR: (month, year) => ['employee-worklog', 'calendar', month, year],
  EMPLOYEE_WORKLOG_DAILY: (date) => ['employee-worklog', 'daily', date],
  EMPLOYEE_WORKLOG_MONTHLY_SUMMARY: (month, year, viewType = 'day') => ['employee-worklog', 'monthly-summary', month, year, viewType],
  EMPLOYEE_WORKLOG_MONTHLY: (month, year) => ['employee-worklog', 'monthly', month, year],
  EMPLOYEE_PROJECTS: ['employee-worklog', 'projects'],

  // Employee <-> Service PO mapping (Admin-side, backs the Project dropdown above)
  EMPLOYEE_SERVICEPO_MAPPING_BY_EMPLOYEE: (employeeId) => ['employee-servicepo-mapping', 'employee', employeeId],
  EMPLOYEE_SERVICEPO_MAPPING_BY_SERVICE_PO: (servicePOId) => ['employee-servicepo-mapping', 'service-po', servicePOId],

  // Employee Reports
  EMPLOYEE_REPORT_DAILY: (date) => ['employee-report', 'daily', date],
  EMPLOYEE_REPORT_MONTHLY: (month, year) => ['employee-report', 'monthly', month, year],
  EMPLOYEE_REPORT_RANGE: (startDate, endDate) => ['employee-report', 'range', startDate, endDate],

  // Employee Project Hours Report
  EMPLOYEE_PROJECT_HOURS_FILTER_TREE: ['employee-project-hours-report', 'filter-tree'],
  EMPLOYEE_PROJECT_HOURS_REPORT: (params) => ['employee-project-hours-report', 'report', params],

  // Timesheet Approval Status Report (Employee sees own, Manager sees mapped team — one endpoint)
  TIMESHEET_APPROVAL_STATUS_REPORT: (params) => ['timesheet-approval-status-report', params],
};
