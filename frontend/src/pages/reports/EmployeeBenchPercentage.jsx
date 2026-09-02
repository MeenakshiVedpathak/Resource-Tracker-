import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { createColumnHelper } from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown, Download, Search } from 'lucide-react';
import { useEmployeeBenchPercentage } from '@/hooks/useReports';
import { useActiveEmployees } from '@/hooks/useEmployees';
import { useActiveClients } from '@/hooks/useClients';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { formatHours, formatPercentage } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import FilterToggleButton from '@/components/common/FilterToggleButton';
import FilterPanel from '@/components/common/FilterPanel';
import BusinessUnitFilter, { ALL_BUS } from '@/components/common/BusinessUnitFilter';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { cn } from '@/utils/cn';

const columnHelper = createColumnHelper();

// The Summary average must reflect every matching employee, not just the current server page, so
// the whole matching set is fetched once (capped well above any realistic monthly headcount) and
// paginated client-side from there.
const MAX_RECORDS_FETCH = 5000;

const now = new Date();
const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);

const PERIOD_MODES = [
  { value: 'month', label: 'Month' },
  { value: 'range', label: 'Date Range' },
];

// No continuous bench-% threshold is documented anywhere (EmployeeCapacityForecast only ever
// renders a boolean bench_flag as a warning/outline Badge) — these bands reuse that same
// Badge vocabulary (outline / warning / destructive), just applied across a numeric range instead
// of a single true/false cut, so a high bench_pct reads as escalating risk (amber, then red).
const BENCH_PCT_WARNING_THRESHOLD = 20;
const BENCH_PCT_CRITICAL_THRESHOLD = 40;

const BenchPctBadge = ({ value }) => {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  const pct = Number(value);
  const variant =
    pct >= BENCH_PCT_CRITICAL_THRESHOLD ? 'destructive' : pct >= BENCH_PCT_WARNING_THRESHOLD ? 'warning' : 'outline';
  return (
    <Badge variant={variant} className="tabular-nums">
      {formatPercentage(pct)}
    </Badge>
  );
};

const SortableHeader = ({ label, column, sortBy, sortOrder, onSort, align }) => {
  const isActive = sortBy === column;
  const Icon = isActive ? (sortOrder === 'asc' ? ChevronUp : ChevronDown) : ChevronsUpDown;
  return (
    <button
      type="button"
      onClick={() => onSort(column)}
      className={cn(
        'inline-flex items-center gap-1 hover:text-foreground transition-colors',
        align === 'right' && 'justify-end w-full'
      )}
    >
      {label}
      <Icon className={cn('h-3 w-3', !isActive && 'opacity-40')} />
    </button>
  );
};

const getColumns = (sortBy, sortOrder, onSort) => [
  columnHelper.accessor('employee_code', {
    header: 'Employee Code',
    size: 150,
    enableSorting: false,
    cell: (info) => (
      <span className="font-mono text-xs font-semibold text-muted-foreground whitespace-nowrap">
        {info.getValue() || '—'}
      </span>
    ),
  }),
  columnHelper.accessor('full_name', {
    header: 'Full Name',
    size: 220,
    enableSorting: false,
    cell: (info) => <div className="truncate font-medium max-w-[200px]" title={info.getValue()}>{info.getValue() || '—'}</div>,
  }),
  columnHelper.accessor('bench_hours', {
    header: () => (
      <SortableHeader label="Bench Hours" column="bench_hours" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} align="right" />
    ),
    size: 140,
    meta: { align: 'right' },
    enableSorting: false,
    cell: (info) => <span className="tabular-nums">{formatHours(info.getValue())}</span>,
  }),
  columnHelper.accessor('total_hours', {
    header: () => (
      <SortableHeader label="Total Hours" column="total_hours" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} align="right" />
    ),
    size: 140,
    meta: { align: 'right' },
    enableSorting: false,
    cell: (info) => <span className="tabular-nums">{formatHours(info.getValue())}</span>,
  }),
  columnHelper.accessor('bench_pct', {
    header: () => (
      <SortableHeader label="Bench %" column="bench_pct" sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} align="right" />
    ),
    size: 130,
    meta: { align: 'right' },
    enableSorting: false,
    cell: (info) => <BenchPctBadge value={info.getValue()} />,
  }),
];

