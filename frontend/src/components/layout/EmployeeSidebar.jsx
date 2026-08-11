import { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { selectSidebarCollapsed, toggleSidebar, setSidebarCollapsed } from '@/store/slices/uiSlice';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { resolveFormRoute } from '@/constants/rbacForms';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// RBAC-driven, same as the admin Sidebar's buildNavGroups — one group per module, one item per
// mapped form. Used to be a hardcoded NAV_GROUPS array shown to every Employee regardless of
// any Form Master mapping; now an Employee only sees what's actually mapped to them.
const buildNavGroups = (accessibleForms) =>
  Object.entries(accessibleForms ?? {})
    .map(([moduleName, forms]) => ({
      label: moduleName,
      items: (forms ?? [])
        .map((form) => {
          const cfg = resolveFormRoute(form.name);
          if (!cfg) {
            console.warn(
              `[RBAC] EmployeeSidebar: no route mapping for form "${form.name}" (module "${moduleName}"). ` +
              `Add it to src/constants/rbacForms.js.`
            );
            return null;
          }
          return { label: form.name, icon: cfg.icon, to: cfg.to, exact: cfg.exact };
        })
        .filter(Boolean),
    }))
    .filter((group) => group.items.length > 0);

const isActive = (to, pathname, exact) =>
  exact ? pathname === to : pathname === to || pathname.startsWith(to + '/');

const EmployeeSidebar = () => {
  const dispatch = useDispatch();
  const collapsed = useSelector(selectSidebarCollapsed);
  const { pathname } = useLocation();
  const { accessibleForms } = useAuth();
  const navGroups = useMemo(() => buildNavGroups(accessibleForms), [accessibleForms]);

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

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-4 scrollbar-thin">
          {navGroups.map((group) => (
            <div key={group.label} className="space-y-0.5">
              {!collapsed && (
                <p className="px-3 py-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30 whitespace-nowrap">
                  {group.label}
                </p>
              )}
              {group.items.map((item) => {
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
            </div>
          ))}
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
