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
  LayoutDashboard, Users, UserCog, Shield, Building2,
  FileText, FolderOpen, Clock, DollarSign, BarChart3,
  Tag, Layers, Sparkles, ClipboardList,
} from 'lucide-react';
import { ROUTES } from '@/constants/routes';

export const FORM_NAMES = {
  DASHBOARD: 'Dashboard',
  AI_INSIGHTS: 'AI Insights',
  EMPLOYEES: 'Employees',
  USERS: 'Users',
  ROLES: 'Roles',
  FORMS: 'Forms',
  USER_ROLE_MAPPING: 'User Role Mapping',
  // Not in FORM_ROUTE_CONFIG on purpose — it's a per-row "Manage Forms" action on the Roles
  // page, not its own sidebar item. Kept here only so useHasForm() can gate that action.
  ROLE_FORM_MAPPING: 'Role Form Mapping',
  CLIENTS: 'Clients',
  SERVICE_POS: 'Service POs',
  SUB_PROJECTS: 'Sub-Projects',
  SERVICE_TYPES: 'Service Types',
  SERVICE_CATEGORIES: 'Service Categories',
  TIMESHEETS: 'Timesheets',
  MONTHLY_COSTS: 'Monthly Costs',
  REPORT_PO_VS_RESOURCE: 'PO vs Resource',
  REPORT_SERVICE_PO_SUMMARY: 'Service PO Summary',
  REPORT_MONTHLY_UTILIZATION: 'Monthly Utilization',
  REPORT_RESOURCE_ALLOCATION: 'Resource Allocation',
  REPORT_RESOURCE_PROJECT_UTILIZATION: 'Resource Project Utilization',
};

// form_name (lowercased/trimmed) -> { to, icon, exact }. Icons are used by the dynamic Sidebar.
export const FORM_ROUTE_CONFIG = {
  [FORM_NAMES.DASHBOARD]: { to: ROUTES.DASHBOARD, icon: LayoutDashboard, exact: true },
  [FORM_NAMES.AI_INSIGHTS]: { to: ROUTES.AI_INSIGHTS, icon: Sparkles, exact: true },
  [FORM_NAMES.EMPLOYEES]: { to: ROUTES.EMPLOYEES, icon: Users },
  [FORM_NAMES.USERS]: { to: ROUTES.USERS, icon: UserCog },
  [FORM_NAMES.ROLES]: { to: ROUTES.ROLES, icon: Shield },
  [FORM_NAMES.FORMS]: { to: ROUTES.FORMS, icon: ClipboardList },
  [FORM_NAMES.USER_ROLE_MAPPING]: { to: ROUTES.USER_ROLE_MAPPING, icon: UserCog },
  [FORM_NAMES.CLIENTS]: { to: ROUTES.CLIENTS, icon: Building2 },
  [FORM_NAMES.SERVICE_POS]: { to: ROUTES.SERVICE_POS, icon: FileText },
  [FORM_NAMES.SUB_PROJECTS]: { to: ROUTES.SUB_PROJECTS, icon: FolderOpen },
  [FORM_NAMES.SERVICE_TYPES]: { to: ROUTES.SERVICE_TYPES, icon: Layers },
  [FORM_NAMES.SERVICE_CATEGORIES]: { to: ROUTES.SERVICE_CATEGORIES, icon: Tag },
  [FORM_NAMES.TIMESHEETS]: { to: ROUTES.TIMESHEETS, icon: Clock },
  [FORM_NAMES.MONTHLY_COSTS]: { to: ROUTES.MONTHLY_COSTS, icon: DollarSign },
  [FORM_NAMES.REPORT_PO_VS_RESOURCE]: { to: ROUTES.REPORT_SERVICE_PO_RESOURCE, icon: BarChart3 },
  [FORM_NAMES.REPORT_SERVICE_PO_SUMMARY]: { to: ROUTES.REPORT_SERVICE_PO_SUMMARY, icon: BarChart3 },
  [FORM_NAMES.REPORT_MONTHLY_UTILIZATION]: { to: ROUTES.REPORT_MONTHLY_RESOURCE_UTILIZATION, icon: BarChart3 },
  [FORM_NAMES.REPORT_RESOURCE_ALLOCATION]: { to: ROUTES.REPORT_RESOURCE_ALLOCATION, icon: BarChart3 },
  [FORM_NAMES.REPORT_RESOURCE_PROJECT_UTILIZATION]: { to: ROUTES.REPORT_RESOURCE_PROJECT_UTILIZATION, icon: BarChart3 },
};

const NORMALIZED_CONFIG = Object.fromEntries(
  Object.entries(FORM_ROUTE_CONFIG).map(([name, cfg]) => [name.trim().toLowerCase(), cfg])
);

// Case-insensitive/trimmed lookup so minor casing differences from the Form Master
// don't silently drop a nav item.
export const resolveFormRoute = (formName) => NORMALIZED_CONFIG[(formName ?? '').trim().toLowerCase()];
