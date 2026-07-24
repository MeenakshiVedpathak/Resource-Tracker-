import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/constants/routes';

// formName: gate direct URL access against the RBAC accessible-forms map (Step 5) —
// blocks navigation to a page whose form isn't granted to any of the user's roles.
// allowedRoles: gate against role names directly (e.g. the Management-only admin screens).
const ProtectedRoute = ({ children, allowedRoles, formName }) => {
  const { isAuthenticated, hasRole, accessibleForms } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (allowedRoles?.length && !hasRole(...allowedRoles)) {
    return <Navigate to={ROUTES.NOT_AUTHORIZED} replace />;
  }

  if (formName) {
    const allForms = Object.values(accessibleForms ?? {}).flat();
    const allowed = allForms.some((f) => f.name === formName);
    if (!allowed) {
      return <Navigate to={ROUTES.NOT_AUTHORIZED} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
