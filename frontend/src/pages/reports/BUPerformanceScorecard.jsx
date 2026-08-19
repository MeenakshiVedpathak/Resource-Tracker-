import { useState } from 'react';
import * as XLSX from 'xlsx';
import { createColumnHelper } from '@tanstack/react-table';
import { AlertCircle, Download } from 'lucide-react';
import { useBUPerformanceScorecard } from '@/hooks/useReports';
import { reportsApi } from '@/api/reports.api';
import { extractApiError } from '@/services/apiClient';
import { formatCurrency, formatPercentage } from '@/utils/formatters';
import PageHeader from '@/components/common/PageHeader';
import FilterToggleButton from '@/components/common/FilterToggleButton';
import FilterPanel from '@/components/common/FilterPanel';
import DataTable from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MonthYearPicker } from '@/components/ui/month-year-picker';

const columnHelper = createColumnHelper();

const exportToExcel = (rows) => {
  const header = [
    'Company Code', 'Company Name', 'Entity ID', 'Active Employees', 'Active POs',
    'Total Invoiced', 'Total Delivery Cost', 'Total Margin', 'Avg Utilization %',
  ];
  const dataRows = rows.map((r) => [
    r.company_code ?? '',
    r.company_name ?? '',
    r.entity_id ?? '',
    r.active_employees != null ? Number(r.active_employees) : '',
    r.active_pos != null ? Number(r.active_pos) : '',
    r.total_invoiced != null ? Number(r.total_invoiced) : '',
    r.total_delivery_cost != null ? Number(r.total_delivery_cost) : '',
    r.total_margin != null ? Number(r.total_margin) : '',
    r.avg_utilization_pct != null ? Number(r.avg_utilization_pct) * 100 : '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'BU Performance Scorecard');
  XLSX.writeFile(wb, 'BU_Performance_Scorecard.xlsx');
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
  columnHelper.accessor('company_code', {
    header: 'Company Code',
    size: 150,
    cell: (info) => (
      <span className="font-mono text-xs font-semibold text-muted-foreground whitespace-nowrap">
        {info.getValue() || '—'}
      </span>
    ),
  }),
  columnHelper.accessor('company_name', {
    header: 'Company Name',
    size: 220,
    cell: (info) => <div className="truncate max-w-[200px]" title={info.getValue()}>{info.getValue() || '—'}</div>,
  }),
  columnHelper.accessor('entity_id', {
    header: 'Entity ID',
    size: 120,
    cell: (info) => info.getValue() ?? '—',
  }),
  columnHelper.accessor('active_employees', {
    header: 'Active Employees',
    size: 150,
    cell: (info) => <span className="tabular-nums">{info.getValue() ?? '—'}</span>,
  }),
  columnHelper.accessor('active_pos', {
    header: 'Active POs',
    size: 130,
    cell: (info) => <span className="tabular-nums">{info.getValue() ?? '—'}</span>,
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
  columnHelper.accessor('avg_utilization_pct', {
    header: 'Avg Utilization %',
    size: 150,
    // Sample data shows "0.47" as a 0–1 ratio, not an already-scaled percentage — scaling by
    // 100 here; confirm against real backend data once available.
    cell: (info) => {
      const value = info.getValue();
      if (value == null || value === '') return <span className="text-muted-foreground">—</span>;
      return <span className="tabular-nums">{formatPercentage(Number(value) * 100)}</span>;
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

const BUPerformanceScorecard = () => {
  const [monthYear, setMonthYear] = useState({
    month: prevMonth.getMonth() + 1,
    year: prevMonth.getFullYear(),
  });
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [exporting, setExporting] = useState(false);

  const params = {
    ...(monthYear && { month: monthYear.month, year: monthYear.year }),
    page,
    limit,
  };

  const { data, isPending, isError, error } = useBUPerformanceScorecard(params);

  const records = data?.data?.records ?? [];
  const meta = data?.meta ?? {};
  const errorMessage = isError ? extractApiError(error) : null;

  const handleExport = async () => {
    setExporting(true);
    try {
      const total = meta.total > 0 ? meta.total : 1000;
      const res = await reportsApi.getBUPerformanceScorecard({ ...params, page: 1, limit: total });
      const allRecords = res?.data?.records ?? [];
      exportToExcel(allRecords);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="BU Performance Scorecard"
        description="Per-company scorecard of active employees, POs, and margin. Visible to Entity Admin and Admin roles only."
        actions={
          <div className="flex items-center gap-2">
            <FilterToggleButton
              isOpen={filtersOpen}
              onToggle={() => setFiltersOpen((p) => !p)}
              activeCount={0}
              className="h-9"
            />
            {!errorMessage && records.length > 0 && (
              <Button variant="outline" size="sm" className="h-9" onClick={handleExport} disabled={exporting}>
                <Download className="mr-1.5 h-4 w-4" />{exporting ? 'Exporting…' : 'Export Excel'}
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

      {errorMessage && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      {!errorMessage && (
        <>
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
          />

          {records.length > 0 && (
            <div className="mt-4 rounded-lg border bg-muted/40 px-4 py-3">
              <p className="mb-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Totals (all pages)</p>
              <div className="flex flex-wrap gap-x-6 gap-y-2">
                <SummaryItem label="Total Invoiced" value={formatCurrency(data?.data?.total_invoiced_amount)} />
                <SummaryItem label="Total Delivery Cost" value={formatCurrency(data?.data?.total_delivery_cost)} />
                <SummaryItem
                  label="Total Margin"
                  value={formatCurrency(data?.data?.total_margin)}
                  negative={Number(data?.data?.total_margin) < 0}
                />
              </div>
            </div>
          )}
        </>
      )}
    </div>
  );
};

export default BUPerformanceScorecard;
