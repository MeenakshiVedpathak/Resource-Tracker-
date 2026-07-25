import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/constants/routes';
import LoadingScreen from '@/components/common/LoadingScreen';

// formName: gate direct URL access against the RBAC accessible-forms map (Step 5) —
// blocks navigation to a page whose form isn't granted to any of the user's roles.
// allowedRoles: gate against role names directly (e.g. the Management-only admin screens).
const ProtectedRoute = ({ children, allowedRoles, formName }) => {
  const { isAuthenticated, hasRole, accessibleForms, accessibleFormsLoaded } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (allowedRoles?.length && !hasRole(...allowedRoles)) {
    return <Navigate to={ROUTES.NOT_AUTHORIZED} replace />;
  }

  if (formName) {
    // Right after a fresh login, accessibleForms is deliberately cleared until the
    // authoritative POST /roles/forms fetch resolves (see authSlice's setCredentials) — an
    // empty map at that point means "not loaded yet", not "not authorized". Without this
    // check, that fetch's in-flight window would misread as unauthorized and briefly bounce
    // straight to the 404/not-authorized page until the request resolves.
    if (!accessibleFormsLoaded) {
      return <LoadingScreen />;
    }

    const allForms = Object.values(accessibleForms ?? {}).flat();
    const allowed = allForms.some((f) => f.name === formName);
    if (!allowed) {
      return <Navigate to={ROUTES.NOT_AUTHORIZED} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
