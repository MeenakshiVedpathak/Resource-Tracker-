import { memo } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import { TableRow, TableCell } from '@/components/ui/table';
import { formatHoursCell } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import { DAILY_HOURS_CAP } from './WorkLogEntryModal';
import { FIRST_COL_WIDTH, DAY_COL_WIDTH, TOTAL_COL_WIDTH } from './summaryTableLayout';

// One Service/Project (or nested hierarchy node) row in the Monthly Summary table. Memoized so
// scrolling/resizing the 100+ row table doesn't re-render every row on every parent update —
// only a row whose own label/hoursByDay/total/edits/expanded-state actually changed re-renders.
//
// A node with a hierarchy breakdown of its own (`hasChildren`) is a rollup — read-only, with a
// chevron to reveal its Parent/Child nodes underneath. A leaf node (Service PO or hierarchy
// node with no further breakdown) maps 1:1 to a work log entry and is editable. `editableDays`
// caps editing at today, same as My Work Log's date picker.
const SummaryRow = ({
  label, depth = 0, hasChildren, isExpanded, onToggleExpand,
  days, hoursByDay, total, editable, cellEdits, editableDays, onCellChange,
}) => (
  <TableRow className="hover:bg-muted/30">
    <TableCell
      className={cn('summary-col-pinned sticky left-0 truncate pr-2 text-xs', depth > 0 ? 'font-normal text-muted-foreground' : 'font-medium')}
      style={{
        width: FIRST_COL_WIDTH, minWidth: FIRST_COL_WIDTH, maxWidth: FIRST_COL_WIDTH,
        paddingLeft: 8 + depth * 14,
      }}
      title={label}
    >
      {depth > 0 && <span className="mr-1 text-muted-foreground">{'└'}</span>}
      {hasChildren ? (
        <button
          type="button"
          onClick={onToggleExpand}
          className="mr-1 inline-flex align-middle text-muted-foreground hover:text-foreground"
        >
          {isExpanded ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
        </button>
      ) : null}
      {label}
    </TableCell>

    {days.map((day) => {
      const isDirty = cellEdits?.[day] !== undefined;
      const value = isDirty ? cellEdits[day] : (hoursByDay?.[day] ?? '');

      if (!editable || !editableDays?.has(day)) {
        return (
          <TableCell
            key={day}
            className="px-1 text-center text-xs tabular-nums"
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
