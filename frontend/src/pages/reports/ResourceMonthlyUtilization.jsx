import { useState } from 'react';
import * as XLSX from 'xlsx';
import { createColumnHelper } from '@tanstack/react-table';
import { Download } from 'lucide-react';
import { useResourceMonthlyUtilization } from '@/hooks/useReports';
import { reportsApi } from '@/api/reports.api';
import { extractReportRows } from '@/utils/reportEnvelope';
import { useDebounce } from '@/hooks/useDebounce';
import { useActiveEmployees } from '@/hooks/useEmployees';
import { useActiveClients } from '@/hooks/useClients';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import FilterToggleButton from '@/components/common/FilterToggleButton';
import FilterPanel from '@/components/common/FilterPanel';
import BusinessUnitFilter, { ALL_BUS } from '@/components/common/BusinessUnitFilter';
import EntityFilter, { ALL_ENTITIES } from '@/components/common/EntityFilter';
import SearchInput from '@/components/common/SearchInput';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MonthYearPicker } from '@/components/ui/month-year-picker';

const columnHelper = createColumnHelper();
const now = new Date();
const ALL = 'all';

const MONTH_ABBR = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
const shortMonthLabel = (month, year) => `${MONTH_ABBR[(month ?? 1) - 1]} ${year ?? ''}`.trim();

// This report has no sortBy/sortOrder param in its own contract (unlike PM-wise/Project-wise
// Utilization), so columns here are plain headers — no server-sort wiring.
const formatHours2 = (value) => (value == null ? '—' : Number(value).toFixed(2));

// Same plain "{value}%"/em-dash cell MonthlyResourceUtilization.jsx already uses for its own
// utilization_percentage column — copied here rather than imported since that file has no
// exported/shared version of it (it's defined locally there too), and per this task's own "do
// not touch other report screens" constraint, extracting one now would mean also editing that
// file to use it.
const UtilizationPercentCell = ({ value }) => {
  if (value == null) return <span className="text-muted-foreground">—</span>;
  return <span className="tabular-nums">{Number(value).toFixed(2)}%</span>;
};

const columns = [
  columnHelper.accessor('employeeName', {
    header: 'Employee',
    size: 200,
    meta: { sticky: true, left: 0 },
    cell: (info) => {
      const row = info.row.original;
      return (
        <div className="min-w-0 truncate font-medium" title={row.employeeCode ? `${row.employeeName} (${row.employeeCode})` : row.employeeName}>
          {row.employeeName || '—'}
        </div>
      );
    },
  }),
  columnHelper.accessor((row) => shortMonthLabel(row.month, row.year), {
    id: 'month',
    header: 'Month',
    size: 110,
    cell: (info) => <span className="whitespace-nowrap">{info.getValue()}</span>,
  }),
  columnHelper.accessor('billableHours', {
    header: 'Billable (hrs)',
    size: 140,
    meta: { align: 'right' },
    cell: (info) => <span className="tabular-nums">{formatHours2(info.getValue())}</span>,
  }),
  columnHelper.accessor('nonBillableHours', {
    header: 'Non-Billable (hrs)',
    size: 160,
    meta: { align: 'right' },
    cell: (info) => <span className="tabular-nums">{formatHours2(info.getValue())}</span>,
  }),
  columnHelper.accessor('totalHours', {
    header: 'Total Hours',
    size: 130,
    meta: { align: 'right' },
    cell: (info) => <span className="tabular-nums font-medium">{formatHours2(info.getValue())}</span>,
  }),
  columnHelper.accessor('billableUtilizationPercentage', {
    header: 'Billable Utilisation %',
    size: 170,
    meta: { align: 'right' },
    cell: (info) => <UtilizationPercentCell value={info.getValue()} />,
  }),
  columnHelper.accessor('nonBillableUtilizationPercentage', {
    header: 'Non-Billable Utilisation %',
    size: 190,
    meta: { align: 'right' },
    cell: (info) => <UtilizationPercentCell value={info.getValue()} />,
  }),
  columnHelper.accessor('overallUtilizationPercentage', {
    header: 'Overall Utilisation %',
    size: 170,
    meta: { align: 'right' },
    cell: (info) => <UtilizationPercentCell value={info.getValue()} />,
  }),
];

const SummaryItem = ({ label, value }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[11px] text-muted-foreground">{label}</span>
    <span className="text-sm font-semibold tabular-nums text-foreground">{value}</span>
  </div>
);

