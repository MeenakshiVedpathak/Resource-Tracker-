import { Navigate, Outlet } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { ROUTES } from '@/constants/routes';

const AuthLayout = () => {
  const { isAuthenticated } = useAuth();

  if (isAuthenticated) {
    return <Navigate to={ROUTES.DASHBOARD} replace />;
  }

  return (
    <div className="min-h-screen flex">
      {/* Left panel — branding */}
      <div className="hidden lg:flex lg:w-[52%] bg-sidebar relative flex-col justify-between p-12 overflow-hidden">
        {/* Decorative gradient orbs */}
        <div className="absolute -top-24 -left-24 h-96 w-96 rounded-full bg-primary/20 blur-3xl" />
        <div className="absolute bottom-0 right-0 h-80 w-80 rounded-full bg-primary/10 blur-3xl" />

        <div className="relative z-10 flex items-center gap-3">
          <img src="/logo.svg" alt="Logo" className="h-16 object-contain" />
        </div>

        {/* Center copy */}
        <div className="relative z-10 space-y-6">
          <h1 className="text-4xl font-bold text-white leading-tight">
            Manage resources,<br />
            track costs,<br />
            <span className="text-primary-foreground/70 text-3xl">deliver results.</span>
          </h1>
          <p className="text-white/60 text-base max-w-xs leading-relaxed">
            A unified platform for workforce planning, service PO tracking, and financial reporting across your organization.
          </p>
          {/* Feature pills */}
          <div className="flex flex-wrap gap-2 pt-2">
            {['Timesheet Import', 'Service PO Tracking', 'Cost Analytics', 'Role-Based Access'].map((f) => (
              <span
                key={f}
                className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-white/70"
              >
                {f}
              </span>
            ))}
          </div>
        </div>

        {/* Bottom tagline */}
        <p className="relative z-10 text-xs text-white/30">
          © {new Date().getFullYear()} GTT Data. All rights reserved.
        </p>
      </div>

      {/* Right panel — form */}
      <div className="flex flex-1 flex-col items-center justify-center bg-background px-6 py-12">
        <div className="mb-8 flex items-center justify-center lg:hidden">
          <img src="/logo.svg" alt="Logo" className="h-12 object-contain" />
        </div>

        <div className="w-full max-w-sm">
          <Outlet />
        </div>
      </div>
    </div>
  );
};

export default AuthLayout;
