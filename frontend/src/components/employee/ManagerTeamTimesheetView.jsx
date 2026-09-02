import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { createColumnHelper } from '@tanstack/react-table';
import { Check, X, ChevronRight, Loader2 } from 'lucide-react';
import {
  useMyTeamApprovalSummary, useApproveMyTeamTimesheets, useFetchAllApprovalBuckets,
  useRejectMyTeamTimesheetEntry, useApproveMyTeamTimesheetEntry,
} from '@/hooks/useMyTeam';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { formatDate, formatDateTime, formatMonthYear } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import StatusBadge from '@/components/common/StatusBadge';
import EmptyState from '@/components/common/EmptyState';
import RejectEntryDialog from '@/components/employee/RejectEntryDialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { DateRangePicker } from '@/components/ui/date-range-picker';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import { ScrollArea } from '@/components/ui/scroll-area';

const columnHelper = createColumnHelper();

// A drill-down entry (embedded inline in the summary row) carries a plain `hours` field — never
// `hours_logged`/`modified_hours`, that's only the shape of the separate flat-list endpoint.
const effectiveHours = (entry) => entry.modified_hours ?? entry.hours_logged ?? entry.hours;

// Daily rows are keyed by date; Monthly rows have no single date, only month+year. Works on a full
// summary row and on the trimmed selection descriptor below alike — both carry the key fields.
const rowKeyOf = (logType, row) => (logType === 'daily' ? row.date : `${row.year}-${row.month}`);

// What a selected row is remembered by. Selection outlives the page that made it (and the rows
// currently in memory), so it stores exactly what POST .../approve needs — plus the row's absolute
// index in the filtered set, which is what lets the banner say how far the selection reaches.
// Index rather than page number: the display page it maps to is index/pageSize, so the count stays
// right when the Manager changes rows-per-page instead of having to throw the selection away.
const selectionValueOf = (logType, row, index) => (logType === 'daily'
  ? { date: row.date, index }
  : { month: row.month, year: row.year, index });

// The live approval-summary response names this field `approval_status`, not `status` — despite
// the documented contract's sample calling it `status`; confirmed by inspecting the real network
// response, where a summary row otherwise matches the doc (date/month/year/total_hours/entry_count)
// but ships `approval_status` instead. Backend already forces this to 'approved' whenever
// approval_required is false for the Employee, so checking it alone is sufficient —
// approval_required is checked too only to mirror the spec's rule literally.
//
// Since the Work Log Rejection Workflow (2026-08-23), a bucket's `approval_status` can also be
// 'rejected' — any pending entry makes the whole bucket 'pending' first; a bucket only reads as
// 'rejected' once every entry in it has been individually rejected (never 'approved' in that
// case). Bulk/bucket-level Approve stays gated on 'pending' only, same as before — a 'rejected'
// bucket needs the Employee to edit+resubmit before a Manager can act on it again.
const isApprovable = (row) => row.approval_status === 'pending' && row.approval_required !== false;

// Individual entries inside a bucket's `entries[]` carry their own `status` — this is the
// granularity Approve/Reject actually operate at inside the drill-down drawer (PUT
// .../timesheets/:id/approve|reject), distinct from the bucket-level bulk endpoint above.
const isEntryPending = (entry) => entry.status === 'pending';
const isEntryRejected = (entry) => entry.status === 'rejected';

const buildYearOptions = () => {
  const current = dayjs().year();
  return Array.from({ length: 5 }, (_, i) => {
    const y = current - 3 + i;
    return { label: String(y), value: String(y) };
  });
};

