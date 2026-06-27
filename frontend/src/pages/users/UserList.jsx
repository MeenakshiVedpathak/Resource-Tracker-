import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useUsers, useDeleteUser } from '@/hooks/useUsers';
import { useRoles } from '@/hooks/useRoles';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';
import { useDebounce } from '@/hooks/useDebounce';
import { extractApiError } from '@/services/apiClient';
import { buildPath, ROUTES } from '@/constants/routes';
import { formatDate } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';

const columnHelper = createColumnHelper();

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

  const columns = [
    columnHelper.accessor('email', {
      header: 'Email',
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('roles', {
      header: 'Roles',
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
      cell: (info) => {
        const emp = info.getValue();
        if (!emp) return <span className="text-muted-foreground">—</span>;
        const name = emp.full_name ?? emp;
        return (
          <button
            className="text-sm text-primary underline-offset-2 hover:underline"
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
    columnHelper.display({
      id: 'actions',
      size: 88,
      cell: ({ row }) =>
        isHR ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Edit"
              onClick={() => navigate(buildPath(ROUTES.USER_EDIT, { id: row.original.id }))}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Deactivate"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Edit"
              onClick={() => navigate(buildPath(ROUTES.USER_EDIT, { id: row.original.id }))}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
    }),
  ];

  const handleDelete = () => {
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        success(`${deleteTarget.email} will be deactivated.`);
        setDeleteTarget(null);
      },
      onError: (err) => {
        showError(extractApiError(err));
        setDeleteTarget(null);
      },
    });
  };

  return (
    <div>
      <PageHeader
        title="Users"
        description="Manage portal user accounts"
        actions={
          isHR && (
            <Button size="sm" onClick={() => navigate(ROUTES.USER_NEW)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add User
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={users}
        isLoading={isPending}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search by email…"
        toolbar={
          <>
            <Select value={statusFilter} onValueChange={(v) => { setStatusFilter(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-32 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="inactive">Inactive</SelectItem>
              </SelectContent>
            </Select>
            <Select value={roleFilter} onValueChange={(v) => { setRoleFilter(v); setPage(1); }}>
              <SelectTrigger className="h-9 w-36 text-sm">
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
        title="Deactivate user?"
        description={`${deleteTarget?.email} will be deactivated.`}
        confirmLabel="Deactivate"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />
    </div>
  );
};

export default UserList;
