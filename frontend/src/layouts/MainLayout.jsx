import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import AICopilotWidget from '@/components/ai/AICopilotWidget';
import { useSyncAccessibleForms } from '@/hooks/useAccessibleForms';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/constants/routes';

// RBAC redesign (§6.1): the full set of routes a Platform Admin may reach. Platform Admin only
// manages Admins now — Entity Admin/Company management moved to the Admin/Entity Admin tiers.
const PLATFORM_ADMIN_ROUTES = [ROUTES.ADMINS, ROUTES.ADMIN_NEW, ROUTES.ROLES, ROUTES.FORMS];

const MainLayout = () => {
  // Mounted for every authenticated page load — including a hard refresh (a fresh page
  // load always gets a brand-new QueryClient, so this always hits the network here, not
  // just when the store happens to be empty) — so the sidebar/route guards reflect the
  // logged-in user's current role-form mappings, not a stale snapshot from last login.
  useSyncAccessibleForms();

  const { isPlatformAdmin, isEmployeeOnly, homeRoute } = useAuth();
  const { pathname } = useLocation();

  // Dynamic login: an account whose ONLY role is Employee has no business on any RBAC-driven
  // Admin/User route — enforced here (not just by hiding nav items) so a direct URL visit still
  // bounces them to their own dashboard, same as the Platform Admin check below. A multi-role
  // account (e.g. Employee + Manager) must still reach MainLayout for its other role's screens,
  // so this checks `isEmployeeOnly`, not just `isEmployee`. Uses useAuth's form-aware `homeRoute`
  // rather than hardcoding ROUTES.EMPLOYEE_DASHBOARD — an Employee not mapped to the "Employee
  // Dashboard" form itself (only to other Employee forms) would otherwise bounce straight into
  // Not Authorized, which (being rendered under this same MainLayout) would bounce right back
  // here, looping forever.
  if (isEmployeeOnly) {
    return <Navigate to={homeRoute} replace />;
  }

  // A Platform Admin's only screens are Admin creation plus Role Master and Forms Master —
  // enforced here (rather than in ProtectedRoute) since this is the one layout every
  // authenticated route renders inside, regardless of whether that route uses
  // formName/allowedRoles guards or none at all (e.g. Notifications, AI Copilot pages).
  // `isPlatformAdmin` is derived from the single role every login returns (§0).
  const isOnPlatformAdminRoute = PLATFORM_ADMIN_ROUTES.some((route) => pathname.startsWith(route));
  if (isPlatformAdmin && !isOnPlatformAdminRoute) {
    return <Navigate to={ROUTES.ADMINS} replace />;
  }

  return (
    <div className="flex h-screen overflow-hidden bg-background">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden min-w-0">
        <Topbar />
        <main className="flex-1 overflow-y-auto flex flex-col">
          <div className="mx-auto max-w-screen-2xl px-6 pt-6 pb-8 flex-1 w-full">
            <Outlet />
          </div>
          <footer className="w-full border-t bg-slate-50/80 py-3 px-6">
            <div className="mx-auto max-w-screen-2xl flex flex-col sm:flex-row items-center justify-between gap-1">
              <p className="text-[11px] text-muted-foreground">
                © {new Date().getFullYear()} GTT Data Solutions Ltd. All rights reserved.
              </p>
              <p className="text-[11px] text-muted-foreground">
                Designed &amp; Developed by{' '}
                <span className="font-semibold text-foreground/70">GTT Data Solutions Ltd.</span>
              </p>
            </div>
          </footer>
        </main>
      </div>
      {!isPlatformAdmin && <AICopilotWidget />}
    </div>
  );
};

export default MainLayout;
