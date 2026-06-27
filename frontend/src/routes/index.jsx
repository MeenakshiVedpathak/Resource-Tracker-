import { lazy, Suspense } from 'react';
import { Route, Routes } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import ProtectedRoute from './ProtectedRoute';
import AuthLayout from '@/layouts/AuthLayout';
import MainLayout from '@/layouts/MainLayout';
import LoadingScreen from '@/components/common/LoadingScreen';

// ── Auth pages ──
const Login = lazy(() => import('@/pages/auth/Login'));

// ── Core ──
const Dashboard = lazy(() => import('@/pages/Dashboard'));

// ── People ──
const EmployeeList = lazy(() => import('@/pages/employees/EmployeeList'));
const EmployeeForm = lazy(() => import('@/pages/employees/EmployeeForm'));
const UserList = lazy(() => import('@/pages/users/UserList'));
const UserForm = lazy(() => import('@/pages/users/UserForm'));
const RoleList = lazy(() => import('@/pages/roles/RoleList'));

// ── Business ──
const ClientList = lazy(() => import('@/pages/clients/ClientList'));
const ClientForm = lazy(() => import('@/pages/clients/ClientForm'));
const ServicePOList = lazy(() => import('@/pages/servicePOs/ServicePOList'));
const ServicePOForm = lazy(() => import('@/pages/servicePOs/ServicePOForm'));
const ServicePODetail = lazy(() => import('@/pages/servicePOs/ServicePODetail'));
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
const MonthlyCostForm = lazy(() => import('@/pages/monthlyCosts/MonthlyCostForm'));
const MonthlyCostImport = lazy(() => import('@/pages/monthlyCosts/MonthlyCostImport'));

// ── Reports ──
const ReportsLayout = lazy(() => import('@/pages/reports/ReportsLayout'));
const EmployeeHourlyRate = lazy(() => import('@/pages/reports/EmployeeHourlyRate'));
const MonthlyCostSummary = lazy(() => import('@/pages/reports/MonthlyCostSummary'));
const TimesheetSummary = lazy(() => import('@/pages/reports/TimesheetSummary'));
const ServicePOUtilisation = lazy(() => import('@/pages/reports/ServicePOUtilisation'));
const SubProjectHours = lazy(() => import('@/pages/reports/SubProjectHours'));
const ResourceAllocation = lazy(() => import('@/pages/reports/ResourceAllocation'));
const OperationalCost = lazy(() => import('@/pages/reports/OperationalCost'));
const MonthlyUtilization = lazy(() => import('@/pages/reports/MonthlyUtilization'));
const ServicePOResource = lazy(() => import('@/pages/reports/ServicePOResource'));

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
        <Route path={ROUTES.DASHBOARD} element={<Dashboard />} />

        {/* Employees */}
        <Route path={ROUTES.EMPLOYEES} element={<EmployeeList />} />
        <Route path={ROUTES.EMPLOYEE_NEW} element={<EmployeeForm />} />
        <Route path={ROUTES.EMPLOYEE_EDIT} element={<EmployeeForm />} />

        {/* Users */}
        <Route path={ROUTES.USERS} element={<UserList />} />
        <Route path={ROUTES.USER_NEW} element={<UserForm />} />
        <Route path={ROUTES.USER_EDIT} element={<UserForm />} />

        {/* Roles */}
        <Route path={ROUTES.ROLES} element={<RoleList />} />

        {/* Clients */}
        <Route path={ROUTES.CLIENTS} element={<ClientList />} />
        <Route path={ROUTES.CLIENT_NEW} element={<ClientForm />} />
        <Route path={ROUTES.CLIENT_EDIT} element={<ClientForm />} />

        {/* Service POs */}
        <Route path={ROUTES.SERVICE_POS} element={<ServicePOList />} />
        <Route path={ROUTES.SERVICE_PO_NEW} element={<ServicePOForm />} />
        <Route path={ROUTES.SERVICE_PO_DETAIL} element={<ServicePODetail />} />
        <Route path={ROUTES.SERVICE_PO_EDIT} element={<ServicePOForm />} />

        {/* Sub-projects */}
        <Route path={ROUTES.SUB_PROJECTS} element={<SubProjectList />} />
        <Route path={ROUTES.SUB_PROJECT_NEW} element={<SubProjectForm />} />
        <Route path={ROUTES.SUB_PROJECT_EDIT} element={<SubProjectForm />} />

        {/* Service Types */}
        <Route path={ROUTES.SERVICE_TYPES} element={<ServiceTypeList />} />
        <Route path={ROUTES.SERVICE_TYPE_NEW} element={<ServiceTypeForm />} />
        <Route path={ROUTES.SERVICE_TYPE_EDIT} element={<ServiceTypeForm />} />

        {/* Service Categories */}
        <Route path={ROUTES.SERVICE_CATEGORIES} element={<ServiceCategoryList />} />
        <Route path={ROUTES.SERVICE_CATEGORY_NEW} element={<ServiceCategoryForm />} />
        <Route path={ROUTES.SERVICE_CATEGORY_EDIT} element={<ServiceCategoryForm />} />

        {/* Resources */}
        <Route path={ROUTES.TIMESHEETS} element={<TimesheetList />} />
        <Route path={ROUTES.TIMESHEET_UPLOAD} element={<TimesheetUpload />} />
        <Route path={ROUTES.TIMESHEET_IMPORT_DETAIL} element={<TimesheetImportDetail />} />
        <Route path={ROUTES.MONTHLY_COSTS} element={<MonthlyCostList />} />
        <Route path={ROUTES.MONTHLY_COST_IMPORT} element={<MonthlyCostImport />} />
        <Route path={ROUTES.MONTHLY_COST_NEW} element={<MonthlyCostForm />} />
        <Route path={ROUTES.MONTHLY_COST_EDIT} element={<MonthlyCostForm />} />

        {/* Reports */}
        <Route path={ROUTES.REPORTS} element={<ReportsLayout />}>
          <Route path={ROUTES.REPORT_HOURLY_RATE} element={<EmployeeHourlyRate />} />
          <Route path={ROUTES.REPORT_MONTHLY_COST} element={<MonthlyCostSummary />} />
          <Route path={ROUTES.REPORT_TIMESHEET} element={<TimesheetSummary />} />
          <Route path={ROUTES.REPORT_PO_UTILISATION} element={<ServicePOUtilisation />} />
          <Route path={ROUTES.REPORT_SUB_PROJECT_HOURS} element={<SubProjectHours />} />
          <Route path={ROUTES.REPORT_RESOURCE_ALLOCATION} element={<ResourceAllocation />} />
          <Route path={ROUTES.REPORT_OPERATIONAL_COST} element={<OperationalCost />} />
          <Route path={ROUTES.REPORT_MONTHLY_UTILIZATION} element={<MonthlyUtilization />} />
          <Route path={ROUTES.REPORT_SERVICE_PO_RESOURCE} element={<ServicePOResource />} />
        </Route>

        {/* Settings */}
        <Route path={ROUTES.PROFILE} element={<Profile />} />
        <Route path={ROUTES.NOTIFICATIONS} element={<Notifications />} />
      </Route>

      <Route path={ROUTES.NOT_FOUND} element={<NotFound />} />
    </Routes>
  </Suspense>
);

export default AppRoutes;
