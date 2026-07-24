import { NavLink, Outlet } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/utils/cn';

const NAV = [
  { label: 'PO vs Resource', to: ROUTES.REPORT_SERVICE_PO_RESOURCE },
  { label: 'Service PO Summary', to: ROUTES.REPORT_SERVICE_PO_SUMMARY },
  { label: 'Monthly Utilization', to: ROUTES.REPORT_MONTHLY_RESOURCE_UTILIZATION },
  { label: 'Resource Allocation', to: ROUTES.REPORT_RESOURCE_ALLOCATION },
  { label: 'Resource Project Utilization', to: ROUTES.REPORT_RESOURCE_PROJECT_UTILIZATION },
];

const ReportsLayout = () => (
  <div>
    {/* Mobile horizontal tabs — desktop nav is in the main sidebar */}
    <div className="md:hidden -mx-6 -mt-6 mb-5 border-b bg-muted/20 overflow-x-auto">
      <nav className="flex gap-1 px-4 py-2 min-w-max">
        {NAV.map(({ label, to }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'whitespace-nowrap rounded-md px-3 py-1.5 text-xs font-medium transition-colors',
                isActive
                  ? 'bg-primary text-primary-foreground'
                  : 'text-muted-foreground hover:bg-accent hover:text-accent-foreground'
              )
            }
          >
            {label}
          </NavLink>
        ))}
      </nav>
    </div>

    <Outlet />
  </div>
);

export default ReportsLayout;
