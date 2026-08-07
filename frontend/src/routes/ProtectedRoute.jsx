import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/constants/routes';
import LoadingScreen from '@/components/common/LoadingScreen';

// formName: gate direct URL access against the RBAC accessible-forms map (Step 5) —
// blocks navigation to a page whose form isn't granted to any of the user's roles.
// allowedRoles: gate against role names directly (e.g. the Management-only admin screens).
// platformAdminOnly: gate against the backend's `is_platform_admin` user flag (multi-tenancy
// retrofit's Company Management routes) — not a role, since a Platform Admin has none.
// employeeOnly: gate against the dynamic-login `loginType === 'employee'` flag (Employee
// self-service routes) — sends a non-Employee back to their own dashboard, not not-authorized,
// since an Admin/User simply has a different home, not a permissions problem.
const ProtectedRoute = ({ children, allowedRoles, formName, platformAdminOnly, employeeOnly }) => {
  const { isAuthenticated, hasRole, isPlatformAdmin, isEmployee, accessibleForms, accessibleFormsLoaded } = useAuth();
  const location = useLocation();

  if (!isAuthenticated) {
    return <Navigate to={ROUTES.LOGIN} state={{ from: location }} replace />;
  }

  if (employeeOnly && !isEmployee) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  if (platformAdminOnly && !isPlatformAdmin) {
    return <Navigate to={ROUTES.NOT_AUTHORIZED} replace />;
  }

  if (allowedRoles?.length && !hasRole(...allowedRoles)) {
    return <Navigate to={ROUTES.NOT_AUTHORIZED} replace />;
  }

  // A Platform Admin has no roles/accessible-forms at all (it sits above the per-company RBAC
  // system entirely), so it can never satisfy a formName check — bypass it here rather than
  // maintaining fake Role-Form-Mapping rows for an account that has no company. MainLayout
  // already restricts which formName routes a Platform Admin can reach (Role/Forms Master),
  // so this doesn't widen access beyond what's rendered.
  if (formName && !isPlatformAdmin) {
    // Right after a fresh login, accessibleForms is deliberately cleared until the
    // authoritative POST /roles/forms fetch resolves (see authSlice's setCredentials) — an
    // empty map at that point means "not loaded yet", not "not authorized". Without this
    // check, that fetch's in-flight window would misread as unauthorized and briefly bounce
    // straight to the 404/not-authorized page until the request resolves.
    if (!accessibleFormsLoaded) {
      return <LoadingScreen />;
    }

    // Case-insensitive/trimmed, matching resolveFormRoute's own normalization (rbacForms.js) —
    // otherwise a form whose sidebar item resolves fine (case-insensitive) can still 404 on
    // direct navigation/click-through here if the Form Master row's exact casing/whitespace
    // differs from the FORM_NAMES constant.
    const normalize = (s) => (s ?? '').trim().toLowerCase();
    const allForms = Object.values(accessibleForms ?? {}).flat();
    const allowed = allForms.some((f) => normalize(f.name) === normalize(formName));
    if (!allowed) {
      return <Navigate to={ROUTES.NOT_AUTHORIZED} replace />;
    }
  }

  return children;
};

export default ProtectedRoute;
