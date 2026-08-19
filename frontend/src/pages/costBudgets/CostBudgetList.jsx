import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Pencil, Ban } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import FilterToggleButton from '@/components/common/FilterToggleButton';
import FilterPanel from '@/components/common/FilterPanel';
import DataTable from '@/components/common/DataTable';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import CostBudgetEntrySheet from './CostBudgetEntrySheet';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useCostBudgets, useDeactivateCostBudget } from '@/hooks/useCostBudgets';
import { useCanWrite } from '@/hooks/usePermissions';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { formatCurrency, formatMonthYear, formatDate, getStatusColor } from '@/utils/formatters';
import { toApiMonth, fromApiMonth } from '@/utils/monthApi';

const columnHelper = createColumnHelper();

const CostBudgetList = () => {
  const [servicePoFilter, setServicePoFilter] = useState('all');
  const [monthFilter, setMonthFilter] = useState(null);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [sheetOpen, setSheetOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  const canManage = useCanWrite();
  const { success, error: showError } = useNotification();

  const { data: servicePos = [], isPending: isServicePosLoading } = useActiveServicePOs();

  const params = {
    ...(servicePoFilter !== 'all' && { service_po_id: servicePoFilter }),
    ...(monthFilter && { month: toApiMonth(monthFilter) }),
  };
  const { data: records = [], isPending } = useCostBudgets(params);
  const deactivateMutation = useDeactivateCostBudget();

  const activeFilterCount = [servicePoFilter !== 'all', !!monthFilter].filter(Boolean).length;

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
    columnHelper.accessor('service_po_name', {
      header: 'Service PO',
      cell: (info) => (
        <div className="text-sm font-medium">
          {info.getValue()}
          {info.row.original.service_po_code && (
            <span className="ml-1 font-normal text-xs text-muted-foreground">({info.row.original.service_po_code})</span>
          )}
        </div>
      ),
    }),
    columnHelper.accessor((row) => row.client?.client_name, {
      id: 'client',
      header: 'Client',
      cell: (info) => info.getValue() ?? <span className="text-muted-foreground">—</span>,
    }),
    columnHelper.accessor((row) => fromApiMonth(row.month), {
      id: 'month',
      header: 'Month',
      cell: (info) => {
        const p = info.getValue();
        return <span className="text-sm">{formatMonthYear(p?.month, p?.year)}</span>;
      },
    }),
    columnHelper.accessor('invoice_amount', {
      header: 'Invoice Amount',
      cell: (info) => <span className="tabular-nums text-sm font-medium">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.accessor('description', {
      header: 'Description',
      cell: (info) => (
        <span className="text-sm text-muted-foreground">{info.getValue() || '—'}</span>
      ),
    }),
    columnHelper.accessor('status', {
      header: 'Status',
      size: 100,
      cell: (info) => <Badge variant={getStatusColor(info.getValue())}>{info.getValue()}</Badge>,
    }),
    columnHelper.accessor('updated_at', {
      header: 'Updated',
      size: 130,
      cell: (info) => <span className="text-xs text-muted-foreground">{formatDate(info.getValue())}</span>,
    }),
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cost Budget"
        description="Monthly invoice amount budgeted per Service PO"
        actions={
          <div className="flex items-center gap-2">
            <FilterToggleButton
              isOpen={filtersOpen}
              onToggle={() => setFiltersOpen((prev) => !prev)}
              activeCount={activeFilterCount}
            />
            {canManage && (
              <Button size="sm" className="gap-1.5" onClick={openCreate}>
                <Plus className="h-4 w-4" /> Add Cost Budget
              </Button>
            )}
          </div>
        }
      />

      <FilterPanel isOpen={filtersOpen} maxHeightClass="max-h-[100px]" gridClassName="grid-cols-1 sm:grid-cols-2 gap-4 w-full">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Service PO</Label>
          <SearchableSelect
            options={[
              { label: 'All Service POs', value: 'all' },
              ...servicePos.map((po) => ({ label: po.service_po_name || po.service_po_code || String(po.id), value: String(po.id) })),
            ]}
            value={servicePoFilter}
            onValueChange={setServicePoFilter}
            placeholder="All Service POs"
            searchPlaceholder="Search Service PO..."
            className="h-9 w-full text-sm bg-white"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Month</Label>
          <MonthYearPicker value={monthFilter} onChange={setMonthFilter} placeholder="All months" className="w-full" />
        </div>
      </FilterPanel>

      <DataTable
        columns={columns}
        data={records}
        isLoading={isPending}
        toolbar={null}
        rowClassName={(r) => (r.status !== 'active' ? 'opacity-50' : '')}
      />

      <CostBudgetEntrySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        initialData={editTarget}
        servicePos={servicePos}
        isServicePosLoading={isServicePosLoading}
      />

      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title="Deactivate Cost Budget"
        description={`Deactivate the ${deactivateTarget ? formatMonthYear(fromApiMonth(deactivateTarget.month)?.month, fromApiMonth(deactivateTarget.month)?.year) : ''} cost budget for "${deactivateTarget?.service_po_name}"? It will be hidden from active views.`}
        confirmLabel="Deactivate"
        onConfirm={handleDeactivate}
        isLoading={deactivateMutation.isPending}
      />
    </div>
  );
};

export default CostBudgetList;
