import { Fragment, useMemo, useState } from 'react';
import { useNavigate, useSearchParams, Outlet } from 'react-router-dom';
import { Plus, Pencil, Power, PowerOff, MoreVertical, ChevronDown, ChevronRight, Network } from 'lucide-react';
import { useCompanies, useUpdateCompany } from '@/hooks/useCompanies';
import { useNotification } from '@/hooks/useNotification';
import { useDebounce } from '@/hooks/useDebounce';
import { useCanManageBusinessUnits } from '@/hooks/usePermissions';
import { extractApiError } from '@/services/apiClient';
import { buildPath, ROUTES } from '@/constants/routes';
import { getInitials } from '@/utils/formatters';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import FilterToggleButton from '@/components/common/FilterToggleButton';
import FilterPanel from '@/components/common/FilterPanel';
import EntityFilter from '@/components/common/EntityFilter';
import SearchInput from '@/components/common/SearchInput';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Avatar, AvatarFallback } from '@/components/ui/avatar';
import { Skeleton } from '@/components/ui/skeleton';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { cn } from '@/utils/cn';

const ALL = 'all';

const TruncatedCell = ({ value, maxWidth = '150px', className }) => {
  if (!value) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <div className={cn('text-sm truncate', className)} style={{ maxWidth }} title={value}>
      {value}
    </div>
  );
};

