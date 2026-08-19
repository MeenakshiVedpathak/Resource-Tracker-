import { useState } from 'react';
import * as XLSX from 'xlsx';
import { createColumnHelper } from '@tanstack/react-table';
import { Download } from 'lucide-react';
import { useEmployeeCapacityForecast } from '@/hooks/useReports';
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

const DEFAULT_BENCH_THRESHOLD_HOURS = 40;

const exportToExcel = (rows) => {
  const header = [
    'Employee Code', 'Full Name', 'Designation', 'Monthly Capacity Hours', 'Total Planned Hours',
    'Capacity Used %', 'Active PO Mappings', 'Overallocated', 'Bench Risk',
  ];
  const dataRows = rows.map((r) => [
    r.employee_code ?? '',
    r.full_name ?? '',
    r.designation ?? '',
    r.monthly_capacity_hours != null ? Number(r.monthly_capacity_hours) : '',
    r.total_planned_hours != null ? Number(r.total_planned_hours) : '',
    r.capacity_used_pct != null ? Number(r.capacity_used_pct) : '',
    r.active_po_mappings_count != null ? Number(r.active_po_mappings_count) : '',
    r.overallocation_flag ? 'Yes' : 'No',
    r.bench_flag ? 'Yes' : 'No',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Employee Capacity Forecast');
  XLSX.writeFile(wb, `Employee_Capacity_Forecast.xlsx`);
};

const now = new Date();
const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

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
    size: 200,
    cell: (info) => <div className="truncate font-medium max-w-[180px]" title={info.getValue()}>{info.getValue() || '—'}</div>,
  }),
  columnHelper.accessor('designation', {
    header: 'Designation',
    size: 160,
    cell: (info) => info.getValue() || '—',
  }),
  columnHelper.accessor('monthly_capacity_hours', {
    header: 'Monthly Capacity Hours',
    size: 170,
    cell: (info) => <span className="tabular-nums">{formatHours(info.getValue())}</span>,
  }),
  columnHelper.accessor('total_planned_hours', {
    header: 'Total Planned Hours',
    size: 160,
    cell: (info) => <span className="tabular-nums">{formatHours(info.getValue())}</span>,
  }),
  columnHelper.accessor('capacity_used_pct', {
    header: 'Capacity Used %',
    size: 140,
    cell: (info) => <span className="tabular-nums">{formatPercentage(info.getValue())}</span>,
  }),
  columnHelper.accessor('active_po_mappings_count', {
    header: 'Active PO Mappings',
    size: 150,
    cell: (info) => <span className="tabular-nums">{info.getValue() ?? '—'}</span>,
  }),
  columnHelper.accessor('overallocation_flag', {
    header: 'Overallocated',
    size: 130,
    cell: (info) => (
      <Badge variant={info.getValue() ? 'destructive' : 'outline'}>
        {info.getValue() ? 'Yes' : 'No'}
      </Badge>
    ),
  }),
  columnHelper.accessor('bench_flag', {
    header: 'Bench Risk',
    size: 120,
    cell: (info) => (
      <Badge variant={info.getValue() ? 'warning' : 'outline'}>
        {info.getValue() ? 'Yes' : 'No'}
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

const EmployeeCapacityForecast = () => {
  const [monthYear, setMonthYear] = useState({
    month: prevMonth.getMonth() + 1,
    year: prevMonth.getFullYear(),
  });
  const [benchThresholdHours, setBenchThresholdHours] = useState(String(DEFAULT_BENCH_THRESHOLD_HOURS));
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [exporting, setExporting] = useState(false);

  const debouncedBenchThresholdHours = useDebounce(benchThresholdHours, 400);

  const params = {
    ...(monthYear && { month: monthYear.month, year: monthYear.year }),
    benchThresholdHours: debouncedBenchThresholdHours !== '' ? Number(debouncedBenchThresholdHours) : DEFAULT_BENCH_THRESHOLD_HOURS,
    page,
    limit,
  };

  const { data, isPending } = useEmployeeCapacityForecast(params);

  const records = data?.data?.records ?? [];
  const meta = data?.meta ?? {};

  const activeFilterCount = [
    Number(benchThresholdHours) !== DEFAULT_BENCH_THRESHOLD_HOURS,
  ].filter(Boolean).length;

  const handleExport = async () => {
    setExporting(true);
    try {
      const total = meta.total > 0 ? meta.total : 1000;
      const res = await reportsApi.getEmployeeCapacityForecast({ ...params, page: 1, limit: total });
      const allRecords = res?.data?.records ?? [];
      exportToExcel(allRecords);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Employee Capacity & Bench Forecast"
        description="Capacity utilization and bench/overallocation risk per employee for the selected month."
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

      <FilterPanel isOpen={filtersOpen} maxHeightClass="max-h-[240px]">
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
          <Label className="text-xs">Bench Threshold Hours</Label>
          <Input
            type="number"
            min={0}
            value={benchThresholdHours}
            onChange={(e) => { setBenchThresholdHours(e.target.value); setPage(1); }}
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

      {data?.data && (
        <div className="mt-4 rounded-lg border bg-muted/40 px-4 py-3">
          <p className="mb-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Summary</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            {/* `_on_page` counts are page-scoped, not grand totals — labeled explicitly to avoid misreading. */}
            <SummaryItem label="Bench Risk (this page)" value={data.data.bench_risk_count_on_page ?? 0} />
            <SummaryItem label="Overallocated (this page)" value={data.data.overallocated_count_on_page ?? 0} />
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeCapacityForecast;
