// ⚠️ GUESSED MAPPING — CONFIRM WITH BACKEND/ADMIN ⚠️
//
// The backend's Form Master only knows a form's `form_name` string (see POST /roles/forms
// response, e.g. { "Dashboard": [{ id, name: "Analytics Dashboard" }] }). It has no concept
// of a frontend route. Until the real Form Master rows exist, the `name` values below are
// GUESSES based on this app's current page titles/sidebar labels — they are almost certainly
// not identical to what a Management user will actually type into the new Form Master screen.
//
// The lookup below is case-insensitive/trimmed to reduce accidental breakage, but the key
// strings themselves still need to match whatever `form_name` values get seeded/entered.
// Any accessible-forms entry with no match here is dropped from the sidebar (see Sidebar.jsx)
// and logged via console.warn so mismatches are visible during rollout instead of silently
// wrong.
import {
  LayoutDashboard, Users, Shield, Building2,
  FileText, FolderOpen, FolderKanban, Clock, DollarSign,
  Tag, Layers, Sparkles, ClipboardList, Landmark, ShieldCheck,
  FileBarChart2, PieChart, CalendarRange, UserCheck, Network, Receipt, Table2, Wallet, IndianRupee,
  ListTree, ListChecks, Banknote, CalendarClock,
} from 'lucide-react';
import { ROUTES } from '@/constants/routes';

export const FORM_NAMES = {
  DASHBOARD: 'Dashboard',
  AI_INSIGHTS: 'AI Insights',
  EMPLOYEES: 'Employee Master',
  ROLES: 'Roles',
  FORMS: 'Forms',
  // Not in FORM_ROUTE_CONFIG on purpose — it's a per-row "Manage Forms" action on the Roles
  // page, not its own sidebar item. Kept here only so useHasForm() can gate that action.
  ROLE_FORM_MAPPING: 'Role Form Mapping',
  // Entity Admin tier — these two are the ONLY forms an Entity Admin's login ever returns
  // (module "Entity Management"). Company Management has no form of its own on purpose — it's
  // reached via buttons on these two screens, not a sidebar item (see CompanyList/BuAdminList).
  ENTITY_MASTER: 'Entity Master',
  BU_ADMIN_MASTER: 'BU Admin Master',
  CLIENTS: 'Client Master',
  // Matches the actual Form Master row name ("Project Master"), not the page's own title.
  PROJECTS: 'Project Master',
  SERVICE_POS: 'Service PO Master',
  SUB_PROJECTS: 'Sub-Projects',
  SERVICE_TYPES: 'Service Types',
  SERVICE_CATEGORIES: 'Service Categories',
  TIMESHEETS: 'Timesheets',
  MONTHLY_COSTS: 'Monthly Costs',
  REPORT_PO_VS_RESOURCE: 'PO vs Resource',
  REPORT_SERVICE_PO_SUMMARY: 'Service PO Summary',
  REPORT_INVOICE_PO_SUMMARY: 'Invoice PO Summary',
  REPORT_MONTHLY_UTILIZATION: 'Monthly Utilization',
  REPORT_RESOURCE_ALLOCATION: 'Resource Allocation',
  REPORT_RESOURCE_PROJECT_UTILIZATION: 'Resource Project Utilization',
  // Matches the backend's actual Form Master row name (confirmed via GET /roles/forms), not
  // the report's own page title.
  REPORT_CLIENT_SERVICE_PO_HOURS: 'Client × Service PO',
  // Employee self-service (§ RBAC mapping migration) — previously static/hardcoded
  // (EmployeeSidebar + `employeeOnly`), now driven by Form Master + Role-Form Mapping like
  // every other screen. "Employee Dashboard" (not "Dashboard") on purpose — that name is
  // already taken by the admin-side Dashboard form and this lookup is a flat, name-keyed map;
  // reusing "Dashboard" here would collide and resolve to the wrong route.
  EMPLOYEE_DASHBOARD: 'Employee Dashboard',
  EMPLOYEE_WORK_LOG: 'My Work Log',
  EMPLOYEE_MONTHLY_SUMMARY: 'Monthly Summary',
  EMPLOYEE_REPORTS: 'PO Wise Report',
  // Guessed name — same caveat as the rest of this file's Employee self-service entries; confirm
  // against the actual Form Master row once one is seeded for this new report.
  EMPLOYEE_PROJECT_HOURS_REPORT: 'Project Hours Report',
  // Guessed name — same caveat as the rest of this file's Employee self-service entries; confirm
  // against the actual Form Master row once one is seeded for this new report. Shared by both
  // Employee and Manager logins (single endpoint auto-resolves "own" vs "team" data), so whichever
  // role(s) this form gets mapped to will reach the same page/route.
  EMPLOYEE_TIMESHEET_APPROVAL_STATUS_REPORT: 'Timesheet Approval Status Report',
  // Manager Timesheet Access & Approval — the backend's Form Master grants Managers these two
  // Resources-module rows (distinct from the Employee Self-Service "My Work Log" row an Employee
  // gets). Both point at the same EmployeeTimesheet page/route as "My Work Log" — that page
  // already renders the Manager-only selector + approval view on top of the self-service UI, and
  // the spec forbids a separate screen for this.
  MANAGER_TIMESHEET: 'Timesheet',
  MANAGER_TIMESHEET_APPROVAL: 'Timesheet Approval',
  // Business module, Service PO Admin login (confirmed via GET /roles/forms) — the Form Master
  // row now exists on the backend, so this is picked up automatically by Sidebar's RBAC-driven
  // buildNavGroups() instead of the Manager-only hardcoded injection below.
  SERVICE_PO_MONTHLY_BUDGET: 'Invoice Master',
  // People module, Manager login (confirmed via GET /roles/forms) — the Form Master row now
  // exists on the backend, so this is picked up automatically by buildNavGroups() instead of
  // the MY_TEAM_ROLES hardcoded injection in Sidebar.jsx.
  MY_TEAM: 'My Team',
  // Guessed names — same caveat as the rest of this file: these two screens are brand new
  // (backend spec dated 2026-08-19, no Form Master rows confirmed yet). Confirm against the
  // real GET /roles/forms response once these are seeded.
  COST_BUDGET: 'Cost Budget',
  RESOURCE_BUDGET: 'Resource Budget',
};

