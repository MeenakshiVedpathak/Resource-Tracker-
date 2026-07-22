import { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import * as XLSX from 'xlsx';
import { Plus, Pencil, Trash2, Search, Filter, Download } from 'lucide-react';
import { useServiceTypes, useDeleteServiceType } from '@/hooks/useServiceTypes';
import { useActiveServiceCategories } from '@/hooks/useServiceCategories';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { buildPath, ROUTES } from '@/constants/routes';
import { formatDate } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { cn } from '@/utils/cn';

const columnHelper = createColumnHelper();

const exportToExcel = (rows, categoryMap) => {
  const header = ['Service Type Name', 'Service Category', 'Created'];
  const dataRows = rows.map((r) => [
    r.service_type_name ?? '',
    categoryMap[r.service_category_id] ?? '',
    r.created_at ? formatDate(r.created_at) : '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Service Types');
  XLSX.writeFile(wb, 'Service_Types.xlsx');
};

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
  const [limit, setLimit] = useState(10);
  const [categoryFilter, setCategoryFilter] = useState('all');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  const canManage = hasRole('Finance', 'Management');

  const { data: serviceCategories = [] } = useActiveServiceCategories();
  const categoryMap = Object.fromEntries(serviceCategories.map((c) => [c.id, c.name]));

  const [sorting, setSorting] = useState([]);

  const params = {
    page,
    limit,
    ...(categoryFilter !== 'all' && { service_category_id: categoryFilter }),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(sorting[0] && { sortBy: sorting[0].id, sortOrder: sorting[0].desc ? 'desc' : 'asc' }),
  };

  const { data, isPending } = useServiceTypes(params);
  const deleteMutation = useDeleteServiceType();

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

  const total = meta.total ?? rows.length;
  const paginatedRows = rows.slice((page - 1) * limit, page * limit);

  const handleExport = () => exportToExcel(rows, categoryMap);

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
              title="Edit"
              onClick={() => navigate(buildPath(ROUTES.SERVICE_TYPE_EDIT, { id: row.original.id }))}
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
    <div className="space-y-4">
      <PageHeader
        title="Service Types"
        description="Manage service type master data"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search service types…"
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
              {categoryFilter !== 'all' && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  1
                </span>
              )}
            </Button>
            {rows.length > 0 && (
              <Button variant="outline" size="sm" className="h-9 gap-1.5" onClick={handleExport}>
                <Download className="h-4 w-4" /> Export Excel
              </Button>
            )}
            {canManage && (
              <Button size="sm" className="bg-blue-600 hover:bg-blue-700 text-white" onClick={() => navigate(ROUTES.SERVICE_TYPE_NEW)}>
                <Plus className="mr-1.5 h-4 w-4" /> Add Service Type
              </Button>
            )}
          </div>
        }
      />

      {/* Collapsible filter panel */}
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${filtersOpen ? 'max-h-[160px] opacity-100 mb-2' : 'max-h-0 opacity-0 mb-0'}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full rounded-lg border bg-muted/30 p-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Service Category</Label>
            <SearchableSelect
              options={[
                { label: "All Categories", value: "all" },
                ...serviceCategories.map((cat) => ({
                  label: cat.name,
                  value: String(cat.id)
                }))
              ]}
              value={categoryFilter}
              onValueChange={(v) => { setCategoryFilter(v); setPage(1); }}
              placeholder="All Categories"
              searchPlaceholder="Search category..."
              className="h-9 w-full text-sm bg-white"
            />
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
