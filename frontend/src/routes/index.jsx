import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { FORM_NAMES } from '@/constants/rbacForms';
import ProtectedRoute from './ProtectedRoute';
import AuthLayout from '@/layouts/AuthLayout';
import MainLayout from '@/layouts/MainLayout';
import EmployeeLayout from '@/layouts/EmployeeLayout';
import ForgotPasswordLayout from '@/layouts/ForgotPasswordLayout';
import LoadingScreen from '@/components/common/LoadingScreen';

// ── Auth pages ──
const Login = lazy(() => import('@/pages/auth/Login'));
const ForgotPasswordEmail = lazy(() => import('@/pages/auth/ForgotPasswordEmail'));
const ForgotPasswordOtp = lazy(() => import('@/pages/auth/ForgotPasswordOtp'));
const ForgotPasswordReset = lazy(() => import('@/pages/auth/ForgotPasswordReset'));

// ── Employee self-service (dynamic login) ──
const EmployeeDashboard = lazy(() => import('@/pages/employee/EmployeeDashboard'));
const EmployeeTimesheet = lazy(() => import('@/pages/employee/EmployeeTimesheet'));
const EmployeeMonthlySummary = lazy(() => import('@/pages/employee/EmployeeMonthlySummary'));
const EmployeeReports = lazy(() => import('@/pages/employee/EmployeeReports'));

// ── Core ──
const Dashboard = lazy(() => import('@/pages/Dashboard'));
const AIInsights = lazy(() => import('@/pages/AIInsights'));

// ── People ──
const EmployeeList = lazy(() => import('@/pages/employees/EmployeeList'));
const EmployeeForm = lazy(() => import('@/pages/employees/EmployeeForm'));
const UserList = lazy(() => import('@/pages/users/UserList'));
const UserForm = lazy(() => import('@/pages/users/UserForm'));
const RoleList = lazy(() => import('@/pages/roles/RoleList'));
const RoleForm = lazy(() => import('@/pages/roles/RoleForm'));

// ── RBAC admin (access gated by Role-Form Mapping, not a hard-coded role) ──
const FormList = lazy(() => import('@/pages/forms/FormList'));
const FormForm = lazy(() => import('@/pages/forms/FormForm'));
const UserRoleMappingList = lazy(() => import('@/pages/userRoleMapping/UserRoleMappingList'));
const UserRoleMappingForm = lazy(() => import('@/pages/userRoleMapping/UserRoleMappingForm'));
const RoleFormMappingForm = lazy(() => import('@/pages/roleFormMapping/RoleFormMappingForm'));

// ── Company Management (Platform Admin only — multi-tenancy retrofit) ──
const CompanyList = lazy(() => import('@/pages/companies/CompanyList'));
const CompanyForm = lazy(() => import('@/pages/companies/CompanyForm'));

// ── Business ──
const ClientList = lazy(() => import('@/pages/clients/ClientList'));
const ClientForm = lazy(() => import('@/pages/clients/ClientForm'));
const ServicePOList = lazy(() => import('@/pages/servicePOs/ServicePOList'));
const ServicePOForm = lazy(() => import('@/pages/servicePOs/ServicePOForm'));
const ServicePODetail = lazy(() => import('@/pages/servicePOs/ServicePODetail'));
const ServicePOImport = lazy(() => import('@/pages/servicePOs/ServicePOImport'));
const SubProjectList = lazy(() => import('@/pages/subProjects/SubProjectList'));
const SubProjectForm = lazy(() => import('@/pages/subProjects/SubProjectForm'));
const ServiceTypeList = lazy(() => import('@/pages/serviceTypes/ServiceTypeList'));
const ServiceTypeForm = lazy(() => import('@/pages/serviceTypes/ServiceTypeForm'));
const ServiceCategoryList = lazy(() => import('@/pages/serviceCategories/ServiceCategoryList'));
const ServiceCategoryForm = lazy(() => import('@/pages/serviceCategories/ServiceCategoryForm'));

// ── Resources ──
const TimesheetList = lazy(() => import('@/pages/timesheets/TimesheetList'));
const TimesheetUpload = lazy(() => import('@/pages/timesheets/TimesheetUpload'));
const TimesheetImportDetail = lazy(() => import('@/pages/timesheets/TimesheetImportDetail'));
const MonthlyCostList = lazy(() => import('@/pages/monthlyCosts/MonthlyCostList'));
const MonthlyCostDetail = lazy(() => import('@/pages/monthlyCosts/MonthlyCostDetail'));
const MonthlyCostForm = lazy(() => import('@/pages/monthlyCosts/MonthlyCostForm'));
const MonthlyCostImport = lazy(() => import('@/pages/monthlyCosts/MonthlyCostImport'));

