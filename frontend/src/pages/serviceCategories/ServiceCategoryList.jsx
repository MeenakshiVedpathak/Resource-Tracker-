import { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, Search, Filter } from 'lucide-react';
import { useServiceCategories, useDeleteServiceCategory } from '@/hooks/useServiceCategories';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { buildPath, ROUTES } from '@/constants/routes';
import { formatDate } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
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

const ServiceCategoryList = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { success, showError } = useNotification();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  const canManage = hasRole('Finance', 'Management');

  const [sorting, setSorting] = useState([]);

  const params = {
    page,
    limit,
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(sorting[0] && { sortBy: sorting[0].id, sortOrder: sorting[0].desc ? 'desc' : 'asc' }),
  };

  const { data, isPending } = useServiceCategories(params);
  const deleteMutation = useDeleteServiceCategory();

  const handleDelete = () => {
    if (!deleteTarget) return;
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        success('Service category deleted successfully.');
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
              onClick={() => navigate(buildPath(ROUTES.SERVICE_CATEGORY_EDIT, { id: row.original.id }))}
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
    columnHelper.accessor('name', {
      header: 'Category Name',
      size: 300,
      meta: { sticky: true, left: 90 },
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="280px" className="font-medium" />,
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 110,
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
        title="Service Categories"
        description="Manage service category master data"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search categories…"
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
              {statusFilter !== 'all' && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  1
                </span>
              )}
            </Button>
            {canManage && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate(ROUTES.SERVICE_CATEGORY_NEW)}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Category
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
        data={paginatedRows}
        isLoading={isPending}
        toolbar={null}
        pagination={{
          page: meta.current_page ?? page,
          limit: meta.per_page ?? limit,
          total: total
        }}
        sorting={sorting}
        onSortingChange={(s) => { setSorting(s); setPage(1); }}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Service Category"
        description={`Are you sure you want to delete the category "${deleteTarget?.name}"? This action cannot be undone.`}
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
        confirmLabel="Delete"
        variant="destructive"
      />

      <Outlet />
    </div>
  );
};

export default ServiceCategoryList;
