import React, { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import ProtectedRoute from './ProtectedRoute';
import MainLayout from '../layouts/MainLayout';
import AuthLayout from '../layouts/AuthLayout';
import LoadingSpinner from '../components/LoadingSpinner';

// Lazy-loaded pages
const LoginPage = lazy(() => import('../pages/auth/LoginPage'));
const DashboardPage = lazy(() => import('../pages/dashboard/DashboardPage'));

const EmployeesListPage = lazy(() => import('../pages/employees/EmployeesListPage'));
const EmployeeNewPage = lazy(() => import('../pages/employees/EmployeeNewPage'));
const EmployeeEditPage = lazy(() => import('../pages/employees/EmployeeEditPage'));

const UsersListPage = lazy(() => import('../pages/users/UsersListPage'));
const UserNewPage = lazy(() => import('../pages/users/UserNewPage'));
const UserEditPage = lazy(() => import('../pages/users/UserEditPage'));

const RolesListPage = lazy(() => import('../pages/roles/RolesListPage'));

const ClientsListPage = lazy(() => import('../pages/clients/ClientsListPage'));
const ClientNewPage = lazy(() => import('../pages/clients/ClientNewPage'));
const ClientEditPage = lazy(() => import('../pages/clients/ClientEditPage'));

const ServicePOsListPage = lazy(() => import('../pages/service-pos/ServicePOsListPage'));
const ServicePONewPage = lazy(() => import('../pages/service-pos/ServicePONewPage'));
const ServicePODetailPage = lazy(() => import('../pages/service-pos/ServicePODetailPage'));
const ServicePOEditPage = lazy(() => import('../pages/service-pos/ServicePOEditPage'));

const SubProjectsListPage = lazy(() => import('../pages/sub-projects/SubProjectsListPage'));
const MonthlyCostsPage = lazy(() => import('../pages/monthly-costs/MonthlyCostsPage'));

const TimesheetUploadPage = lazy(() => import('../pages/timesheets/TimesheetUploadPage'));
const TimesheetsListPage = lazy(() => import('../pages/timesheets/TimesheetsListPage'));

const ReportsPage = lazy(() => import('../pages/reports/ReportsPage'));
const UtilizationReportPage = lazy(() => import('../pages/reports/UtilizationReportPage'));
const BillingReportPage = lazy(() => import('../pages/reports/BillingReportPage'));
const CostReportPage = lazy(() => import('../pages/reports/CostReportPage'));

const SettingsPage = lazy(() => import('../pages/settings/SettingsPage'));
const NotificationsPage = lazy(() => import('../pages/notifications/NotificationsPage'));

const NotFoundPage = lazy(() => import('../pages/NotFoundPage'));

// Role constants
export const ROLES = {
  HR: 'HR',
  FINANCE: 'Finance',
  DIVISION_HEAD: 'Division Head',
  PROJECT_MANAGER: 'Project Manager',
  MANAGEMENT: 'Management',
};

const ALL_ROLES = Object.values(ROLES);

// Route definitions with role access control
export const routeConfig = [
  {
    path: '/',
    element: <DashboardPage />,
    allowedRoles: ALL_ROLES,
    label: 'Dashboard',
  },
  {
    path: '/employees',
    element: <EmployeesListPage />,
    allowedRoles: [ROLES.HR, ROLES.DIVISION_HEAD, ROLES.MANAGEMENT],
    label: 'Employees',
  },
  {
    path: '/employees/new',
    element: <EmployeeNewPage />,
    allowedRoles: [ROLES.HR],
    label: 'New Employee',
  },
  {
    path: '/employees/:id/edit',
    element: <EmployeeEditPage />,
    allowedRoles: [ROLES.HR],
    label: 'Edit Employee',
  },
  {
    path: '/users',
    element: <UsersListPage />,
    allowedRoles: [ROLES.HR, ROLES.MANAGEMENT],
    label: 'Users',
  },
  {
    path: '/users/new',
    element: <UserNewPage />,
    allowedRoles: [ROLES.HR],
    label: 'New User',
  },
  {
    path: '/users/:id/edit',
    element: <UserEditPage />,
    allowedRoles: [ROLES.HR],
    label: 'Edit User',
  },
  {
    path: '/roles',
    element: <RolesListPage />,
    allowedRoles: [ROLES.MANAGEMENT],
    label: 'Roles',
  },
  {
    path: '/clients',
    element: <ClientsListPage />,
    allowedRoles: [ROLES.DIVISION_HEAD, ROLES.MANAGEMENT, ROLES.PROJECT_MANAGER],
    label: 'Clients',
  },
  {
    path: '/clients/new',
    element: <ClientNewPage />,
    allowedRoles: [ROLES.DIVISION_HEAD, ROLES.MANAGEMENT],
    label: 'New Client',
  },
  {
    path: '/clients/:id/edit',
    element: <ClientEditPage />,
    allowedRoles: [ROLES.DIVISION_HEAD, ROLES.MANAGEMENT],
    label: 'Edit Client',
  },
  {
    path: '/service-pos',
    element: <ServicePOsListPage />,
    allowedRoles: [ROLES.DIVISION_HEAD, ROLES.MANAGEMENT, ROLES.PROJECT_MANAGER, ROLES.FINANCE],
    label: 'Service POs',
  },
  {
    path: '/service-pos/new',
    element: <ServicePONewPage />,
    allowedRoles: [ROLES.DIVISION_HEAD, ROLES.MANAGEMENT],
    label: 'New Service PO',
  },
  {
    path: '/service-pos/:id',
    element: <ServicePODetailPage />,
    allowedRoles: [ROLES.DIVISION_HEAD, ROLES.MANAGEMENT, ROLES.PROJECT_MANAGER, ROLES.FINANCE],
    label: 'Service PO Detail',
  },
  {
    path: '/service-pos/:id/edit',
    element: <ServicePOEditPage />,
    allowedRoles: [ROLES.DIVISION_HEAD, ROLES.MANAGEMENT],
    label: 'Edit Service PO',
  },
  {
    path: '/sub-projects',
    element: <SubProjectsListPage />,
    allowedRoles: [ROLES.DIVISION_HEAD, ROLES.MANAGEMENT, ROLES.PROJECT_MANAGER],
    label: 'Sub Projects',
  },
  {
    path: '/monthly-costs',
    element: <MonthlyCostsPage />,
    allowedRoles: [ROLES.FINANCE, ROLES.MANAGEMENT],
    label: 'Monthly Costs',
  },
  {
    path: '/timesheets/upload',
    element: <TimesheetUploadPage />,
    allowedRoles: [ROLES.HR, ROLES.PROJECT_MANAGER, ROLES.DIVISION_HEAD],
    label: 'Upload Timesheets',
  },
  {
    path: '/timesheets',
    element: <TimesheetsListPage />,
    allowedRoles: ALL_ROLES,
    label: 'Timesheets',
  },
  {
    path: '/reports',
    element: <ReportsPage />,
    allowedRoles: [ROLES.MANAGEMENT, ROLES.DIVISION_HEAD, ROLES.FINANCE],
    label: 'Reports',
  },
  {
    path: '/reports/utilization',
    element: <UtilizationReportPage />,
    allowedRoles: [ROLES.MANAGEMENT, ROLES.DIVISION_HEAD, ROLES.FINANCE],
    label: 'Utilization Report',
  },
  {
    path: '/reports/billing',
    element: <BillingReportPage />,
    allowedRoles: [ROLES.MANAGEMENT, ROLES.FINANCE],
    label: 'Billing Report',
  },
  {
    path: '/reports/cost',
    element: <CostReportPage />,
    allowedRoles: [ROLES.MANAGEMENT, ROLES.FINANCE],
    label: 'Cost Report',
  },
  {
    path: '/settings',
    element: <SettingsPage />,
    allowedRoles: ALL_ROLES,
    label: 'Settings',
  },
  {
    path: '/notifications',
    element: <NotificationsPage />,
    allowedRoles: ALL_ROLES,
    label: 'Notifications',
  },
];

const AppRoutes = () => {
  return (
    <Suspense fallback={<LoadingSpinner fullPage />}>
      <Routes>
        {/* Public Routes */}
        <Route
          path="/login"
          element={
            <AuthLayout>
              <LoginPage />
            </AuthLayout>
          }
        />

        {/* Protected Routes */}
        <Route
          element={
            <ProtectedRoute>
              <MainLayout />
            </ProtectedRoute>
          }
        >
          {routeConfig.map(({ path, element, allowedRoles }) => (
            <Route
              key={path}
              path={path}
              element={
                <ProtectedRoute allowedRoles={allowedRoles}>
                  {element}
                </ProtectedRoute>
              }
            />
          ))}

          {/* Reports wildcard */}
          <Route path="/reports/*" element={<ReportsPage />} />
        </Route>

        {/* 404 */}
        <Route path="/404" element={<NotFoundPage />} />
        <Route path="*" element={<Navigate to="/404" replace />} />
      </Routes>
    </Suspense>
  );
};

export default AppRoutes;
