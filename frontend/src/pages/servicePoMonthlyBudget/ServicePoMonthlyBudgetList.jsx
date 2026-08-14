import { useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { ClipboardList, Pencil, Plus } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import DataTable from '@/components/common/DataTable';
import EmptyState from '@/components/common/EmptyState';
import { formatCurrency, formatDate, formatMonthYear } from '@/utils/formatters';

const REMARK_SEPARATOR = ' · ';
const columnHelper = createColumnHelper();

const ServicePoMonthlyBudgetList = ({
  month, year, records, isLoading, search = '', clientFilter = 'all', poFilterIds = null, onEdit, onAddEntry,
}) => {
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

  const totals = useMemo(
    () => filteredRecords.reduce(
      (acc, r) => ({
        invoice: acc.invoice + Number(r.invoice_amount ?? 0),
        billed: acc.billed + Number(r.billed_amount ?? 0),
      }),
      { invoice: 0, billed: 0 }
    ),
    [filteredRecords]
  );

  const columns = [
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 70,
      meta: { sticky: true, left: 0 },
      cell: ({ row }) => (
        <Button
          size="icon"
          variant="outline"
          className="h-7 w-7"
          onClick={() => onEdit(row.original.service_po_id)}
          aria-label="Edit"
        >
          <Pencil className="h-3.5 w-3.5" />
        </Button>
      ),
    }),
    columnHelper.accessor('service_po_name', {
      header: 'Service PO',
      size: 200,
      cell: (info) => (
        <div className="truncate font-medium max-w-[180px]" title={info.getValue()}>
          {info.getValue() || '—'}
        </div>
      ),
    }),
    columnHelper.accessor('service_po_code', {
      header: 'PO Code',
      size: 140,
      cell: (info) => (
        <span className="font-mono text-xs text-muted-foreground">{info.getValue() || '—'}</span>
      ),
    }),
    columnHelper.accessor('client.client_name', {
      header: 'Client',
      size: 160,
      cell: (info) => (
        <div className="truncate max-w-[140px]" title={info.getValue()}>{info.getValue() || '—'}</div>
      ),
    }),
    columnHelper.accessor('invoice_amount', {
      header: 'Invoice Amount',
      size: 140,
      meta: { align: 'right' },
      cell: (info) => <span className="tabular-nums">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.accessor('billed_amount', {
      header: 'Billable Amount',
      size: 140,
      meta: { align: 'right' },
      cell: (info) => <span className="tabular-nums">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.display({
      id: 'remark',
      header: 'Remark',
      size: 200,
      cell: ({ row }) => {
        const remark = [row.original.invoice_description, row.original.billed_remark]
          .filter(Boolean)
          .join(REMARK_SEPARATOR);
        return (
          <div className="truncate max-w-[180px] text-muted-foreground" title={remark}>
            {remark || '—'}
          </div>
        );
      },
    }),
    columnHelper.accessor('updated_at', {
      header: 'Updated',
      size: 110,
      cell: (info) => formatDate(info.getValue()),
    }),
  ];

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ClipboardList className="h-4.5 w-4.5" />
          </div>
          <div>
            <CardTitle>Saved Budgets</CardTitle>
            <CardDescription>{formatMonthYear(month, year)}</CardDescription>
          </div>
        </div>

        {!isLoading && records.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{filteredRecords.length} {filteredRecords.length === 1 ? 'entry' : 'entries'}</Badge>
            <Badge variant="muted" className="font-normal">Invoice {formatCurrency(totals.invoice)}</Badge>
            <Badge variant="muted" className="font-normal">Billable {formatCurrency(totals.billed)}</Badge>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {records.length === 0 && !isLoading ? (
          <EmptyState
            icon={ClipboardList}
            title="No budgets saved yet"
            description={`Nothing has been entered for ${formatMonthYear(month, year)} yet.`}
            action={onAddEntry ? { label: 'Add Entry', icon: Plus, onClick: onAddEntry } : undefined}
          />
        ) : !isLoading && filteredRecords.length === 0 ? (
          <EmptyState title="No records found" description="Try adjusting your search or filters." />
        ) : (
          <DataTable
            tableContainerClassName="max-h-[50vh]"
            columns={columns}
            data={filteredRecords}
            isLoading={isLoading}
          />
        )}
      </CardContent>
    </Card>
  );
};

export default ServicePoMonthlyBudgetList;
