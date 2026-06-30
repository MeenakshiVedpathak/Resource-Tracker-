import { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Pencil, Eye, Trash2 } from 'lucide-react';
import { useServicePOs, useDeleteServicePO } from '@/hooks/useServicePOs';

import { useAuth } from '@/hooks/useAuth';
import { useDebounce } from '@/hooks/useDebounce';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { buildPath, ROUTES } from '@/constants/routes';
import { formatCurrency, formatDate } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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
  const { success, error: showError } = useNotification();
  const [deleteTarget, setDeleteTarget] = useState(null);
  const deleteMutation = useDeleteServicePO();

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
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 250,
      meta: { sticky: true, left: 0 },
      cell: ({ row }) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          <Button
            size="sm"
            onClick={() => navigate(buildPath(ROUTES.SERVICE_PO_DETAIL, { id: row.original.id }))}
            className="h-6 px-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-normal text-[11px] transition-colors"
          >
            <Eye className="h-3 w-3 mr-1" /> View
          </Button>
          {canManage && (
            <>
              <Button
                size="sm"
                onClick={() => navigate(buildPath(ROUTES.SERVICE_PO_EDIT, { id: row.original.id }))}
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
            </>
          )}
        </div>
      ),
    }),

    columnHelper.accessor('service_po_code', {
      header: 'PO Code',
      size: 180,
      meta: { sticky: true, left: 250 },
      cell: (info) => (
        <div className="font-mono text-xs font-semibold text-muted-foreground truncate" style={{ maxWidth: "160px" }} title={info.getValue()}>
          {info.getValue()}
        </div>
      ),
    }),
    columnHelper.accessor('service_po_name', {
      header: 'PO Name',
      size: 300,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="280px" className="font-medium" />,
    }),
    columnHelper.accessor('client.client_name', {
      header: 'Client',
      size: 220,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="200px" />,
    }),
    columnHelper.accessor('serviceType.service_type_name', {
      header: 'Service Type',
      size: 220,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="200px" />,
    }),
    columnHelper.accessor('account_manager', {
      header: 'Account Manager',
      size: 180,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="160px" />,
    }),
    columnHelper.accessor('service_description', {
      header: 'Description',
      size: 300,
      cell: (info) => <TruncatedCell value={info.getValue()} maxWidth="280px" className="text-muted-foreground" />,
    }),
    columnHelper.accessor('po_value', {
      header: 'PO Value',
      size: 160,
      cell: (info) =>
        info.getValue() != null ? (
          formatCurrency(info.getValue())
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    }),
    columnHelper.accessor('invoice_frequency', {
      header: 'Invoice Freq.',
      size: 160,
      cell: (info) => info.getValue() || <span className="text-muted-foreground">—</span>,
    }),
    columnHelper.accessor('invoice_amount', {
      header: 'Invoice Amount',
      size: 160,
      cell: (info) =>
        info.getValue() != null ? (
          <span className="tabular-nums font-medium">{formatCurrency(info.getValue())}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    }),
    columnHelper.accessor('start_date', {
      header: 'Start Date',
      size: 130,
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor('end_date', {
      header: 'End Date',
      size: 130,
      cell: (info) => formatDate(info.getValue()),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 160,
      cell: (info) => <StatusBadge status={info.getValue()} />,
    }),
  ];

  const handleDelete = () => {
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        success('Service PO deleted successfully.');
        setDeleteTarget(null);
      },
      onError: (err) => {
        showError(extractApiError(err));
      },
    });
  };

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

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete Service PO?"
        description={`Are you sure you want to delete ${deleteTarget?.service_po_code}? This action cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />

      <Outlet />
    </div>
  );
};

export default ServicePOList;
