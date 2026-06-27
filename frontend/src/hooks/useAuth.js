import { useDispatch, useSelector } from 'react-redux';
import {
  selectCurrentUser,
  selectIsAuthenticated,
  selectUserRole,
  selectUserRoles,
  selectUserPermissions,
  logout,
  setCredentials,
  setUser,
} from '@/store/slices/authSlice';

export const useAuth = () => {
  const dispatch = useDispatch();
  const user = useSelector(selectCurrentUser);
  const isAuthenticated = useSelector(selectIsAuthenticated);
  const role = useSelector(selectUserRole);       // first role — for display
  const roles = useSelector(selectUserRoles);     // all roles — for permission checks
  const permissions = useSelector(selectUserPermissions);

  // true if the user has ANY of the specified roles
  const hasRole = (...requiredRoles) => roles.some((r) => requiredRoles.includes(r));

  const hasPermission = (permission) => permissions.includes(permission);

  const handleLogout = () => dispatch(logout());

  const updateCredentials = (payload) => dispatch(setCredentials(payload));

  const updateUser = (userData) => dispatch(setUser(userData));

  return {
    user,
    isAuthenticated,
    role,
    roles,
    permissions,
    hasRole,
    hasPermission,
    logout: handleLogout,
    setCredentials: updateCredentials,
    setUser: updateUser,
  };
};

export default useAuth;
