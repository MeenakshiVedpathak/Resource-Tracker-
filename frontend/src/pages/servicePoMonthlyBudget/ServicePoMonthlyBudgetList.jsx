import { forwardRef, useEffect, useImperativeHandle, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { ChevronRight, ClipboardList, Plus } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import EmptyState from '@/components/common/EmptyState';
import { useServicePoMonthlyBudgetServicePOs } from '@/hooks/useServicePoMonthlyBudget';
import { useNotification } from '@/hooks/useNotification';
import { formatCurrency, formatDate, formatMonthYear, getStatusColor } from '@/utils/formatters';

const ServicePoMonthlyBudgetList = forwardRef(({
  month, year, records, isLoading, search = '', clientFilter = 'all', poFilterIds = null,
  onEdit, onAddEntry, canAddEntry = true, addEntryDisabledReason, onExportStateChange,
}, ref) => {
  const { success, error: showError } = useNotification();
  const { data: servicePos = [] } = useServicePoMonthlyBudgetServicePOs();

  const poMetaMap = useMemo(
    () => new Map(servicePos.map((po) => [String(po.service_po_id), po])),
    [servicePos]
  );

  const filteredRecords = useMemo(() => {
    const term = search.trim().toLowerCase();
    return records.filter((r) => {
      if (clientFilter !== 'all' && String(r.client?.id) !== clientFilter) return false;
      if (poFilterIds && !poFilterIds.has(r.service_po_id)) return false;
      if (!term) return true;
      return [r.service_po_name, r.service_po_code, r.client?.client_name]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(term));
    });
  }, [records, search, clientFilter, poFilterIds]);

  const handleExportExcel = () => {
    if (filteredRecords.length === 0) {
      showError('No data to export');
      return;
    }
    const exportData = filteredRecords.map((r) => ({
      'Service PO': r.service_po_name || '',
      'PO Code': r.service_po_code || '',
      'Client': r.client?.client_name || '',
      'Invoice Amount': Number(r.invoice_amount ?? 0),
      'Invoice Description': r.invoice_description || '',
      'Billable Amount': Number(r.billed_amount ?? 0),
      'Billable Remark': r.billed_remark || '',
      'Updated': formatDate(r.updated_at),
    }));
    const ws = XLSX.utils.json_to_sheet(exportData);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Monthly Budgets');
    XLSX.writeFile(wb, `Invoice_Master_${formatMonthYear(month, year).replace(/\s+/g, '_')}.xlsx`);
    success('Exported to Excel successfully');
  };

  const canExport = !isLoading && records.length > 0;

  useEffect(() => {
    onExportStateChange?.(canExport);
    return () => onExportStateChange?.(false);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canExport]);

  useImperativeHandle(ref, () => ({ exportExcel: handleExportExcel }));

  if (records.length === 0 && !isLoading) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState
          icon={ClipboardList}
          title="No budgets saved yet"
          description={`Nothing has been entered for ${formatMonthYear(month, year)} yet.`}
          action={onAddEntry ? {
            label: 'Add Entry',
            icon: Plus,
            onClick: onAddEntry,
            disabled: !canAddEntry,
            title: canAddEntry ? undefined : addEntryDisabledReason,
          } : undefined}
        />
      </div>
    );
  }

  if (!isLoading && filteredRecords.length === 0) {
    return (
      <div className="rounded-xl border bg-card">
        <EmptyState title="No records found" description="Try adjusting your search or filters." />
      </div>
    );
  }

  if (isLoading) {
    return (
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {Array.from({ length: 4 }).map((_, i) => (
          <div key={i} className="h-[220px] animate-pulse rounded-xl border bg-muted/40" />
        ))}
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {filteredRecords.map((r) => {
          const poMeta = poMetaMap.get(String(r.service_po_id));
          const statusLabel = poMeta?.is_billable ? 'Billable' : poMeta?.status || '—';
          const statusVariant = poMeta?.is_billable ? 'success' : getStatusColor(poMeta?.status);

          return (
            <button
              key={r.service_po_id}
              type="button"
              onClick={() => onEdit(r.service_po_id)}
              className="group flex flex-col rounded-xl border bg-card p-4 text-left shadow-card transition-colors hover:border-primary hover:shadow-md focus:outline-none focus:ring-2 focus:ring-ring"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex min-w-0 gap-3">
                  <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                    <ClipboardList className="h-4.5 w-4.5" />
                  </div>
                  <div className="min-w-0">
                    <p className="truncate font-semibold" title={r.service_po_name}>
                      {r.service_po_name || '—'}
                    </p>
                    <p className="truncate font-mono text-xs text-muted-foreground" title={r.service_po_code}>
                      {r.service_po_code ? `(${r.service_po_code})` : ''}
                    </p>
                  </div>
                </div>
                <ChevronRight className="mt-1 h-4 w-4 shrink-0 text-muted-foreground transition-transform group-hover:translate-x-0.5" />
              </div>

              <Separator className="my-3" />

              <div className="flex items-start justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Invoice Amount</p>
                  <p className="font-semibold tabular-nums">{formatCurrency(r.invoice_amount)}</p>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Billable Amount</p>
                  <p className="font-semibold tabular-nums">{formatCurrency(r.billed_amount)}</p>
                </div>
              </div>

              <div className="mt-3 flex items-end justify-between gap-3">
                <div>
                  <p className="text-xs text-muted-foreground">Status</p>
                  <Badge variant={statusVariant} className="mt-1 font-normal">{statusLabel}</Badge>
                </div>
                <div className="text-right">
                  <p className="text-xs text-muted-foreground">Client</p>
                  <p className="truncate text-sm font-medium" title={r.client?.client_name}>
                    {r.client?.client_name || '—'}
                  </p>
                </div>
              </div>

              <Separator className="my-3" />

              <div className="flex items-center justify-between text-xs text-muted-foreground">
                <span>Updated on {formatDate(r.updated_at, 'DD-MMM-YYYY')}</span>
                <ChevronRight className="h-3.5 w-3.5" />
              </div>
            </button>
          );
        })}

        {onAddEntry && (
          <button
            type="button"
            onClick={onAddEntry}
            disabled={!canAddEntry}
            title={canAddEntry ? undefined : addEntryDisabledReason}
            className="flex min-h-[220px] flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-4 text-muted-foreground transition-colors hover:border-primary hover:text-primary disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:border-border disabled:hover:text-muted-foreground"
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <Plus className="h-4.5 w-4.5" />
            </div>
            <span className="text-sm font-medium">Add Entry</span>
          </button>
        )}
      </div>

      <p className="text-center text-sm text-muted-foreground">
        Showing 1 to {filteredRecords.length} of {filteredRecords.length} entries
      </p>
    </div>
  );
});

ServicePoMonthlyBudgetList.displayName = 'ServicePoMonthlyBudgetList';

export default ServicePoMonthlyBudgetList;
