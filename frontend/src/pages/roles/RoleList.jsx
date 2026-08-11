import { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Pencil, Layers, Trash2, Plus, Search, Filter } from 'lucide-react';
import { useRoles, useDeleteRole } from '@/hooks/useRoles';
import { useCanWrite, useHasForm } from '@/hooks/usePermissions';
import { useNotification } from '@/hooks/useNotification';
import { useDebounce } from '@/hooks/useDebounce';
import { extractApiError } from '@/services/apiClient';
import { buildPath, ROUTES } from '@/constants/routes';
import { FORM_NAMES } from '@/constants/rbacForms';
import { formatDate } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const RoleList = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);

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
  const deleteMutation = useDeleteRole();

  const roles = data?.data ?? [];
  const meta = data?.meta ?? {};

  const handleDelete = () => {
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        success(`${deleteTarget.role_name} has been deleted.`);
        setDeleteTarget(null);
      },
      onError: (err) => {
        showError(extractApiError(err));
        setDeleteTarget(null);
      },
    });
  };

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
            {canWrite && (
              <Button
                size="sm"
                title={isSystem ? 'System role — cannot be deleted' : 'Delete'}
                disabled={isSystem}
                onClick={() => setDeleteTarget(row.original)}
                className="h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded transition-colors disabled:opacity-40"
              >
                <Trash2 className="h-3 w-3" />
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
      size: 100,
      cell: (info) => <StatusBadge status={info.getValue()} />,
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
            <Button
              size="sm"
              className="gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setFiltersOpen((prev) => !prev)}
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {canWrite && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate(ROUTES.ROLE_NEW)}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Role
              </Button>
            )}
          </div>
        }
      />

      {/* Collapsible filter panel */}
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${filtersOpen ? 'max-h-[160px] opacity-100 mb-2' : 'max-h-0 opacity-0 mb-0'}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full rounded-lg border bg-muted/30 p-4">
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
        </div>
      </div>

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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete role?"
        description={`${deleteTarget?.role_name} will be permanently deleted. This can't be undone, and it's blocked if the role is still assigned to any user.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />

      <Outlet />
    </div>
  );
};

export default RoleList;
