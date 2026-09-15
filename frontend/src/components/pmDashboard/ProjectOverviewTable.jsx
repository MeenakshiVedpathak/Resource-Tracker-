import { useMemo, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { usePmDashboardProjects } from '@/hooks/usePmDashboard';
import { useDebounce } from '@/hooks/useDebounce';
import { useInViewOnce } from '@/hooks/useInViewOnce';
import { formatDate, formatHours, formatPercentage, getStatusColor, capitalize } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import SearchInput from '@/components/common/SearchInput';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';

const columnHelper = createColumnHelper();

// Only these map onto the backend's documented sortBy enum (project_name|team_size|
// planned_hours|actual_hours|variance_pct|overdue_po_count|nearest_end_date) — every other
// column here (Client, Status, # Service POs, Risk) has no server-side sort field to send, so
// they're left non-sortable rather than silently sending a sortBy value the backend won't
// recognize.
const columns = [
  columnHelper.accessor('project_name', {
    header: 'Project Name',
    size: 220,
    meta: { sticky: true },
    cell: (info) => (
      <div className="truncate max-w-[200px] font-medium" title={info.getValue()}>
        {info.getValue()}
      </div>
    ),
  }),
  columnHelper.accessor('client_name', {
    header: 'Client',
    size: 160,
    enableSorting: false,
    cell: (info) => <div className="truncate max-w-[140px]" title={info.getValue()}>{info.getValue() || '—'}</div>,
  }),
  columnHelper.accessor('project_status', {
    header: 'Status',
    size: 110,
    enableSorting: false,
    cell: (info) => <Badge variant={getStatusColor(info.getValue())}>{capitalize(info.getValue())}</Badge>,
  }),
  columnHelper.accessor('service_po_count', {
    header: '# Service POs',
    size: 120,
    enableSorting: false,
    cell: (info) => (
      <span className="tabular-nums">
        {info.getValue() ?? 0}
        <span className="text-muted-foreground"> ({info.row.original.active_po_count ?? 0} active)</span>
      </span>
    ),
  }),
  columnHelper.accessor('team_size', {
    header: 'Team Size',
    size: 100,
    cell: (info) => <span className="tabular-nums">{info.getValue() ?? 0}</span>,
  }),
  columnHelper.accessor('actual_hours', {
    header: 'Logged Hours (MTD)',
    size: 150,
    cell: (info) => <span className="tabular-nums">{formatHours(info.getValue())}</span>,
  }),
  columnHelper.accessor('planned_hours', {
    header: 'Planned Hours (MTD)',
    size: 150,
    cell: (info) => <span className="tabular-nums">{formatHours(info.getValue())}</span>,
  }),
  columnHelper.accessor('variance_pct', {
    header: 'Variance %',
    size: 110,
    cell: (info) => {
      const v = info.getValue();
      return (
        <span className={cn('tabular-nums font-medium', v != null && Math.abs(v) >= 20 && 'text-destructive')}>
          {v == null ? '—' : formatPercentage(v)}
        </span>
      );
    },
  }),
  columnHelper.accessor('risk_flag', {
    header: 'Risk',
    size: 100,
    enableSorting: false,
    cell: (info) => (
      <Badge variant={info.getValue() ? 'destructive' : 'success'}>
        {info.getValue() ? 'At Risk' : 'On Track'}
      </Badge>
    ),
  }),
  columnHelper.accessor('nearest_end_date', {
    header: 'Nearest Deadline',
    size: 140,
    cell: (info) => <span className="whitespace-nowrap">{formatDate(info.getValue())}</span>,
  }),
];

// Section 1 — Project Overview: the default view of GET /pm-dashboard/projects. Deliberately
// deferred (useInViewOnce) — the KPI row and Action Required feed above the fold must populate
// instantly on load; this table is allowed to lazy-load once it's about to scroll into view.
const ProjectOverviewTable = ({ monthYear, buId }) => {
  const [sectionRef, inView] = useInViewOnce();
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  // Default sort: nearest deadline first (the backend has no direct "risk first" sortBy field —
  // see the client-side re-sort below for how that half of the spec's default order is met).
  const [sorting, setSorting] = useState([{ id: 'nearest_end_date', desc: false }]);

  const debouncedSearch = useDebounce(search, 400);

  const params = {
    buId,
    month: monthYear.month,
    year: monthYear.year,
    page,
    limit,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(sorting[0] && { sortBy: sorting[0].id, sortOrder: sorting[0].desc ? 'desc' : 'asc' }),
  };

  const { data, isPending } = usePmDashboardProjects(params, inView);
  const records = data?.records ?? [];
  const meta = data?.meta ?? {};

  // Risk-first is only ever applied on top of the untouched default sort (nearest deadline,
  // ascending) — the moment a user clicks a different column header, their explicit choice is
  // respected as-is rather than fighting it with a risk-flag regroup they didn't ask for.
  const isDefaultSort = sorting.length === 0 || (sorting[0]?.id === 'nearest_end_date' && !sorting[0]?.desc);
  const displayRecords = useMemo(() => {
    if (!isDefaultSort) return records;
    // Array.prototype.sort is stable in every modern engine, so this only regroups by risk —
    // the server's own nearest_end_date-ascending order is preserved within each group.
    return [...records].sort((a, b) => (b.risk_flag === true) - (a.risk_flag === true));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [records, isDefaultSort]);

  return (
    <div ref={sectionRef} className="flex flex-col gap-3">
      <SearchInput
        value={search}
        onChange={(e) => { setSearch(e.target.value); setPage(1); }}
        placeholder="Search project or client…"
        className="w-full sm:w-72"
      />
      <DataTable
        columns={columns}
        data={displayRecords}
        mobileCards
        isLoading={!inView || isPending}
        pagination={meta.total != null ? { page: meta.page ?? page, limit: meta.limit ?? limit, total: meta.total } : undefined}
        sorting={sorting}
        onSortingChange={(s) => { setSorting(s); setPage(1); }}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
      />
    </div>
  );
};

export default ProjectOverviewTable;
