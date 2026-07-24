import { useEffect, useMemo } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { selectSidebarCollapsed, toggleSidebar, setSidebarCollapsed } from '@/store/slices/uiSlice';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { resolveFormRoute } from '@/constants/rbacForms';
import { isProtectedAccount } from '@/constants/protectedAccounts';
import { ChevronLeft, ChevronRight } from 'lucide-react';

// Modules hidden from the sidebar for everyone except the protected super-admin account,
// regardless of what any role's own form mappings say — a hardcoded UI restriction on top
// of the RBAC data, not derived from it.
const RESTRICTED_MODULES = ['administration'];

// Fixed display order for module sections, overriding whatever order the API happens to
// return them in (it's alphabetical server-side). Any module not listed here keeps its
// original relative position, appended after these (Array.sort is stable).
const MODULE_ORDER = ['core', 'administration', 'people', 'business', 'resources', 'reports'];
const moduleRank = (moduleName) => {
  const i = MODULE_ORDER.indexOf(moduleName.trim().toLowerCase());
  return i === -1 ? MODULE_ORDER.length : i;
};

// Builds one nav group per module, one item per form — driven entirely by the RBAC
// accessible-forms map (module -> [{ id, name }]) so a user only ever sees what their
// roles actually grant. Section order follows MODULE_ORDER above, not the API's own
// (alphabetical) key order. A form with no known route mapping is dropped (and logged)
// rather than rendered as a dead link — see constants/rbacForms.js.
const buildNavGroups = (accessibleForms, { isSuperAdmin }) =>
  Object.entries(accessibleForms ?? {})
    .filter(
      ([moduleName]) => isSuperAdmin || !RESTRICTED_MODULES.includes(moduleName.trim().toLowerCase())
    )
    .map(([moduleName, forms]) => ({
      label: moduleName,
      items: (forms ?? [])
        .map((form) => {
          const cfg = resolveFormRoute(form.name);
          if (!cfg) {
            console.warn(
              `[RBAC] Sidebar: no route mapping for form "${form.name}" (module "${moduleName}"). ` +
              `Add it to src/constants/rbacForms.js.`
            );
            return null;
          }
          return { label: form.name, icon: cfg.icon, to: cfg.to, exact: cfg.exact };
        })
        .filter(Boolean),
    }))
    .filter((group) => group.items.length > 0)
    .sort((a, b) => moduleRank(a.label) - moduleRank(b.label));

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
  const { pathname } = useLocation();
  const { accessibleForms, user } = useAuth();
  const isSuperAdmin = isProtectedAccount(user?.email);
  const navGroups = useMemo(
    () => buildNavGroups(accessibleForms, { isSuperAdmin }),
    [accessibleForms, isSuperAdmin]
  );

  // Drawer on mobile: start closed, and close again after each navigation
  useEffect(() => {
    if (window.innerWidth < 768) dispatch(setSidebarCollapsed(true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [pathname]);

  return (
    <>
      {/* Mobile backdrop — closes the drawer on tap */}
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
      {/* Logo */}
      <div className={cn(
        'flex h-16 shrink-0 items-center border-b border-sidebar-border px-4 gap-3',
        collapsed ? 'justify-center px-2' : ''
      )}>
        <motion.div
          className="relative flex shrink-0 items-center justify-center"
          initial={{ opacity: 0, scale: 0.7, rotate: -8 }}
          animate={{ opacity: 1, scale: 1, rotate: 0 }}
          transition={{ duration: 0.5 }}
          whileHover={{ scale: 1.08 }}
          whileTap={{ scale: 0.94 }}
        >
          <motion.img
            src="/logo.svg"
            alt="Logo"
            className={cn("object-contain", collapsed ? "w-10" : "h-12")}
            animate={{
              scale: [1, 1.15, 1],
              rotate: [0, 2, 0, -2, 0],
              filter: [
                'drop-shadow(0 0 4px rgba(139,92,246,0.5))',
                'drop-shadow(0 0 16px rgba(37,99,235,0.8))',
                'drop-shadow(0 0 4px rgba(139,92,246,0.5))',
              ],
            }}
            transition={{ duration: 2.8, repeat: Infinity, ease: 'easeInOut' }}
          />
        </motion.div>
        <AnimatePresence initial={false}>
          {!collapsed && (
            <motion.span
              initial={{ opacity: 0, width: 0 }}
              animate={{ opacity: 1, width: 'auto' }}
              exit={{ opacity: 0, width: 0 }}
              transition={{ duration: 0.15 }}
              className="font-bold text-lg text-white whitespace-nowrap overflow-hidden"
            >
              PMS Portal
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-3 px-2 space-y-4 scrollbar-thin">
        {navGroups.map((group) => (
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
    </>
  );
};

export default Sidebar;