// form_name (lowercased/trimmed) -> { to, icon, exact }. Icons are used by the dynamic Sidebar.
export const FORM_ROUTE_CONFIG = {
  [FORM_NAMES.DASHBOARD]: { to: ROUTES.DASHBOARD, icon: LayoutDashboard, exact: true },
  [FORM_NAMES.AI_INSIGHTS]: { to: ROUTES.AI_INSIGHTS, icon: Sparkles, exact: true },
  [FORM_NAMES.EMPLOYEES]: { to: ROUTES.EMPLOYEES, icon: Users },
  [FORM_NAMES.ROLES]: { to: ROUTES.ROLES, icon: Shield },
  [FORM_NAMES.FORMS]: { to: ROUTES.FORMS, icon: ClipboardList },
  [FORM_NAMES.ENTITY_MASTER]: { to: ROUTES.ENTITIES, icon: Landmark },
  [FORM_NAMES.BU_ADMIN_MASTER]: { to: ROUTES.BU_ADMINS, icon: ShieldCheck },
  [FORM_NAMES.CLIENTS]: { to: ROUTES.CLIENTS, icon: Building2 },
  [FORM_NAMES.PROJECTS]: { to: ROUTES.PROJECTS, icon: FolderKanban },
  [FORM_NAMES.SERVICE_POS]: { to: ROUTES.SERVICE_POS, icon: FileText },
  [FORM_NAMES.SUB_PROJECTS]: { to: ROUTES.SUB_PROJECTS, icon: FolderOpen },
  [FORM_NAMES.SERVICE_TYPES]: { to: ROUTES.SERVICE_TYPES, icon: Layers },
  [FORM_NAMES.SERVICE_CATEGORIES]: { to: ROUTES.SERVICE_CATEGORIES, icon: Tag },
  [FORM_NAMES.TIMESHEETS]: { to: ROUTES.TIMESHEETS, icon: Clock },
  [FORM_NAMES.MONTHLY_COSTS]: { to: ROUTES.MONTHLY_COSTS, icon: DollarSign },
  [FORM_NAMES.REPORT_PO_VS_RESOURCE]: { to: ROUTES.REPORT_SERVICE_PO_RESOURCE, icon: Network },
  [FORM_NAMES.REPORT_SERVICE_PO_SUMMARY]: { to: ROUTES.REPORT_SERVICE_PO_SUMMARY, icon: FileBarChart2 },
  [FORM_NAMES.REPORT_INVOICE_PO_SUMMARY]: { to: ROUTES.REPORT_INVOICE_PO_SUMMARY, icon: IndianRupee },
  [FORM_NAMES.REPORT_MONTHLY_UTILIZATION]: { to: ROUTES.REPORT_MONTHLY_RESOURCE_UTILIZATION, icon: CalendarRange },
  [FORM_NAMES.REPORT_RESOURCE_ALLOCATION]: { to: ROUTES.REPORT_RESOURCE_ALLOCATION, icon: PieChart },
  [FORM_NAMES.REPORT_RESOURCE_PROJECT_UTILIZATION]: { to: ROUTES.REPORT_RESOURCE_PROJECT_UTILIZATION, icon: UserCheck },
  [FORM_NAMES.REPORT_CLIENT_SERVICE_PO_HOURS]: { to: ROUTES.REPORT_CLIENT_SERVICE_PO_HOURS, icon: Receipt },
  [FORM_NAMES.EMPLOYEE_DASHBOARD]: { to: ROUTES.EMPLOYEE_DASHBOARD, icon: LayoutDashboard, exact: true },
  [FORM_NAMES.EMPLOYEE_WORK_LOG]: { to: ROUTES.EMPLOYEE_TIMESHEET, icon: Clock },
  [FORM_NAMES.EMPLOYEE_MONTHLY_SUMMARY]: { to: ROUTES.EMPLOYEE_MONTHLY_SUMMARY, icon: Table2 },
  [FORM_NAMES.EMPLOYEE_REPORTS]: { to: ROUTES.EMPLOYEE_REPORTS, icon: FileBarChart2 },
  [FORM_NAMES.EMPLOYEE_PROJECT_HOURS_REPORT]: { to: ROUTES.EMPLOYEE_PROJECT_HOURS_REPORT, icon: ListTree },
  [FORM_NAMES.EMPLOYEE_TIMESHEET_APPROVAL_STATUS_REPORT]: { to: ROUTES.EMPLOYEE_TIMESHEET_APPROVAL_STATUS_REPORT, icon: ListChecks },
  [FORM_NAMES.MANAGER_TIMESHEET]: { to: ROUTES.EMPLOYEE_TIMESHEET, icon: Clock },
  [FORM_NAMES.MANAGER_TIMESHEET_APPROVAL]: { to: ROUTES.EMPLOYEE_TIMESHEET, icon: Clock },
  [FORM_NAMES.SERVICE_PO_MONTHLY_BUDGET]: { to: ROUTES.SERVICE_PO_MONTHLY_BUDGET, icon: Wallet, exact: true },
  [FORM_NAMES.MY_TEAM]: { to: ROUTES.MY_TEAM, icon: Network, exact: true },
  [FORM_NAMES.COST_BUDGET]: { to: ROUTES.COST_BUDGETS, icon: Banknote, exact: true },
  [FORM_NAMES.RESOURCE_BUDGET]: { to: ROUTES.RESOURCE_BUDGETS, icon: CalendarClock, exact: true },
};

