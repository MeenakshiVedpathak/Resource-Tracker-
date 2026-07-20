export const ROUTES = {
  // Auth
  LOGIN: '/login',
  FORGOT_PASSWORD: '/forgot-password',

  // Core
  DASHBOARD: '/',

  // People
  EMPLOYEES: '/employees',
  EMPLOYEE_NEW: '/employees/new',
  EMPLOYEE_EDIT: '/employees/:id/edit',

  USERS: '/users',
  USER_NEW: '/users/new',
  USER_EDIT: '/users/:id/edit',

  ROLES: '/roles',

  // Business
  CLIENTS: '/clients',
  CLIENT_NEW: '/clients/new',
  CLIENT_EDIT: '/clients/:id/edit',

  SERVICE_POS: '/service-pos',
  SERVICE_PO_NEW: '/service-pos/new',
  SERVICE_PO_DETAIL: '/service-pos/:id',
  SERVICE_PO_EDIT: '/service-pos/:id/edit',
  SERVICE_PO_IMPORT: '/service-pos/import',

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
  REPORT_HOURLY_RATE: '/reports/hourly-rate',
  REPORT_MONTHLY_COST: '/reports/monthly-cost',
  REPORT_TIMESHEET: '/reports/timesheet-summary',
  REPORT_PO_UTILISATION: '/reports/po-utilisation',
  REPORT_SUB_PROJECT_HOURS: '/reports/sub-project-hours',
  REPORT_RESOURCE_ALLOCATION: '/reports/resource-allocation',
  REPORT_OPERATIONAL_COST: '/reports/operational-cost',
  REPORT_MONTHLY_UTILIZATION: '/reports/monthly-utilization',
  REPORT_SERVICE_PO_RESOURCE: '/reports/service-po-resource',
  REPORT_SERVICE_PO_SUMMARY: '/reports/service-po-summary',
  REPORT_MONTHLY_RESOURCE_UTILIZATION: '/reports/monthly-resource-utilization',
  REPORT_RESOURCE_PROJECT_UTILIZATION: '/reports/resource-project-utilization',

  // Settings
  PROFILE: '/profile',
  NOTIFICATIONS: '/notifications',
  SETTINGS: '/settings',

  // Error
  NOT_FOUND: '*',
};

export const buildPath = (route, params = {}) => {
  let path = route;
  Object.entries(params).forEach(([key, value]) => {
    path = path.replace(`:${key}`, value);
  });
  return path;
};
