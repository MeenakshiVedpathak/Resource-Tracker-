import { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Pencil, Search, Building2 } from 'lucide-react';
import { useEntities, useToggleEntityStatus } from '@/hooks/useEntities';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { buildPath, ROUTES } from '@/constants/routes';
import { formatDate } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import FilterToggleButton from '@/components/common/FilterToggleButton';
import FilterPanel from '@/components/common/FilterPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { cn } from '@/utils/cn';

const columnHelper = createColumnHelper();

const TruncatedCell = ({ value, maxWidth = '150px', className }) => {
  if (!value) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <div className={cn("text-sm truncate", className)} style={{ maxWidth }} title={value}>
      {value}
    </div>
  );
};

const StatusToggle = ({ entity }) => {
  const { mutate, isPending } = useToggleEntityStatus();
  const isActive = entity.status === 'active';
  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Switch
        checked={isActive}
        disabled={isPending}
        onCheckedChange={(checked) =>
          mutate({ id: entity.id, status: checked ? 'active' : 'inactive' })
        }
      />
      <span className={cn('text-xs font-medium', isActive ? 'text-green-600' : 'text-slate-400')}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    </div>
  );
};

const EntityList = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  // Entity Admin can manage Entity Master the same as Admin (reverts the earlier "ownership
  // flip (§1)" that made Entity Admin read-only here).
  const canManageEntities = hasRole('Admin') || hasRole('Entity Admin');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  const [sorting, setSorting] = useState([]);

  const params = {
    page,
    limit,
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(sorting[0] && { sort_by: sorting[0].id, sort_order: sorting[0].desc ? 'DESC' : 'ASC' }),
  };

  const { data, isPending } = useEntities(params);

  const entities = data?.data ?? [];
  const meta = data?.meta ?? {};

  const columns = [
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 150,
      meta: { sticky: true, left: 0 },
      cell: ({ row }) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            title="Manage BUs"
            onClick={() => navigate(`${ROUTES.COMPANIES}?entity_id=${row.original.id}`)}
            className="h-6 w-6 p-0 bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors"
          >
            <Building2 className="h-3 w-3" />
          </Button>
          {canManageEntities && (
            <>
              <Button
                size="sm"
                title="Edit"
                onClick={() => navigate(buildPath(ROUTES.ENTITY_EDIT, { id: row.original.id }))}
                className="h-6 w-6 p-0 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            </>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('entity_name', {
      header: 'Entity Name',
      size: 250,
      meta: { sticky: true, left: 150 },
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="230px" className="font-medium" />,
    }),
    columnHelper.accessor('entity_code', {
      header: 'Entity Code',
      size: 190,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="170px" />,
    }),
    columnHelper.display({
      id: 'entity_admin',
      header: 'Entity Admin',
      size: 220,
      cell: ({ row }) => (
        <TruncatedCell
          value={row.original.entity_admin_email ?? row.original.entity_admin?.email ?? row.original.entityAdmin?.email}
          maxWidth="200px"
        />
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 140,
      cell: (info) => <StatusToggle entity={info.row.original} />,
    }),
    columnHelper.accessor('created_at', {
      header: 'Created Date',
      size: 140,
      cell: (info) => formatDate(info.getValue()),
    }),
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={canManageEntities ? 'Entity Management' : 'My Entity'}
        description={canManageEntities ? 'Create Entities and assign them to Entity Admins' : 'Read-only view of the Entities assigned to you'}
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search entities…"
                className="pl-9 w-[250px] h-9 text-sm bg-white"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              />
            </div>
            <FilterToggleButton
              isOpen={filtersOpen}
              onToggle={() => setFiltersOpen((prev) => !prev)}
              activeCount={statusFilter !== 'all' ? 1 : 0}
            />
            {canManageEntities && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate(ROUTES.ENTITY_NEW)}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Entity
              </Button>
            )}
          </div>
        }
      />

      <FilterPanel isOpen={filtersOpen} maxHeightClass="max-h-[160px]">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Status</Label>
          <div className="flex items-center rounded-md border overflow-hidden h-9 text-sm bg-white">
            {[
              { label: 'All', value: 'all' },
              { label: 'Active', value: 'active' },
              { label: 'Inactive', value: 'inactive' },
            ].map(({ label, value }) => (
              <button
                key={value}
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
        data={entities}
        isLoading={isPending}
        toolbar={null}
        pagination={
          meta.total != null
            ? {
                page: meta.page ?? page,
                limit: meta.limit ?? limit,
                total: meta.total,
              }
            : undefined
        }
        sorting={sorting}
        onSortingChange={(s) => { setSorting(s); setPage(1); }}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
        onRowClick={canManageEntities ? (row) => navigate(buildPath(ROUTES.ENTITY_EDIT, { id: row.id })) : undefined}
        emptyState={
          // A freshly-created Admin/Entity Admin legitimately has zero Entities yet — this is
          // not an error state (§1 gotcha).
          !search && statusFilter === 'all' ? (
            <EmptyState
              title={canManageEntities ? 'No Entities yet' : 'No Entities assigned to you yet'}
              description={
                canManageEntities
                  ? 'Create one to get started.'
                  : 'Once an Admin assigns an Entity to you, it will show up here.'
              }
              action={canManageEntities ? { label: 'Add Entity', icon: Plus, onClick: () => navigate(ROUTES.ENTITY_NEW) } : undefined}
            />
          ) : undefined
        }
      />

      <Outlet />
    </div>
  );
};

export default EntityList;
