import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { FORM_NAMES } from '@/constants/rbacForms';
import ProtectedRoute from './ProtectedRoute';
import AuthLayout from '@/layouts/AuthLayout';
import MainLayout from '@/layouts/MainLayout';
import LoadingScreen from '@/components/common/LoadingScreen';

// ── Auth pages ──
const Login = lazy(() => import('@/pages/auth/Login'));

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

// ── Settings ──
const Profile = lazy(() => import('@/pages/Profile'));
const Notifications = lazy(() => import('@/pages/Notifications'));

// ── Errors ──
const NotFound = lazy(() => import('@/pages/NotFound'));

const AppRoutes = () => (
  <Suspense fallback={<LoadingScreen />}>
    <Routes>
      {/* Auth */}
      <Route element={<AuthLayout />}>
        <Route path={ROUTES.LOGIN} element={<Login />} />
      </Route>

      {/* Protected app */}
      <Route
        element={
          <ProtectedRoute>
            <MainLayout />
          </ProtectedRoute>
        }
      >
        <Route path={ROUTES.DASHBOARD} element={<ProtectedRoute formName={FORM_NAMES.DASHBOARD}><Dashboard /></ProtectedRoute>} />
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

        {/* Settings — personal-account pages, always available to any authenticated user */}
        <Route path={ROUTES.PROFILE} element={<Profile />} />
        <Route path={ROUTES.NOTIFICATIONS} element={<Notifications />} />

        {/* RBAC guard redirect target — a real path, unlike the '*' catch-all below */}
        <Route path={ROUTES.NOT_AUTHORIZED} element={<NotFound />} />
      </Route>

      <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