const exportToExcel = (rows) => {
  const header = ['Employee Code', 'Full Name', 'Bench Hours', 'Total Hours', 'Bench %'];
  const dataRows = rows.map((r) => [
    r.employee_code ?? '',
    r.full_name ?? '',
    r.bench_hours != null ? Number(r.bench_hours) : '',
    r.total_hours != null ? Number(r.total_hours) : '',
    r.bench_pct != null ? Number(r.bench_pct) : '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Employee Bench Percentage');
  XLSX.writeFile(wb, 'Employee_Bench_Percentage.xlsx');
};

const SummaryItem = ({ label, value }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[11px] text-muted-foreground">{label}</span>
    <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
  </div>
);

const EmployeeBenchPercentage = () => {
  const [periodMode, setPeriodMode] = useState('month');
  const [monthYear, setMonthYear] = useState({
    month: prevMonth.getMonth() + 1,
    year: prevMonth.getFullYear(),
  });
  const [dateRange, setDateRange] = useState(null);

  const [employeeId, setEmployeeId] = useState('all');
  const [clientId, setClientId] = useState('all');
  const [poId, setPoId] = useState('all');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [buId, setBuId] = useState(ALL_BUS);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState('bench_pct');
  const [sortOrder, setSortOrder] = useState('desc');

  const { data: activeEmployees = [] } = useActiveEmployees();
  const { data: activeClients = [] } = useActiveClients();
  const { data: activePOs = [] } = useActiveServicePOs();

  const periodReady =
    periodMode === 'month'
      ? !!(monthYear?.month && monthYear?.year)
      : !!(dateRange?.startDate && dateRange?.endDate);

  const params = {
    ...(periodMode === 'month'
      ? monthYear?.month && monthYear?.year && { month: monthYear.month, year: monthYear.year }
      : dateRange?.startDate && dateRange?.endDate && { startDate: dateRange.startDate, endDate: dateRange.endDate }),
    ...(employeeId !== 'all' && { employeeId }),
    ...(clientId !== 'all' && { clientId }),
    ...(poId !== 'all' && { poId }),
    sortBy,
    sortOrder,
    page: 1,
    limit: MAX_RECORDS_FETCH,
    buId,
  };

  const { data, isPending } = useEmployeeBenchPercentage(params);

  const records = Array.isArray(data?.data) ? data.data : [];

  // Applied in memory — the whole matching set is already here, so there is nothing to gain from
  // a round-trip. Covers the identifying columns only; the numeric/metric columns are left out,
  // since substring-matching an amount or a count misleads more than it helps.
  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return records;
    return records.filter((r) => [r.employee_code, r.full_name]
      .some((v) => String(v ?? '').toLowerCase().includes(q)));
  }, [records, search]);
  const pagedRecords = filteredRecords.slice((page - 1) * limit, page * limit);
  const showLoading = periodReady && isPending;

  const avgBenchPct =
    filteredRecords.length > 0
      ? filteredRecords.reduce((sum, r) => sum + (Number(r.bench_pct) || 0), 0) / filteredRecords.length
      : null;

  const activeFilterCount = [
    buId !== ALL_BUS,
    employeeId !== 'all',
    clientId !== 'all',
    poId !== 'all',
  ].filter(Boolean).length;

  const clearFilters = () => {
    setBuId(ALL_BUS);
    setEmployeeId('all');
    setClientId('all');
    setPoId('all');
    setPage(1);
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((o) => (o === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(column);
      setSortOrder('asc');
    }
    setPage(1);
  };

  const handlePeriodModeChange = (mode) => {
    setPeriodMode(mode);
    setPage(1);
  };

  // Already have the full matching set in memory — no need for a second network round-trip.
  const handleExport = () => exportToExcel(filteredRecords);

  const columns = getColumns(sortBy, sortOrder, handleSort);

  return (
    <div>
      <PageHeader
        title="Employee Bench Percentage"
        description="Share of each employee's hours that went unbilled (bench) for the selected period."
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
              <Input
                placeholder="Search code, name…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="h-9 w-72 pl-9 text-sm"
              />
            </div>
            <FilterToggleButton
              isOpen={filtersOpen}
              onToggle={() => setFiltersOpen((p) => !p)}
              activeCount={activeFilterCount}
              className="h-9"
            />
            {filteredRecords.length > 0 && (
              <Button variant="outline" size="sm" className="h-9" onClick={handleExport}>
                <Download className="mr-1.5 h-4 w-4" />Export Excel
              </Button>
            )}
          </div>
        }
      />

      <FilterPanel isOpen={filtersOpen} maxHeightClass="max-h-[440px]" onClear={clearFilters} showClear={activeFilterCount > 0}>
        <BusinessUnitFilter value={buId} onChange={setBuId} />

        <div className="flex flex-col gap-1.5 md:col-span-2">
          <Label className="text-xs">Period <span className="text-destructive">*</span></Label>
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-muted border shrink-0">
              {PERIOD_MODES.map(({ value, label }) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => handlePeriodModeChange(value)}
                  className={`flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap ${
                    periodMode === value ? 'bg-card shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground hover:text-foreground'
                  }`}
                >
                  {label}
                </button>
              ))}
            </div>
            {periodMode === 'month' ? (
              <MonthYearPicker
                value={monthYear}
                onChange={(val) => { setMonthYear(val); setPage(1); }}
                placeholder="Select month"
                clearable={false}
                className="flex-1"
              />
            ) : (
              <DateRangePicker
                value={dateRange}
                onChange={(val) => { setDateRange(val); setPage(1); }}
                placeholder="Select date range"
                className="flex-1"
              />
            )}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Employee</Label>
          <SearchableSelect
            options={[
              { label: 'All Employees', value: 'all' },
              ...activeEmployees.map((e) => ({ label: e.full_name, value: String(e.id) })),
            ]}
            value={employeeId}
            onValueChange={(v) => { setEmployeeId(v); setPage(1); }}
            placeholder="All Employees"
            searchPlaceholder="Search employee..."
            className="h-9 w-full text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Client</Label>
          <SearchableSelect
            options={[
              { label: 'All Clients', value: 'all' },
              ...activeClients.map((c) => ({ label: c.client_name, value: String(c.id) })),
            ]}
            value={clientId}
            onValueChange={(v) => { setClientId(v); setPage(1); }}
            placeholder="All Clients"
            searchPlaceholder="Search client..."
            className="h-9 w-full text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Project (Service PO)</Label>
          <SearchableSelect
            options={[
              { label: 'All Projects', value: 'all' },
              ...activePOs.map((po) => ({
                label: po.service_po_name || po.service_po_code || String(po.id),
                value: String(po.id),
              })),
            ]}
            value={poId}
            onValueChange={(v) => { setPoId(v); setPage(1); }}
            placeholder="All Projects"
            searchPlaceholder="Search project..."
            className="h-9 w-full text-sm"
          />
        </div>
      </FilterPanel>

      <DataTable
        tableContainerClassName="max-h-[50vh]"
        columns={columns}
        data={pagedRecords}
        isLoading={showLoading}
        emptyState={
          !periodReady ? (
            <EmptyState title="Select a period" description="Choose a month or a date range to load the bench percentage report." />
          ) : undefined
        }
        pagination={periodReady ? { page, limit, total: filteredRecords.length } : undefined}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
      />

      {periodReady && filteredRecords.length > 0 && (
        <div className="mt-4 rounded-lg border bg-muted/40 px-4 py-3">
          <p className="mb-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Summary</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <SummaryItem label="Avg Bench %" value={formatPercentage(avgBenchPct)} />
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeBenchPercentage;
