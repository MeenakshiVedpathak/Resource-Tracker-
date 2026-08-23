import { useEffect, useMemo, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useDispatch, useSelector } from 'react-redux';
import { selectSidebarCollapsed, toggleSidebar, setSidebarCollapsed } from '@/store/slices/uiSlice';
import { selectIsDirty, selectDirtyMessage, clearDirty } from '@/store/slices/navigationGuardSlice';
import { cn } from '@/utils/cn';
import { useAuth } from '@/hooks/useAuth';
import { useFormModules, useForms } from '@/hooks/useForms';
import { useFormCategories } from '@/hooks/useFormCategories';
import { resolveFormRoute } from '@/constants/rbacForms';
import { ROUTES } from '@/constants/routes';
import { ChevronLeft, ChevronRight, ChevronDown, UserPlus, Shield, ClipboardList, UserCog, Landmark, Network, Folder } from 'lucide-react';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import ScrollOnHoverText from '@/components/common/ScrollOnHoverText';

// A Platform Admin (top of the RBAC hierarchy, §0) sees ONLY these nav items — everything else
// the RBAC-driven buildNavGroups() would otherwise show is skipped for them. Platform Admin
// only provisions Admins now (§6.1) — Entity Admin/Company management moved down a tier.
const SUPER_ADMIN_NAV_GROUPS = [
  {
    label: 'Administration',
    items: [
      { label: 'Admins', icon: UserPlus, to: ROUTES.ADMINS, exact: false },
      { label: 'Role Master', icon: Shield, to: ROUTES.ROLES, exact: false },
      { label: 'Forms Master', icon: ClipboardList, to: ROUTES.FORMS, exact: false },
      { label: 'Organization Overview', icon: Network, to: ROUTES.ORGANIZATION_OVERVIEW, exact: true },
    ],
  },
];

// Modules hidden from the sidebar for everyone except users with the BU Admin role (the RBAC
// redesign's per-company "first admin", renamed from the old "Company Admin"), regardless of
// what any role's own form mappings say — a hardcoded UI restriction on top of the RBAC data.
const RESTRICTED_MODULES = ['administration'];

// Screens gated by role name directly (allowedRoles on the route) rather than a Form Master
// row — their nav items are injected on top of the RBAC-driven groups below rather than
// resolved from accessibleForms, same pattern as the BU Admin bypass above.
const ENTITY_ADMIN_MANAGEMENT_ROLES = ['Admin'];
const TEAM_MAPPING_ROLES = ['Service PO Admin'];

// Modules with a dedicated category-browser landing page (Zoho-style folder list + report
// list) — their group label becomes a link into that hub instead of plain text.
const MODULE_OVERVIEW_ROUTES = { reports: ROUTES.REPORTS };

// Builds one nav group per module, one item per form — driven entirely by the RBAC
// accessible-forms map (module -> [{ id, name }]) so a user only ever sees what their
// roles actually grant. Section AND item order follow each row's real Form Master `seq`
// (moduleRank/formRank, resolved from GET /forms/modules + GET /forms — see useMenuRank
// below), not the API's own (alphabetical) key order — no module/form name is hardcoded
// here, so a re-sequence on the Form Master screen is reflected with no frontend change.
// A form with no known route mapping is dropped (and logged) rather than rendered as a
// dead link — see constants/rbacForms.js.
//
// A form that Form Master has placed under a Category is grouped under a synthetic
// { isCategory: true, items: [...] } node instead of a plain leaf item, so the sidebar
// mirrors the same Module -> Category -> Form hierarchy the Form Master screen shows.
// accessibleForms itself (POST /roles/forms) doesn't carry category_id, so the category
// assignment is looked up from the separate GET /forms data useMenuRank already fetches
// for sequencing (categoryOf/categoryInfo) — see below.
const buildNavGroups = (accessibleForms, { isSuperAdmin, moduleRank, formRank, categoryOf, categoryInfo }) =>
  Object.entries(accessibleForms ?? {})
    .filter(
      ([moduleName]) => isSuperAdmin || !RESTRICTED_MODULES.includes(moduleName.trim().toLowerCase())
    )
    .map(([moduleName, forms]) => {
      const resolved = (forms ?? [])
        .map((form) => {
          const cfg = resolveFormRoute(form.name);
          if (!cfg) {
            console.warn(
              `[RBAC] Sidebar: no route mapping for form "${form.name}" (module "${moduleName}"). ` +
              `Add it to src/constants/rbacForms.js.`
            );
            return null;
          }
          return {
            label: form.name,
            icon: cfg.icon,
            to: cfg.to,
            exact: cfg.exact,
            categoryId: categoryOf(moduleName, form.name),
          };
        })
        .filter(Boolean);

      const byRank = (a, b) => formRank(moduleName, a.label) - formRank(moduleName, b.label);

      const uncategorized = resolved.filter((i) => i.categoryId == null).sort(byRank);

      const byCategory = new Map();
      resolved.forEach((i) => {
        if (i.categoryId == null) return;
        if (!byCategory.has(i.categoryId)) byCategory.set(i.categoryId, []);
        byCategory.get(i.categoryId).push(i);
      });
      const categoryGroups = Array.from(byCategory.entries())
        .map(([categoryId, items]) => {
          const info = categoryInfo(categoryId);
          return {
            isCategory: true,
            id: categoryId,
            label: info?.name ?? `Category #${categoryId}`,
            seq: info?.seq ?? 0,
            items: items.sort(byRank),
          };
        })
        .sort((a, b) => a.seq - b.seq);

      return { label: moduleName, items: [...categoryGroups, ...uncategorized] };
    })
    .filter((group) => group.items.length > 0)
    .sort((a, b) => moduleRank(a.label) - moduleRank(b.label));

