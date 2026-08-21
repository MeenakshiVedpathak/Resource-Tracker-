import { useDispatch, useSelector } from 'react-redux';
import { queryClient } from '@/lib/queryClient';
import {
  selectCurrentUser,
  selectIsAuthenticated,
  selectUserRole,
  selectUserRoles,
  selectUserPermissions,
  selectAuthRoles,
  selectAuthRoleIds,
  selectAccessibleForms,
  selectAccessibleFormsLoaded,
  selectIsOriginalDataVisible,
  selectHasWriteAccess,
  selectCurrentCompany,
  selectCompanyId,
  selectCurrentEmployee,
  selectHierarchyRank,
  selectIsPlatformAdmin,
  selectIsEmployee,
  selectIsEmployeeOnly,
  selectMappedBus,
  selectSelectedBuId,
  logout,
  setCredentials,
  setUser,
  setAccessibleForms,
  setIsOriginalDataVisible,
  setCompany,
  setSelectedBu,
} from '@/store/slices/authSlice';
import { ROUTES } from '@/constants/routes';
import { computeHomeRoute, FORM_NAMES } from '@/constants/rbacForms';

export const useAuth = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const role = useSelector(selectUserRole);       // first role — for display
  const roles = useSelector(selectUserRoles);     // all role names — for hasRole checks
  const permissions = useSelector(selectUserPermissions);
  const roleObjects = useSelector(selectAuthRoles);   // [{ id, name, permission }] — RBAC source of truth
  const roleIds = useSelector(selectAuthRoleIds);
  const accessibleForms = useSelector(selectAccessibleForms); // { [module]: [{ id, name }] }
  const accessibleFormsLoaded = useSelector(selectAccessibleFormsLoaded); // false only right after a fresh login, until forms are fetched
  const isOriginalDataVisible = useSelector(selectIsOriginalDataVisible); // gates Modified/Original toggle
  const hasWriteAccess = useSelector(selectHasWriteAccess);   // any role carries "Read & Write"
  const company = useSelector(selectCurrentCompany); // multi-tenancy retrofit — null until backend sends one
  const companyId = useSelector(selectCompanyId);
  const employee = useSelector(selectCurrentEmployee); // login's sibling `employee` object, or null
  const hierarchyRank = useSelector(selectHierarchyRank); // the held role's position in the RBAC hierarchy
  const isPlatformAdmin = useSelector(selectIsPlatformAdmin); // derived from the single held role
  const isEmployee = useSelector(selectIsEmployee); // true if Employee is ANY held role
  const isEmployeeOnly = useSelector(selectIsEmployeeOnly); // true only if Employee is the SOLE held role
  const mappedBus = useSelector(selectMappedBus); // BU Head spec — [] for every non-BU-Head login
  const selectedBuId = useSelector(selectSelectedBuId); // the currently-selected BU, global across the app

  // true if the user has ANY of the specified roles
  const hasRole = (...requiredRoles) => roles.some((r) => requiredRoles.includes(r));

  // Where "back to home" should actually land — Dashboard (or, for an Employee-only account,
  // Employee Dashboard) is no longer guaranteed to be accessible to everyone (see
  // ProtectedRoute's `allowIfNoFormsMapped`), so anything that used to hardcode ROUTES.DASHBOARD
  // / ROUTES.EMPLOYEE_DASHBOARD as a safe fallback (NotFound's button, MainLayout's employee-only
  // tier guard) should use this instead to avoid bouncing an account straight back into Not
  // Authorized just because its actual mapped forms don't include that particular one.
  const homeRoute = isEmployeeOnly
    ? computeHomeRoute(accessibleForms, { homeFormName: FORM_NAMES.EMPLOYEE_DASHBOARD, homeRoute: ROUTES.EMPLOYEE_DASHBOARD })
    : isPlatformAdmin
      ? ROUTES.ADMINS
      : computeHomeRoute(accessibleForms);

  const hasPermission = (permission) => permissions.includes(permission);

  const handleLogout = () => {
    dispatch(logout());
    queryClient.clear();
  };

  const updateCredentials = (payload) => dispatch(setCredentials(payload));

  const updateUser = (userData) => dispatch(setUser(userData));

  const updateAccessibleForms = (forms) => dispatch(setAccessibleForms(forms));

  const updateIsOriginalDataVisible = (visible) => dispatch(setIsOriginalDataVisible(visible));

  const updateCompany = (company) => dispatch(setCompany(company));

  // BU Head spec §12: switching BU updates the global selection only — no re-login, no full
  // page reload. Callers (UserMenu's BU dropdown) are responsible for invalidating React Query
  // so BU-scoped screens refetch (§17), same as handleLogout's queryClient.clear() above.
  const selectBu = (buId) => dispatch(setSelectedBu(buId));

  return {
    user,
    isAuthenticated,
    role,
    roles,
    permissions,
    roleObjects,
    roleIds,
    accessibleForms,
    accessibleFormsLoaded,
    isOriginalDataVisible,
    hasWriteAccess,
    company,
    companyId,
    employee,
    hierarchyRank,
    isPlatformAdmin,
    isEmployee,
    isEmployeeOnly,
    mappedBus,
    selectedBuId,
    homeRoute,
    hasRole,
    hasPermission,
    logout: handleLogout,
    setCredentials: updateCredentials,
    setUser: updateUser,
    setAccessibleForms: updateAccessibleForms,
    setIsOriginalDataVisible: updateIsOriginalDataVisible,
    setCompany: updateCompany,
    setSelectedBu: selectBu,
  };
};

export default useAuth;
