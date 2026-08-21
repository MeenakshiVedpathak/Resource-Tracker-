import { useState } from 'react';
import * as XLSX from 'xlsx';
import { createColumnHelper } from '@tanstack/react-table';
import { Download } from 'lucide-react';
import { useDeliveryHeadPerformance } from '@/hooks/useReports';
import { formatCurrency, formatHours } from '@/utils/formatters';
import PageHeader from '@/components/common/PageHeader';
import FilterToggleButton from '@/components/common/FilterToggleButton';
import FilterPanel from '@/components/common/FilterPanel';
import DataTable from '@/components/common/DataTable';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MonthYearPicker } from '@/components/ui/month-year-picker';

const columnHelper = createColumnHelper();

// Totals must reflect the WHOLE matching month's data, not one server page, so the whole
// matching set is fetched once (capped well above any realistic Delivery Head headcount for a
// single month) and paginated client-side from there.
const MAX_RECORDS_FETCH = 5000;

const exportToExcel = (rows) => {
  const header = [
    'Employee Code', 'Full Name', 'PO Count', 'Total Hours Delivered',
    'Total Invoiced', 'Total Delivery Cost', 'Total Margin', 'At-Risk POs',
  ];
  const dataRows = rows.map((r) => [
    r.employee_code ?? '',
    r.full_name ?? '',
    r.po_count != null ? Number(r.po_count) : '',
    r.total_hours_delivered != null ? Number(r.total_hours_delivered) : '',
    r.total_invoiced != null ? Number(r.total_invoiced) : '',
    r.total_delivery_cost != null ? Number(r.total_delivery_cost) : '',
    r.total_margin != null ? Number(r.total_margin) : '',
    r.at_risk_po_count != null ? Number(r.at_risk_po_count) : '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Delivery Head Performance');
  XLSX.writeFile(wb, 'Delivery_Head_Performance.xlsx');
};

const now = new Date();
const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

const MarginCell = ({ value }) => {
  if (value == null || value === '') return <span className="text-muted-foreground">—</span>;
  const negative = Number(value) < 0;
  return (
    <span className={`tabular-nums font-medium ${negative ? 'text-destructive' : ''}`}>
      {formatCurrency(value)}
    </span>
  );
};

const columns = [
  columnHelper.accessor('employee_code', {
    header: 'Employee Code',
    size: 150,
    cell: (info) => (
      <span className="font-mono text-xs font-semibold text-muted-foreground whitespace-nowrap">
        {info.getValue() || '—'}
      </span>
    ),
  }),
  columnHelper.accessor('full_name', {
    header: 'Full Name',
    size: 220,
    cell: (info) => <div className="truncate max-w-[200px]" title={info.getValue()}>{info.getValue() || '—'}</div>,
  }),
  columnHelper.accessor('po_count', {
    header: 'PO Count',
    size: 110,
    cell: (info) => <span className="tabular-nums">{info.getValue() ?? '—'}</span>,
  }),
  columnHelper.accessor('total_hours_delivered', {
    header: 'Total Hours Delivered',
    size: 170,
    cell: (info) => <span className="tabular-nums">{formatHours(info.getValue())}</span>,
  }),
  columnHelper.accessor('total_invoiced', {
    header: 'Total Invoiced',
    size: 160,
    cell: (info) => <span className="tabular-nums">{formatCurrency(info.getValue())}</span>,
  }),
  columnHelper.accessor('total_delivery_cost', {
    header: 'Total Delivery Cost',
    size: 170,
    cell: (info) => <span className="tabular-nums">{formatCurrency(info.getValue())}</span>,
  }),
  columnHelper.accessor('total_margin', {
    header: 'Total Margin',
    size: 160,
    cell: (info) => <MarginCell value={info.getValue()} />,
  }),
  columnHelper.accessor('at_risk_po_count', {
    header: 'At-Risk POs',
    size: 130,
    cell: (info) => {
      const value = info.getValue();
      return (
        <Badge variant={Number(value) > 0 ? 'destructive' : 'outline'}>
          {value ?? 0}
        </Badge>
      );
    },
  }),
];

const SummaryItem = ({ label, value, negative = false }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[11px] text-muted-foreground">{label}</span>
    <span className={`text-sm font-semibold tabular-nums ${negative ? 'text-destructive' : 'text-foreground'}`}>
      {value}
    </span>
  </div>
);

const DeliveryHeadPerformance = () => {
  const [monthYear, setMonthYear] = useState({
    month: prevMonth.getMonth() + 1,
    year: prevMonth.getFullYear(),
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  // page/limit above are for client-side pagination only, never sent to the API — the whole
  // matching month's data is fetched in one shot so totals and pagination both work off it.
  const params = {
    ...(monthYear && { month: monthYear.month, year: monthYear.year }),
    page: 1,
    limit: MAX_RECORDS_FETCH,
  };

  const { data, isPending } = useDeliveryHeadPerformance(params);

  const records = data?.data?.records ?? [];
  const pagedRecords = records.slice((page - 1) * limit, page * limit);

  // Recomputed client-side from the full record set rather than trusted from the backend's own
  // `summary` — its field names don't even match this report's own row-level fields (it reads
  // `total_invoiced_amount` while rows use `total_invoiced`), and it only reflected one page.
  const summary = records.length > 0 ? {
    total_invoiced: records.reduce((sum, r) => sum + (Number(r.total_invoiced) || 0), 0),
    total_delivery_cost: records.reduce((sum, r) => sum + (Number(r.total_delivery_cost) || 0), 0),
    total_margin: records.reduce((sum, r) => sum + (Number(r.total_margin) || 0), 0),
    total_at_risk_po_count: records.reduce((sum, r) => sum + (Number(r.at_risk_po_count) || 0), 0),
  } : null;

  // Already have the full record set in memory — no need for a second network round-trip.
  const handleExport = () => exportToExcel(records);

  return (
    <div>
      <PageHeader
        title="Delivery Head Performance"
        description="Portfolio performance per Delivery Head — PO count, hours, and margin delivered."
        actions={
          <div className="flex items-center gap-2">
            <FilterToggleButton
              isOpen={filtersOpen}
              onToggle={() => setFiltersOpen((p) => !p)}
              activeCount={0}
              className="h-9"
            />
            {records.length > 0 && (
              <Button variant="outline" size="sm" className="h-9" onClick={handleExport}>
                <Download className="mr-1.5 h-4 w-4" />Export Excel
              </Button>
            )}
          </div>
        }
      />

      {/* Collapsible filter panel */}
      <FilterPanel isOpen={filtersOpen} maxHeightClass="max-h-[200px]">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Month &amp; Year <span className="text-destructive">*</span></Label>
          <MonthYearPicker
            value={monthYear}
            onChange={(val) => { setMonthYear(val); setPage(1); }}
            placeholder="Select month"
            clearable={false}
            className="w-full"
          />
        </div>
      </FilterPanel>

      <DataTable
        tableContainerClassName="max-h-[50vh]"
        columns={columns}
        data={pagedRecords}
        isLoading={isPending}
        pagination={{ page, limit, total: records.length }}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
      />

      {summary && (
        <div className="mt-4 rounded-lg border bg-muted/40 px-4 py-3">
          <p className="mb-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Totals (all pages)</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <SummaryItem label="Total Invoiced" value={formatCurrency(summary.total_invoiced)} />
            <SummaryItem label="Total Delivery Cost" value={formatCurrency(summary.total_delivery_cost)} />
            <SummaryItem
              label="Total Margin"
              value={formatCurrency(summary.total_margin)}
              negative={Number(summary.total_margin) < 0}
            />
            <SummaryItem label="Total At-Risk POs" value={summary.total_at_risk_po_count ?? 0} />
          </div>
        </div>
      )}
    </div>
  );
};

export default DeliveryHeadPerformance;
