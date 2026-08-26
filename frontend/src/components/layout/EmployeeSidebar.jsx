import { useEffect, useMemo, useRef, useState } from 'react';
import { Link, useLocation } from 'react-router-dom';
import { motion } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { selectSidebarCollapsed, toggleSidebar, setSidebarCollapsed } from '@/store/slices/uiSlice';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { useFormModules, useForms } from '@/hooks/useForms';
import { useEmployeeEntries } from '@/hooks/useEmployeeWorkLog';
import { resolveFormRoute } from '@/constants/rbacForms';
import { ROUTES } from '@/constants/routes';
import { ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';
import ScrollOnHoverText from '@/components/common/ScrollOnHoverText';

// Real module/form ordering, sourced from the same Form Master data the /forms screen
// manages (GET /forms/modules for module seq, GET /forms for per-module form seq) — see the
// identical helper in Sidebar.jsx. Available to every authenticated user regardless of
// whether they hold the "Forms" RBAC permission (that permission only gates writes).
const useMenuRank = () => {
  const { data: moduleRows } = useFormModules({ status: 'active' });
  const { data: formsList } = useForms({ status: 'active' });

  return useMemo(() => {
    const moduleSeq = new Map();
    (moduleRows ?? []).forEach((m) => moduleSeq.set(m.form_name.trim().toLowerCase(), m.seq));

    const formSeq = new Map();
    (formsList?.data ?? []).forEach((f) => {
      if (f.module_name != null) {
        formSeq.set(`${f.module_name.trim().toLowerCase()}::${f.form_name.trim().toLowerCase()}`, f.seq);
      }
    });

    return {
      moduleRank: (moduleName) => moduleSeq.get(moduleName.trim().toLowerCase()) ?? Number.MAX_SAFE_INTEGER,
      formRank: (moduleName, formName) =>
        formSeq.get(`${moduleName.trim().toLowerCase()}::${formName.trim().toLowerCase()}`) ?? Number.MAX_SAFE_INTEGER,
    };
  }, [moduleRows, formsList]);
};

// RBAC-driven, same as the admin Sidebar's buildNavGroups — one group per module, one item per
// mapped form, both ordered by the real Form Master seq (moduleRank/formRank above) rather
// than a hardcoded name list. Used to be a hardcoded NAV_GROUPS array shown to every Employee
// regardless of any Form Master mapping; now an Employee only sees what's actually mapped to
// them, in the order an admin actually arranged.
const buildNavGroups = (accessibleForms, { moduleRank, formRank }) =>
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
        .filter(Boolean)
        .sort((a, b) => formRank(moduleName, a.label) - formRank(moduleName, b.label)),
    }))
    .filter((group) => group.items.length > 0)
    .sort((a, b) => moduleRank(a.label) - moduleRank(b.label));

const isActive = (to, pathname, exact) =>
  exact ? pathname === to : pathname === to || pathname.startsWith(to + '/');

const EmployeeNavItem = ({ item, active, collapsed, badgeCount }) => {
  const [hovered, setHovered] = useState(false);
  const hasBadge = badgeCount > 0;

  return (
    <Link
      to={item.to}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'nav-item group relative flex items-center gap-3 transition-all',
        active && 'active',
        collapsed && 'justify-center px-2'
      )}
      title={collapsed ? `${item.label}${hasBadge ? ` (${badgeCount})` : ''}` : undefined}
    >
      {active && (
        <span className="absolute left-0 top-1/2 -translate-y-1/2 h-5 w-0.5 rounded-r-full bg-primary" />
      )}
      <span className="relative shrink-0">
        <item.icon className={cn('shrink-0', collapsed ? 'h-5 w-5' : 'h-4 w-4')} />
        {hasBadge && collapsed && (
          <span className="absolute -right-1 -top-1 h-2 w-2 rounded-full bg-destructive" />
        )}
      </span>
      {!collapsed && (
        <span className="flex flex-1 items-center justify-between gap-2 overflow-hidden">
          <ScrollOnHoverText text={item.label} hovered={hovered} />
          {hasBadge && (
            <span className="shrink-0 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold leading-none text-destructive-foreground">
              {badgeCount > 99 ? '99+' : badgeCount}
            </span>
          )}
        </span>
      )}
    </Link>
  );
};

