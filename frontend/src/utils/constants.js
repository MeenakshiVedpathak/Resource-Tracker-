// ===========================================================================
// Roles
// ===========================================================================
export const ROLES = {
  HR: 'HR',
  FINANCE: 'Finance',
  DIVISION_HEAD: 'Division Head',
  PROJECT_MANAGER: 'Project Manager',
  MANAGEMENT: 'Management',
};

export const ROLE_LIST = Object.values(ROLES);

// Permissions map: which roles can access which features
export const ROLE_PERMISSIONS = {
  [ROLES.HR]: ['employees', 'timesheets', 'reports.utilization'],
  [ROLES.FINANCE]: ['monthly_costs', 'reports', 'clients', 'service_pos'],
  [ROLES.DIVISION_HEAD]: ['employees', 'timesheets', 'reports', 'service_pos', 'sub_projects'],
  [ROLES.PROJECT_MANAGER]: ['timesheets', 'reports.utilization', 'service_pos.read'],
  [ROLES.MANAGEMENT]: ['*'], // full access
};

// ===========================================================================
// Status Options
// ===========================================================================
export const STATUS = {
  ACTIVE: 'active',
  INACTIVE: 'inactive',
};

export const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const EMPLOYEE_STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
];

export const TIMESHEET_IMPORT_STATUS = {
  PENDING: 'pending',
  PROCESSING: 'processing',
  COMPLETED: 'completed',
  FAILED: 'failed',
  PARTIAL: 'partial',
};

export const IMPORT_STATUS_OPTIONS = [
  { value: 'pending', label: 'Pending' },
  { value: 'processing', label: 'Processing' },
  { value: 'completed', label: 'Completed' },
  { value: 'partial', label: 'Partial' },
  { value: 'failed', label: 'Failed' },
];

// ===========================================================================
// Service Type Options
// ===========================================================================
export const SERVICE_TYPES = {
  PROJECT: 'Project',
  SERVICE_PACK: 'Service Pack',
  RESOURCE_OUTSOURCING: 'Resource Outsourcing',
  MANAGED_SERVICES: 'Managed Services',
};

export const SERVICE_TYPE_OPTIONS = [
  { value: 'Project', label: 'Project' },
  { value: 'Service Pack', label: 'Service Pack' },
  { value: 'Resource Outsourcing', label: 'Resource Outsourcing' },
  { value: 'Managed Services', label: 'Managed Services' },
];

// ===========================================================================
// Pagination
// ===========================================================================
export const PAGINATION = {
  DEFAULT_PAGE: 0,
  DEFAULT_ROWS_PER_PAGE: 10,
  ROWS_PER_PAGE_OPTIONS: [5, 10, 25, 50, 100],
  MAX_EXPORT_ROWS: 10000,
};

// ===========================================================================
// Date Formats
// ===========================================================================
export const DATE_FORMATS = {
  DISPLAY: 'dd MMM yyyy',
  DISPLAY_WITH_TIME: 'dd MMM yyyy, HH:mm',
  DISPLAY_SHORT: 'dd/MM/yyyy',
  API: 'yyyy-MM-dd',
  MONTH_YEAR: 'MMM yyyy',
  FULL_MONTH_YEAR: 'MMMM yyyy',
  TIME: 'HH:mm',
  TIMESTAMP: 'dd MMM yyyy HH:mm:ss',
  EXPORT_FILENAME: 'yyyyMMdd_HHmmss',
};

// ===========================================================================
// Report Types
// ===========================================================================
export const REPORT_TYPES = {
  UTILIZATION_SUMMARY: 'utilization_summary',
  RESOURCE_UTILIZATION: 'resource_utilization',
  PROJECT_COST: 'project_cost',
  BILLABLE_VS_NONBILLABLE: 'billable_vs_nonbillable',
  MONTHLY_TREND: 'monthly_trend',
};

export const REPORT_TYPE_OPTIONS = [
  { value: REPORT_TYPES.UTILIZATION_SUMMARY, label: 'Utilization Summary' },
  { value: REPORT_TYPES.RESOURCE_UTILIZATION, label: 'Resource Utilization' },
  { value: REPORT_TYPES.PROJECT_COST, label: 'Project Cost' },
  { value: REPORT_TYPES.BILLABLE_VS_NONBILLABLE, label: 'Billable vs Non-Billable' },
  { value: REPORT_TYPES.MONTHLY_TREND, label: 'Monthly Trend' },
];

export const EXPORT_FORMATS = {
  EXCEL: 'xlsx',
  CSV: 'csv',
  PDF: 'pdf',
};

export const EXPORT_FORMAT_OPTIONS = [
  { value: 'xlsx', label: 'Excel (.xlsx)' },
  { value: 'csv', label: 'CSV (.csv)' },
  { value: 'pdf', label: 'PDF (.pdf)' },
];

// ===========================================================================
// Months
// ===========================================================================
export const MONTHS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

// ===========================================================================
// Notification Types
// ===========================================================================
export const NOTIFICATION_TYPES = {
  INFO: 'info',
  SUCCESS: 'success',
  WARNING: 'warning',
  ERROR: 'error',
  SYSTEM: 'system',
};

// ===========================================================================
// Local Storage Keys
// ===========================================================================
export const STORAGE_KEYS = {
  ACCESS_TOKEN: 'rut_access_token',
  REFRESH_TOKEN: 'rut_refresh_token',
  USER: 'rut_user',
  THEME: 'rut_theme',
  SIDEBAR_OPEN: 'rut_sidebar_open',
};

// ===========================================================================
// API Error Codes
// ===========================================================================
export const API_ERRORS = {
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION_ERROR: 422,
  INTERNAL_ERROR: 500,
};

// ===========================================================================
// Timesheet
// ===========================================================================
export const TIMESHEET = {
  MAX_HOURS_PER_DAY: 24,
  MIN_HOURS_PER_ENTRY: 0.25,
  WORKING_HOURS_PER_DAY: 8,
  WORKING_DAYS_PER_MONTH: 22,
};

// ===========================================================================
// Dashboard Chart Colors
// ===========================================================================
export const CHART_COLORS = {
  PRIMARY: '#1976d2',
  SECONDARY: '#dc004e',
  SUCCESS: '#2e7d32',
  WARNING: '#ed6c02',
  INFO: '#0288d1',
  PURPLE: '#7b1fa2',
  TEAL: '#00695c',
  PALETTE: [
    '#1976d2',
    '#dc004e',
    '#2e7d32',
    '#ed6c02',
    '#0288d1',
    '#7b1fa2',
    '#00695c',
    '#c62828',
  ],
};

// ===========================================================================
// Navigation Drawer
// ===========================================================================
export const DRAWER_WIDTH = 260;
export const DRAWER_WIDTH_COLLAPSED = 64;
export const APP_BAR_HEIGHT = 64;
