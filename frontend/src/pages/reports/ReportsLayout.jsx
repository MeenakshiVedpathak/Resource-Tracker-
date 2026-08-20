import { NavLink, Outlet } from 'react-router-dom';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/utils/cn';

const NAV = [
  { label: 'PO vs Resource', to: ROUTES.REPORT_SERVICE_PO_RESOURCE },
  { label: 'Service PO Summary', to: ROUTES.REPORT_SERVICE_PO_SUMMARY },
  { label: 'Invoice PO Summary', to: ROUTES.REPORT_INVOICE_PO_SUMMARY },
  { label: 'Monthly Utilization', to: ROUTES.REPORT_MONTHLY_RESOURCE_UTILIZATION },
  { label: 'Resource Allocation', to: ROUTES.REPORT_RESOURCE_ALLOCATION },
  { label: 'Resource Project Utilization', to: ROUTES.REPORT_RESOURCE_PROJECT_UTILIZATION },
  { label: 'Client Service PO Hours', to: ROUTES.REPORT_CLIENT_SERVICE_PO_HOURS },
  { label: 'Service PO Profitability', to: ROUTES.REPORT_SERVICE_PO_PROFITABILITY },
  { label: 'Budgeted Margin Forecast', to: ROUTES.REPORT_BUDGETED_MARGIN_FORECAST },
  { label: 'Staffing Plan Accuracy', to: ROUTES.REPORT_RESOURCE_STAFFING_PLAN_ACCURACY },
  { label: 'Client Profitability', to: ROUTES.REPORT_CLIENT_PROFITABILITY_CONCENTRATION },
  { label: 'BU Performance Scorecard', to: ROUTES.REPORT_BU_PERFORMANCE_SCORECARD },
  { label: 'Capacity & Bench Forecast', to: ROUTES.REPORT_EMPLOYEE_CAPACITY_FORECAST },
  { label: 'PO Timeline Risk', to: ROUTES.REPORT_SERVICE_PO_TIMELINE_RISK },
  { label: 'Delivery Head Performance', to: ROUTES.REPORT_DELIVERY_HEAD_PERFORMANCE },
  { label: 'Invoice Realization Trend', to: ROUTES.REPORT_INVOICE_REALIZATION_TREND },
  { label: 'Service Line Business Mix', to: ROUTES.REPORT_SERVICE_LINE_BUSINESS_MIX },
  { label: 'Budget vs Billed', to: ROUTES.REPORT_BUDGET_VS_BILLED },
  { label: 'Client Cost Analytics', to: ROUTES.REPORT_CLIENT_COST_ANALYTICS },
  { label: 'Client Wise Analytics', to: ROUTES.REPORT_CLIENT_WISE_ANALYTICS },
  { label: 'Monthly Hours Trend', to: ROUTES.REPORT_MONTHLY_HOURS_TREND },
  { label: 'Employee Bench Percentage', to: ROUTES.REPORT_EMPLOYEE_BENCH_PERCENTAGE },
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