// Collapsed (icon-only) sidebar has no room for category sub-headers — flatten each
// module back down to a plain list of leaf items so every form still gets its icon.
const flattenNavItems = (items) => items.flatMap((item) => (item.isCategory ? item.items : [item]));

// Real module/form ordering, sourced from the same Form Master data the /forms screen
// manages (GET /forms/modules for module seq, GET /forms for per-module form seq) —
// available to every authenticated user regardless of whether they hold the "Forms" RBAC
// permission themselves (that permission only gates writes). Unknown names (not yet
// resolvable — e.g. a brand-new module before this query has loaded) rank last rather than
// erroring, so the nav still renders, just unsorted for that item until the seq data lands.
const useMenuRank = () => {
  const { data: moduleRows } = useFormModules({ status: 'active' });
  const { data: formsList } = useForms({ status: 'active' });
  // Unscoped, same as FormList's admin screen — only used to label category groups by name.
  const { data: allCategories = [] } = useFormCategories({});

  return useMemo(() => {
    const moduleSeq = new Map();
    (moduleRows ?? []).forEach((m) => moduleSeq.set(m.form_name.trim().toLowerCase(), m.seq));

    const formSeq = new Map();
    const formCategoryId = new Map();
    (formsList?.data ?? []).forEach((f) => {
      if (f.module_name != null) {
        const key = `${f.module_name.trim().toLowerCase()}::${f.form_name.trim().toLowerCase()}`;
        formSeq.set(key, f.seq);
        if (f.category_id != null) formCategoryId.set(key, f.category_id);
      }
    });

    const categoryLookup = new Map(allCategories.map((c) => [c.id, c]));

    return {
      moduleRank: (moduleName) => moduleSeq.get(moduleName.trim().toLowerCase()) ?? Number.MAX_SAFE_INTEGER,
      formRank: (moduleName, formName) =>
        formSeq.get(`${moduleName.trim().toLowerCase()}::${formName.trim().toLowerCase()}`) ?? Number.MAX_SAFE_INTEGER,
      categoryOf: (moduleName, formName) =>
        formCategoryId.get(`${moduleName.trim().toLowerCase()}::${formName.trim().toLowerCase()}`) ?? null,
      categoryInfo: (categoryId) => categoryLookup.get(categoryId),
    };
  }, [moduleRows, formsList, allCategories]);
};

const isActive = (to, pathname, exact) => {
  if (exact) return pathname === to;
  return pathname === to || pathname.startsWith(to + '/');
};

// Indented child link rendered below a parent with children
const SubNavItem = ({ item, onNavAttempt }) => {
  const { pathname } = useLocation();
  const active = pathname === item.to;
  const [hovered, setHovered] = useState(false);

  return (
    <Link
      to={item.to}
      onClick={(e) => onNavAttempt(e, item.to)}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
      className={cn(
        'relative flex items-center rounded-md py-1 pl-8 pr-3 text-xs transition-colors min-w-0',
        active
          ? 'text-sidebar-foreground font-medium bg-sidebar-hover/70'
          : 'text-sidebar-foreground/55 hover:text-sidebar-foreground hover:bg-sidebar-hover/40'
      )}
      title={item.label}
    >
      {active && (
        <span className="absolute left-[18px] top-1/2 -translate-y-1/2 h-3.5 w-0.5 rounded-full bg-primary/70" />
      )}
      <ScrollOnHoverText text={item.label} hovered={hovered} className="min-w-0" />
    </Link>
  );
};

