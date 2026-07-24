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
  selectIsOriginalDataVisible,
  selectHasWriteAccess,
  logout,
  setCredentials,
  setUser,
  setAccessibleForms,
  setIsOriginalDataVisible,
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
  const isOriginalDataVisible = useSelector(selectIsOriginalDataVisible); // gates Modified/Original toggle
  const hasWriteAccess = useSelector(selectHasWriteAccess);   // any role carries "Read & Write"

  // true if the user has ANY of the specified roles
  const hasRole = (...requiredRoles) => roles.some((r) => requiredRoles.includes(r));

  const hasPermission = (permission) => permissions.includes(permission);

  const handleLogout = () => dispatch(logout());

  const updateCredentials = (payload) => dispatch(setCredentials(payload));

  const updateUser = (userData) => dispatch(setUser(userData));

  const updateAccessibleForms = (forms) => dispatch(setAccessibleForms(forms));

  const updateIsOriginalDataVisible = (visible) => dispatch(setIsOriginalDataVisible(visible));

  return {
    user,
    isAuthenticated,
    role,
    roles,
    permissions,
    roleObjects,
    roleIds,
    accessibleForms,
    isOriginalDataVisible,
    hasWriteAccess,
    hasRole,
    hasPermission,
    logout: handleLogout,
    setCredentials: updateCredentials,
    setUser: updateUser,
    setAccessibleForms: updateAccessibleForms,
    setIsOriginalDataVisible: updateIsOriginalDataVisible,
  };
};

export default useAuth;
