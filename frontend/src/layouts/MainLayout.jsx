import { Navigate, Outlet, useLocation } from 'react-router-dom';
import Sidebar from '@/components/layout/Sidebar';
import Topbar from '@/components/layout/Topbar';
import AICopilotWidget from '@/components/ai/AICopilotWidget';
import { useSyncAccessibleForms } from '@/hooks/useAccessibleForms';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/constants/routes';

const MainLayout = () => {
  // Mounted for every authenticated page load — including a hard refresh (a fresh page
  // load always gets a brand-new QueryClient, so this always hits the network here, not
  // just when the store happens to be empty) — so the sidebar/route guards reflect the
  // logged-in user's current role-form mappings, not a stale snapshot from last login.
  useSyncAccessibleForms();

  const { isPlatformAdmin, isEmployee } = useAuth();
  const { pathname } = useLocation();

  // Dynamic login: an Employee has no business on any RBAC-driven Admin/User route — enforced
  // here (not just by hiding nav items) so a direct URL visit still bounces them to their own
  // dashboard, same as the Platform Admin check below.
  if (isEmployee) {
    return <Navigate to={ROUTES.EMPLOYEE_DASHBOARD} replace />;
  }

  // Multi-tenancy retrofit: a Platform Admin's only screen is Company Management — enforced here
  // (rather than in ProtectedRoute) since this is the one layout every authenticated route
  // renders inside, regardless of whether that route uses formName/allowedRoles guards or none
  // at all (e.g. Profile, Notifications, AI Copilot pages). `isPlatformAdmin` is the backend's
  // authoritative `is_platform_admin` flag on the user object, not a role.
  if (isPlatformAdmin && !pathname.startsWith(ROUTES.COMPANIES)) {
    return <Navigate to={ROUTES.COMPANIES} replace />;
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
