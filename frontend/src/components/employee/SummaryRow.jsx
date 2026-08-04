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
// Every row is editable for its own hours, even a node with a hierarchy breakdown underneath
// it (`hasChildren`) — a Service PO or Parent node can carry directly-logged hours *and* have
// children logging their own hours at the same time. `editableDays` caps editing at today,
// same as My Work Log's date picker.
const SummaryRow = ({
  label, depth = 0, hasChildren, isExpanded, onToggleExpand,
  days, hoursByDay, total, editable, cellEdits, editableDays, onCellChange,
}) => (
  // A table row can't literally become a Card, but shading nested rows and accenting an
  // expandable header's left edge gives the same "card accordion" grouping cue My Work Log
  // uses, without giving up the day-column grid this view needs.
  <TableRow className={cn('transition-colors hover:bg-muted/30', depth > 0 && 'bg-muted/10')}>
    <TableCell
      className={cn(
        'summary-col-pinned sticky left-0 truncate pr-2 text-xs',
        depth > 0 ? 'font-normal text-muted-foreground' : 'font-medium',
        hasChildren && depth === 0 && 'border-l-2 border-l-primary/40'
      )}
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
          className="mr-1 inline-flex align-middle text-muted-foreground transition-colors hover:text-foreground"
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
              'h-7 w-full rounded border bg-transparent text-center text-xs tabular-nums transition-colors',
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