// ── Reports ──
const ReportsLayout = lazy(() => import('@/pages/reports/ReportsLayout'));
const ResourceAllocation = lazy(() => import('@/pages/reports/ResourceAllocation'));
const ServicePOResource = lazy(() => import('@/pages/reports/ServicePOResource'));
const ServicePOSummary = lazy(() => import('@/pages/reports/ServicePOSummary'));
const MonthlyResourceUtilization = lazy(() => import('@/pages/reports/MonthlyResourceUtilization'));
const ResourceProjectUtilization = lazy(() => import('@/pages/reports/ResourceProjectUtilization'));

// ── AI Copilot (new pages, launched from the floating AI Copilot widget) ──
const RootCauseView = lazy(() => import('@/pages/ai/RootCauseView'));
const ExecutiveReport = lazy(() => import('@/pages/ai/ExecutiveReport'));
const ForecastDashboard = lazy(() => import('@/pages/ai/ForecastDashboard'));
const ResourceRecommendations = lazy(() => import('@/pages/ai/ResourceRecommendations'));
const WhatIfSimulator = lazy(() => import('@/pages/ai/WhatIfSimulator'));
const ProjectHealthCard = lazy(() => import('@/pages/ai/ProjectHealthCard'));
const EmployeeAIProfile = lazy(() => import('@/pages/ai/EmployeeAIProfile'));

// ── Settings ──
const Notifications = lazy(() => import('@/pages/Notifications'));

// ── Errors ──
const NotFound = lazy(() => import('@/pages/NotFound'));

