import { Outlet } from 'react-router-dom';
import EmployeeSidebar from '@/components/layout/EmployeeSidebar';
import Topbar from '@/components/layout/Topbar';

// Employee self-service shell — same structure as MainLayout (Sidebar + Topbar + Outlet +
// footer) but with the reduced EmployeeSidebar and no AICopilotWidget (admin/reporting-scoped
// feature, out of scope for employees). Topbar/UserMenu are reused unchanged — they're fully
// generic (theme toggle, sign out), no admin-only links.
const EmployeeLayout = () => (
  <div className="flex h-screen overflow-hidden bg-background">
    <EmployeeSidebar />
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
  </div>
);

export default EmployeeLayout;
