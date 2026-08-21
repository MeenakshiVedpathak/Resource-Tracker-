import { useState } from 'react';
import * as XLSX from 'xlsx';
import { createColumnHelper } from '@tanstack/react-table';
import { Download } from 'lucide-react';
import { useBudgetedMarginForecast } from '@/hooks/useReports';
import { formatCurrency, formatHours, formatPercentage } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import EmptyState from '@/components/common/EmptyState';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import FilterToggleButton from '@/components/common/FilterToggleButton';
import FilterPanel from '@/components/common/FilterPanel';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MonthYearPicker } from '@/components/ui/month-year-picker';

const columnHelper = createColumnHelper();

// Totals must reflect the WHOLE matching month's data, not one server page, so the whole
// matching set is fetched once (capped well above any realistic Service PO count for a single
// month) and paginated client-side from there.
const MAX_RECORDS_FETCH = 5000;

const exportToExcel = (rows) => {
  const header = [
    'PO Code', 'PO Name', 'Client', 'Status', 'Budget Description',
    'Budgeted Revenue', 'Budgeted Hours', 'Budgeted Cost', 'Forecasted Margin', 'Forecasted Margin %',
  ];
  const dataRows = rows.map((r) => [
    r.service_po_code ?? '',
    r.service_po_name ?? '',
    r.client_name ?? '',
    r.status ?? '',
    r.budget_description ?? '',
    r.budgeted_revenue != null ? Number(r.budgeted_revenue) : '',
    r.budgeted_hours != null ? Number(r.budgeted_hours) : '',
    r.budgeted_cost != null ? Number(r.budgeted_cost) : '',
    r.forecasted_margin != null ? Number(r.forecasted_margin) : '',
    r.forecasted_margin_pct != null ? Number(r.forecasted_margin_pct) : '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Budgeted Margin Forecast');
  XLSX.writeFile(wb, 'Budgeted_Margin_Forecast.xlsx');
};

const now = new Date();
const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
const defaultMonthYear = { month: prevMonth.getMonth() + 1, year: prevMonth.getFullYear() };

const MarginCell = ({ value, format = 'currency' }) => {
  if (value == null || value === '') return <span className="text-muted-foreground">—</span>;
  const negative = Number(value) < 0;
  const formatted = format === 'percentage' ? formatPercentage(value) : formatCurrency(value);
  return <span className={`tabular-nums ${negative ? 'text-destructive' : ''}`}>{formatted}</span>;
};

const columns = [
  columnHelper.accessor('service_po_code', {
    header: 'PO Code',
    size: 150,
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
    meta: { sticky: true, left: 150 },
    cell: (info) => <div className="truncate font-medium max-w-[200px]" title={info.getValue()}>{info.getValue() || '—'}</div>,
  }),
  columnHelper.accessor('client_name', {
    header: 'Client',
    size: 200,
    cell: (info) => <div className="truncate max-w-[180px]" title={info.getValue()}>{info.getValue() || '—'}</div>,
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    size: 150,
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor('budget_description', {
    header: 'Budget Description',
    size: 220,
    cell: (info) => <div className="truncate max-w-[200px]" title={info.getValue()}>{info.getValue() || '—'}</div>,
  }),
  columnHelper.accessor('budgeted_revenue', {
    header: 'Budgeted Revenue',
    size: 160,
    cell: (info) => <MarginCell value={info.getValue()} />,
  }),
  columnHelper.accessor('budgeted_hours', {
    header: 'Budgeted Hours',
    size: 150,
    cell: (info) => <span className="tabular-nums">{formatHours(info.getValue())}</span>,
  }),
  columnHelper.accessor('budgeted_cost', {
    header: 'Budgeted Cost',
    size: 160,
    cell: (info) => <MarginCell value={info.getValue()} />,
  }),
  columnHelper.accessor('forecasted_margin', {
    header: 'Forecasted Margin',
    size: 170,
    cell: (info) => <MarginCell value={info.getValue()} />,
  }),
  columnHelper.accessor('forecasted_margin_pct', {
    header: 'Forecasted Margin %',
    size: 170,
    cell: (info) => <MarginCell value={info.getValue()} format="percentage" />,
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

const BudgetedMarginForecast = () => {
  const [monthYear, setMonthYear] = useState(defaultMonthYear);
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

  const { data, isPending } = useBudgetedMarginForecast(params);

  const records = data?.data?.records ?? [];
  const pagedRecords = records.slice((page - 1) * limit, page * limit);

  // Recomputed client-side from the full record set — the backend's own `summary` only ever
  // reflected one page. Overall margin % is a derived ratio (total margin ÷ total revenue), not
  // a per-row average, matching how "overall margin %" is defined elsewhere in this app.
  const summary = records.length > 0 ? (() => {
    const total_budgeted_revenue = records.reduce((sum, r) => sum + (Number(r.budgeted_revenue) || 0), 0);
    const total_budgeted_cost = records.reduce((sum, r) => sum + (Number(r.budgeted_cost) || 0), 0);
    const total_forecasted_margin = records.reduce((sum, r) => sum + (Number(r.forecasted_margin) || 0), 0);
    return {
      total_budgeted_revenue,
      total_budgeted_cost,
      total_forecasted_margin,
      overall_forecasted_margin_pct: total_budgeted_revenue !== 0 ? (total_forecasted_margin / total_budgeted_revenue) * 100 : null,
    };
  })() : null;

  const activeFilterCount = [
    monthYear?.month !== defaultMonthYear.month || monthYear?.year !== defaultMonthYear.year,
  ].filter(Boolean).length;

  // Already have the full record set in memory — no need for a second network round-trip.
  const handleExport = () => exportToExcel(records);

  return (
    <div>
      <PageHeader
        title="Budgeted Margin Forecast"
        description="Forecasted margin from budgeted revenue vs budgeted cost, by Service PO."
        actions={
          <div className="flex items-center gap-2">
            <FilterToggleButton
              isOpen={filtersOpen}
              onToggle={() => setFiltersOpen((p) => !p)}
              activeCount={activeFilterCount}
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
        emptyState={
          <EmptyState
            title="No budgeted forecast data"
            description="Enter future budgets for this Service PO and month via the Cost Budget and Resource Budget screens to see a forecast here."
          />
        }
      />

      {summary && (
        <div className="mt-4 rounded-lg border bg-muted/40 px-4 py-3">
          <p className="mb-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Totals (all pages)</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <SummaryItem label="Total Budgeted Revenue" value={formatCurrency(summary.total_budgeted_revenue)} />
            <SummaryItem label="Total Budgeted Cost" value={formatCurrency(summary.total_budgeted_cost)} />
            <SummaryItem
              label="Total Forecasted Margin"
              value={formatCurrency(summary.total_forecasted_margin)}
              negative={Number(summary.total_forecasted_margin) < 0}
            />
            <SummaryItem
              label="Overall Forecasted Margin %"
              value={formatPercentage(summary.overall_forecasted_margin_pct)}
              negative={Number(summary.overall_forecasted_margin_pct) < 0}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default BudgetedMarginForecast;
