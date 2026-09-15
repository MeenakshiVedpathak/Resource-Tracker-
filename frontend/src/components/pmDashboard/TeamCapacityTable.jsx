import { useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { usePmDashboardTeam } from '@/hooks/usePmDashboard';
import { useDebounce } from '@/hooks/useDebounce';
import { formatHours, formatPercentage } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import SearchInput from '@/components/common/SearchInput';
import SegmentedToggle from '@/components/common/SegmentedToggle';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/utils/cn';

const columnHelper = createColumnHelper();

// Semantic red/amber/green — deliberately separate from the app's single brand accent color, per
// the spec: overallocated reads as a real capacity risk (red), bench as idle capacity worth
// reassigning (amber), everything else as healthy (green).
const capacityTone = (row) => {
  if (row.overallocation_flag) return 'destructive';
  if (row.bench_flag) return 'warning';
  return 'success';
};

const columns = [
  columnHelper.accessor('full_name', {
    header: 'Employee',
    size: 200,
    meta: { sticky: true },
    cell: (info) => (
      <div className="min-w-0">
        <p className="truncate font-medium" title={info.getValue()}>{info.getValue()}</p>
        <p className="truncate text-xs text-muted-foreground">{info.row.original.employee_code}</p>
      </div>
    ),
  }),
  columnHelper.accessor('designation', {
    header: 'Designation',
    size: 160,
    enableSorting: false,
    cell: (info) => <div className="truncate max-w-[140px]">{info.getValue() || '—'}</div>,
  }),
  columnHelper.accessor('monthly_capacity_hours', {
    header: 'Monthly Capacity',
    size: 130,
    enableSorting: false,
    cell: (info) => <span className="tabular-nums">{formatHours(info.getValue())}</span>,
  }),
  columnHelper.accessor('planned_hours', {
    header: 'Planned Hours',
    size: 120,
    cell: (info) => <span className="tabular-nums">{formatHours(info.getValue())}</span>,
  }),
  columnHelper.accessor('actual_hours', {
    header: 'Actual Hours',
    size: 120,
    cell: (info) => <span className="tabular-nums">{formatHours(info.getValue())}</span>,
  }),
  // Heuristic, not HR-verified leave data — see api/pmDashboard.api.js/the backend spec: hours
  // logged against a Service Type literally named "Leaves" (or a Service PO named "Idle"/"On
  // Bench" for no_work_hours below). Labelled accordingly rather than as authoritative leave.
  columnHelper.accessor('leave_hours', {
    header: 'Leave (logged)',
    size: 120,
    cell: (info) => <span className="tabular-nums">{formatHours(info.getValue())}</span>,
  }),
  columnHelper.accessor('no_work_hours', {
    header: 'No-Work Hours',
    size: 120,
    cell: (info) => <span className="tabular-nums">{formatHours(info.getValue())}</span>,
  }),
  columnHelper.accessor('capacity_used_pct', {
    header: 'Capacity Used',
    size: 170,
    cell: (info) => {
      const pct = info.getValue();
      const tone = capacityTone(info.row.original);
      return (
        <div className="flex flex-col gap-1">
          <div className="flex items-center justify-between gap-2 text-xs">
            <span className={cn('font-semibold tabular-nums', tone === 'destructive' && 'text-destructive')}>
              {formatPercentage(pct)}
            </span>
          </div>
          <Progress
            value={Math.min(100, Math.max(0, pct ?? 0))}
            className="h-1.5"
            indicatorClassName={
              tone === 'destructive' ? 'bg-destructive' : tone === 'warning' ? 'bg-warning' : 'bg-success'
            }
          />
        </div>
      );
    },
  }),
  columnHelper.display({
    id: 'status',
    header: 'Status',
    size: 130,
    enableSorting: false,
    cell: (info) => {
      const row = info.row.original;
      if (row.overallocation_flag) return <Badge variant="destructive">Overallocated</Badge>;
      if (row.bench_flag) return <Badge variant="warning">Bench</Badge>;
      return <Badge variant="success">Normal</Badge>;
    },
  }),
];

const STATUS_FILTERS = [
  { value: 'all', label: 'All' },
  { value: 'overallocated', label: 'Overallocated' },
  { value: 'bench', label: 'Bench' },
];

// Section 3 — Team & Capacity: GET /pm-dashboard/team. `statusFilter` narrows client-side (the
// backend has no overallocated/bench query param — only a `benchThresholdHours` that shapes the
// flag itself), same page of results, since a PM's own team size makes a second server round-trip
// pointless. `initialStatusFilter` lets the Overallocated Employees KPI land here pre-filtered.
const TeamCapacityTable = ({ monthYear, buId, initialStatusFilter = 'all' }) => {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState(initialStatusFilter);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [sorting, setSorting] = useState([]);

  const debouncedSearch = useDebounce(search, 400);

  const params = {
    buId,
    month: monthYear.month,
    year: monthYear.year,
    // Fetch a wide page when a status filter is active, since that filter only narrows what's
    // ALREADY on this page (client-side) — a small server page could otherwise show "0 results"
    // for a filter that has matches further down the full list.
    page: statusFilter === 'all' ? page : 1,
    limit: statusFilter === 'all' ? limit : 200,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(sorting[0] && { sortBy: sorting[0].id, sortOrder: sorting[0].desc ? 'desc' : 'asc' }),
  };

  const { data, isPending } = usePmDashboardTeam(params);
  const records = data?.records ?? [];
  const meta = data?.meta ?? {};

  const filteredRecords = statusFilter === 'all'
    ? records
    : records.filter((r) => (statusFilter === 'overallocated' ? r.overallocation_flag : r.bench_flag));

  const pagedRecords = statusFilter === 'all'
    ? filteredRecords
    : filteredRecords.slice((page - 1) * limit, page * limit);

  const pagination = statusFilter === 'all'
    ? (meta.total != null ? { page: meta.page ?? page, limit: meta.limit ?? limit, total: meta.total } : undefined)
    : { page, limit, total: filteredRecords.length };

  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-2">
        <SearchInput
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(1); }}
          placeholder="Search employee…"
          className="w-full sm:w-72"
        />
        <SegmentedToggle
          options={STATUS_FILTERS}
          value={statusFilter}
          onChange={(v) => { setStatusFilter(v); setPage(1); }}
          className="w-full sm:w-auto"
        />
      </div>
      <DataTable
        columns={columns}
        data={pagedRecords}
        mobileCards
        isLoading={isPending}
        pagination={pagination}
        sorting={sorting}
        onSortingChange={(s) => { setSorting(s); setPage(1); }}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
      />
    </div>
  );
};

export default TeamCapacityTable;