const NORMALIZED_CONFIG = Object.fromEntries(
  Object.entries(FORM_ROUTE_CONFIG).map(([name, cfg]) => [name.trim().toLowerCase(), cfg])
);

// Case-insensitive/trimmed lookup so minor casing differences from the Form Master
// don't silently drop a nav item.
export const resolveFormRoute = (formName) => NORMALIZED_CONFIG[(formName ?? '').trim().toLowerCase()];

// First route the accessible-forms map actually resolves to, module order be damned — used as
// a landing page when Dashboard itself isn't one of the caller's mapped forms.
export const getFirstAccessibleRoute = (accessibleForms) => {
  const allForms = Object.values(accessibleForms ?? {}).flat();
  for (const f of allForms) {
    const cfg = resolveFormRoute(f?.name);
    if (cfg) return cfg.to;
  }
  return null;
};

// Pure — takes a plain accessible-forms map (module -> [{ name }]), not a hook, so it works
// equally from Redux-derived state (useAuth's homeRoute) and from a login response's own
// `forms` object before that's even landed in the store yet (Login.jsx's post-auth redirect,
// where waiting for a re-render to read it back out of Redux would be too late). The preferred
// home (Dashboard by default) is the destination whenever it's actually mapped, or when NOTHING
// is mapped (the zero-forms safety net ProtectedRoute's `allowIfNoFormsMapped` also honors) —
// otherwise the first form that resolves to a real route.
//
// `homeFormName`/`homeRoute` let an Employee-only account reuse this same logic against
// "Employee Dashboard" / EMPLOYEE_DASHBOARD instead of the admin-side Dashboard — an Employee
// whose role mapping omits
// "Employee Dashboard" itself (but has other Employee forms like "My Work Log") must still land
// on one of those, not get bounced to Not Authorized (see Login.jsx, useAuth's homeRoute).
export const computeHomeRoute = (accessibleForms, { homeFormName = FORM_NAMES.DASHBOARD, homeRoute = ROUTES.DASHBOARD } = {}) => {
  const allForms = Object.values(accessibleForms ?? {}).flat();
  const hasHome = allForms.some((f) => (f?.name ?? '').trim().toLowerCase() === homeFormName.trim().toLowerCase());
  if (hasHome || allForms.length === 0) return homeRoute;
  return getFirstAccessibleRoute(accessibleForms) ?? homeRoute;
};