// A mapped Employee's aggregated, approval-eligible timesheet — never the raw per-PO hierarchy
// rows (those live behind the drill-down drawer) and never the `drafts` array (an Employee's own
// unsynced work, not approval-eligible by definition). Daily mode shows one row per date, Monthly
// one row per month, both pre-aggregated server-side by GET .../approval-summary; bulk approval
// targets a whole date or whole month via POST .../approve, while individual entries inside the
// drill-down drawer can be approved/rejected one at a time via PUT .../:id/approve|reject.
// Resolves a rejected entry's `rejected_by` (a raw employee id — the backend doesn't send
// `rejected_by_name` on this endpoint) to a display name. Reject only ever happens as the
// currently logged-in Manager, so a match against their own id is the only case worth handling —
// anything else (an id with no name available) is hidden rather than shown as a bare number.
const rejectedByLabel = (entry, currentEmployee) => {
  if (entry.rejected_by_name) return entry.rejected_by_name;
  if (currentEmployee && String(entry.rejected_by) === String(currentEmployee.id)) return currentEmployee.full_name;
  return null;
};

const ManagerTeamTimesheetView = ({ employeeId, employeeName }) => {
  const { success, error: showError, info } = useNotification();
  const { employee: currentEmployee } = useAuth();

  const [logType, setLogType] = useState('daily');
  const [dateRange, setDateRange] = useState(null);
  const [year, setYear] = useState(String(dayjs().year()));
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  // Map<rowKey, selection descriptor> rather than a Set of keys: "select all" reaches pending
  // buckets on pages that were never rendered, so the approve payload has to be rebuildable from
  // the selection alone, without looking anything up in the current page's `rows`.
  const [selected, setSelected] = useState(new Map());
  const [drillDownRow, setDrillDownRow] = useState(null);
  const [rejectTarget, setRejectTarget] = useState(null); // { entries: [...] } being rejected, or null
  // Tracked separately from rejectEntryMutation.isPending — a row-level reject fires one PUT per
  // entry via Promise.all/mutateAsync, and the shared mutation's isPending can flip false as soon
  // as the FIRST of several concurrent calls settles, prematurely re-enabling the dialog's Submit.
  const [isRejecting, setIsRejecting] = useState(false);

  const resetSelection = () => setSelected(new Map());

  // Everything that defines *which* buckets are in scope, with no page/limit — the table's page
  // narrows the display only, so "select all" reuses these filters at the full-set page size.
  const filterParams = useMemo(() => ({
    employee_id: employeeId,
    log_type: logType,
    ...(logType === 'daily'
      ? (dateRange?.startDate ? { startDate: dateRange.startDate, endDate: dateRange.endDate } : {})
      : { startDate: `${year}-01-01`, endDate: `${year}-12-31` }),
  }), [employeeId, logType, dateRange, year]);

  const summaryParams = useMemo(() => ({ ...filterParams, page, limit }), [filterParams, page, limit]);

  const { data, isLoading, isError, error, refetch } = useMyTeamApprovalSummary(summaryParams);
  const fetchAllBuckets = useFetchAllApprovalBuckets();
  const approveMutation = useApproveMyTeamTimesheets();
  const rejectEntryMutation = useRejectMyTeamTimesheetEntry();
  const approveEntryMutation = useApproveMyTeamTimesheetEntry();

  const rows = data?.data ?? [];
  const meta = data?.meta;
  const pageSize = meta?.limit ?? limit;
  const selectableRows = rows.filter(isApprovable);
  const anySelected = selected.size > 0;
  const pageSelectedCount = selectableRows.filter((r) => selected.has(rowKeyOf(logType, r))).length;
  // Vacuously true when this page has nothing selectable but a selection exists elsewhere — so the
  // header checkbox still reads as "on" and one more click clears the whole selection.
  const pageFullySelected = anySelected && pageSelectedCount === selectableRows.length;
  const offPageSelectedCount = selected.size - pageSelectedCount;
  // Each descriptor remembers its absolute position in the filtered set, so this counts the pages
  // the selection actually spans rather than the pages the filtered set happens to have.
  const selectedPageCount = new Set(Array.from(selected.values(), (v) => Math.floor(v.index / pageSize) + 1)).size;

  const handleLogTypeChange = (next) => {
    setLogType(next);
    setPage(1);
    resetSelection();
  };

  const handleDateRangeChange = (range) => {
    setDateRange(range);
    setPage(1);
    resetSelection();
  };

  const handleYearChange = (v) => {
    setYear(v);
    setPage(1);
    resetSelection();
  };

  // Paging deliberately does NOT clear the selection any more — it now spans the whole filtered
  // set, and wiping it on navigation would silently undo a select-all the moment the Manager
  // looked at page 2. Changing a filter still resets it: that changes which buckets are in scope.
  const handlePageChange = (p) => {
    setPage(p);
  };

  // Selection survives a page-size change too — descriptors are stored by absolute index, so the
  // pages they map to just get recomputed against the new size.
  const handlePageSizeChange = (size) => {
    setLimit(size);
    setPage(1);
  };

  // Select-all means every pending bucket in the current Employee + filter scope, not just the ten
  // rows that happen to be rendered: it refetches the summary at the full-set page size (the table
  // stays on its own page size for display) and selects every pending bucket that comes back.
  // Ordering matches the paginated query, so a bucket's index gives the display page it lives on.
  const selectAllPending = async () => {
    try {
      const allBuckets = await fetchAllBuckets.mutateAsync(filterParams);
      const next = new Map();
      allBuckets.forEach((bucket, index) => {
        if (!isApprovable(bucket)) return;
        next.set(rowKeyOf(logType, bucket), selectionValueOf(logType, bucket, index));
      });
      if (next.size === 0) {
        info(`No pending ${logType === 'daily' ? 'dates' : 'months'} to select in this range.`);
        return;
      }
      setSelected(next);
    } catch (err) {
      showError(extractApiError(err));
    }
  };

  const toggleAll = () => {
    if (pageFullySelected) {
      resetSelection();
      return;
    }
    selectAllPending();
  };

  // `rowIndex` is the row's index on the current page; offsetting it by the page turns it into the
  // absolute index in the filtered set, matching what selectAllPending records.
  const toggleOne = (row, rowIndex) => {
    const key = rowKeyOf(logType, row);
    setSelected((prev) => {
      const next = new Map(prev);
      if (next.has(key)) next.delete(key);
      else next.set(key, selectionValueOf(logType, row, ((page - 1) * pageSize) + rowIndex));
      return next;
    });
  };

  // `targets` are summary rows or selection descriptors interchangeably — both carry date (daily)
  // or month+year (monthly), which is all the endpoint takes. Exactly one of dates/months goes out.
  const approvalPayloadFor = (targets) =>
    logType === 'daily'
      ? { employeeId, dates: targets.map((t) => t.date) }
      : { employeeId, months: targets.map((t) => ({ month: t.month, year: t.year })) };

  const runApprove = (targets, successMessage) => {
    approveMutation.mutate(approvalPayloadFor(targets), {
      onSuccess: () => {
        success(successMessage);
        setSelected((prev) => {
          const next = new Map(prev);
          targets.forEach((t) => next.delete(rowKeyOf(logType, t)));
          return next;
        });
        setDrillDownRow(null);
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  const periodLabel = (row) => (logType === 'daily' ? formatDate(row.date) : formatMonthYear(row.month, row.year));

  const handleApproveRow = (row) => runApprove([row], `${periodLabel(row)} approved.`);

  // Table-level Reject — the row is a whole date/month bucket, but reject is entry-level (no
  // bulk-reject endpoint), so this targets every still-pending entry embedded in the bucket.
  const handleRejectRow = (row) => {
    const pendingEntries = (row.entries ?? []).filter(isEntryPending);
    if (pendingEntries.length === 0) {
      showError('No pending entries to reject — open the row to see current status.');
      return;
    }
    setRejectTarget({ entries: pendingEntries });
  };

  // Approves the entire selection in one POST, including buckets on pages that aren't rendered —
  // this used to filter `rows` (the current page) and silently dropped everything else. The
  // mutation invalidates every approval-summary query afterwards, so all pages come back showing
  // the new status, not just this one.
  const handleApproveSelected = () => {
    const targets = Array.from(selected.values());
    if (targets.length === 0) return;
    const unit = logType === 'daily' ? 'date' : 'month';
    runApprove(targets, `${targets.length} ${unit}${targets.length === 1 ? '' : 's'} approved.`);
  };

  // A 409 means someone else (another Manager session, or a bulk action) already acted on this
  // entry — the spec's suggested handling is to surface a fixed message and refetch rather than
  // showing whatever the backend's generic conflict message says.
  const isConflict = (err) => err?.response?.status === 409;

  const handleApproveEntry = (entry) => {
    approveEntryMutation.mutate(entry.id, {
      onSuccess: () => success('Entry approved.'),
      onError: (err) => {
        if (isConflict(err)) {
          showError('This entry was already updated.');
          refetch();
        } else {
          showError(extractApiError(err));
        }
      },
    });
  };

  // `rejectTarget` is always `{ entries: [...] }` — a single entry from the drill-down's
  // per-entry Reject button, or every still-pending entry in a bucket from the main table's
  // row-level Reject button (there's no bulk reject endpoint, so this fires one PUT per entry).
  const handleRejectSubmit = async (remark) => {
    const targets = rejectTarget?.entries ?? [];
    if (targets.length === 0) return;
    setIsRejecting(true);
    try {
      await Promise.all(targets.map((e) => rejectEntryMutation.mutateAsync({ id: e.id, remark })));
      success(targets.length === 1 ? 'Entry rejected.' : `${targets.length} entries rejected.`);
      setRejectTarget(null);
    } catch (err) {
      if (isConflict(err)) {
        showError('This entry was already updated.');
        setRejectTarget(null);
        refetch();
      } else {
        showError(extractApiError(err));
      }
    } finally {
      setIsRejecting(false);
    }
  };

  // The summary row already embeds every underlying entry inline (confirmed live) — no separate
  // fetch needed for the drill-down, which also means expanding a row costs zero extra requests.
  // Re-derived from the live `rows` (not the `drillDownRow` snapshot) on every render so an
  // entry-level approve/reject inside the open drawer reflects its new status immediately once
  // the approval-summary query refetches, without closing the drawer.
  const resolvedDrillDownRow = drillDownRow
    ? rows.find((r) => rowKeyOf(logType, r) === rowKeyOf(logType, drillDownRow)) ?? drillDownRow
    : null;
  const detailRows = resolvedDrillDownRow?.entries ?? [];

  const columns = [
    columnHelper.display({
      id: 'select',
      // Enabled even when this page has no pending rows — the pending buckets it selects may all
      // live on other pages, which is exactly the case this control exists to cover.
      header: () => (fetchAllBuckets.isPending ? (
        <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" aria-label="Selecting all pending entries" />
      ) : (
        <Checkbox
          checked={pageFullySelected ? true : (anySelected ? 'indeterminate' : false)}
          onCheckedChange={toggleAll}
          disabled={isLoading || (rows.length === 0 && !anySelected)}
          aria-label="Select all pending entries in the current filter"
        />
      )),
      size: 40,
      cell: ({ row }) => (
        <Checkbox
          checked={selected.has(rowKeyOf(logType, row.original))}
          onCheckedChange={() => toggleOne(row.original, row.index)}
          disabled={!isApprovable(row.original)}
          onClick={(e) => e.stopPropagation()}
          aria-label="Select row"
        />
      ),
    }),
    columnHelper.display({
      id: 'period',
      header: logType === 'daily' ? 'Date' : 'Month',
      size: 160,
      cell: ({ row }) => <span className="text-sm font-medium">{periodLabel(row.original)}</span>,
    }),
    columnHelper.display({
      id: 'hours',
      header: 'Hours',
      size: 100,
      cell: ({ row }) => (
        <span className="tabular-nums text-sm font-medium">{Number(row.original.total_hours ?? 0).toFixed(2)} hrs</span>
      ),
    }),
    columnHelper.display({
      id: 'entries',
      header: 'Entries',
      size: 90,
      cell: ({ row }) => <span className="text-sm text-muted-foreground">{row.original.entry_count}</span>,
    }),
    columnHelper.display({
      id: 'status',
      header: 'Status',
      size: 130,
      cell: ({ row }) => <StatusBadge status={row.original.approval_status} />,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Action',
      size: 170,
      cell: ({ row }) =>
        isApprovable(row.original) ? (
          <div className="flex items-center gap-1.5">
            <Button
              variant="outline"
              size="sm"
              className="h-7 gap-1 text-destructive hover:text-destructive"
              onClick={(e) => { e.stopPropagation(); handleRejectRow(row.original); }}
              disabled={approveMutation.isPending || isRejecting}
            >
              <X className="h-3.5 w-3.5" />
              Reject
            </Button>
            <Button
              size="sm"
              className="h-7 gap-1"
              onClick={(e) => { e.stopPropagation(); handleApproveRow(row.original); }}
              disabled={approveMutation.isPending || isRejecting}
            >
              <Check className="h-3.5 w-3.5" />
              Approve
            </Button>
          </div>
        ) : (
          <span className="text-sm text-muted-foreground">—</span>
        ),
    }),
    columnHelper.display({
      id: 'expand',
      header: '',
      size: 32,
      cell: () => <ChevronRight className="h-4 w-4 text-muted-foreground" />,
    }),
  ];

  if (isError) {
    return (
      <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
        {extractApiError(error)}
      </div>
    );
  }

  return (
    <div className="space-y-4 rounded-xl border bg-card p-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h3 className="text-base font-semibold">
          {employeeName ? `${employeeName}'s Timesheet Approval` : 'Timesheet Approval'}
        </h3>
        <div className="flex flex-wrap items-center gap-2">
          <Tabs value={logType} onValueChange={handleLogTypeChange}>
            <TabsList>
              <TabsTrigger value="daily">Daily</TabsTrigger>
              <TabsTrigger value="monthly">Monthly</TabsTrigger>
            </TabsList>
          </Tabs>
          {logType === 'daily' ? (
            <DateRangePicker
              value={dateRange}
              onChange={handleDateRangeChange}
              placeholder="Select a date range"
              className="h-9 w-64 text-sm"
            />
          ) : (
            <div className="w-28">
              <SearchableSelect
                options={buildYearOptions()}
                value={year}
                onValueChange={handleYearChange}
                placeholder="Year"
                searchPlaceholder="Search year…"
              />
            </div>
          )}
        </div>
      </div>

      {/* Spells out the reach of the selection — page-only vs. spanning pages — so a select-all
          that covers a backlog the Manager can't see isn't indistinguishable from one that only
          covers the ten visible rows. */}
      {anySelected && (
        <div className="flex flex-wrap items-center justify-between gap-2 rounded-lg border bg-muted/40 px-3 py-2">
          <span className="text-sm text-muted-foreground">
            <span className="font-medium text-foreground">{selected.size}</span> pending{' '}
            {logType === 'daily' ? 'date' : 'month'}{selected.size === 1 ? '' : 's'} selected
            {selectedPageCount > 1 && ` across ${selectedPageCount} pages`}
            {offPageSelectedCount > 0 && ` — ${offPageSelectedCount} not on this page`}
          </span>
          <div className="flex items-center gap-1.5">
            <Button variant="ghost" size="sm" className="h-7" onClick={resetSelection} disabled={approveMutation.isPending}>
              Clear
            </Button>
            <Button size="sm" className="h-7 gap-1" onClick={handleApproveSelected} disabled={approveMutation.isPending}>
              {approveMutation.isPending ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Check className="h-3.5 w-3.5" />}
              Approve Selected
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={rows}
        isLoading={isLoading}
        pagination={meta ? { page: meta.page, limit: meta.limit, total: meta.total } : undefined}
        onPageChange={handlePageChange}
        onPageSizeChange={handlePageSizeChange}
        onRowClick={setDrillDownRow}
        emptyState={<EmptyState title={`No ${logType} timesheet entries for this period.`} />}
      />

      <Sheet open={!!drillDownRow} onOpenChange={(open) => !open && setDrillDownRow(null)}>
        <SheetContent className="w-full overflow-y-auto sm:max-w-lg">
          {resolvedDrillDownRow && (
            <>
              <SheetHeader>
                <SheetTitle>
                  {logType === 'daily'
                    ? formatDate(resolvedDrillDownRow.date, 'dddd, DD MMMM YYYY')
                    : formatMonthYear(resolvedDrillDownRow.month, resolvedDrillDownRow.year)}
                </SheetTitle>
                <SheetDescription>
                  Total {Number(resolvedDrillDownRow.total_hours ?? 0).toFixed(2)} hrs across {resolvedDrillDownRow.entry_count}{' '}
                  entr{resolvedDrillDownRow.entry_count === 1 ? 'y' : 'ies'}
                </SheetDescription>
              </SheetHeader>

              <ScrollArea className="mt-4 max-h-[60vh]">
                <div className="space-y-2 pr-3">
                  {detailRows.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No entries found.</p>
                  ) : (
                    detailRows.map((r) => (
                      <div key={r.id} className="rounded-lg border p-3 text-sm">
                        <div className="flex items-center justify-between font-medium">
                          <span>{r.servicePO?.service_po_name ?? r.servicePO?.service_po_code ?? '—'}</span>
                          <span className="flex items-center gap-2">
                            <span className="tabular-nums">{Number(effectiveHours(r) ?? 0).toFixed(2)} hrs</span>
                            {r.status && <StatusBadge status={r.status} />}
                          </span>
                        </div>
                        {r.subProject?.sub_project_name && (
                          <p className="mt-0.5 text-xs text-muted-foreground">{r.subProject.sub_project_name}</p>
                        )}
                        {r.description && <p className="mt-1 text-xs text-muted-foreground">{r.description}</p>}
                        {logType === 'monthly' && (
                          <p className="mt-1 text-xs text-muted-foreground">{formatDate(r.work_date)}</p>
                        )}

                        {isEntryRejected(r) && (
                          <div className="mt-2 rounded-md border border-destructive/30 bg-destructive/5 p-2 text-xs text-destructive">
                            <p className="font-medium">
                              Rejected{rejectedByLabel(r, currentEmployee) ? ` by ${rejectedByLabel(r, currentEmployee)}` : ''}
                              {r.rejected_at ? ` on ${formatDateTime(r.rejected_at)}` : ''}
                            </p>
                            {r.rejection_remark && <p className="mt-0.5">{r.rejection_remark}</p>}
                          </div>
                        )}

                        {isEntryPending(r) && (
                          <div className="mt-2 flex justify-end gap-1.5">
                            <Button
                              variant="outline"
                              size="sm"
                              className="h-7 gap-1 text-destructive hover:text-destructive"
                              onClick={() => setRejectTarget({ entries: [r] })}
                              disabled={isRejecting || approveEntryMutation.isPending}
                            >
                              <X className="h-3.5 w-3.5" />
                              Reject
                            </Button>
                            <Button
                              size="sm"
                              className="h-7 gap-1"
                              onClick={() => handleApproveEntry(r)}
                              disabled={isRejecting || approveEntryMutation.isPending}
                            >
                              <Check className="h-3.5 w-3.5" />
                              Approve
                            </Button>
                          </div>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </ScrollArea>

              <SheetFooter className="mt-4">
                {isApprovable(resolvedDrillDownRow) ? (
                  <Button onClick={() => handleApproveRow(resolvedDrillDownRow)} disabled={approveMutation.isPending} className="gap-1.5">
                    <Check className="h-4 w-4" />
                    Approve {periodLabel(resolvedDrillDownRow)}
                  </Button>
                ) : (
                  <StatusBadge status={resolvedDrillDownRow.approval_status} />
                )}
              </SheetFooter>
            </>
          )}
        </SheetContent>
      </Sheet>

      <RejectEntryDialog
        open={!!rejectTarget}
        onOpenChange={(open) => !open && setRejectTarget(null)}
        onConfirm={handleRejectSubmit}
        isSubmitting={isRejecting}
        count={rejectTarget?.entries?.length ?? 1}
      />
    </div>
  );
};

export default ManagerTeamTimesheetView;