// Every sibling report on this page (Employee Utilization Summary, PM-wise/Project-wise
// Utilization, …) has an Export Excel action — this one didn't. Follows
// EmployeeUtilizationSummary's "export every matching record, not just the current page" pattern
// (one extra request with a wide `limit`) since this endpoint is server-paginated the same way.
const exportToExcel = (rows) => {
  const header = [
    'Employee', 'Employee Code', 'Month', 'Billable (hrs)', 'Non-Billable (hrs)', 'Total Hours',
    'Billable Utilisation %', 'Non-Billable Utilisation %', 'Overall Utilisation %',
  ];
  const dataRows = rows.map((r) => [
    r.employeeName ?? '',
    r.employeeCode ?? '',
    shortMonthLabel(r.month, r.year),
    r.billableHours != null ? Number(r.billableHours) : '',
    r.nonBillableHours != null ? Number(r.nonBillableHours) : '',
    r.totalHours != null ? Number(r.totalHours) : '',
    r.billableUtilizationPercentage != null ? Number(r.billableUtilizationPercentage) : '',
    r.nonBillableUtilizationPercentage != null ? Number(r.nonBillableUtilizationPercentage) : '',
    r.overallUtilizationPercentage != null ? Number(r.overallUtilizationPercentage) : '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Resource Monthly Utilisation');
  XLSX.writeFile(wb, 'Resource_Monthly_Utilisation_Report.xlsx');
};

// Employee/resource-wise monthly utilization, split into Billable / Non-Billable / Overall — a
// NEW, separate screen from MonthlyResourceUtilization.jsx (dynamic service-category "Excel-
// style" report) and ResourceProjectUtilization.jsx (per-project hours breakdown); neither of
// those files, their API calls, or shared components are touched by this addition.
//
// GET /reports/resource-monthly-utilization has no sortBy/search-across-pages contract beyond a
// single `search` param and is server-paginated — no client-side widen-and-filter needed here.
// `summary` is explicitly PAGE-LEVEL (the backend aggregates only the current page's rows, not
// the full filtered dataset) — shown as-is from the response, never recomputed client-side (the
// task spec is explicit: these are aggregated server-side from hours, not averaged from per-row
// percentages, so summing/averaging them again client-side would double-derive and drift from
// the real figures), and labeled "This Page's Totals" rather than "Total (all pages)" so it's
// never mistaken for a grand total the way IRT/PM-wise Utilization's own Total row is.
const ResourceMonthlyUtilization = () => {
  const [monthYear, setMonthYear] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const [employeeId, setEmployeeId] = useState(ALL);
  const [clientId, setClientId] = useState(ALL);
  const [poId, setPoId] = useState(ALL);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [entityId, setEntityId] = useState(ALL_ENTITIES);
  const [buId, setBuId] = useState(ALL_BUS);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebounce(search, 400);

  const { data: activeEmployees = [] } = useActiveEmployees();
  const { data: activeClients = [] } = useActiveClients();
  const { data: activePOs = [] } = useActiveServicePOs();

  const periodReady = !!(monthYear?.month && monthYear?.year);

  const params = {
    month: monthYear.month,
    year: monthYear.year,
    ...(employeeId !== ALL && { employeeId }),
    ...(clientId !== ALL && { clientId }),
    ...(poId !== ALL && { poId }),
    ...(debouncedSearch && { search: debouncedSearch }),
    page,
    limit,
    buId,
    ...(entityId !== ALL_ENTITIES && { entityId }),
  };

  const { data, isPending } = useResourceMonthlyUtilization(params);

  const records = extractReportRows(data);
  const meta = data?.meta ?? {};
  const summary = data?.data?.summary ?? null;
  const showLoading = periodReady && isPending;

  // Export pulls every matching record (not just the current page) with one extra request —
  // same tradeoff EmployeeUtilizationSummary documents for its own export.
  const handleExport = async () => {
    setExporting(true);
    try {
      const total = meta.total > 0 ? meta.total : 1000;
      const res = await reportsApi.getResourceMonthlyUtilization({ ...params, page: 1, limit: total });
      exportToExcel(extractReportRows(res));
    } finally {
      setExporting(false);
    }
  };

  const activeFilterCount = (entityId !== ALL_ENTITIES ? 1 : 0)
    + (buId !== ALL_BUS ? 1 : 0)
    + (employeeId !== ALL ? 1 : 0)
    + (clientId !== ALL ? 1 : 0)
    + (poId !== ALL ? 1 : 0);

  const clearFilters = () => {
    setEntityId(ALL_ENTITIES);
    setBuId(ALL_BUS);
    setEmployeeId(ALL);
    setClientId(ALL);
    setPoId(ALL);
    setPage(1);
  };

  return (
    // No `h-full min-h-0` here (unlike most report pages) — that combination is what tells
    // DataTable to treat itself as the page's internal scroll owner, squeezed into whatever
    // viewport space is left after the header/filters/pagination/summary below it. For a report
    // capped at a small page size (10 rows by default) that squeeze was clipping rows that
    // should just be fully visible, and forcing a matching min-height on the table container
    // instead just left dead empty space AND broke the sticky header/pagination positioning on
    // pages with fewer rows. Letting this page size to its natural content height and scroll as a
    // whole (like the page itself, not the table) avoids both problems.
    <div className="flex flex-col">
      <PageHeader
        title="Resource Monthly Utilisation"
        description="Employee-wise monthly utilisation, split into billable, non-billable, and overall."
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SearchInput
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              placeholder="Search employee name or code…"
              className="w-full sm:w-full md:w-72"
            />
            <FilterToggleButton
              isOpen={filtersOpen}
              onToggle={() => setFiltersOpen((p) => !p)}
              activeCount={activeFilterCount}
              className="h-9"
            />
            {records.length > 0 && (
              <Button variant="outline" size="toolbar" onClick={handleExport} disabled={exporting}>
                <Download className="h-4 w-4" />{exporting ? 'Exporting…' : 'Export Excel'}
              </Button>
            )}
          </div>
        }
      />

      <FilterPanel
        isOpen={filtersOpen}
        maxHeightClass="max-h-[440px]"
        onClear={clearFilters}
        showClear={activeFilterCount > 0}
      >
        <EntityFilter value={entityId} onChange={(v) => { setEntityId(v); setBuId(ALL_BUS); setPage(1); }} />

        <BusinessUnitFilter value={buId} entityId={entityId} onChange={(v) => { setBuId(v); setPage(1); }} />

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Month &amp; Year <span className="text-destructive">*</span></Label>
          <MonthYearPicker
            value={monthYear}
            onChange={(val) => { if (val) { setMonthYear(val); setPage(1); } }}
            placeholder="Select month"
            clearable={false}
            className="w-full"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Employee</Label>
          <SearchableSelect
            options={[{ label: 'All Employees', value: ALL }, ...activeEmployees.map((e) => ({ label: e.full_name, value: String(e.id) }))]}
            value={employeeId}
            onValueChange={(v) => { setEmployeeId(v ?? ALL); setPage(1); }}
            placeholder="All Employees"
            searchPlaceholder="Search employee..."
            className="h-9 w-full text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Client</Label>
          <SearchableSelect
            options={[{ label: 'All Clients', value: ALL }, ...activeClients.map((c) => ({ label: c.client_name, value: String(c.id) }))]}
            value={clientId}
            onValueChange={(v) => { setClientId(v ?? ALL); setPage(1); }}
            placeholder="All Clients"
            searchPlaceholder="Search client..."
            className="h-9 w-full text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Service PO / Project</Label>
          <SearchableSelect
            options={[
              { label: 'All Service POs', value: ALL },
              ...activePOs.map((po) => ({ label: po.service_po_name || po.service_po_code || String(po.id), value: String(po.id) })),
            ]}
            value={poId}
            onValueChange={(v) => { setPoId(v ?? ALL); setPage(1); }}
            placeholder="All Service POs"
            searchPlaceholder="Search service PO..."
            className="h-9 w-full text-sm"
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
            <EmptyState title="Select a month" description="Choose a month and year to load this report." />
          ) : undefined
        }
        pagination={periodReady && meta.total != null ? { page: meta.page ?? page, limit: meta.limit ?? limit, total: meta.total } : undefined}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
      />

      {summary && (
        <div className="mt-4 rounded-lg border bg-muted/40 px-4 py-3">
          <p className="mb-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">This Page&apos;s Totals</p>
          <p className="mb-2 text-[11px] text-muted-foreground">
            Reflects only the rows shown on this page — not a grand total across every page of results.
          </p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <SummaryItem label="Billable Hrs" value={formatHours2(summary.billableHours)} />
            <SummaryItem label="Non-Billable Hrs" value={formatHours2(summary.nonBillableHours)} />
            <SummaryItem label="Total Hrs" value={formatHours2(summary.totalHours)} />
            <SummaryItem label="Billable Utilisation %" value={<UtilizationPercentCell value={summary.billableUtilizationPercentage} />} />
            <SummaryItem label="Non-Billable Utilisation %" value={<UtilizationPercentCell value={summary.nonBillableUtilizationPercentage} />} />
            <SummaryItem label="Overall Utilisation %" value={<UtilizationPercentCell value={summary.overallUtilizationPercentage} />} />
          </div>
        </div>
      )}
    </div>
  );
};

export default ResourceMonthlyUtilization;
