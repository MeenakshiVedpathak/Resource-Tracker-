import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Pencil } from 'lucide-react';
import { useServiceTypes } from '@/hooks/useServiceTypes';
import { useActiveServiceCategories } from '@/hooks/useServiceCategories';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { buildPath, ROUTES } from '@/constants/routes';
import { formatDate } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';

const columnHelper = createColumnHelper();

const ServiceTypeList = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();

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

  const rows = Array.isArray(data?.data) ? data.data : [];
  const meta = data?.meta ?? {};

  const columns = [
    columnHelper.accessor('service_type_name', {
      header: 'Service Type Name',
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('service_category_id', {
      header: 'Service Category',
      size: 200,
      cell: (info) =>
        categoryMap[info.getValue()] ? (
          <span className="text-sm">{categoryMap[info.getValue()]}</span>
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
              onClick={() => navigate(buildPath(ROUTES.SERVICE_TYPE_EDIT, { id: row.original.id }))}
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
        data={rows}
        isLoading={isPending}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search service types…"
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

export default ServiceTypeList;
