import { useMemo, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Pencil, Ban, Building2 } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import DataTable from '@/components/common/DataTable';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import CostBudgetEntrySheet from './CostBudgetEntrySheet';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useCostBudgetsByServicePo, useDeactivateCostBudget } from '@/hooks/useCostBudgets';
import { useCanWrite } from '@/hooks/usePermissions';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { formatCurrency, formatMonthYear, formatDate, getStatusColor } from '@/utils/formatters';
import { fromApiMonth } from '@/utils/monthApi';

const columnHelper = createColumnHelper();

const CostBudgetList = () => {
  const [servicePoId, setServicePoId] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  const canManage = useCanWrite();
  const { success, error: showError } = useNotification();

  const { data: servicePos = [] } = useActiveServicePOs();
  const selectedPo = servicePos.find((po) => String(po.id) === servicePoId);

  // Every month ever saved for this PO (active + inactive) — the whole point of this screen is
  // to show all added months at once, not force picking one month at a time.
  const { data: records = [], isPending } = useCostBudgetsByServicePo(servicePoId);
  const deactivateMutation = useDeactivateCostBudget();

  // "YYYY-MM" sorts correctly as a plain string — most recent month first.
  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0)),
    [records]
  );

  const servicePoOptions = servicePos.map((po) => ({
    value: String(po.id),
    label: `${po.service_po_name}${po.service_po_code ? ` (${po.service_po_code})` : ''}`,
    searchValue: `${po.service_po_name} ${po.service_po_code ?? ''} ${po.client?.client_name ?? ''}`,
  }));

  const openCreate = () => {
    setEditTarget(null);
    setSheetOpen(true);
  };

  const openEdit = (record) => {
    setEditTarget(record);
    setSheetOpen(true);
  };

  const handleDeactivate = () => {
    if (!deactivateTarget) return;
    deactivateMutation.mutate(deactivateTarget.id, {
      onSuccess: () => {
        success('Cost budget deactivated.');
        setDeactivateTarget(null);
      },
      onError: (err) => {
        showError(extractApiError(err));
        setDeactivateTarget(null);
      },
    });
  };

  const columns = [
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 90,
      cell: ({ row }) => {
        if (!canManage) return null;
        const record = row.original;
        return (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              title="Edit"
              onClick={() => openEdit(record)}
              className="h-6 w-6 p-0 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            >
              <Pencil className="h-3 w-3" />
            </Button>
            {record.status === 'active' && (
              <Button
                size="sm"
                title="Deactivate"
                onClick={() => setDeactivateTarget(record)}
                className="h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
              >
                <Ban className="h-3 w-3" />
              </Button>
            )}
          </div>
        );
      },
    }),
    columnHelper.accessor((row) => fromApiMonth(row.month), {
      id: 'month',
      header: 'Month',
      size: 150,
      cell: (info) => {
        const p = info.getValue();
        return <span className="text-sm font-medium whitespace-nowrap">{formatMonthYear(p?.month, p?.year)}</span>;
      },
    }),
    columnHelper.accessor('invoice_amount', {
      header: 'Invoice Amount',
      size: 160,
      cell: (info) => <span className="tabular-nums text-sm font-medium whitespace-nowrap">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.accessor('description', {
      header: 'Description',
      size: 240,
      cell: (info) => (
        <div className="truncate text-sm text-muted-foreground" title={info.getValue() || ''}>
          {info.getValue() || '—'}
        </div>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 100,
      cell: (info) => <Badge variant={getStatusColor(info.getValue())}>{info.getValue()}</Badge>,
    }),
    // columnHelper.accessor('updated_at', {
    //   header: 'Updated',
    //   size: 140,
    //   cell: (info) => <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(info.getValue())}</span>,
    // }),
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cost Budget"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SearchableSelect
              options={servicePoOptions}
              value={servicePoId}
              onValueChange={(v) => v && setServicePoId(v)}
              placeholder="Select a Service PO"
              searchPlaceholder="Search Service PO…"
              emptyMessage="No Service POs available."
              className="w-72 bg-white"
            />
            {canManage && servicePoId && (
              <Button size="sm" className="gap-1.5" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Add Cost Budget
              </Button>
            )}
          </div>
        }
      >
        {selectedPo?.client?.client_name && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" /> {selectedPo.client.client_name}
          </p>
        )}
      </PageHeader>

      {!servicePoId ? (
        <EmptyState
          title="Select a Service PO"
          description="Choose a Service PO above to see every month a cost budget has been added for it."
        />
      ) : (
        <DataTable
          columns={columns}
          data={sortedRecords}
          isLoading={isPending}
          toolbar={null}
          rowClassName={(r) => (r.status !== 'active' ? 'opacity-50' : '')}
          emptyState={
            <EmptyState
              title="No cost budgets yet"
              description="No months have been added for this Service PO yet."
              action={canManage ? { label: 'Add Cost Budget', icon: Plus, onClick: openCreate } : undefined}
            />
          }
        />
      )}

      <CostBudgetEntrySheet open={sheetOpen} onOpenChange={setSheetOpen} initialData={editTarget} servicePo={selectedPo} />

      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title="Deactivate Cost Budget"
        description={`Deactivate the ${deactivateTarget ? formatMonthYear(fromApiMonth(deactivateTarget.month)?.month, fromApiMonth(deactivateTarget.month)?.year) : ''} cost budget for "${selectedPo?.service_po_name ?? ''}"? It will be hidden from active views.`}
        confirmLabel="Deactivate"
        onConfirm={handleDeactivate}
        isLoading={deactivateMutation.isPending}
      />
    </div>
  );
};

export default CostBudgetList;
