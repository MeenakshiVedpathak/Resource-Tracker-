import { useState } from 'react';
import * as XLSX from 'xlsx';
import { createColumnHelper } from '@tanstack/react-table';
import { Download } from 'lucide-react';
import { useResourceStaffingPlanAccuracy } from '@/hooks/useReports';
import { reportsApi } from '@/api/reports.api';
import { useDebounce } from '@/hooks/useDebounce';
import { formatHours, formatPercentage } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import FilterToggleButton from '@/components/common/FilterToggleButton';
import FilterPanel from '@/components/common/FilterPanel';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { MonthYearPicker } from '@/components/ui/month-year-picker';

const columnHelper = createColumnHelper();

const DEFAULT_THRESHOLD_PCT = 20;

const exportToExcel = (rows) => {
  const header = [
    'Employee Code', 'Employee Name', 'PO Code', 'PO Name',
    'Planned Hours', 'Actual Hours', 'Variance', 'Variance %', 'At Risk',
  ];
  const dataRows = rows.map((r) => [
    r.employee_code ?? '',
    r.full_name ?? '',
    r.service_po_code ?? '',
    r.service_po_name ?? '',
    r.planned_hours != null ? Number(r.planned_hours) : '',
    r.actual_hours != null ? Number(r.actual_hours) : '',
    r.variance != null ? Number(r.variance) : '',
    r.variance_pct != null ? Number(r.variance_pct) : '',
    r.at_risk ? 'At Risk' : 'OK',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Staffing Plan Accuracy');
  XLSX.writeFile(wb, `Resource_Staffing_Plan_Accuracy.xlsx`);
};

const now = new Date();
const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

const columns = [
  columnHelper.accessor('employee_code', {
    header: 'Employee Code',
    size: 140,
    cell: (info) => <span className="font-mono text-xs font-semibold text-muted-foreground whitespace-nowrap">{info.getValue() || '—'}</span>,
  }),
  columnHelper.accessor('full_name', {
    header: 'Employee Name',
    size: 200,
    cell: (info) => <div className="truncate max-w-[180px]" title={info.getValue()}>{info.getValue() || '—'}</div>,
  }),
  columnHelper.accessor('service_po_code', {
    header: 'PO Code',
    size: 140,
    cell: (info) => <span className="font-mono text-xs whitespace-nowrap">{info.getValue() || '—'}</span>,
  }),
  columnHelper.accessor('service_po_name', {
    header: 'PO Name',
    size: 220,
    cell: (info) => <div className="truncate max-w-[200px]" title={info.getValue()}>{info.getValue() || '—'}</div>,
  }),
  columnHelper.accessor('planned_hours', {
    header: 'Planned Hours',
    size: 140,
    cell: (info) => <span className="tabular-nums">{formatHours(info.getValue())}</span>,
  }),
  columnHelper.accessor('actual_hours', {
    header: 'Actual Hours',
    size: 140,
    cell: (info) => <span className="tabular-nums">{formatHours(info.getValue())}</span>,
  }),
  columnHelper.accessor('variance', {
    header: 'Variance',
    size: 120,
    cell: (info) => <span className="tabular-nums">{formatHours(info.getValue())}</span>,
  }),
  columnHelper.accessor('variance_pct', {
    header: 'Variance %',
    size: 120,
    // planned_hours = 0 guards div-by-zero on the backend, so variance_pct arrives as null.
    cell: (info) => <span className="tabular-nums">{info.getValue() == null ? '—' : formatPercentage(info.getValue())}</span>,
  }),
  columnHelper.accessor('at_risk', {
    header: 'At Risk',
    size: 110,
    cell: (info) => (
      <Badge variant={info.getValue() ? 'destructive' : 'outline'}>
        {info.getValue() ? 'At Risk' : 'OK'}
      </Badge>
    ),
  }),
];

const SummaryItem = ({ label, value }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[11px] text-muted-foreground">{label}</span>
    <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
  </div>
);

const ResourceStaffingPlanAccuracy = () => {
  const [monthYear, setMonthYear] = useState({
    month: prevMonth.getMonth() + 1,
    year: prevMonth.getFullYear(),
  });
  const [varianceThresholdPct, setVarianceThresholdPct] = useState(String(DEFAULT_THRESHOLD_PCT));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [exporting, setExporting] = useState(false);

  const debouncedThresholdPct = useDebounce(varianceThresholdPct, 400);

  const params = {
    ...(monthYear && { month: monthYear.month, year: monthYear.year }),
    ...(debouncedThresholdPct !== '' && { varianceThresholdPct: Number(debouncedThresholdPct) }),
    page,
    limit,
  };

  const { data, isPending } = useResourceStaffingPlanAccuracy(params);

  const records = data?.data?.records ?? [];
  const summary = data?.data ?? null;
  const meta = data?.meta ?? {};

  const activeFilterCount = [
    varianceThresholdPct !== String(DEFAULT_THRESHOLD_PCT),
  ].filter(Boolean).length;

  const handleExport = async () => {
    setExporting(true);
    try {
      const total = meta.total > 0 ? meta.total : 1000;
      const res = await reportsApi.getResourceStaffingPlanAccuracy({ ...params, page: 1, limit: total });
      const allRecords = res?.data?.records ?? [];
      exportToExcel(allRecords);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Resource Staffing Plan Accuracy"
        description="Planned vs actual hours per employee/Service PO, flagged when variance exceeds a threshold."
        actions={
          <div className="flex items-center gap-2">
            <FilterToggleButton
              isOpen={filtersOpen}
              onToggle={() => setFiltersOpen((p) => !p)}
              activeCount={activeFilterCount}
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

      <FilterPanel isOpen={filtersOpen} maxHeightClass="max-h-[160px]">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Month &amp; Year <span className="text-destructive">*</span></Label>
          <MonthYearPicker
            value={monthYear}
            onChange={(val) => { setMonthYear(val); setPage(1); }}
            placeholder="Select month"
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Variance Threshold %</Label>
          <Input
            type="number"
            min={0}
            value={varianceThresholdPct}
            onChange={(e) => { setVarianceThresholdPct(e.target.value); setPage(1); }}
            placeholder="20"
            className="h-9 w-full text-sm"
          />
        </div>
      </FilterPanel>

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

      {summary && (
        <div className="mt-4 rounded-lg border bg-muted/40 px-4 py-3">
          <p className="mb-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Totals (all pages)</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <SummaryItem label="Total Planned Hours" value={formatHours(summary.total_planned_hours)} />
            <SummaryItem label="Total Actual Hours" value={formatHours(summary.total_actual_hours)} />
            <SummaryItem label="Total Variance Hours" value={formatHours(summary.total_variance_hours)} />
            <SummaryItem label="Threshold Used" value={formatPercentage(summary.variance_threshold_pct_used)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceStaffingPlanAccuracy;
