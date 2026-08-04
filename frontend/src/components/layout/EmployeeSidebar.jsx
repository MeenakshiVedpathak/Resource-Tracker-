import { useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { selectSidebarCollapsed, toggleSidebar, setSidebarCollapsed } from '@/store/slices/uiSlice';
import { cn } from '@/utils/cn';
import { ROUTES } from '@/constants/routes';
import { ChevronLeft, ChevronRight, LayoutDashboard, Clock, Table2, FileBarChart2 } from 'lucide-react';

// Static (not RBAC-driven) — an Employee always sees exactly these, per spec.
const NAV_ITEMS = [
  { label: 'Dashboard', icon: LayoutDashboard, to: ROUTES.EMPLOYEE_DASHBOARD, exact: true },
  { label: 'My Work Log', icon: Clock, to: ROUTES.EMPLOYEE_TIMESHEET, exact: false },
  { label: 'Monthly Summary', icon: Table2, to: ROUTES.EMPLOYEE_MONTHLY_SUMMARY, exact: false },
  { label: 'Reports', icon: FileBarChart2, to: ROUTES.EMPLOYEE_REPORTS, exact: false },
];

const isActive = (to, pathname, exact) =>
  exact ? pathname === to : pathname === to || pathname.startsWith(to + '/');

const EmployeeSidebar = () => {
  const dispatch = useDispatch();
  const collapsed = useSelector(selectSidebarCollapsed);
  const { pathname } = useLocation();

  useEffect(() => {
    if (window.innerWidth < 768) dispatch(setSidebarCollapsed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {!collapsed && (
        <div
          className="fixed inset-0 z-40 bg-black/50 md:hidden"
          onClick={() => dispatch(toggleSidebar())}
        />
      )}

      <motion.aside
        animate={{ width: collapsed ? 64 : 260 }}
        transition={{ duration: 0.2, ease: 'easeInOut' }}
        className={cn(
          'fixed inset-y-0 left-0 z-50 flex h-full shrink-0 flex-col bg-sidebar border-r border-sidebar-border overflow-hidden transition-transform duration-200',
          'md:relative md:z-auto md:translate-x-0',
          collapsed ? '-translate-x-full md:translate-x-0' : 'translate-x-0'
        )}
      >
        <div
          className={cn(
            'flex h-16 shrink-0 items-center border-b border-sidebar-border px-4 gap-3',
            collapsed ? 'justify-center px-2' : ''
          )}
        >
          <img src="/logo.svg" alt="Logo" className={cn('object-contain', collapsed ? 'w-10' : 'h-12')} />
          {!collapsed && (
            <span className="font-bold text-lg text-white whitespace-nowrap overflow-hidden">Trackio</span>
          )}
        </div>

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-0.5 scrollbar-thin">
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.to, pathname, item.exact);
            return (
              <Link
                key={item.to}
                to={item.to}
                className={cn(
                  'nav-item group relative flex items-center gap-3 transition-all',
                  active && 'active',
                  collapsed && 'justify-center px-2'
                )}
                title={collapsed ? item.label : undefined}
              >
                {active && (
                  <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-primary" />
                )}
                <item.icon className={cn('shrink-0', collapsed ? 'h-5 w-5' : 'h-4 w-4')} />
                {!collapsed && <span className="overflow-hidden whitespace-nowrap">{item.label}</span>}
              </Link>
            );
          })}
        </nav>

        <div className="shrink-0 border-t border-sidebar-border p-2">
          <button
            onClick={() => dispatch(toggleSidebar())}
            className={cn(
              'flex w-full items-center gap-2 rounded-lg px-3 py-2 text-xs text-sidebar-foreground/50',
              'hover:bg-sidebar-hover hover:text-sidebar-foreground transition-colors',
              collapsed && 'justify-center px-2'
            )}
          >
            {collapsed ? (
              <ChevronRight className="h-4 w-4" />
            ) : (
              <>
                <ChevronLeft className="h-4 w-4" />
                <span>Collapse</span>
              </>
            )}
          </button>
        </div>
      </motion.aside>
    </>
  );
};

export default EmployeeSidebar;