const EmployeeSidebar = () => {
  const dispatch = useDispatch();
  const collapsed = useSelector(selectSidebarCollapsed);
  const { pathname } = useLocation();
  const { accessibleForms } = useAuth();
  const { moduleRank, formRank } = useMenuRank();
  const navGroups = useMemo(() => buildNavGroups(accessibleForms, { moduleRank, formRank }), [accessibleForms, moduleRank, formRank]);

  const hasRejectedEntriesTab = useMemo(
    () => navGroups.some((g) => g.items.some((i) => i.to === ROUTES.EMPLOYEE_REJECTED_ENTRIES)),
    [navGroups]
  );
  const { data: rejectedEntries } = useEmployeeEntries({ status: 'rejected', page: 1, limit: 1 }, hasRejectedEntriesTab);
  const rejectedCount = rejectedEntries?.meta?.total ?? 0;

  // Per-module expand/collapse in the drawer — same convenience-only (unpersisted) behaviour as
  // the admin Sidebar. Tracking *expanded* labels means an empty Set reads as "all collapsed"
  // without needing the module list up front.
  const [expandedModules, setExpandedModules] = useState(() => new Set());
  const toggleModule = (label) => {
    setExpandedModules((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  // The module holding the current route, so the first render doesn't leave an Employee staring
  // at nothing but collapsed headers. Seeded once (not on every navigation) so a module the user
  // has since collapsed by hand stays collapsed.
  const activeGroupLabel = useMemo(
    () => navGroups.find((g) => g.items.some((i) => isActive(i.to, pathname, i.exact)))?.label ?? null,
    [navGroups, pathname]
  );
  const seededRef = useRef(false);
  useEffect(() => {
    if (seededRef.current || !activeGroupLabel) return;
    seededRef.current = true;
    setExpandedModules(new Set([activeGroupLabel]));
  }, [activeGroupLabel]);

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
        animate={{ width: collapsed ? 64 : 224 }}
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

        <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-2 scrollbar-thin">
          {navGroups.map((group) => {
            const moduleCollapsed = !expandedModules.has(group.label);
            // Rejected-entries badge is the only one in this nav; surfaced on the header while
            // the module is folded away so a collapsed group can't hide it.
            const groupBadge = group.items.some((i) => i.to === ROUTES.EMPLOYEE_REJECTED_ENTRIES)
              ? rejectedCount
              : 0;
            return (
            <div key={group.label} className="space-y-px">
              {!collapsed && (
                <button
                  type="button"
                  onClick={() => toggleModule(group.label)}
                  className="flex w-full items-center gap-1 px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30 whitespace-nowrap hover:text-sidebar-foreground/60 transition-colors"
                >
                  {moduleCollapsed
                    ? <ChevronRight className="h-3 w-3 shrink-0 transition-transform duration-150" />
                    : <ChevronDown className="h-3 w-3 shrink-0 transition-transform duration-150" />}
                  <span className="truncate">{group.label}</span>
                  {moduleCollapsed && groupBadge > 0 && (
                    <span className="ml-auto shrink-0 rounded-full bg-destructive px-1.5 py-0.5 text-[10px] font-semibold leading-none text-destructive-foreground">
                      {groupBadge > 99 ? '99+' : groupBadge}
                    </span>
                  )}
                </button>
              )}
              {/* Icon rail has no group headers to fold, so it always lists every item. */}
              {(collapsed || !moduleCollapsed) && group.items.map((item) => (
                <EmployeeNavItem
                  key={item.to}
                  item={item}
                  active={isActive(item.to, pathname, item.exact)}
                  collapsed={collapsed}
                  badgeCount={item.to === ROUTES.EMPLOYEE_REJECTED_ENTRIES ? rejectedCount : 0}
                />
              ))}
            </div>
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
