import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/common/EmptyState';
import SummaryRow from './SummaryRow';
import SummaryFooter from './SummaryFooter';
import { FIRST_COL_WIDTH, DAY_COL_WIDTH, TOTAL_COL_WIDTH } from './summaryTableLayout';

// Responsive freeze-pane table for the Monthly Summary tab: sticky header, sticky first
// column (Service/Project), sticky last column (Total), sticky bottom TOTAL row. A single
// scrolling container drives both axes, so `sticky` on each edge resolves against the same
// scroll ancestor.
//
// `edits` is `{ [rowKey]: { [day]: hoursString } }` — unsaved cell overrides from the parent
// page, keyed by each row's own `rowKey` (`po:<id>` or `h:<id>`) rather than a bare Service PO
// id, since a hierarchy node and a Service PO don't share an id space. Totals are computed from
// these overlaid on the server values, never taken as separate fields, so a total updates live
// as you type and always matches what's on screen.
const SummaryTable = ({ month, year, rows, isLoading, edits, onCellChange }) => {
  // Collapsed by default — a Service PO's hierarchy breakdown only shows once its row (or an
  // ancestor Parent node) is expanded, so the table opens as a flat list and drills down on click.
  const [expandedKeys, setExpandedKeys] = useState(() => new Set());
  const toggleExpanded = (rowKey) => setExpandedKeys((prev) => {
    const next = new Set(prev);
    next.has(rowKey) ? next.delete(rowKey) : next.add(rowKey);
    return next;
  });

  const daysInMonth = useMemo(
    () => dayjs(`${year}-${String(month).padStart(2, '0')}-01`).daysInMonth(),
    [month, year]
  );
  const days = useMemo(() => Array.from({ length: daysInMonth }, (_, i) => i + 1), [daysInMonth]);

  const today = dayjs().startOf('day');
  const monthStart = dayjs(`${year}-${String(month).padStart(2, '0')}-01`);
  // A cell is only editable up through today — matches My Work Log's date picker, which
  // caps at today too. A cell already synced into the official Timesheet is still shown as
  // editable here (the summary endpoint doesn't yet expose per-cell sync status); the
  // backend rejects the save and the error surfaces as a toast, same as everywhere else.
  const editableDays = useMemo(() => {
    const maxDay = monthStart.isSame(today, 'month') ? today.date() : (monthStart.isBefore(today, 'month') ? daysInMonth : 0);
    return new Set(days.filter((d) => d <= maxDay));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, daysInMonth, month, year]);

  const weekdayShort = (day) =>
    dayjs(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`).format('ddd');

  const cellValue = (row, day) => {
    const edited = edits?.[row.rowKey]?.[day];
    return edited !== undefined ? Number(edited || 0) : Number(row.hoursByDay?.[day] ?? 0);
  };

  // Row/column/grand totals are always derived from the per-day cells themselves, never taken
  // as separate backend fields — one source of truth, so totals can't drift from what's shown.
  const rowsWithTotals = useMemo(
    () => rows.map((row) => ({
      ...row,
      total: days.reduce((sum, day) => sum + cellValue(row, day), 0),
    })),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [rows, days, edits]
  );

  // Only depth-0 (Service PO) rows count toward column/grand totals — a Service PO with a
  // hierarchy breakdown already reports its rolled-up total there, so summing its nested
  // rows too would double-count the same hours.
  const columnTotals = useMemo(() => {
    const topLevelRows = rows.filter((row) => (row.depth ?? 0) === 0);
    const totals = {};
    days.forEach((day) => {
      totals[day] = topLevelRows.reduce((sum, row) => sum + cellValue(row, day), 0);
    });
    return totals;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [days, rows, edits]);

  const grandTotal = useMemo(
    () => Object.values(columnTotals).reduce((sum, v) => sum + v, 0),
    [columnTotals]
  );

  // A row shows only once every ancestor in its chain is expanded — collapsing a Parent hides
  // its whole subtree in one step, not just its direct children.
  const visibleRows = useMemo(
    () => rowsWithTotals.filter((row) => (row.ancestorKeys ?? []).every((key) => expandedKeys.has(key))),
    [rowsWithTotals, expandedKeys]
  );

  return (
    <Table
      className="table-fixed border-collapse"
      containerClassName="max-h-[70vh] overflow-auto rounded-xl border bg-card"
    >
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead
            className="summary-table-head summary-col-pinned sticky left-0 top-0 px-2 text-xs"
            style={{ width: FIRST_COL_WIDTH, minWidth: FIRST_COL_WIDTH, maxWidth: FIRST_COL_WIDTH }}
          >
            Service / Project
          </TableHead>

          {days.map((day) => (
            <TableHead
              key={day}
              className="summary-table-head px-1 text-center"
              style={{ width: DAY_COL_WIDTH, minWidth: DAY_COL_WIDTH, maxWidth: DAY_COL_WIDTH }}
            >
              <div className="flex flex-col items-center leading-tight">
                <span className="text-xs font-bold text-foreground">{day}</span>
                <span className="text-[9px] font-normal text-muted-foreground">{weekdayShort(day)}</span>
              </div>
            </TableHead>
          ))}

          <TableHead
            className="summary-table-head summary-col-pinned sticky right-0 top-0 text-center"
            style={{ width: TOTAL_COL_WIDTH, minWidth: TOTAL_COL_WIDTH, maxWidth: TOTAL_COL_WIDTH }}
          >
            Total
          </TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {isLoading ? (
          Array.from({ length: 6 }).map((_, i) => (
            <TableRow key={i} className="hover:bg-transparent">
              <TableCell className="sticky left-0 bg-card px-2" style={{ width: FIRST_COL_WIDTH }}>
                <Skeleton className="h-4 w-20" />
              </TableCell>
              {days.map((day) => (
                <TableCell key={day} className="px-1" style={{ width: DAY_COL_WIDTH }}>
                  <Skeleton className="mx-auto h-4 w-4" />
                </TableCell>
              ))}
              <TableCell className="sticky right-0 bg-card" style={{ width: TOTAL_COL_WIDTH }}>
                <Skeleton className="mx-auto h-4 w-8" />
              </TableCell>
            </TableRow>
          ))
        ) : rowsWithTotals.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={days.length + 2} className="p-0">
              <EmptyState title="No work log found for this month." />
            </TableCell>
          </TableRow>
        ) : (
          visibleRows.map((row) => (
            <SummaryRow
              key={row.rowKey}
              label={row.label}
              depth={row.depth}
              hasChildren={row.hasChildren}
              isExpanded={expandedKeys.has(row.rowKey)}
              onToggleExpand={() => toggleExpanded(row.rowKey)}
              days={days}
              hoursByDay={row.hoursByDay}
              total={row.total}
              editable={!!row.editable}
              editableDays={editableDays}
              cellEdits={edits?.[row.rowKey]}
              onCellChange={(day, value) => onCellChange(row.rowKey, day, value)}
            />
          ))
        )}
      </TableBody>

      {!isLoading && rowsWithTotals.length > 0 && (
        <TableFooter>
          <SummaryFooter days={days} columnTotals={columnTotals} grandTotal={grandTotal} />
        </TableFooter>
      )}
    </Table>
  );
};

export default SummaryTable;
