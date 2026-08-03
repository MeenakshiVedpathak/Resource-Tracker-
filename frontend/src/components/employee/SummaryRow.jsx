import { memo } from 'react';
import { TableRow, TableCell } from '@/components/ui/table';
import { formatHoursCell } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import { DAILY_HOURS_CAP } from './WorkLogEntryModal';
import { FIRST_COL_WIDTH, DAY_COL_WIDTH, TOTAL_COL_WIDTH } from './summaryTableLayout';

// One Service/Project row in the Monthly Summary table. Memoized so scrolling/resizing the
// 100+ row table doesn't re-render every row on every parent update — only a row whose own
// label/hoursByDay/total/edits actually changed re-renders.
//
// Only rows tied to a real service_po_id can be edited (a cell maps 1:1 to a work log entry
// for that employee/PO/date) — label-only aggregate rows stay read-only. `editableDays` caps
// editing at today, same as My Work Log's date picker.
const SummaryRow = ({ label, days, hoursByDay, total, editable, cellEdits, editableDays, onCellChange }) => (
  <TableRow className="hover:bg-muted/30">
    <TableCell
      className="summary-col-pinned sticky left-0 truncate font-medium"
      style={{ width: FIRST_COL_WIDTH, minWidth: FIRST_COL_WIDTH, maxWidth: FIRST_COL_WIDTH }}
      title={label}
    >
      {label}
    </TableCell>

    {days.map((day) => {
      const isDirty = cellEdits?.[day] !== undefined;
      const value = isDirty ? cellEdits[day] : (hoursByDay?.[day] ?? '');

      if (!editable || !editableDays?.has(day)) {
        return (
          <TableCell
            key={day}
            className="text-center tabular-nums"
            style={{ width: DAY_COL_WIDTH, minWidth: DAY_COL_WIDTH, maxWidth: DAY_COL_WIDTH }}
          >
            {formatHoursCell(hoursByDay?.[day])}
          </TableCell>
        );
      }

      return (
        <TableCell
          key={day}
          className="p-1 text-center"
          style={{ width: DAY_COL_WIDTH, minWidth: DAY_COL_WIDTH, maxWidth: DAY_COL_WIDTH }}
        >
          <input
            type="number"
            step="0.5"
            min="0"
            max={DAILY_HOURS_CAP}
            value={value}
            onChange={(e) => onCellChange(day, e.target.value)}
            className={cn(
              'h-7 w-full rounded border bg-transparent text-center text-xs tabular-nums',
              'focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring',
              isDirty && 'border-amber-400 bg-amber-50 dark:bg-amber-950/30'
            )}
          />
        </TableCell>
      );
    })}

    <TableCell
      className="summary-col-pinned sticky right-0 text-center font-semibold tabular-nums"
      style={{ width: TOTAL_COL_WIDTH, minWidth: TOTAL_COL_WIDTH, maxWidth: TOTAL_COL_WIDTH }}
    >
      {formatHoursCell(total)}
    </TableCell>
  </TableRow>
);

export default memo(SummaryRow);
