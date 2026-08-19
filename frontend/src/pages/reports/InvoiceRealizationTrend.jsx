import { useState } from 'react';
import * as XLSX from 'xlsx';
import { createColumnHelper } from '@tanstack/react-table';
import { Download, AlertCircle } from 'lucide-react';
import { useInvoiceRealizationTrend } from '@/hooks/useReports';
import { reportsApi } from '@/api/reports.api';
import { formatCurrency, formatMonthYear } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import FilterToggleButton from '@/components/common/FilterToggleButton';
import FilterPanel from '@/components/common/FilterPanel';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';

const columnHelper = createColumnHelper();

// Positive unbilled = amount not yet billed (needs attention); negative = over-billed vs.
// invoiced, which is not a problem, so the two are colored oppositely.
const unbilledColorClass = (value) => {
  if (value == null) return 'text-foreground';
  return value > 0 ? 'text-amber-600 dark:text-amber-400' : 'text-emerald-600 dark:text-emerald-400';
};

const exportToExcel = (rows) => {
  const header = ['PO Code', 'PO Name', 'Client', 'Total Invoiced', 'Total Billed', 'Total Unbilled', 'Months Outstanding'];
  const dataRows = rows.map((r) => [
    r.service_po_code ?? '',
    r.service_po_name ?? '',
    r.client_name ?? '',
    r.total_invoiced != null ? Number(r.total_invoiced) : '',
    r.total_billed != null ? Number(r.total_billed) : '',
    r.total_unbilled != null ? Number(r.total_unbilled) : '',
    r.months_outstanding ?? '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Invoice Realization Trend');
  XLSX.writeFile(wb, 'Invoice_Realization_Trend.xlsx');
};

const now = new Date();
const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const startMonthDate = new Date(now.getFullYear(), now.getMonth() - 6, 1);

const columns = [
  columnHelper.accessor('service_po_code', {
    header: 'PO Code',
    size: 140,
    meta: { sticky: true, left: 0 },
    cell: (info) => (
      <span className="font-mono text-xs font-semibold text-muted-foreground whitespace-nowrap">
        {info.getValue() || '—'}
      </span>
    ),
  }),
  columnHelper.accessor('service_po_name', {
    header: 'PO Name',
    size: 220,
    meta: { sticky: true, left: 140 },
    cell: (info) => <div className="truncate font-medium max-w-[200px]" title={info.getValue()}>{info.getValue() || '—'}</div>,
  }),
  columnHelper.accessor('client_name', {
    header: 'Client',
    size: 200,
    cell: (info) => <div className="truncate max-w-[180px]" title={info.getValue()}>{info.getValue() || '—'}</div>,
  }),
  columnHelper.accessor('total_invoiced', {
    header: 'Total Invoiced',
    size: 160,
    cell: (info) => <span className="tabular-nums">{formatCurrency(info.getValue())}</span>,
  }),
  columnHelper.accessor('total_billed', {
    header: 'Total Billed',
    size: 160,
    cell: (info) => <span className="tabular-nums">{formatCurrency(info.getValue())}</span>,
  }),
  columnHelper.accessor('total_unbilled', {
    header: 'Total Unbilled',
    size: 160,
    cell: (info) => (
      <span className={`tabular-nums font-medium ${unbilledColorClass(info.getValue())}`}>
        {formatCurrency(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor('months_outstanding', {
    header: 'Months Outstanding',
    size: 160,
    cell: (info) => <span className="tabular-nums">{info.getValue() ?? '—'}</span>,
  }),
];

const SummaryItem = ({ label, value, colorClass }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[11px] text-muted-foreground">{label}</span>
    <span className={`text-sm font-semibold tabular-nums ${colorClass ?? 'text-foreground'}`}>{value}</span>
  </div>
);

const InvoiceRealizationTrend = () => {
  const [fromMonthYear, setFromMonthYear] = useState({
    month: startMonthDate.getMonth() + 1,
    year: startMonthDate.getFullYear(),
  });
  const [toMonthYear, setToMonthYear] = useState({
    month: prevMonth.getMonth() + 1,
    year: prevMonth.getFullYear(),
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [selectedRow, setSelectedRow] = useState(null);
  const [exporting, setExporting] = useState(false);

  const params = {
    ...(fromMonthYear && { startMonth: fromMonthYear.month, startYear: fromMonthYear.year }),
    ...(toMonthYear && { endMonth: toMonthYear.month, endYear: toMonthYear.year }),
    page,
    limit,
  };

  const { data, isPending } = useInvoiceRealizationTrend(params);

  const records = data?.data?.records ?? [];
  const meta = data?.meta ?? {};
  const note = data?.data?.note;

  const handleExport = async () => {
    setExporting(true);
    try {
      const total = meta.total > 0 ? meta.total : 1000;
      const res = await reportsApi.getInvoiceRealizationTrend({ ...params, page: 1, limit: total });
      const allRecords = res?.data?.records ?? [];
      exportToExcel(allRecords);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Invoice Realization Trend"
        description="Invoiced vs billed amounts per Service PO across a month range, with a monthly trend drill-down."
        actions={
          <div className="flex items-center gap-2">
            <FilterToggleButton
              isOpen={filtersOpen}
              onToggle={() => setFiltersOpen((p) => !p)}
              activeCount={0}
              className="h-9"
            />
            {records.length > 0 && (
              <Button variant="outline" size="sm" className="h-9" onClick={handleExport} disabled={exporting}>
                <Download className="mr-1.5 h-4 w-4" />{exporting ? 'Exporting…' : 'Export Excel'}
              </Button>
            )}
          </div>
        }
      />

      <FilterPanel isOpen={filtersOpen} maxHeightClass="max-h-[200px]">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">From <span className="text-destructive">*</span></Label>
          <MonthYearPicker
            value={fromMonthYear}
            onChange={(val) => { setFromMonthYear(val); setPage(1); }}
            placeholder="Select month"
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">To <span className="text-destructive">*</span></Label>
          <MonthYearPicker
            value={toMonthYear}
            onChange={(val) => { setToMonthYear(val); setPage(1); }}
            placeholder="Select month"
            className="w-full"
          />
        </div>
      </FilterPanel>

      {note && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-sky-200 bg-sky-50 px-3 py-2.5 text-xs text-sky-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <p>{note}</p>
        </div>
      )}

      <DataTable
        tableContainerClassName="max-h-[50vh]"
        columns={columns}
        data={records}
        isLoading={isPending}
        pagination={meta.total != null ? {
          page: meta.page ?? page,
          limit: meta.limit ?? limit,
          total: meta.total,
        } : undefined}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
        onRowClick={(row) => setSelectedRow(row)}
      />

      {data?.data && (
        <div className="mt-4 rounded-lg border bg-muted/40 px-4 py-3">
          <p className="mb-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Totals (all pages)</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <SummaryItem label="Total Invoiced" value={formatCurrency(data.data.total_invoiced_amount)} />
            <SummaryItem label="Total Billed" value={formatCurrency(data.data.total_billed_amount)} />
            <SummaryItem
              label="Total Unbilled"
              value={formatCurrency(data.data.total_unbilled_amount)}
              colorClass={unbilledColorClass(data.data.total_unbilled_amount)}
            />
          </div>
        </div>
      )}

      <Sheet open={!!selectedRow} onOpenChange={(open) => !open && setSelectedRow(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col bg-white overflow-hidden">
          {selectedRow && (
            <>
              <SheetHeader className="px-5 py-4 border-b">
                <SheetTitle className="text-left">{selectedRow.service_po_name || '—'}</SheetTitle>
                <p className="text-xs text-muted-foreground">{selectedRow.client_name || '—'}</p>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Monthly Trend ({(selectedRow.monthly_trend ?? []).length})
                </p>
                {(selectedRow.monthly_trend ?? []).length === 0 ? (
                  <p className="text-xs text-muted-foreground">No monthly trend data available.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedRow.monthly_trend.map((m, i) => (
                      <div key={i} className="rounded-md border px-3 py-2.5">
                        <p className="mb-1.5 text-xs font-semibold text-foreground">{formatMonthYear(m.month, m.year)}</p>
                        <div className="grid grid-cols-3 gap-2 text-xs">
                          <div>
                            <p className="text-muted-foreground">Invoice Amount</p>
                            <p className="font-medium tabular-nums">{formatCurrency(m.invoice_amount)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Billed Amount</p>
                            <p className="font-medium tabular-nums">{formatCurrency(m.billed_amount)}</p>
                          </div>
                          <div>
                            <p className="text-muted-foreground">Unbilled</p>
                            <p className={`font-medium tabular-nums ${unbilledColorClass(m.unbilled)}`}>
                              {formatCurrency(m.unbilled)}
                            </p>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default InvoiceRealizationTrend;
