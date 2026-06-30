import { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { useServiceTypes, useDeleteServiceType } from '@/hooks/useServiceTypes';
import { useActiveServiceCategories } from '@/hooks/useServiceCategories';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { buildPath, ROUTES } from '@/constants/routes';
import { formatDate } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
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

const ServiceTypeList = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { success, showError } = useNotification();

  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const debouncedSearch = useDebounce(search, 400);
  const canManage = hasRole('Finance', 'Management');

  const { data: serviceCategories = [] } = useActiveServiceCategories();
  const categoryMap = Object.fromEntries(serviceCategories.map((c) => [c.id, c.name]));

  const params = {
    page,
    limit,
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { data, isPending } = useServiceTypes(params);
  const deleteMutation = useDeleteServiceType();
  const [deleteTarget, setDeleteTarget] = useState(null);

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        success('Service type deleted successfully.');
        setDeleteTarget(null);
      },
      onError: (err) => {
        showError(extractApiError(err));
        setDeleteTarget(null);
      },
    });
  };

  const rows = Array.isArray(data?.data) ? data.data : [];
  const meta = data?.meta ?? {};

  // Since backend doesn't support pagination for service types, we slice it client-side
  const total = meta.total ?? rows.length;
  const paginatedRows = rows.slice((page - 1) * limit, page * limit);

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
              onClick={() => navigate(buildPath(ROUTES.SERVICE_TYPE_EDIT, { id: row.original.id }))}
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
        ) : null,
    }),
    columnHelper.accessor('service_type_name', {
      header: 'Service Type Name',
      size: 300,
      meta: { sticky: true, left: 90 },
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="280px" className="font-medium" />,
    }),
    columnHelper.accessor('service_category_id', {
      header: 'Service Category',
      size: 250,
      cell: (info) =>
        categoryMap[info.getValue()] ? (
          <TruncatedCell value={categoryMap[info.getValue()]} maxWidth="230px" />
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
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
    <div>
      <PageHeader
        title="Service Types"
        description="Manage service type master data"
        actions={
          canManage && (
            <Button size="sm" onClick={() => navigate(ROUTES.SERVICE_TYPE_NEW)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Service Type
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={paginatedRows}
        isLoading={isPending}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search service types…"
        pagination={{
          page: meta.current_page ?? page,
          limit: meta.per_page ?? limit,
          total: total
        }}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Service Type"
        description={`Are you sure you want to delete the service type "${deleteTarget?.service_type_name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
        confirmLabel="Delete"
        variant="destructive"
      />

      <Outlet />
    </div>
  );
};

export default ServiceTypeList;
