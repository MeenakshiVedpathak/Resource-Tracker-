import { NavLink, Outlet } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/utils/cn';

const NAV = [
  { label: 'Employee Hourly Rate',  to: ROUTES.REPORT_HOURLY_RATE },
  { label: 'Monthly Cost Summary',  to: ROUTES.REPORT_MONTHLY_COST },
  { label: 'Timesheet Summary',     to: ROUTES.REPORT_TIMESHEET },
  { label: 'PO Utilisation',        to: ROUTES.REPORT_PO_UTILISATION },
  { label: 'Sub-Project Hours',     to: ROUTES.REPORT_SUB_PROJECT_HOURS },
  { label: 'Resource Allocation',   to: ROUTES.REPORT_RESOURCE_ALLOCATION },
  { label: 'Operational Cost',      to: ROUTES.REPORT_OPERATIONAL_COST },
  { label: 'Monthly Utilization',   to: ROUTES.REPORT_MONTHLY_UTILIZATION },
  { label: 'PO vs Resource',        to: ROUTES.REPORT_SERVICE_PO_RESOURCE },
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
