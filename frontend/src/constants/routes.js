export const ROUTES = {
  // Auth — a real route per screen (not just steps in one page): the Forgot Password flow's
  // state (email/otp/timers) needs "refresh/back-button/direct-URL -> Email screen" semantics,
  // which only make sense with separate URLs to refresh/navigate/back into.
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',
  FORGOT_PASSWORD_OTP: '/forgot-password/verify-otp',
  FORGOT_PASSWORD_RESET: '/forgot-password/reset-password',

  // Core
  DASHBOARD: '/',
  AI_INSIGHTS: '/ai-insights',

  // Employee self-service (dynamic login)
  EMPLOYEE_DASHBOARD: '/employee/dashboard',
  EMPLOYEE_TIMESHEET: '/employee/timesheet',
  EMPLOYEE_MONTHLY_SUMMARY: '/employee/monthly-summary',
  EMPLOYEE_REPORTS: '/employee/reports',

  // AI Copilot — new pages added on top of the existing app, reachable from the
  // floating AI Copilot widget's launcher rather than the RBAC-driven sidebar
  // (see components/ai/AICopilotHub.jsx for why).
  AI_ROOT_CAUSE: '/ai/root-cause',
  AI_EXECUTIVE_REPORT: '/ai/executive-report',
  AI_FORECAST: '/ai/forecast',
  AI_RECOMMENDATIONS: '/ai/recommendations',
  AI_WHAT_IF: '/ai/what-if',
  AI_PROJECT_HEALTH: '/ai/project-health',
  EMPLOYEE_AI_PROFILE: '/employees/:id/ai-profile',

  // People
  EMPLOYEES: '/employees',
  EMPLOYEE_NEW: '/employees/new',
  EMPLOYEE_EDIT: '/employees/:id/edit',

  USERS: '/users',
  USER_NEW: '/users/new',
  USER_EDIT: '/users/:id/edit',

  ROLES: '/roles',
  ROLE_NEW: '/roles/new',
  ROLE_EDIT: '/roles/:id/edit',

  FORMS: '/forms',
  FORM_NEW: '/forms/new',
  FORM_EDIT: '/forms/:id/edit',

  // Role-Form Mapping is a per-row action on the Roles page, not its own menu item
  ROLE_FORM_MAPPING_EDIT: '/roles/:roleId/forms',

  // Admin management (Platform Admin only, §6.1)
  ADMINS: '/admins',
  ADMIN_NEW: '/admins/new',

  // Entity Admin management (Admin tier, platform-wide, §6.2)
  ENTITY_ADMINS: '/entity-admins',
  ENTITY_ADMIN_NEW: '/entity-admins/new',

  // Entity Master (Admin / Entity Admin)
  ENTITIES: '/entities',
  ENTITY_NEW: '/entities/new',
  ENTITY_EDIT: '/entities/:id/edit',

  // BU Admin Master (Admin / Entity Admin)
  BU_ADMINS: '/bu-admins',

  // Company Management — Admin (platform-wide) or Entity Admin (own Entities), §6.3
  COMPANIES: '/companies',
  COMPANY_NEW: '/companies/new',
  COMPANY_EDIT: '/companies/:id/edit',

  // Business
  CLIENTS: '/clients',
  CLIENT_NEW: '/clients/new',
  CLIENT_EDIT: '/clients/:id/edit',

  PROJECTS: '/projects',
  PROJECT_NEW: '/projects/new',
  PROJECT_EDIT: '/projects/:id/edit',

  SERVICE_POS: '/service-pos',
  SERVICE_PO_NEW: '/service-pos/new',
  SERVICE_PO_DETAIL: '/service-pos/:id',
  SERVICE_PO_EDIT: '/service-pos/:id/edit',
  SERVICE_PO_IMPORT: '/service-pos/import',
  SERVICE_PO_MAP_EMPLOYEES: '/service-pos/:id/map-employees',

  SUB_PROJECTS: '/sub-projects',
  SUB_PROJECT_NEW: '/sub-projects/new',
  SUB_PROJECT_EDIT: '/sub-projects/:id/edit',

  SERVICE_TYPES: '/service-types',
  SERVICE_TYPE_NEW: '/service-types/new',
  SERVICE_TYPE_EDIT: '/service-types/:id/edit',

  SERVICE_CATEGORIES: '/service-categories',
  SERVICE_CATEGORY_NEW: '/service-categories/new',
  SERVICE_CATEGORY_EDIT: '/service-categories/:id/edit',

  // Resources
  RESOURCE_ALLOCATION: '/resource-allocation',
  TIMESHEETS: '/timesheets',
  TIMESHEET_UPLOAD: '/timesheets/upload',
  TIMESHEET_IMPORT_DETAIL: '/timesheets/import/:id',
  MONTHLY_COSTS: '/monthly-costs',
  MONTHLY_COST_IMPORT: '/monthly-costs/import',
  MONTHLY_COST_DETAIL: '/monthly-costs/:month/:year',
  MONTHLY_COST_NEW: '/monthly-costs/:month/:year/new',
  MONTHLY_COST_EDIT: '/monthly-costs/:month/:year/:id/edit',

  // Analytics
  REPORTS: '/reports',
  REPORT_RESOURCE_ALLOCATION: '/reports/resource-allocation',
  REPORT_SERVICE_PO_RESOURCE: '/reports/service-po-resource',
  REPORT_SERVICE_PO_SUMMARY: '/reports/service-po-summary',
  REPORT_INVOICE_PO_SUMMARY: '/reports/invoice-po-summary',
  REPORT_MONTHLY_RESOURCE_UTILIZATION: '/reports/monthly-resource-utilization',
  REPORT_RESOURCE_PROJECT_UTILIZATION: '/reports/resource-project-utilization',
  REPORT_CLIENT_SERVICE_PO_HOURS: '/reports/client-service-po-hours',

  // Team Mapping — Service PO Admin self-service (§7)
  TEAM_MAPPINGS: '/team-mappings',

  // My Team — Manager self-service (§8)
  MY_TEAM: '/my-team',

  // Service PO Monthly Budget — Manager self-service, net-new (Service PO Manager screen)
  SERVICE_PO_MONTHLY_BUDGET: '/service-po-monthly-budget',

  // Settings
  NOTIFICATIONS: '/notifications',
  SETTINGS: '/settings',

  // Error
  NOT_FOUND: '*',
  NOT_AUTHORIZED: '/not-authorized',
};

export const buildPath = (route, params = {}) => {
  let path = route;
  Object.entries(params).forEach(([key, value]) => {
    path = path.replace(`:${key}`, value);
  });
  return path;
};