const CompanyList = () => {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const entityIdParam = searchParams.get('entity_id');
  const { success, error: showError } = useNotification();
  // BU Master is now reachable read-only by the BU-scoped senior tier (BU Admin / BU Head), who
  // need to see the BUs they map employees against but may never add, rename or deactivate one —
  // that stays with Admin / Entity Admin (see useCanManageBusinessUnits and the route guards on
  // COMPANY_NEW / COMPANY_EDIT). For them this whole screen is a plain list: no Actions column,
  // no "Add BU", and no click-through to the edit form.
  const canManage = useCanManageBusinessUnits();

  const [search, setSearch] = useState('');
  const [statusTarget, setStatusTarget] = useState(null); // { company, nextStatus }
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState(ALL);
  // Only meaningful when there's no entityIdParam — a BU list already scoped to one Entity (via
  // the Entity list's "Manage BUs" action) has nothing left to narrow by Entity.
  const [entityFilters, setEntityFilters] = useState([]);
  // Sub-BUs collapsed under their Parent by default — expanding is an explicit per-row choice.
  const [expandedIds, setExpandedIds] = useState(() => new Set());

  const debouncedSearch = useDebounce(search, 400);

  // Fetched whole (no server pagination) and filtered/grouped client-side below — the BU
  // hierarchy has to be built from the full flat list (parent_business_unit_id per row), and a
  // Sub-BU could otherwise land on a different server page than its own Parent, breaking the
  // tree. 500 matches the backend's own "load full list" cap (same one
  // useSelectableBusinessUnits already relies on) — this is an admin master list, not expected to
  // ever approach that in practice.
  const params = {
    limit: 500,
    ...(entityIdParam
      ? { entity_id: entityIdParam }
      : entityFilters.length > 0 && { entity_ids: entityFilters.join(',') }),
    status: ALL,
  };

  const { data, isPending } = useCompanies(params);
  const updateMutation = useUpdateCompany(statusTarget?.company?.id);

  const activeFilterCount = [!entityIdParam && entityFilters.length > 0, statusFilter !== ALL].filter(Boolean).length;

  const clearFilters = () => {
    setEntityFilters([]);
    setStatusFilter(ALL);
  };

  const allCompanies = data?.data ?? [];

  // Client-side status + search filtering, then grouped into Parent BU -> Sub-BU[] — a Sub-BU
  // that matches search/status is kept (with its Parent shown for context even if the Parent
  // itself doesn't match, same "keep the parent as context" rule the BU filter dropdown uses).
  const { roots, childrenByParent, totalMatched } = useMemo(() => {
    const q = debouncedSearch.trim().toLowerCase();
    const passesOwn = (c) =>
      (statusFilter === ALL || c.status === statusFilter) &&
      (!q || c.company_name?.toLowerCase().includes(q) || c.company_code?.toLowerCase().includes(q));

    const byParent = new Map();
    allCompanies.forEach((c) => {
      if (c.parent_business_unit_id == null) return;
      const key = String(c.parent_business_unit_id);
      if (!byParent.has(key)) byParent.set(key, []);
      byParent.get(key).push(c);
    });

    const rootList = allCompanies.filter((c) => c.parent_business_unit_id == null);
    let matchedCount = 0;
    const visibleRoots = rootList
      .map((root) => {
        const children = byParent.get(String(root.id)) ?? [];
        const matchedChildren = children.filter(passesOwn);
        const rootMatches = passesOwn(root);
        if (!rootMatches && matchedChildren.length === 0) return null;
        matchedCount += (rootMatches ? 1 : 0) + matchedChildren.length;
        return { root, children: rootMatches ? children : matchedChildren, childMatched: !rootMatches && matchedChildren.length > 0 };
      })
      .filter(Boolean);

    return { roots: visibleRoots, childrenByParent: byParent, totalMatched: matchedCount };
  }, [allCompanies, statusFilter, debouncedSearch]);

  const toggleExpanded = (id) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      const key = String(id);
      if (next.has(key)) next.delete(key);
      else next.add(key);
      return next;
    });
  };
  const isExpanded = (id, childMatched) => expandedIds.has(String(id)) || (debouncedSearch.trim().length > 0 && childMatched);

  const goToAddBu = () => navigate(entityIdParam ? `${ROUTES.COMPANY_NEW}?entity_id=${entityIdParam}` : ROUTES.COMPANY_NEW);
  const goToAddSubBu = (parentId) => navigate(`${ROUTES.COMPANY_NEW}?parent_business_unit_id=${parentId}`);
  const goToEdit = (id) => navigate(buildPath(ROUTES.COMPANY_EDIT, { id }));

  const handleConfirmStatusChange = () => {
    updateMutation.mutate(
      { status: statusTarget.nextStatus },
      {
        onSuccess: () => {
          success(
            `${statusTarget.company.company_name} has been ${statusTarget.nextStatus === 'active' ? 'activated' : 'deactivated'}.`
          );
          setStatusTarget(null);
        },
        onError: (err) => {
          showError(extractApiError(err));
          setStatusTarget(null);
        },
      }
    );
  };

  // Shared row content (desktop table row + mobile card both call this) — one place to keep the
  // Parent-vs-Sub-BU visual distinction (indent, a small corner-arrow icon, muted "under X"
  // caption on the Sub-BU row) consistent between the two layouts.
  // Desktop — 3 separate colored icon buttons in the Actions column, matching every other
  // table's own row-action convention in this app (e.g. Service PO List's View/Map/Edit
  // buttons) rather than a dropdown menu. "Add Sub-BU" only exists on a top-level Parent BU's
  // own row — depth is capped at 2 levels, a Sub-BU can never itself have children.
  const RowActionButtons = ({ company, isTopLevel }) => {
    const isActive = company.status === 'active';
    return (
      <div className="flex items-center gap-1.5" onClick={(e) => e.stopPropagation()}>
        <Button
          size="sm"
          title="Edit BU"
          onClick={() => goToEdit(company.id)}
          className="h-6 w-6 p-0 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
        >
          <Pencil className="h-3 w-3" />
        </Button>
        {isTopLevel && (
          <Button
            size="sm"
            title="Add Sub-BU"
            onClick={() => goToAddSubBu(company.id)}
            className="h-6 w-6 p-0 bg-violet-500 hover:bg-violet-600 text-white rounded transition-colors"
          >
            <Network className="h-3 w-3" />
          </Button>
        )}
        <Button
          size="sm"
          title={isActive ? 'Deactivate' : 'Activate'}
          onClick={() => setStatusTarget({ company, nextStatus: isActive ? 'inactive' : 'active' })}
          className={cn(
            'h-6 w-6 p-0 rounded transition-colors text-white',
            isActive ? 'bg-amber-500 hover:bg-amber-600' : 'bg-green-600 hover:bg-green-700'
          )}
        >
          {isActive ? <PowerOff className="h-3 w-3" /> : <Power className="h-3 w-3" />}
        </Button>
      </div>
    );
  };

  // Mobile — kept as a compact "⋮" dropdown (space-constrained cards, same convention every
  // other mobile list in this app already uses).
  const RowActionsMenu = ({ company, isTopLevel }) => {
    const isActive = company.status === 'active';
    return (
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 shrink-0" aria-label="Actions" onClick={(e) => e.stopPropagation()}>
            <MoreVertical className="h-4 w-4" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" onClick={(e) => e.stopPropagation()}>
          <DropdownMenuItem onClick={() => goToEdit(company.id)}>
            <Pencil className="h-4 w-4" /> Edit BU
          </DropdownMenuItem>
          {isTopLevel && (
            <DropdownMenuItem onClick={() => goToAddSubBu(company.id)}>
              <Network className="h-4 w-4" /> Add Sub-BU
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setStatusTarget({ company, nextStatus: isActive ? 'inactive' : 'active' })}>
            {isActive ? <PowerOff className="h-4 w-4" /> : <Power className="h-4 w-4" />}
            {isActive ? 'Deactivate' : 'Activate'}
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>
    );
  };

  return (
    <div className="flex h-full min-h-0 flex-col space-y-4">
      <PageHeader
        title="BU Management"
        description={
          entityIdParam
            ? 'BUs under this Entity'
            : canManage
              ? 'Manage BUs across your Entities'
              : 'BUs you are mapped to'
        }
        actions={
          <>
            <div className="hidden flex-wrap items-center gap-2 md:flex">
              <div className="flex items-center gap-3">
                <SearchInput
                  value={search}
                  onChange={(e) => setSearch(e.target.value)}
                  placeholder="Search BUs…"
                  className="w-[250px]"
                />
                <FilterToggleButton
                  isOpen={filtersOpen}
                  onToggle={() => setFiltersOpen((prev) => !prev)}
                  activeCount={activeFilterCount}
                />
                {canManage && (
                  <Button size="toolbar" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={goToAddBu}>
                    <Plus className="h-4 w-4" /> Add BU
                  </Button>
                )}
              </div>
            </div>
            {canManage && (
              <Button size="toolbar" className="md:hidden" onClick={goToAddBu}>
                <Plus className="h-4 w-4" /> Add
              </Button>
            )}
          </>
        }
      />

      <div className="flex flex-col gap-2 md:hidden">
        <p className="text-sm text-muted-foreground">
          {totalMatched} business unit{totalMatched === 1 ? '' : 's'}
        </p>
        <SearchInput
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search BUs…"
          className="w-full"
          inputClassName="h-10 bg-white"
        />
        <div className="flex items-center justify-between gap-2">
          <FilterToggleButton isOpen={filtersOpen} onToggle={() => setFiltersOpen((prev) => !prev)} activeCount={activeFilterCount} className="h-10" />
        </div>
      </div>

      <FilterPanel isOpen={filtersOpen} maxHeightClass="max-h-[200px]" onClear={clearFilters} showClear={activeFilterCount > 0}>
        {!entityIdParam && (
          <EntityFilter multiple value={entityFilters} onChange={(v) => setEntityFilters(v)} />
        )}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Status</Label>
          <div className="flex items-center rounded-md border overflow-hidden h-9 text-sm bg-white">
            {[
              { label: 'All', value: ALL },
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ].map(({ label, value }) => (
              <button
                key={value}
                type="button"
                onClick={() => setStatusFilter(value)}
                className={cn(
                  'flex-1 px-3 h-full font-medium text-center transition-colors border-r last:border-r-0',
                  statusFilter === value
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-background text-muted-foreground hover:bg-muted'
                )}
              >
                {label}
              </button>
            ))}
          </div>
        </div>
      </FilterPanel>

      {/* Desktop — Parent BU rows with their Sub-BUs indented directly beneath, expand/collapse
          per Parent. Plain table (not the shared DataTable) since this is a grouped tree, not a
          flat paginated grid — see the comment on `params` above for why pagination was dropped
          in favor of one full fetch. */}
      <div className="hidden min-h-0 flex-1 flex-col overflow-hidden rounded-lg border md:flex">
        <div className="flex-1 min-h-0 overflow-auto">
          <table className="w-full text-sm">
            <thead className="sticky top-0 z-10 bg-background">
              <tr className="border-b">
                {canManage && <th className="w-[100px] px-2 py-2 text-left text-xs font-semibold">Actions</th>}
                <th className="w-10 px-3 py-2" />
                <th className="px-2 py-2 text-left text-xs font-semibold">BU Name</th>
                <th className="px-2 py-2 text-left text-xs font-semibold">Entity Name</th>
                <th className="px-2 py-2 text-left text-xs font-semibold">BU Code</th>
                <th className="px-2 py-2 text-left text-xs font-semibold">Status</th>
              </tr>
            </thead>
            <tbody>
              {isPending ? (
                Array.from({ length: 6 }).map((_, i) => (
                  <tr key={i} className="border-b">
                    <td colSpan={canManage ? 6 : 5} className="px-3 py-3"><Skeleton className="h-5 w-full" /></td>
                  </tr>
                ))
              ) : roots.length === 0 ? (
                <tr>
                  <td colSpan={canManage ? 6 : 5} className="p-0">
                    <EmptyState title="No records found" description="Try adjusting your search or filters." />
                  </td>
                </tr>
              ) : (
                roots.map(({ root, children, childMatched }) => {
                  const hasChildren = (childrenByParent.get(String(root.id))?.length ?? 0) > 0;
                  const expanded = isExpanded(root.id, childMatched);
                  return (
                    <Fragment key={root.id}>
                      <tr
                        className={cn('border-b transition-colors hover:bg-muted/30', canManage && 'cursor-pointer')}
                        onClick={canManage ? () => goToEdit(root.id) : undefined}
                      >
                        {canManage && (
                          <td className="px-2 py-2.5">
                            <RowActionButtons company={root} isTopLevel />
                          </td>
                        )}
                        <td className="px-3 py-2.5" onClick={(e) => e.stopPropagation()}>
                          {hasChildren ? (
                            <button type="button" onClick={() => toggleExpanded(root.id)} className="flex h-5 w-5 items-center justify-center rounded hover:bg-muted" aria-label={expanded ? 'Collapse' : 'Expand'}>
                              {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                            </button>
                          ) : null}
                        </td>
                        <td className="px-2 py-2.5">
                          <TruncatedCell value={root.company_name} maxWidth="230px" className="font-medium" />
                        </td>
                        <td className="px-2 py-2.5"><TruncatedCell value={root.entity?.entity_name} maxWidth="180px" /></td>
                        <td className="px-2 py-2.5"><TruncatedCell value={root.company_code} maxWidth="130px" /></td>
                        <td className="px-2 py-2.5"><StatusBadge status={root.status} /></td>
                      </tr>
                      {hasChildren && expanded && children.map((child) => (
                        <tr
                          key={child.id}
                          className={cn('border-b bg-muted/10 transition-colors hover:bg-muted/30', canManage && 'cursor-pointer')}
                          onClick={canManage ? () => goToEdit(child.id) : undefined}
                        >
                          {canManage && (
                            <td className="px-2 py-2">
                              <RowActionButtons company={child} isTopLevel={false} />
                            </td>
                          )}
                          <td />
                          <td className="px-2 py-2 pl-8">
                            <div className="flex min-w-0 items-center gap-1.5 text-muted-foreground">
                              <Network className="h-3 w-3 shrink-0" />
                              <TruncatedCell value={child.company_name} maxWidth="210px" />
                            </div>
                          </td>
                          <td className="px-2 py-2"><TruncatedCell value={child.entity?.entity_name} maxWidth="180px" /></td>
                          <td className="px-2 py-2"><TruncatedCell value={child.company_code} maxWidth="130px" /></td>
                          <td className="px-2 py-2"><StatusBadge status={child.status} /></td>
                        </tr>
                      ))}
                    </Fragment>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Mobile — same Parent -> Sub-BU grouping, cards instead of table rows. */}
      <div className="flex min-h-0 flex-1 flex-col gap-3 md:hidden">
        <div className="flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto">
          {isPending ? (
            Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="flex items-center gap-3 rounded-xl border bg-white p-3 shadow-sm">
                <Skeleton className="h-10 w-10 shrink-0 rounded-full" />
                <div className="flex-1 space-y-2">
                  <Skeleton className="h-4 w-2/3" />
                  <Skeleton className="h-3 w-1/3" />
                </div>
              </div>
            ))
          ) : roots.length === 0 ? (
            <EmptyState title="No records found" description="Try adjusting your search or filters." />
          ) : (
            roots.map(({ root, children, childMatched }) => {
              const hasChildren = (childrenByParent.get(String(root.id))?.length ?? 0) > 0;
              const expanded = isExpanded(root.id, childMatched);
              const isActive = root.status === 'active';
              return (
                <div key={root.id} className="overflow-hidden rounded-xl border bg-white shadow-sm">
                  <div
                    className={cn('flex items-center gap-3 p-3', canManage && 'active:bg-slate-50')}
                    onClick={canManage ? () => goToEdit(root.id) : undefined}
                  >
                    {hasChildren && (
                      <button type="button" onClick={(e) => { e.stopPropagation(); toggleExpanded(root.id); }} className="flex h-8 w-8 shrink-0 items-center justify-center rounded hover:bg-muted">
                        {expanded ? <ChevronDown className="h-4 w-4" /> : <ChevronRight className="h-4 w-4" />}
                      </button>
                    )}
                    <Avatar className="h-10 w-10 shrink-0">
                      <AvatarFallback>{getInitials(root.company_name)}</AvatarFallback>
                    </Avatar>
                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium text-slate-900">{root.company_name}</p>
                      <p className="mt-0.5 truncate text-xs text-muted-foreground">
                        {root.company_code}
                        {root.entity?.entity_name ? ` · ${root.entity.entity_name}` : ''}
                        {' · '}
                        <span className={isActive ? 'text-green-600' : 'text-slate-400'}>{isActive ? 'Active' : 'Inactive'}</span>
                      </p>
                    </div>
                    {canManage && <RowActionsMenu company={root} isTopLevel />}
                  </div>
                  {hasChildren && expanded && (
                    <div className="divide-y border-t bg-muted/10">
                      {children.map((child) => {
                        const childActive = child.status === 'active';
                        return (
                          <div
                            key={child.id}
                            className={cn('flex items-center gap-3 p-3 pl-8', canManage && 'active:bg-slate-50')}
                            onClick={canManage ? () => goToEdit(child.id) : undefined}
                          >
                            <Network className="h-3.5 w-3.5 shrink-0 text-muted-foreground" />
                            <div className="min-w-0 flex-1">
                              <p className="truncate text-sm font-medium text-slate-900">{child.company_name}</p>
                              <p className="mt-0.5 truncate text-xs text-muted-foreground">
                                {child.company_code}
                                {' · '}
                                <span className={childActive ? 'text-green-600' : 'text-slate-400'}>{childActive ? 'Active' : 'Inactive'}</span>
                              </p>
                            </div>
                            {canManage && <RowActionsMenu company={child} isTopLevel={false} />}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!statusTarget}
        onOpenChange={(open) => !open && setStatusTarget(null)}
        title={statusTarget?.nextStatus === 'active' ? 'Activate BU?' : 'Deactivate BU?'}
        description={
          statusTarget?.nextStatus === 'active'
            ? `${statusTarget?.company?.company_name} will regain access to the platform.`
            : `${statusTarget?.company?.company_name} will lose access to the platform.`
        }
        confirmLabel={statusTarget?.nextStatus === 'active' ? 'Activate' : 'Deactivate'}
        variant={statusTarget?.nextStatus === 'active' ? 'default' : 'destructive'}
        onConfirm={handleConfirmStatusChange}
        isLoading={updateMutation.isPending}
      />

      <Outlet />
    </div>
  );
};

export default CompanyList;
