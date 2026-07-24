import { useState, useMemo } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, Search, Filter, Lock } from 'lucide-react';
import { useUsers, useDeleteUser, useToggleUserStatus } from '@/hooks/useUsers';
import { useRoles } from '@/hooks/useRoles';
import { useCanWrite } from '@/hooks/usePermissions';
import { isProtectedAccount } from '@/constants/protectedAccounts';
import { useNotification } from '@/hooks/useNotification';
import { useDebounce } from '@/hooks/useDebounce';
import { extractApiError } from '@/services/apiClient';
import { buildPath, ROUTES } from '@/constants/routes';
import { formatDate } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';

const columnHelper = createColumnHelper();

const TruncatedCell = ({ value, maxWidth = '150px', className }) => {
  if (!value) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <div className={cn("text-sm truncate", className)} style={{ maxWidth }} title={value}>
      {value}
    </div>
  );
};

const StatusToggle = ({ user }) => {
  const { mutate, isPending } = useToggleUserStatus();
  const isActive = user.status === 'active';
  const isProtected = isProtectedAccount(user.email);
  return (
    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
      <Switch
        checked={isActive}
        disabled={isPending || isProtected}
        onCheckedChange={(checked) =>
          mutate({ id: user.id, status: checked ? 'active' : 'inactive' })
        }
      />
      <span className={cn('text-xs font-medium', isActive ? 'text-green-600' : 'text-slate-400')}>
        {isActive ? 'Active' : 'Inactive'}
      </span>
    </div>
  );
};

const UserList = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  const isHR = useCanWrite();

  const [sorting, setSorting] = useState([]);

  const params = {
    page,
    limit,
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(roleFilter !== 'all' && { role_id: roleFilter }),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(sorting[0] && { sortBy: sorting[0].id, sortOrder: sorting[0].desc ? 'desc' : 'asc' }),
  };

  const { data, isPending } = useUsers(params);
  const { data: rolesData } = useRoles({ limit: 100 });
  const deleteMutation = useDeleteUser();

  const users = data?.data ?? [];
  const meta = data?.meta ?? {};
  const roles = rolesData?.data ?? [];

  const handleSearch = (e) => {
    setSearch(e.target.value);
    setPage(1);
  };

  const columns = useMemo(() => [
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 96,
      meta: { sticky: true, left: 0 },
      cell: ({ row }) => {
        if (isProtectedAccount(row.original.email)) {
          return (
            <div className="flex items-center gap-1 text-muted-foreground" onClick={(e) => e.stopPropagation()} title="Protected system account">
              <Lock className="h-3 w-3" />
            </div>
          );
        }
        return isHR ? (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              title="Edit"
              onClick={() => navigate(buildPath(ROUTES.USER_EDIT, { id: row.original.id }))}
              className="h-6 w-6 p-0 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            <Button
              size="sm"
              className="h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
              title="Delete"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              title="Edit"
              onClick={() => navigate(buildPath(ROUTES.USER_EDIT, { id: row.original.id }))}
              className="h-6 w-6 p-0 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            >
              <Pencil className="h-3 w-3" />
            </Button>
          </div>
        );
      },
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      size: 250,
      meta: { sticky: true, left: 96 },
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="220px" className="font-medium" />,
    }),
    columnHelper.accessor('roles', {
      header: 'Roles',
      size: 300,
      cell: (info) => {
        // backend may return roles (array) or role (single object)
        const raw = info.getValue();
        const row = info.row.original;
        const list = Array.isArray(raw) ? raw
          : Array.isArray(row.role) ? row.role
            : row.role ? [row.role]
              : [];
        if (!list.length) return <span className="text-muted-foreground">—</span>;
        return (
          <div className="flex flex-wrap gap-1">
            {list.map((r) => (
              <Badge key={r.id ?? r} variant="secondary" className="text-xs">
                {r.role_name ?? r.name ?? '—'}
              </Badge>
            ))}
          </div>
        );
      },
    }),
    columnHelper.accessor('employee', {
      header: 'Employee',
      size: 250,
      cell: (info) => {
        const emp = info.getValue();
        if (!emp) return <span className="text-muted-foreground">—</span>;
        const name = emp.full_name ?? emp;
        return (
          <button
            className="text-sm text-primary underline-offset-2 hover:underline truncate"
            style={{ maxWidth: '230px' }}
            onClick={(e) => {
              e.stopPropagation();
              if (emp.id) navigate(buildPath(ROUTES.EMPLOYEE_EDIT, { id: emp.id }));
            }}
          >
            {name}
          </button>
        );
      },
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 140,
      cell: (info) => <StatusToggle user={info.row.original} />,
    }),
    columnHelper.accessor('last_login', {
      header: 'Last Login',
      size: 140,
      cell: (info) => (
        <span className="text-xs text-muted-foreground">{formatDate(info.getValue())}</span>
      ),
    }),
  ], [navigate, isHR]);

  const handleDelete = () => {
    if (isProtectedAccount(deleteTarget?.email)) {
      showError('This account is protected and cannot be deleted.');
      setDeleteTarget(null);
      return;
    }
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        success(`${deleteTarget.email} will be Deleted.`);
        setDeleteTarget(null);
      },
      onError: (err) => {
        showError(extractApiError(err));
        setDeleteTarget(null);
      },
    });
  };

  const activeFilterCount = [
    statusFilter !== 'all' ? 1 : 0,
    roleFilter !== 'all' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div className="space-y-4">
      <PageHeader
        title="Users"
        description="Manage portal user accounts"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by email..."
                className="pl-9 w-[250px] h-9 text-sm bg-white"
                value={search}
                onChange={handleSearch}
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
            {isHR && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate(ROUTES.USER_NEW)}>
                <Plus className="mr-1.5 h-4 w-4" /> Add User
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
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Role</Label>
            <SearchableSelect
              options={[
                { label: "All roles", value: "all" },
                ...roles.map((r) => ({
                  label: r.role_name,
                  value: String(r.id)
                }))
              ]}
              value={roleFilter}
              onValueChange={(v) => { setRoleFilter(v); setPage(1); }}
              placeholder="All roles"
              searchPlaceholder="Search role..."
              className="h-9 w-full text-sm bg-white"
            />
          </div>
        </div>
      </div>

      <DataTable
        columns={columns}
        data={users}
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
        onRowClick={(row) => !isProtectedAccount(row.email) && navigate(buildPath(ROUTES.USER_EDIT, { id: row.id }))}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete user?"
        description={`${deleteTarget?.email} will be Deleted.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
      <Outlet />
    </div>
  );
};

export default UserList;
