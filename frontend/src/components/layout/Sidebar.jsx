import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { selectSidebarCollapsed, toggleSidebar } from '@/store/slices/uiSlice';
import { cn } from '@/utils/cn';
import { ROUTES } from '@/constants/routes';
import {
  LayoutDashboard, Users, UserCog, Shield, Building2,
  FileText, FolderOpen, Clock, DollarSign, BarChart3,
  ChevronLeft, ChevronRight,
} from 'lucide-react';

const NAV_GROUPS = [
  {
    label: 'Core',
    items: [
      { label: 'Dashboard', icon: LayoutDashboard, to: ROUTES.DASHBOARD, exact: true },
    ],
  },
  {
    label: 'People',
    items: [
      { label: 'Employees', icon: Users, to: ROUTES.EMPLOYEES },
      { label: 'Users', icon: UserCog, to: ROUTES.USERS },
      { label: 'Roles', icon: Shield, to: ROUTES.ROLES },
    ],
  },
  {
    label: 'Business',
    items: [
      { label: 'Clients', icon: Building2, to: ROUTES.CLIENTS },
      { label: 'Service POs', icon: FileText, to: ROUTES.SERVICE_POS },
      { label: 'Sub-Projects', icon: FolderOpen, to: ROUTES.SUB_PROJECTS },
    ],
  },
  {
    label: 'Resources',
    items: [
      { label: 'Timesheets', icon: Clock, to: ROUTES.TIMESHEETS },
      { label: 'Monthly Costs', icon: DollarSign, to: ROUTES.MONTHLY_COSTS },
    ],
  },
  {
    label: 'Analytics',
    items: [
      {
        label: 'Reports',
        icon: BarChart3,
        to: ROUTES.REPORTS,
        children: [
           { label: 'PO vs Resource',        to: ROUTES.REPORT_SERVICE_PO_RESOURCE },
          { label: 'Monthly Utilization',   to: ROUTES.REPORT_MONTHLY_UTILIZATION },
         
          { label: 'Employee Hourly Rate',  to: ROUTES.REPORT_HOURLY_RATE },
          { label: 'Monthly Cost Summary',  to: ROUTES.REPORT_MONTHLY_COST },
          { label: 'Timesheet Summary',     to: ROUTES.REPORT_TIMESHEET },
          { label: 'PO Utilisation',        to: ROUTES.REPORT_PO_UTILISATION },
          { label: 'Sub-Project Hours',     to: ROUTES.REPORT_SUB_PROJECT_HOURS },
          { label: 'Resource Allocation',   to: ROUTES.REPORT_RESOURCE_ALLOCATION },
          { label: 'Operational Cost',      to: ROUTES.REPORT_OPERATIONAL_COST },
          
        ],
      },
    ],
  },
];

const isActive = (to, pathname, exact) => {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(to + '/');
};

// Indented child link rendered below a parent with children
const SubNavItem = ({ item }) => {
  const { pathname } = useLocation();
  const active = pathname === item.to;

  return (
    <Link
      to={item.to}
      className={cn(
        'relative flex items-center rounded-md py-1.5 pl-9 pr-3 text-xs transition-colors',
        active
          ? 'text-sidebar-foreground font-medium bg-sidebar-hover/70'
          : 'text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-hover/40'
      )}
    >
      {active && (
        <span className="absolute left-[18px] top-1/2 -translate-y-1/2 h-3.5 w-0.5 rounded-full bg-primary/70" />
      )}
      <span className="truncate">{item.label}</span>
    </Link>
  );
};

const NavItem = ({ item, collapsed }) => {
  const { pathname } = useLocation();
  const active = isActive(item.to, pathname, item.exact);
  const hasChildren = !collapsed && Array.isArray(item.children) && item.children.length > 0;

  return (
    <div>
      <Link
        to={item.to}
        className={cn(
          'nav-item group relative flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-all',
          'text-sidebar-foreground/70 hover:text-sidebar-foreground hover:bg-sidebar-hover',
          active && 'active text-sidebar-foreground bg-sidebar-hover/80',
          collapsed && 'justify-center px-2'
        )}
        title={collapsed ? item.label : undefined}
      >
        {active && (
          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-primary" />
        )}
        <item.icon className={cn('shrink-0', collapsed ? 'h-5 w-5' : 'h-4 w-4')} />
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="overflow-hidden whitespace-nowrap"
            >
              {item.label}
            </motion.span>
          )}
        </AnimatePresence>
      </Link>

      {/* Sub-items — only rendered when sidebar is expanded */}
      <AnimatePresence initial={false}>
        {hasChildren && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: 0.15 }}
            className="overflow-hidden"
          >
            {/* Vertical connector line */}
            <div className="relative ml-[22px] mt-0.5 mb-1 border-l border-sidebar-border/60 pl-0">
              {item.children.map((child) => (
                <SubNavItem key={child.to} item={child} />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

const Sidebar = () => {
  const dispatch = useDispatch();
  const collapsed = useSelector(selectSidebarCollapsed);

  return (
    <motion.aside
      animate={{ width: collapsed ? 64 : 240 }}
      transition={{ duration: 0.2, ease: 'easeInOut' }}
      className="relative flex h-full shrink-0 flex-col bg-sidebar border-r border-sidebar-border overflow-hidden"
    >
      {/* Logo */}
      <div className={cn(
        'flex h-16 shrink-0 items-center border-b border-sidebar-border px-4 gap-3',
        collapsed && 'justify-center px-2'
      )}>
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary">
          <span className="text-sm font-bold text-white">R</span>
        </div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.1 }}
              className="overflow-hidden"
            >
              <p className="text-sm font-semibold text-sidebar-foreground leading-none whitespace-nowrap">RUT Portal</p>
              <p className="text-[10px] text-sidebar-foreground/40 mt-0.5 whitespace-nowrap">Resource Management</p>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-4 scrollbar-thin">
        {NAV_GROUPS.map((group) => (
          <div key={group.label} className="space-y-0.5">
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.p
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30 whitespace-nowrap"
                >
                  {group.label}
                </motion.p>
              )}
            </AnimatePresence>
            {group.items.map((item) => (
              <NavItem key={item.to} item={item} collapsed={collapsed} />
            ))}
          </div>
        ))}
      </nav>

      {/* Collapse toggle */}
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
  );
};

export default Sidebar;
