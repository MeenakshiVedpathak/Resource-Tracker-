import { useState, useMemo } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, Search } from 'lucide-react';
import { useUsers, useDeleteUser } from '@/hooks/useUsers';
import { useRoles } from '@/hooks/useRoles';
import { useAuth } from '@/hooks/useAuth';
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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const columnHelper = createColumnHelper();

const TruncatedCell = ({ value, maxWidth = '150px', className }) => {
  if (!value) return <span className="text-sm text-muted-foreground">—</span>;
  return (
    <div className={cn("text-sm truncate", className)} style={{ maxWidth }} title={value}>
      {value}
    </div>
  );
};

const UserList = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { success, error: showError } = useNotification();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [roleFilter, setRoleFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const debouncedSearch = useDebounce(search, 400);
  const isHR = hasRole('HR', 'Management');

  const params = {
    page,
    limit,
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(roleFilter !== 'all' && { role_id: roleFilter }),
    ...(debouncedSearch && { search: debouncedSearch }),
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
      size: 180,
      meta: { sticky: true, left: 0 },
      cell: ({ row }) => (
        isHR ? (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              onClick={() => navigate(buildPath(ROUTES.USER_EDIT, { id: row.original.id }))}
              className="h-6 px-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-normal text-[11px] transition-colors"
            >
              <Pencil className="h-3 w-3 mr-1" /> Edit
            </Button>
            <Button
              size="sm"
              className="h-6 px-2 bg-red-500 hover:bg-red-600 text-white rounded font-normal text-[11px] transition-colors"
              title="Delete"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              onClick={() => navigate(buildPath(ROUTES.USER_EDIT, { id: row.original.id }))}
              className="h-6 px-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-normal text-[11px] transition-colors"
            >
              <Pencil className="h-3 w-3 mr-1" /> Edit
            </Button>
          </div>
        )
      ),
    }),
    columnHelper.accessor('email', {
      header: 'Email',
      size: 250,
      meta: { sticky: true, left: 180 },
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
      size: 100,
      cell: (info) => <StatusBadge status={info.getValue()} />,
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
            {isHR && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate(ROUTES.USER_NEW)}>
                <Plus className="mr-1.5 h-4 w-4" /> Add User
              </Button>
            )}
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={users}
        isLoading={isPending}
        toolbar={
          <>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-32 text-sm bg-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-36 text-sm bg-white">
                <SelectValue placeholder="All roles" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All roles</SelectItem>
                {roles.map((r) => (
                  <SelectItem key={r.id} value={String(r.id)}>{r.role_name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </>
        }
        pagination={
          meta.total != null
            ? {
              page: meta.current_page ?? page,
              limit: meta.per_page ?? limit,
              total: meta.total,
            }
            : undefined
        }
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
        onRowClick={(row) => navigate(buildPath(ROUTES.USER_EDIT, { id: row.id }))}
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
