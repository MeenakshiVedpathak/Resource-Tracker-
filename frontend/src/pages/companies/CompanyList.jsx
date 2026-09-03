import { useState } from 'react';
import { useNavigate, useSearchParams, Outlet } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Pencil, Power, PowerOff, Search } from 'lucide-react';
import { useCompanies, useUpdateCompany } from '@/hooks/useCompanies';
import { useNotification } from '@/hooks/useNotification';
import { useDebounce } from '@/hooks/useDebounce';
import { useCanManageBusinessUnits } from '@/hooks/usePermissions';
import { extractApiError } from '@/services/apiClient';
import { buildPath, ROUTES } from '@/constants/routes';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import FilterToggleButton from '@/components/common/FilterToggleButton';
import FilterPanel from '@/components/common/FilterPanel';
import EntityFilter from '@/components/common/EntityFilter';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { cn } from '@/utils/cn';

const ALL = 'all';

const columnHelper = createColumnHelper();

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

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [sorting, setSorting] = useState([]);
  const [statusTarget, setStatusTarget] = useState(null); // { company, nextStatus }
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [statusFilter, setStatusFilter] = useState(ALL);
  // Only meaningful when there's no entityIdParam — a BU list already scoped to one Entity (via
  // the Entity list's "Manage BUs" action) has nothing left to narrow by Entity.
  const [entityFilter, setEntityFilter] = useState(ALL);

  const debouncedSearch = useDebounce(search, 400);

  const effectiveEntityId = entityIdParam || (entityFilter !== ALL ? entityFilter : null);

  const params = {
    page,
    limit,
    ...(effectiveEntityId && { entity_id: effectiveEntityId }),
    // Always sent, 'all' included: GET /companies defaults `status` to 'active' when the param is
    // absent, so omitting it on the All tab silently hid every inactive BU. 'all' is an accepted
    // value there and means "no status filter".
    status: statusFilter,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(sorting[0] && { sort_by: sorting[0].id, sort_order: sorting[0].desc ? 'DESC' : 'ASC' }),
  };

  const { data, isPending } = useCompanies(params);
  const updateMutation = useUpdateCompany(statusTarget?.company?.id);

  const activeFilterCount = [!entityIdParam && entityFilter !== ALL, statusFilter !== ALL].filter(Boolean).length;

  const clearFilters = () => {
    setEntityFilter(ALL);
    setStatusFilter(ALL);
    setPage(1);
  };

  const companies = data?.data ?? [];
  const meta = data?.meta ?? {};

  // Edit / Activate-Deactivate — the two write actions on a BU, so the whole column is dropped
  // (not just disabled) for a login that can't manage BUs.
  const actionsColumn = columnHelper.display({
    id: 'actions',
    header: 'Actions',
    size: 110,
    meta: { sticky: true, left: 0 },
    cell: ({ row }) => {
      const company = row.original;
      const isActive = company.status === 'active';
      return (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            title="Edit"
            onClick={() => navigate(buildPath(ROUTES.COMPANY_EDIT, { id: company.id }))}
            className="h-6 w-6 p-0 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
          >
            <Pencil className="h-3 w-3" />
          </Button>
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
    },
  });

  const columns = [
    ...(canManage ? [actionsColumn] : []),
    columnHelper.accessor('company_name', {
      header: 'BU Name',
      size: 250,
      // Slides left into the Actions column's slot when that column isn't rendered, so the
      // sticky offsets stay flush instead of leaving a 110px gap.
      meta: { sticky: true, left: canManage ? 110 : 0 },
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="230px" className="font-medium" />,
    }),
    columnHelper.accessor((row) => row.entity?.entity_name, {
      id: 'entity_name',
      header: 'Entity Name',
      size: 200,
      enableSorting: false,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="180px" />,
    }),
    columnHelper.accessor('company_code', {
      header: 'BU Code',
      size: 150,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="130px" />,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 120,
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
  ];

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

  return (
    <div className="space-y-4">
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
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search BUs…"
                className="pl-9 w-[250px] h-9 text-sm bg-white"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <FilterToggleButton
              isOpen={filtersOpen}
              onToggle={() => setFiltersOpen((prev) => !prev)}
              activeCount={activeFilterCount}
            />
            {canManage && (
              <Button
                size="sm"
                className="bg-blue-600 hover:bg-blue-700 text-white"
                onClick={() => navigate(entityIdParam ? `${ROUTES.COMPANY_NEW}?entity_id=${entityIdParam}` : ROUTES.COMPANY_NEW)}
              >
                <Plus className="mr-1.5 h-4 w-4" /> Add BU
              </Button>
            )}
          </div>
        }
      />

      <FilterPanel isOpen={filtersOpen} maxHeightClass="max-h-[200px]" onClear={clearFilters} showClear={activeFilterCount > 0}>
        {!entityIdParam && (
          <EntityFilter value={entityFilter} onChange={(v) => { setEntityFilter(v ?? ALL); setPage(1); }} />
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
                onClick={() => { setStatusFilter(value); setPage(1); }}
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

      <DataTable
        columns={columns}
        data={companies}
        isLoading={isPending}
        toolbar={null}
        pagination={
          meta.total != null
            ? { page: meta.page ?? page, limit: meta.limit ?? limit, total: meta.total }
            : undefined
        }
        sorting={sorting}
        onSortingChange={(s) => { setSorting(s); setPage(1); }}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
        onRowClick={canManage ? (row) => navigate(buildPath(ROUTES.COMPANY_EDIT, { id: row.id })) : undefined}
      />

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
