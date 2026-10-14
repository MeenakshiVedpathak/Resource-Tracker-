import { useState, useEffect, useMemo } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { ChevronDown, ChevronUp, ChevronsUpDown, AlertCircle, Download } from 'lucide-react';
import { reportsApi } from '@/api/reports.api';
import { downloadBlob } from '@/utils/download';
import { useNotification } from '@/hooks/useNotification';
import { Button } from '@/components/ui/button';
import { useBuWiseUtilisation } from '@/hooks/useReports';
import { useCanViewOriginalData } from '@/hooks/usePermissions';
import { useActiveEmployees } from '@/hooks/useEmployees';
import { useActiveClients } from '@/hooks/useClients';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useActiveServiceTypes } from '@/hooks/useServiceTypes';
import { useDebounce } from '@/hooks/useDebounce';
import { extractApiError } from '@/services/apiClient';
import { formatHours, formatPercentage, formatDate } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import FilterToggleButton from '@/components/common/FilterToggleButton';
import FilterPanel from '@/components/common/FilterPanel';
import BusinessUnitFilter, { ALL_BUS } from '@/components/common/BusinessUnitFilter';
import EntityFilter from '@/components/common/EntityFilter';
import SearchInput from '@/components/common/SearchInput';
import { Label } from '@/components/ui/label';
import { MultiSelect } from '@/components/ui/multi-select';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { cn } from '@/utils/cn';

const columnHelper = createColumnHelper();

const now = new Date();

// Server-side sort keys the endpoint accepts.
const SORTABLE = {
  BU_NAME: 'buName',
  SUB_BU_NAME: 'subBuName',
  EMPLOYEE_COUNT: 'employeeCount',
  EXPECTED_HOURS: 'expectedHours',
  BILLABLE_HOURS: 'billableHours',
  NON_BILLABLE_HOURS: 'nonBillableHours',
  CUSTOMER_NON_BILLABLE_HOURS: 'customerNonBillableHours',
  TOTAL_LOGGED_HOURS: 'totalLoggedHours',
  UTILIZATION: 'utilizationPercentage',
};

const utilizationColorClass = (value) => {
  if (value == null) return 'text-muted-foreground';
  const num = Number(value);
  if (num >= 75) return 'text-emerald-600 dark:text-emerald-400';
  if (num >= 50) return 'text-amber-600 dark:text-amber-400';
  return 'text-destructive';
};