const AppRoutes = () => (
  <Suspense fallback={<LoadingScreen />}>
    <Routes>
      {/* Auth */}
      <Route element={<AuthLayout />}>
        <Route path={ROUTES.LOGIN} element={<Login />} />

        {/* Forgot Password — three real routes sharing one in-memory ForgotPasswordProvider,
            so refresh/back-button/direct-URL on any of them correctly lands back on the Email
            screen (the provider unmounts, clearing state, whenever none of the three match). */}
        <Route element={<ForgotPasswordLayout />}>
          <Route path={ROUTES.FORGOT_PASSWORD} element={<ForgotPasswordEmail />} />
          <Route path={ROUTES.FORGOT_PASSWORD_OTP} element={<ForgotPasswordOtp />} />
          <Route path={ROUTES.FORGOT_PASSWORD_RESET} element={<ForgotPasswordReset />} />
        </Route>
      </Route>

      {/* Protected app */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        {/* Dashboard — always available to any authenticated user, even with zero forms
            mapped, so there's always a landing page to fall back to (see NotFound's
            "Back to Dashboard" button, and the post-login redirect). */}
        <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />
        <Route path={ROUTES.AI_INSIGHTS} element={<ProtectedRoute formName={FORM_NAMES.AI_INSIGHTS}><AIInsights /></ProtectedRoute>} />

        {/* Employees */}
        <Route path={ROUTES.EMPLOYEES} element={<ProtectedRoute formName={FORM_NAMES.EMPLOYEES}><EmployeeList /></ProtectedRoute>}>
          <Route path="new" element={<EmployeeForm />} />
          <Route path=":id/edit" element={<EmployeeForm />} />
        </Route>

        {/* Users */}
        <Route path={ROUTES.USERS} element={<ProtectedRoute formName={FORM_NAMES.USERS}><UserList /></ProtectedRoute>}>
          <Route path="new" element={<UserForm />} />
          <Route path=":id/edit" element={<UserForm />} />
        </Route>

        {/* Roles — form-mapping is a per-row action on this same page, not a separate menu item */}
        <Route path={ROUTES.ROLES} element={<ProtectedRoute formName={FORM_NAMES.ROLES}><RoleList /></ProtectedRoute>}>
          <Route path="new" element={<RoleForm />} />
          <Route path=":id/edit" element={<RoleForm />} />
          <Route
            path=":roleId/forms"
            element={
              <ProtectedRoute formName={FORM_NAMES.ROLE_FORM_MAPPING}>
                <RoleFormMappingForm />
              </ProtectedRoute>
            }
          />
        </Route>

        {/* Form Master — access controlled by Role-Form Mapping, not a hard-coded role */}
        <Route
          path={ROUTES.FORMS}
          element={
            <ProtectedRoute formName={FORM_NAMES.FORMS}>
              <FormList />
            </ProtectedRoute>
          }
        >
          <Route path="new" element={<FormForm />} />
          <Route path=":id/edit" element={<FormForm />} />
        </Route>

        {/* User <-> Role mapping — access controlled by Role-Form Mapping */}
        <Route
          path={ROUTES.USER_ROLE_MAPPING}
          element={
            <ProtectedRoute formName={FORM_NAMES.USER_ROLE_MAPPING}>
              <UserRoleMappingList />
            </ProtectedRoute>
          }
        >
          <Route path=":userId/edit" element={<UserRoleMappingForm />} />
        </Route>

        {/* Company Management — Platform Admin only, gated by the backend's `is_platform_admin`
            user flag (not the Form Master model, since a Platform Admin sits above the
            per-company RBAC system entirely and has no roles at all). */}
        <Route path={ROUTES.COMPANIES} element={<ProtectedRoute platformAdminOnly><CompanyList /></ProtectedRoute>}>
          <Route path="new" element={<CompanyForm />} />
          <Route path=":id/edit" element={<CompanyForm />} />
        </Route>

        {/* Clients */}
        <Route path={ROUTES.CLIENTS} element={<ProtectedRoute formName={FORM_NAMES.CLIENTS}><ClientList /></ProtectedRoute>}>
          <Route path="new" element={<ClientForm />} />
          <Route path=":id/edit" element={<ClientForm />} />
        </Route>

        {/* Service POs */}
        <Route path={ROUTES.SERVICE_POS} element={<ProtectedRoute formName={FORM_NAMES.SERVICE_POS}><ServicePOList /></ProtectedRoute>}>
          <Route path="new" element={<ServicePOForm />} />
          <Route path=":id/edit" element={<ServicePOForm />} />
        </Route>
        <Route path={ROUTES.SERVICE_PO_IMPORT} element={<ProtectedRoute formName={FORM_NAMES.SERVICE_POS}><ServicePOImport /></ProtectedRoute>} />
        <Route path={ROUTES.SERVICE_PO_DETAIL} element={<ProtectedRoute formName={FORM_NAMES.SERVICE_POS}><ServicePODetail /></ProtectedRoute>} />

        {/* Sub-projects */}
        <Route path={ROUTES.SUB_PROJECTS} element={<ProtectedRoute formName={FORM_NAMES.SUB_PROJECTS}><SubProjectList /></ProtectedRoute>}>
          <Route path="new" element={<SubProjectForm />} />
          <Route path=":id/edit" element={<SubProjectForm />} />
        </Route>

        {/* Service Types */}
        <Route path={ROUTES.SERVICE_TYPES} element={<ProtectedRoute formName={FORM_NAMES.SERVICE_TYPES}><ServiceTypeList /></ProtectedRoute>}>
          <Route path="new" element={<ServiceTypeForm />} />
          <Route path=":id/edit" element={<ServiceTypeForm />} />
        </Route>

        {/* Service Categories */}
        <Route path={ROUTES.SERVICE_CATEGORIES} element={<ProtectedRoute formName={FORM_NAMES.SERVICE_CATEGORIES}><ServiceCategoryList /></ProtectedRoute>}>
          <Route path="new" element={<ServiceCategoryForm />} />
          <Route path=":id/edit" element={<ServiceCategoryForm />} />
        </Route>

        {/* Resources */}
        <Route path={ROUTES.TIMESHEETS} element={<ProtectedRoute formName={FORM_NAMES.TIMESHEETS}><TimesheetList /></ProtectedRoute>} />
        <Route path={ROUTES.TIMESHEET_UPLOAD} element={<ProtectedRoute formName={FORM_NAMES.TIMESHEETS}><TimesheetUpload /></ProtectedRoute>} />
        <Route path={ROUTES.TIMESHEET_IMPORT_DETAIL} element={<ProtectedRoute formName={FORM_NAMES.TIMESHEETS}><TimesheetImportDetail /></ProtectedRoute>} />
        <Route path={ROUTES.MONTHLY_COSTS} element={<ProtectedRoute formName={FORM_NAMES.MONTHLY_COSTS}><MonthlyCostList /></ProtectedRoute>} />
        <Route path={ROUTES.MONTHLY_COST_IMPORT} element={<ProtectedRoute formName={FORM_NAMES.MONTHLY_COSTS}><MonthlyCostImport /></ProtectedRoute>} />
        <Route path={ROUTES.MONTHLY_COST_DETAIL} element={<ProtectedRoute formName={FORM_NAMES.MONTHLY_COSTS}><MonthlyCostDetail /></ProtectedRoute>}>
          <Route path="new" element={<MonthlyCostForm />} />
          <Route path=":id/edit" element={<MonthlyCostForm />} />
        </Route>

        {/* Reports */}
        <Route path={ROUTES.REPORTS} element={<ReportsLayout />}>
          <Route path={ROUTES.REPORT_RESOURCE_ALLOCATION} element={<ProtectedRoute formName={FORM_NAMES.REPORT_RESOURCE_ALLOCATION}><ResourceAllocation /></ProtectedRoute>} />
          <Route path={ROUTES.REPORT_SERVICE_PO_RESOURCE} element={<ProtectedRoute formName={FORM_NAMES.REPORT_PO_VS_RESOURCE}><ServicePOResource /></ProtectedRoute>} />
          <Route path={ROUTES.REPORT_SERVICE_PO_SUMMARY} element={<ProtectedRoute formName={FORM_NAMES.REPORT_SERVICE_PO_SUMMARY}><ServicePOSummary /></ProtectedRoute>} />
          <Route path={ROUTES.REPORT_MONTHLY_RESOURCE_UTILIZATION} element={<ProtectedRoute formName={FORM_NAMES.REPORT_MONTHLY_UTILIZATION}><MonthlyResourceUtilization /></ProtectedRoute>} />
          <Route path={ROUTES.REPORT_RESOURCE_PROJECT_UTILIZATION} element={<ProtectedRoute formName={FORM_NAMES.REPORT_RESOURCE_PROJECT_UTILIZATION}><ResourceProjectUtilization /></ProtectedRoute>} />
        </Route>

        {/* AI Copilot — new, additive pages. No RBAC form rows exist for these yet (they're
            brand new), so — same as Profile/Notifications below — they're available to any
            authenticated user rather than blocked behind a formName gate that would 404 for
            everyone until an admin manually creates matching Forms + Role-Form-Mapping rows. */}
        <Route path={ROUTES.AI_ROOT_CAUSE} element={<RootCauseView />} />
        <Route path={ROUTES.AI_EXECUTIVE_REPORT} element={<ExecutiveReport />} />
        <Route path={ROUTES.AI_FORECAST} element={<ForecastDashboard />} />
        <Route path={ROUTES.AI_RECOMMENDATIONS} element={<ResourceRecommendations />} />
        <Route path={ROUTES.AI_WHAT_IF} element={<WhatIfSimulator />} />
        <Route path={ROUTES.AI_PROJECT_HEALTH} element={<ProjectHealthCard />} />
        <Route path={ROUTES.EMPLOYEE_AI_PROFILE} element={<EmployeeAIProfile />} />

        {/* Settings — personal-account pages, always available to any authenticated user.
            Change Password used to live at ROUTES.PROFILE as a full page — it's now a modal
            (ChangePasswordDialog) opened from UserMenu instead, so that route is gone. */}
        <Route path={ROUTES.NOTIFICATIONS} element={<Notifications />} />

        {/* RBAC guard redirect target — a real path, unlike the '*' catch-all below */}
        <Route path={ROUTES.NOT_AUTHORIZED} element={<NotFound />} />
      </Route>

      {/* Employee self-service — dynamic login's 'employee' loginType (Phases 1-3). Separate
          from MainLayout entirely: an Employee has no roles/accessible-forms, so this can't be
          gated by formName like the RBAC routes above — `employeeOnly` checks the login-type
          flag directly (see ProtectedRoute.jsx). */}
      <Route element={<ProtectedRoute employeeOnly><EmployeeLayout /></ProtectedRoute>}>
        <Route path={ROUTES.EMPLOYEE_DASHBOARD} element={<EmployeeDashboard />} />
        <Route path={ROUTES.EMPLOYEE_TIMESHEET} element={<EmployeeTimesheet />} />
        <Route path={ROUTES.EMPLOYEE_MONTHLY_SUMMARY} element={<EmployeeMonthlySummary />} />
        <Route path={ROUTES.EMPLOYEE_REPORTS} element={<EmployeeReports />} />
      </Route>

      <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
