import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import LoadingSpinner from '../components/LoadingSpinner';

/**
 * ProtectedRoute
 *
 * When used as a layout wrapper (no allowedRoles):
 *   <ProtectedRoute><MainLayout /></ProtectedRoute>
 *   — redirects unauthenticated users to /login.
 *
 * When used on individual routes (with allowedRoles):
 *   <ProtectedRoute allowedRoles={[ROLES.HR]}>...</ProtectedRoute>
 *   — additionally checks the user's role; shows 403 if not allowed.
 */
const ProtectedRoute = ({ children, allowedRoles }) => {
  const location = useLocation();
  const { isAuthenticated, user, isLoading } = useSelector((state) => state.auth);

  if (isLoading) {
    return <LoadingSpinner fullPage />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (allowedRoles && allowedRoles.length > 0) {
    const userRole = user?.role?.role_name || user?.roleName || '';
    const hasAccess = allowedRoles.includes(userRole);

    if (!hasAccess) {
      return <Navigate to="/403" replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
