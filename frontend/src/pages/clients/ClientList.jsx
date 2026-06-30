import { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useClients, useDeleteClient } from '@/hooks/useClients';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';
import { useDebounce } from '@/hooks/useDebounce';
import { extractApiError } from '@/services/apiClient';
import { buildPath, ROUTES } from '@/constants/routes';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
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

const ClientList = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { success, error: showError } = useNotification();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);

  const debouncedSearch = useDebounce(search, 400);
  const canManage = hasRole('Project Manager', 'HR', 'Management');

  const params = {
    page,
    limit,
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { data, isPending } = useClients(params);
  const deleteMutation = useDeleteClient();

  const clients = data?.data ?? [];
  const meta = data?.meta ?? {};

  const columns = [
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 180,
      meta: { sticky: true, left: 0 },
      cell: ({ row }) =>
        canManage ? (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              onClick={() => navigate(buildPath(ROUTES.CLIENT_EDIT, { id: row.original.id }))}
              className="h-6 px-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-normal text-[11px] transition-colors"
            >
              <Pencil className="h-3 w-3 mr-1" /> Edit
            </Button>
            <Button
              size="sm"
              className="h-6 px-2 bg-red-500 hover:bg-red-600 text-white rounded font-normal text-[11px] transition-colors"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          </div>
        ) : (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate(buildPath(ROUTES.CLIENT_EDIT, { id: row.original.id }))}
              className="h-7 w-7 text-blue-600 hover:text-blue-700 hover:bg-blue-50 rounded"
              title="Edit"
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        ),
    }),
    columnHelper.accessor('client_name', {
      header: 'Client Name',
      size: 250,
      meta: { sticky: true, left: 150 },
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="230px" className="font-medium" />,
    }),
    columnHelper.accessor('industry', {
      header: 'Industry',
      size: 250,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="230px" />,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 120,
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
  ];

  const handleDelete = () => {
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        success(`${deleteTarget.client_name} has been deleted.`);
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
        title="Clients"
        description="Manage client accounts"
        actions={
          canManage && (
            <Button size="sm" onClick={() => navigate(ROUTES.CLIENT_NEW)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Client
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={clients}
        isLoading={isPending}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search clients…"
        toolbar={
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
        onRowClick={(row) => navigate(buildPath(ROUTES.CLIENT_EDIT, { id: row.id }))}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete client?"
        description={`${deleteTarget?.client_name} will be permanently deleted.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />

      <Outlet />
    </div>
  );
};

export default ClientList;
