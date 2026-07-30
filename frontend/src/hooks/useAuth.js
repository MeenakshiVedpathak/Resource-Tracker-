import { useDispatch, useSelector } from 'react-redux';
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
  selectIsPlatformAdmin,
  logout,
  setCredentials,
  setUser,
  setAccessibleForms,
  setIsOriginalDataVisible,
  setCompany,
} from '@/store/slices/authSlice';

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
  const isPlatformAdmin = useSelector(selectIsPlatformAdmin); // authoritative backend flag, not a role

  // true if the user has ANY of the specified roles
  const hasRole = (...requiredRoles) => roles.some((r) => requiredRoles.includes(r));

  const hasPermission = (permission) => permissions.includes(permission);

  const handleLogout = () => dispatch(logout());

  const updateCredentials = (payload) => dispatch(setCredentials(payload));

  const updateUser = (userData) => dispatch(setUser(userData));

  const updateAccessibleForms = (forms) => dispatch(setAccessibleForms(forms));

  const updateIsOriginalDataVisible = (visible) => dispatch(setIsOriginalDataVisible(visible));

  const updateCompany = (company) => dispatch(setCompany(company));

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
    isPlatformAdmin,
    hasRole,
    hasPermission,
    logout: handleLogout,
    setCredentials: updateCredentials,
    setUser: updateUser,
    setAccessibleForms: updateAccessibleForms,
    setIsOriginalDataVisible: updateIsOriginalDataVisible,
    setCompany: updateCompany,
  };
};

export default useAuth;