// Category sub-header rendered between a module label and its forms — same indent/connector
// styling as NavItem's own children, but this one isn't a link itself.
const CategoryNavGroup = ({ category, onNavAttempt }) => (
  <div className="mt-0.5">
    <p
      className="px-3 pt-1 pb-0.5 text-[10px] font-medium uppercase tracking-wide text-sidebar-foreground/40 truncate"
      title={category.label}
    >
      {category.label}
    </p>
    <div className="relative ml-[22px] border-l border-sidebar-border/60">
      {category.items.map((item) => (
        <SubNavItem key={item.to} item={item} onNavAttempt={onNavAttempt} />
      ))}
    </div>
  </div>
);

const NavItem = ({ item, collapsed, onNavAttempt }) => {
  const { pathname } = useLocation();
  const active = isActive(item.to, pathname, item.exact);
  const hasChildren = !collapsed && Array.isArray(item.children) && item.children.length > 0;
  const [hovered, setHovered] = useState(false);

  return (
    <div>
      <Link
        to={item.to}
        onClick={(e) => onNavAttempt(e, item.to)}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
        className={cn(
          'nav-item group relative flex items-center gap-3 transition-all min-w-0',
          active && 'active',
          collapsed && 'justify-center px-2'
        )}
        title={item.label}
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
              className="min-w-0"
            >
              <ScrollOnHoverText text={item.label} hovered={hovered} />
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
                <SubNavItem key={child.to} item={child} onNavAttempt={onNavAttempt} />
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
  const navigate = useNavigate();
  const collapsed = useSelector(selectSidebarCollapsed);
  const { pathname } = useLocation();
  const { accessibleForms, hasRole, isPlatformAdmin } = useAuth();
  // BU Head is an additive peer of BU Admin with identical form/permission access — extends the
  // same bypass BU Admin already gets, never a standalone concept.
  const isSuperAdmin = hasRole('BU Admin', 'BU Head');
  const canViewEntityAdmins = hasRole(...ENTITY_ADMIN_MANAGEMENT_ROLES);
  const canViewTeamMapping = hasRole(...TEAM_MAPPING_ROLES);
  const { moduleRank, formRank, categoryOf, categoryInfo } = useMenuRank();
  // isPlatformAdmin is derived from the held roles (§0) — overrides the normal
  // accessible-forms-driven nav entirely.
  const navGroups = useMemo(() => {
    if (isPlatformAdmin) return SUPER_ADMIN_NAV_GROUPS;
    const base = buildNavGroups(accessibleForms, { isSuperAdmin, moduleRank, formRank, categoryOf, categoryInfo });

    const injected = [];
    if (canViewEntityAdmins) {
      injected.push({ group: 'Entity Management', item: { label: 'Entity Admins', icon: Landmark, to: ROUTES.ENTITY_ADMINS, exact: false } });
    }
    if (canViewTeamMapping) {
      injected.push({ group: 'People', item: { label: 'Team Mapping', icon: UserCog, to: ROUTES.TEAM_MAPPINGS, exact: true } });
    }
    if (injected.length === 0) return base;

    return injected.reduce((groups, { group: groupLabel, item }) => {
      const idx = groups.findIndex((g) => g.label.trim().toLowerCase() === groupLabel.toLowerCase());
      if (idx === -1) return [...groups, { label: groupLabel, items: [item] }];
      // Entity Admins should lead its group, ahead of the RBAC-driven BU Admin Master item.
      const prepend = groupLabel === 'Entity Management';
      return groups.map((g, i) => (i === idx ? { ...g, items: prepend ? [item, ...g.items] : [...g.items, item] } : g));
    }, base);
  }, [accessibleForms, isSuperAdmin, isPlatformAdmin, canViewEntityAdmins, canViewTeamMapping, moduleRank, formRank, categoryOf, categoryInfo]);

  // Guards navigation away from a page with unsaved changes (e.g. Timesheet
  // Import Detail's Modified Hours edits) — any page can opt in via the
  // useUnsavedChangesGuard hook, which is what populates this global flag.
  const isDirty = useSelector(selectIsDirty);
  const dirtyMessage = useSelector(selectDirtyMessage);
  const [pendingTo, setPendingTo] = useState(null);

  // Per-module collapse in the expanded drawer — purely a UI convenience (not persisted), so
  // reopening the drawer always starts with every module expanded, same as before this existed.
  const [collapsedModules, setCollapsedModules] = useState(() => new Set());
  const toggleModule = (label) => {
    setCollapsedModules((prev) => {
      const next = new Set(prev);
      if (next.has(label)) next.delete(label);
      else next.add(label);
      return next;
    });
  };

  const handleNavAttempt = (e, to) => {
    if (!isDirty) return;
    e.preventDefault();
    setPendingTo(to);
  };

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
        animate={{ width: collapsed ? 64 : 224 }}
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
              Trackio
            </motion.span>
          )}
        </AnimatePresence>
      </div>

      {/* Navigation */}
      <nav className="flex-1 overflow-y-auto overflow-x-hidden py-2 px-2 space-y-2 scrollbar-thin">
        {navGroups.map((group) => {
          const overviewRoute = MODULE_OVERVIEW_ROUTES[group.label.trim().toLowerCase()];
          const hasCategories = group.items.some((item) => item.isCategory);
          // A module with categories and its own hub page (e.g. Reports -> Reports Center)
          // shows only its module link in the drawer — no nested Category>Form tree —
          // since browsing by category now happens on that hub page instead.
          const onlyModuleLink = hasCategories && !!overviewRoute;
          // Collapse toggle only makes sense when the drawer itself is expanded and there's
          // actually a Category/Form list under this module to hide (onlyModuleLink modules
          // already show nothing below their label).
          const moduleCollapsed = !onlyModuleLink && collapsedModules.has(group.label);
          return (
          <div key={group.label} className="space-y-px">
            <AnimatePresence initial={false}>
              {!collapsed && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                  {overviewRoute ? (
                    <Link
                      to={overviewRoute}
                      onClick={(e) => handleNavAttempt(e, overviewRoute)}
                      className="block px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30 whitespace-nowrap hover:text-sidebar-foreground/60 transition-colors"
                    >
                      {group.label}
                    </Link>
                  ) : (
                    <button
                      type="button"
                      onClick={() => toggleModule(group.label)}
                      className="flex w-full items-center gap-1 px-3 pt-2 pb-1 text-[10px] font-semibold uppercase tracking-widest text-sidebar-foreground/30 whitespace-nowrap hover:text-sidebar-foreground/60 transition-colors"
                    >
                      {moduleCollapsed
                        ? <ChevronRight className="h-3 w-3 shrink-0" />
                        : <ChevronDown className="h-3 w-3 shrink-0" />}
                      <span className="truncate">{group.label}</span>
                    </button>
                  )}
                </motion.div>
              )}
            </AnimatePresence>
            {onlyModuleLink ? (
              collapsed && (
                <NavItem
                  item={{ label: group.label, icon: Folder, to: overviewRoute, exact: true }}
                  collapsed={collapsed}
                  onNavAttempt={handleNavAttempt}
                />
              )
            ) : collapsed ? (
              flattenNavItems(group.items).map((item) => (
                <NavItem key={item.to} item={item} collapsed={collapsed} onNavAttempt={handleNavAttempt} />
              ))
            ) : moduleCollapsed ? null : (
              group.items.map((item) => (
                item.isCategory
                  ? <CategoryNavGroup key={`cat-${item.id}`} category={item} onNavAttempt={handleNavAttempt} />
                  : <NavItem key={item.to} item={item} collapsed={collapsed} onNavAttempt={handleNavAttempt} />
              ))
            )}
          </div>
          );
        })}
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

      <ConfirmDialog
        open={!!pendingTo}
        onOpenChange={(open) => !open && setPendingTo(null)}
        title="Leave without saving?"
        description={dirtyMessage || 'You have unsaved changes. If you leave now, they will be lost.'}
        confirmLabel="Leave"
        cancelLabel="Stay"
        variant="destructive"
        onConfirm={() => {
          const to = pendingTo;
          setPendingTo(null);
          dispatch(clearDirty());
          navigate(to);
        }}
      />
    </>
  );
};

export default Sidebar;
