import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Pencil } from 'lucide-react';
import { useServiceCategories } from '@/hooks/useServiceCategories';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { buildPath, ROUTES } from '@/constants/routes';
import { formatDate } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const columnHelper = createColumnHelper();

const ServiceCategoryList = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);

  const debouncedSearch = useDebounce(search, 400);
  const canManage = hasRole('Finance', 'Management');

  const params = {
    page,
    limit,
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { data, isPending } = useServiceCategories(params);

  const rows = Array.isArray(data?.data) ? data.data : [];
  const meta = data?.meta ?? {};

  const columns = [
    columnHelper.accessor('name', {
      header: 'Category Name',
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
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
    columnHelper.display({
      id: 'actions',
      size: 60,
      cell: ({ row }) =>
        canManage ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Edit"
              onClick={() => navigate(buildPath(ROUTES.SERVICE_CATEGORY_EDIT, { id: row.original.id }))}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null,
    }),
  ];

  return (
    <div>
      <PageHeader
        title="Service Categories"
        description="Manage service category master data"
        actions={
          canManage && (
            <Button size="sm" onClick={() => navigate(ROUTES.SERVICE_CATEGORY_NEW)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Category
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={rows}
        isLoading={isPending}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search categories…"
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
            ? { page: meta.page ?? page, limit: meta.limit ?? limit, total: meta.total }
            : undefined
        }
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
      />
    </div>
  );
};

export default ServiceCategoryList;