const SortableHeader = ({ label, column, sortBy, sortOrder, onSort, align }) => {
  const isActive = sortBy === column;
  const Icon = isActive ? (sortOrder === 'ASC' ? ChevronUp : ChevronDown) : ChevronsUpDown;
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

// A BU with no logged hours still has every hour field at 0, not null — render zeros plainly
// rather than treating them the same as a genuinely missing value (only null/undefined -> '—').
const HoursCell = ({ value }) => (value == null ? <span className="text-muted-foreground">—</span> : <span className="tabular-nums">{formatHours(value)}</span>);

const getColumns = (sortBy, sortOrder, onSort) => [
  columnHelper.accessor('buName', {
    header: () => <SortableHeader label="BU Name" column={SORTABLE.BU_NAME} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />,
    size: 220,
    meta: { sticky: true, left: 0 },
    enableSorting: false,
    cell: (info) => <div className="truncate font-medium max-w-[200px]" title={info.getValue()}>{info.getValue() || '—'}</div>,
  }),
  // The Sub BU's own name, or null for a top-level BU row — this row's `buName` is already its
  // PARENT's name in that case (resolved server-side), so this column never duplicates it.
  // Deliberately not sticky, unlike BU Name — it scrolls with the rest of the hour/utilisation
  // columns.
  columnHelper.accessor('subBuName', {
    header: () => <SortableHeader label="Sub BU Name" column={SORTABLE.SUB_BU_NAME} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} />,
    size: 180,
    enableSorting: false,
    cell: (info) => {
      const value = info.getValue();
      if (!value) return <span className="text-muted-foreground">—</span>;
      return <div className="truncate max-w-[160px]" title={value}>{value}</div>;
    },
  }),
  columnHelper.accessor('totalEmployees', {
    header: () => <SortableHeader label="Total Employees" column={SORTABLE.EMPLOYEE_COUNT} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} align="right" />,
    size: 150,
    meta: { align: 'right' },
    enableSorting: false,
    cell: (info) => <span className="tabular-nums">{info.getValue() ?? 0}</span>,
  }),
  columnHelper.accessor('expectedHours', {
    header: () => <SortableHeader label="Expected Hrs" column={SORTABLE.EXPECTED_HOURS} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} align="right" />,
    size: 140,
    meta: { align: 'right' },
    enableSorting: false,
    cell: (info) => <HoursCell value={info.getValue()} />,
  }),
  columnHelper.accessor('billableHours', {
    header: () => <SortableHeader label="Billable Hrs" column={SORTABLE.BILLABLE_HOURS} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} align="right" />,
    size: 140,
    meta: { align: 'right' },
    enableSorting: false,
    cell: (info) => <HoursCell value={info.getValue()} />,
  }),
  columnHelper.accessor('nonBillableHours', {
    header: () => <SortableHeader label="Non-Billable Hrs" column={SORTABLE.NON_BILLABLE_HOURS} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} align="right" />,
    size: 160,
    meta: { align: 'right' },
    enableSorting: false,
    cell: (info) => <HoursCell value={info.getValue()} />,
  }),
  columnHelper.accessor('customerNonBillableHours', {
    header: () => <SortableHeader label="Customer Non-Billable Hrs" column={SORTABLE.CUSTOMER_NON_BILLABLE_HOURS} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} align="right" />,
    size: 200,
    meta: { align: 'right' },
    enableSorting: false,
    cell: (info) => <HoursCell value={info.getValue()} />,
  }),
  columnHelper.accessor('totalLoggedHours', {
    header: () => <SortableHeader label="Total Logged Hrs" column={SORTABLE.TOTAL_LOGGED_HOURS} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} align="right" />,
    size: 160,
    meta: { align: 'right' },
    enableSorting: false,
    cell: (info) => <HoursCell value={info.getValue()} />,
  }),
  columnHelper.accessor('utilizationPercentage', {
    header: () => <SortableHeader label="Utilisation %" column={SORTABLE.UTILIZATION} sortBy={sortBy} sortOrder={sortOrder} onSort={onSort} align="right" />,
    size: 140,
    meta: { align: 'right' },
    enableSorting: false,
    cell: (info) => {
      const value = info.getValue();
      if (value == null) return <span className="text-muted-foreground">—</span>;
      return <span className={cn('tabular-nums font-medium', utilizationColorClass(value))}>{formatPercentage(value, 2)}</span>;
    },
  }),
  // notLoggedHours = Expected Hrs - Total Logged Hrs (never negative), computed server-side — not
  // a synced/original pair, so it has no "Original" twin of its own.
  columnHelper.accessor('notLoggedHours', {
    header: 'Not Logged Hrs',
    size: 150,
    meta: { align: 'right' },
    enableSorting: false,
    cell: (info) => <HoursCell value={info.getValue()} />,
  }),
  // Original (pre-monthly-cap-adjustment) twins of the synced Billable/Non-Billable/Customer
  // Non-Billable/Total Logged/Utilisation columns above — same formatting, same "—" for a
  // genuinely missing value (older rows the backend hasn't backfilled), plain zero otherwise.
  // Skipped (hidden) entirely only if the backend row carries none of these fields at all.
  columnHelper.accessor('originalBillableHours', {
    header: 'Original Billable Hrs',
    size: 160,
    meta: { align: 'right' },
    enableSorting: false,
    cell: (info) => <HoursCell value={info.getValue()} />,
  }),
  columnHelper.accessor('originalNonBillableHours', {
    header: 'Original Non-Billable Hrs',
    size: 190,
    meta: { align: 'right' },
    enableSorting: false,
    cell: (info) => <HoursCell value={info.getValue()} />,
  }),
  columnHelper.accessor('originalCustomerNonBillableHours', {
    header: 'Original Customer Non-Billable Hrs',
    size: 230,
    meta: { align: 'right' },
    enableSorting: false,
    cell: (info) => <HoursCell value={info.getValue()} />,
  }),
  columnHelper.accessor('originalTotalLoggedHours', {
    header: 'Original Total Logged Hrs',
    size: 190,
    meta: { align: 'right' },
    enableSorting: false,
    cell: (info) => <HoursCell value={info.getValue()} />,
  }),
  columnHelper.accessor('originalUtilizationPercentage', {
    header: 'Original Utilisation %',
    size: 170,
    meta: { align: 'right' },
    enableSorting: false,
    cell: (info) => {
      const value = info.getValue();
      if (value == null) return <span className="text-muted-foreground">—</span>;
      return <span className={cn('tabular-nums font-medium', utilizationColorClass(value))}>{formatPercentage(value, 2)}</span>;
    },
  }),
];

