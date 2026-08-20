import { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Pencil, Layers, Plus, Search } from 'lucide-react';
import { useRoles, useToggleRoleStatus } from '@/hooks/useRoles';
import { useCanWrite, useHasForm } from '@/hooks/usePermissions';
import { useDebounce } from '@/hooks/useDebounce';
import { buildPath, ROUTES } from '@/constants/routes';
import { FORM_NAMES } from '@/constants/rbacForms';
import { formatDate } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import FilterToggleButton from '@/components/common/FilterToggleButton';
import FilterPanel from '@/components/common/FilterPanel';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { SearchableSelect } from '@/components/ui/searchable-select';
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

const StatusToggle = ({ role }) => {
  const { mutate, isPending } = useToggleRoleStatus();
  const isActive = role.status === 'active';
  const isSystem = role.is_system;
  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Switch
        checked={isActive}
        disabled={isPending || isSystem}
        onCheckedChange={(checked) =>
          mutate({ id: role.id, status: checked ? 'active' : 'inactive' })
        }
      />
      <span className={cn('text-xs font-medium', isActive ? 'text-green-600' : 'text-slate-400')}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    </div>
  );
};

const RoleList = () => {
  const navigate = useNavigate();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  const canWrite = useCanWrite();
  // Managing role<->form mappings is its own grantable Administration capability on the
  // backend, distinct from just having write access to Roles — require both.
  const hasFormMappingAccess = useHasForm(FORM_NAMES.ROLE_FORM_MAPPING);
  const canManageFormMapping = canWrite && hasFormMappingAccess;

  const [sorting, setSorting] = useState([]);

  const params = {
    page,
    limit,
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(sorting[0] && { sortBy: sorting[0].id, sortOrder: sorting[0].desc ? 'desc' : 'asc' }),
  };

  const { data, isPending } = useRoles(params);

  const roles = data?.data ?? [];
  const meta = data?.meta ?? {};

  const activeFilterCount = [statusFilter !== 'all' ? 1 : 0].reduce((a, b) => a + b, 0);

  const columns = [
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 160,
      meta: { sticky: true, left: 0 },
      cell: ({ row }) => {
        const isSystem = row.original.is_system;
        if (!canWrite && !canManageFormMapping) return null;
        return (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            {canWrite && (
              <Button
                size="sm"
                title={isSystem ? 'System role — cannot be modified' : 'Edit'}
                disabled={isSystem}
                onClick={() => navigate(buildPath(ROUTES.ROLES + '/' + row.original.id + '/edit'))}
                className="h-6 w-6 p-0 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors disabled:opacity-40"
              >
                <Pencil className="h-3 w-3" />
              </Button>
            )}
            {canManageFormMapping && (
              <Button
                size="sm"
                title="Manage Forms"
                onClick={() => navigate(buildPath(ROUTES.ROLES + '/' + row.original.id + '/forms'))}
                className="h-6 w-6 p-0 bg-indigo-500 hover:bg-indigo-600 text-white rounded transition-colors"
              >
                <Layers className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor('role_name', {
      header: 'Role Name',
      size: 250,
      meta: { sticky: true, left: 160 },
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="230px" className="font-medium" />,
    }),
    columnHelper.accessor('hierarchy_rank', {
      header: 'Hierarchy Rank',
      size: 120,
      cell: (info) => {
        const val = info.getValue();
        return val != null
          ? <span className="text-sm tabular-nums">{val}</span>
          : <span className="text-sm text-muted-foreground">—</span>;
      },
    }),
    columnHelper.accessor('permission', {
      header: 'Permission',
      size: 140,
      cell: (info) => <span className="text-sm">{info.getValue()}</span>,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 140,
      cell: (info) => <StatusToggle role={info.row.original} />,
    }),
    columnHelper.accessor('created_at', {
      header: 'Created',
      size: 140,
      cell: (info) => (
        <span className="text-xs text-muted-foreground">{formatDate(info.getValue())}</span>
      ),
    }),
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Roles"
        description="Manage user roles and access levels"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search roles…"
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
            {canWrite && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate(ROUTES.ROLE_NEW)}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Role
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
        data={roles}
        isLoading={isPending}
        toolbar={null}
        pagination={
          meta.total != null
            ? {
                page: meta.current_page ?? page,
                limit: meta.per_page ?? limit,
                total: meta.total,
              }
            : undefined
        }
        sorting={sorting}
        onSortingChange={(s) => { setSorting(s); setPage(1); }}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
      />

      <Outlet />
    </div>
  );
};

export default RoleList;
