import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Pencil, Eye } from 'lucide-react';
import { useServicePOs } from '@/hooks/useServicePOs';
import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { buildPath, ROUTES } from '@/constants/routes';
import { SERVICE_TYPES } from '@/constants/serviceTypes';
import { formatCurrency, formatDate } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const columnHelper = createColumnHelper();

const serviceTypeMap = Object.fromEntries(SERVICE_TYPES.map((t) => [t.id, t.name]));

const ServicePOList = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('');

  const debouncedSearch = useDebounce(search, 400);
  const debouncedClient = useDebounce(clientFilter, 400);

  const canManage = hasRole('Finance', 'Management');

  const params = {
    page,
    limit,
    ...(statusFilter !== 'all' && { status: statusFilter }),
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(debouncedClient && { client: debouncedClient }),
  };

  const { data, isPending } = useServicePOs(params);

  const servicePOs = data?.data ?? [];
  const meta = data?.meta ?? {};

  const columns = [
    columnHelper.accessor('service_po_code', {
      header: 'PO Code',
      size: 130,
      cell: (info) => (
        <span className="font-mono text-xs font-semibold text-muted-foreground">
          {info.getValue()}
        </span>
      ),
    }),
    columnHelper.accessor('service_po_name', {
      header: 'PO Name',
      cell: (info) => <span className="font-medium">{info.getValue()}</span>,
    }),
    columnHelper.accessor('client_name', {
      header: 'Client',
      cell: (info) =>
        info.getValue() ? (
          info.getValue()
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    }),
    columnHelper.accessor('service_type_id', {
      header: 'Service Type',
      size: 150,
      cell: (info) => serviceTypeMap[info.getValue()] ?? <span className="text-muted-foreground">—</span>,
    }),
    columnHelper.accessor('account_manager', {
      header: 'Account Manager',
      size: 150,
      cell: (info) => info.getValue() || <span className="text-muted-foreground">—</span>,
    }),
    columnHelper.accessor('service_description', {
      header: 'Description',
      cell: (info) => info.getValue()
        ? <span className="line-clamp-2 text-xs text-muted-foreground">{info.getValue()}</span>
        : <span className="text-muted-foreground">—</span>,
    }),
    columnHelper.accessor('po_value', {
      header: 'PO Value',
      size: 120,
      cell: (info) =>
        info.getValue() != null ? (
          formatCurrency(info.getValue())
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    }),
    columnHelper.accessor('invoice_frequency', {
      header: 'Invoice Freq.',
      size: 130,
      cell: (info) => info.getValue() || <span className="text-muted-foreground">—</span>,
    }),
    columnHelper.accessor('invoiced_amount', {
      header: 'Invoiced Amount',
      size: 140,
      cell: (info) =>
        info.getValue() != null ? (
          <span className="tabular-nums font-medium">{formatCurrency(info.getValue())}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    }),
    columnHelper.accessor('start_date', {
      header: 'Start Date',
      size: 110,
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor('end_date', {
      header: 'End Date',
      size: 110,
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 110,
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
    columnHelper.display({
      id: 'actions',
      size: 96,
      cell: ({ row }) => (
        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          {canManage && (
            <Button
              variant="ghost"
              size="icon-sm"
              title="Edit"
              onClick={() => navigate(buildPath(ROUTES.SERVICE_PO_EDIT, { id: row.original.id }))}
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
          )}
          <Button
            variant="ghost"
            size="icon-sm"
            title="View Detail"
            onClick={() => navigate(buildPath(ROUTES.SERVICE_PO_DETAIL, { id: row.original.id }))}
          >
            <Eye className="h-3.5 w-3.5" />
          </Button>
        </div>
      ),
    }),
  ];

  return (
    <div>
      <PageHeader
        title="Service POs"
        description="Manage service purchase orders"
        actions={
          canManage && (
            <Button size="sm" onClick={() => navigate(ROUTES.SERVICE_PO_NEW)}>
              <Plus className="mr-1.5 h-4 w-4" />
              Add Service PO
            </Button>
          )
        }
      />

      <DataTable
        columns={columns}
        data={servicePOs}
        isLoading={isPending}
        searchValue={search}
        onSearchChange={(v) => { setSearch(v); setPage(1); }}
        searchPlaceholder="Search POs…"
        toolbar={
          <>
            <Input
              placeholder="Filter by client…"
              value={clientFilter}
              onChange={(e) => { setClientFilter(e.target.value); setPage(1); }}
              className="h-9 w-40 text-sm"
            />
            <Select
              value={statusFilter}
              onValueChange={(v) => { setStatusFilter(v); setPage(1); }}
            >
              <SelectTrigger className="h-9 w-36 text-sm">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All status</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="closed">Closed</SelectItem>
                <SelectItem value="cancelled">Cancelled</SelectItem>
              </SelectContent>
            </Select>
          </>
        }
        pagination={
          meta.total != null
            ? {
                page: meta.page ?? page,
                limit: meta.limit ?? limit,
                total: meta.total,
              }
            : undefined
        }
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
        onRowClick={(row) => navigate(buildPath(ROUTES.SERVICE_PO_DETAIL, { id: row.id }))}
      />
    </div>
  );
};

export default ServicePOList;