const SummaryItem = ({ label, value }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[11px] text-muted-foreground">{label}</span>
    <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
  </div>
);

const BuWiseUtilisation = () => {
  const [periodMode, setPeriodMode] = useState('month');
  const [monthYear, setMonthYear] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const [dateRange, setDateRange] = useState(null);

  const [entityIds, setEntityIds] = useState([]);
  const [buIds, setBuIds] = useState([]);
  const [employeeIds, setEmployeeIds] = useState([]);
  const [clientIds, setClientIds] = useState([]);
  const [projectIds, setProjectIds] = useState([]);
  const [serviceTypeIds, setServiceTypeIds] = useState([]);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [search, setSearch] = useState('');
  const [isExporting, setIsExporting] = useState(false);
  const { error: showError } = useNotification();
  const debouncedSearch = useDebounce(search, 400);

  // Omitted entirely for "Adjusted (after sync)" (the default); 'O' for "Original logged" —
  // same privileged-view gating every other report's Original/Adjusted toggle already uses.
  const [hoursSource, setHoursSource] = useState('');
  const canViewOriginal = useCanViewOriginalData();
  useEffect(() => {
    if (!canViewOriginal) setHoursSource('');
  }, [canViewOriginal]);

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sortBy, setSortBy] = useState(SORTABLE.UTILIZATION);
  const [sortOrder, setSortOrder] = useState('DESC');

  const { data: activeEmployees = [] } = useActiveEmployees();
  const { data: activeClients = [] } = useActiveClients();
  const { data: activePOs = [] } = useActiveServicePOs();
  const { data: activeServiceTypes = [] } = useActiveServiceTypes();

  const periodReady = periodMode === 'month'
    ? !!(monthYear?.month && monthYear?.year)
    : !!(dateRange?.startDate && dateRange?.endDate);

  const params = {
    ...(periodMode === 'month'
      ? monthYear?.month && monthYear?.year && { month: monthYear.month, year: monthYear.year }
      : dateRange?.startDate && dateRange?.endDate && { startDate: dateRange.startDate, endDate: dateRange.endDate }),
    ...(hoursSource === 'O' && { hoursSource: 'O' }),
    ...(debouncedSearch && { search: debouncedSearch }),
    sortBy,
    sortOrder,
    page,
    limit,
    buId: ALL_BUS,
    ...(entityIds.length > 0 && { entityIds: entityIds.join(',') }),
    ...(buIds.length > 0 && { businessUnitIds: buIds.join(',') }),
    ...(employeeIds.length > 0 && { employeeIds: employeeIds.join(',') }),
    ...(clientIds.length > 0 && { clientIds: clientIds.join(',') }),
    ...(projectIds.length > 0 && { projectIds: projectIds.join(',') }),
    ...(serviceTypeIds.length > 0 && { serviceTypeIds: serviceTypeIds.join(',') }),
  };

  const { data, isPending, isError, error } = useBuWiseUtilisation(params);
  const errorMessage = isError ? extractApiError(error) : null;

  const rawRecords = Array.isArray(data?.data?.records) ? data.data.records : [];
  const records = useMemo(() => {
    return rawRecords.map((r) => ({
      ...r,
      totalEmployees: r.totalEmployees ?? r.total_employees,
      expectedHours: r.expectedHours ?? r.expected_hours,
      billableHours: r.billableHours ?? r.billable_hours,
      nonBillableHours: r.nonBillableHours ?? r.non_billable_hours,
      customerNonBillableHours: r.customerNonBillableHours ?? r.customer_non_billable_hours,
      totalLoggedHours: r.totalLoggedHours ?? r.total_logged_hours,
      utilizationPercentage: r.utilizationPercentage ?? r.utilization_percentage,
      notLoggedHours: r.notLoggedHours ?? r.not_logged_hours,
      originalBillableHours: r.originalBillableHours ?? r.original_billable_hours,
      originalNonBillableHours: r.originalNonBillableHours ?? r.original_non_billable_hours,
      originalCustomerNonBillableHours: r.originalCustomerNonBillableHours ?? r.original_customer_non_billable_hours,
      originalTotalLoggedHours: r.originalTotalLoggedHours ?? r.original_total_logged_hours,
      originalUtilizationPercentage: r.originalUtilizationPercentage ?? r.original_utilization_percentage,
    }));
  }, [rawRecords]);

  const rawSummary = data?.data?.summary ?? null;
  const summary = useMemo(() => {
    if (!rawSummary) return null;
    return {
      ...rawSummary,
      totalEmployees: rawSummary.totalEmployees ?? rawSummary.total_employees,
      expectedHours: rawSummary.expectedHours ?? rawSummary.expected_hours,
      billableHours: rawSummary.billableHours ?? rawSummary.billable_hours,
      nonBillableHours: rawSummary.nonBillableHours ?? rawSummary.non_billable_hours,
      customerNonBillableHours: rawSummary.customerNonBillableHours ?? rawSummary.customer_non_billable_hours,
      totalLoggedHours: rawSummary.totalLoggedHours ?? rawSummary.total_logged_hours,
      utilizationPercentage: rawSummary.utilizationPercentage ?? rawSummary.utilization_percentage,
      notLoggedHours: rawSummary.notLoggedHours ?? rawSummary.not_logged_hours,
      originalBillableHours: rawSummary.originalBillableHours ?? rawSummary.original_billable_hours,
      originalNonBillableHours: rawSummary.originalNonBillableHours ?? rawSummary.original_non_billable_hours,
      originalCustomerNonBillableHours: rawSummary.originalCustomerNonBillableHours ?? rawSummary.original_customer_non_billable_hours,
      originalTotalLoggedHours: rawSummary.originalTotalLoggedHours ?? rawSummary.original_total_logged_hours,
      originalUtilizationPercentage: rawSummary.originalUtilizationPercentage ?? rawSummary.original_utilization_percentage,
    };
  }, [rawSummary]);

  const period = data?.data?.period ?? null;
  const meta = data?.meta ?? {};
  const showLoading = periodReady && isPending;

  const periodLabel = period?.startDate && period?.endDate
    ? `${formatDate(period.startDate)} - ${formatDate(period.endDate)}`
    : null;

  const activeFilterCount = [
    entityIds.length > 0,
    buIds.length > 0,
    employeeIds.length > 0,
    clientIds.length > 0,
    projectIds.length > 0,
    serviceTypeIds.length > 0,
  ].filter(Boolean).length;

  const clearFilters = () => {
    setEntityIds([]);
    setBuIds([]);
    setEmployeeIds([]);
    setClientIds([]);
    setProjectIds([]);
    setServiceTypeIds([]);
    setPage(1);
  };

  const handleSort = (column) => {
    if (sortBy === column) {
      setSortOrder((o) => (o === 'ASC' ? 'DESC' : 'ASC'));
    } else {
      setSortBy(column);
      setSortOrder('DESC');
    }
    setPage(1);
  };

  // Every row matching the current filters, exported server-side — the table is server-paginated,
  // so the rest of the result set isn't in memory (page/limit are stripped, same as the other reports).
  const handleExport = async () => {
    setIsExporting(true);
    try {
      const { page: _p, limit: _l, ...exportParams } = params;
      const result = await reportsApi.exportBuWiseUtilisation(exportParams);
      downloadBlob(result.blob, result.filename);
    } catch (err) {
      showError(extractApiError(err));
    } finally {
      setIsExporting(false);
    }
  };

  const handlePeriodModeChange = (mode) => {
    setPeriodMode(mode);
    setPage(1);
  };

  const hasOriginal = records.some((r) => r.originalTotalLoggedHours != null);
  const columns = getColumns(sortBy, sortOrder, handleSort).filter((c) => {
    if (hasOriginal) return true;
    const isOriginal =
      (typeof c.header === 'string' && c.header.startsWith('Original')) ||
      (typeof c.accessorKey === 'string' && c.accessorKey.startsWith('original'));
    return !isOriginal;
  });

  return (
    <div className="flex h-full min-h-0 flex-col">
      <PageHeader
        title="BU-wise Utilisation"
        description={periodLabel ? `Showing: ${periodLabel}` : undefined}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search BU or Sub BU name…"
              className="w-full sm:w-56"
            />
            {canViewOriginal && (
              <div className="flex items-center gap-0.5 p-0.5 rounded-xl bg-muted border shrink-0">
                {[
                  { value: '', label: 'Adjusted' },
                  { value: 'O', label: 'Original' },
                ].map(({ value, label }) => (
                  <button
                    key={value || 'adjusted'}
                    type="button"
                    onClick={() => { setHoursSource(value); setPage(1); }}
                    className={cn(
                      'flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all duration-150 whitespace-nowrap',
                      hoursSource === value ? 'bg-card shadow-sm text-emerald-600 dark:text-emerald-400' : 'text-muted-foreground hover:text-foreground'
                    )}
                  >
                    {label}
                  </button>
                ))}
              </div>
            )}
            {periodReady && records.length > 0 && (
              <Button variant="outline" size="toolbar" onClick={handleExport} disabled={isExporting}>
                <Download className="h-4 w-4" />{isExporting ? 'Exporting…' : 'Export Excel'}
              </Button>
            )}
            <FilterToggleButton isOpen={filtersOpen} onToggle={() => setFiltersOpen((p) => !p)} activeCount={activeFilterCount} />
          </div>
        }
      />

      {errorMessage && (
        <div className="mb-4 flex items-start gap-2 rounded-lg border border-destructive/30 bg-destructive/5 px-4 py-3 text-sm text-destructive">
          <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
          <span>{errorMessage}</span>
        </div>
      )}

      <FilterPanel isOpen={filtersOpen} onClear={clearFilters} showClear={activeFilterCount > 0}>
        <EntityFilter multiple value={entityIds} onChange={(v) => { setEntityIds(v); setBuIds([]); setPage(1); }} />

        <BusinessUnitFilter multiple value={buIds} entityId={entityIds} onChange={(v) => { setBuIds(v); setPage(1); }} />

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Period</Label>
          <Tabs value={periodMode} onValueChange={handlePeriodModeChange}>
            <TabsList className="grid w-full grid-cols-2 border border-input bg-slate-100">
              <TabsTrigger value="month" className="text-xs font-semibold data-[state=active]:bg-white">Month</TabsTrigger>
              <TabsTrigger value="range" className="text-xs font-semibold data-[state=active]:bg-white">Date Range</TabsTrigger>
            </TabsList>
          </Tabs>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">
            {periodMode === 'month' ? 'Month & Year' : 'Date Range'} <span className="text-destructive">*</span>
          </Label>
          {periodMode === 'month' ? (
            <MonthYearPicker
              value={monthYear}
              onChange={(val) => { setMonthYear(val); setPage(1); }}
              placeholder="Select month"
              clearable={false}
              className="w-full"
            />
          ) : (
            <DateRangePicker
              value={dateRange}
              onChange={(val) => { setDateRange(val); setPage(1); }}
              placeholder="Select date range"
              className="w-full"
            />
          )}
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Employee</Label>
          <MultiSelect
            options={activeEmployees.map((e) => ({ label: e.full_name, value: String(e.id) }))}
            value={employeeIds}
            onValueChange={(v) => { setEmployeeIds(v); setPage(1); }}
            placeholder="All Employees"
            searchPlaceholder="Search employee..."
            className="h-[clamp(1.875rem,2vw,2.25rem)] w-full text-[clamp(0.75rem,0.85vw,0.875rem)] bg-white"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Client</Label>
          <MultiSelect
            options={activeClients.map((c) => ({ label: c.client_name, value: String(c.id) }))}
            value={clientIds}
            onValueChange={(v) => { setClientIds(v); setPage(1); }}
            placeholder="All Clients"
            searchPlaceholder="Search client..."
            className="h-[clamp(1.875rem,2vw,2.25rem)] w-full text-[clamp(0.75rem,0.85vw,0.875rem)] bg-white"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Project (Service PO)</Label>
          <MultiSelect
            options={activePOs.map((po) => ({ label: po.service_po_name || po.service_po_code || String(po.id), value: String(po.id) }))}
            value={projectIds}
            onValueChange={(v) => { setProjectIds(v); setPage(1); }}
            placeholder="All Projects"
            searchPlaceholder="Search project..."
            className="h-[clamp(1.875rem,2vw,2.25rem)] w-full text-[clamp(0.75rem,0.85vw,0.875rem)] bg-white"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Service Type</Label>
          <MultiSelect
            options={activeServiceTypes.map((st) => ({ label: st.service_type_name, value: String(st.id) }))}
            value={serviceTypeIds}
            onValueChange={(v) => { setServiceTypeIds(v); setPage(1); }}
            placeholder="All Service Types"
            searchPlaceholder="Search service type..."
            className="h-[clamp(1.875rem,2vw,2.25rem)] w-full text-[clamp(0.75rem,0.85vw,0.875rem)] bg-white"
          />
        </div>
      </FilterPanel>

      <DataTable
        mobileCards
        columns={columns}
        data={records}
        isLoading={showLoading}
        emptyState={
          !periodReady ? (
            <EmptyState title="Select a period" description="Choose a month or a date range to load BU-wise utilisation." />
          ) : (
            <EmptyState title="No data for the selected filters." />
          )
        }
        pagination={periodReady && meta.total != null ? { page: meta.page ?? page, limit: meta.limit ?? limit, total: meta.total } : undefined}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
      />

      {/* Covers every matching row across every page (the backend's own `summary`), not just the
          page currently on screen — DataTable has no pinned-footer-row feature of its own, so this
          mirrors every other report's own "Totals" bar convention instead of faking one inside the
          table. */}
      {summary && (
        <div className="mt-4 rounded-lg border bg-muted/40 px-4 py-3">
          <p className="mb-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Total (All Pages)</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <SummaryItem label="Total Employees" value={summary.totalEmployees ?? 0} />
            <SummaryItem label="Expected Hrs" value={formatHours(summary.expectedHours)} />
            <SummaryItem label="Billable Hrs" value={formatHours(summary.billableHours)} />
            <SummaryItem label="Non-Billable Hrs" value={formatHours(summary.nonBillableHours)} />
            <SummaryItem label="Customer Non-Billable Hrs" value={formatHours(summary.customerNonBillableHours)} />
            <SummaryItem label="Total Logged Hrs" value={formatHours(summary.totalLoggedHours)} />
            <SummaryItem label="Utilisation %" value={summary.utilizationPercentage != null ? formatPercentage(summary.utilizationPercentage, 2) : '—'} />
            <SummaryItem label="Not Logged Hrs" value={formatHours(summary.notLoggedHours)} />
            {hasOriginal && (
              <>
                <SummaryItem label="Original Billable Hrs" value={formatHours(summary.originalBillableHours)} />
                <SummaryItem label="Original Non-Billable Hrs" value={formatHours(summary.originalNonBillableHours)} />
                <SummaryItem label="Original Customer Non-Billable Hrs" value={formatHours(summary.originalCustomerNonBillableHours)} />
                <SummaryItem label="Original Total Logged Hrs" value={formatHours(summary.originalTotalLoggedHours)} />
                <SummaryItem label="Original Utilisation %" value={summary.originalUtilizationPercentage != null ? formatPercentage(summary.originalUtilizationPercentage, 2) : '—'} />
              </>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default BuWiseUtilisation;
