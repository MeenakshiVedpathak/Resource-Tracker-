import { useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, Folder, Minus, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/common/EmptyState';
import { cn } from '@/utils/cn';
import { DAILY_HOURS_CAP } from './WorkLogEntryModal';

const STEP = 0.5;

const buildChildrenByParent = (rows) => {
  const map = new Map();
  rows.forEach((row) => {
    const parentKey = row.ancestorKeys?.[row.ancestorKeys.length - 1];
    if (!parentKey) return;
    if (!map.has(parentKey)) map.set(parentKey, []);
    map.get(parentKey).push(row);
  });
  return map;
};

const flattenSubtree = (row, relDepth, childrenByParent) => {
  const kids = childrenByParent.get(row.rowKey) ?? [];
  return [{ ...row, relDepth }, ...kids.flatMap((k) => flattenSubtree(k, relDepth + 1, childrenByParent))];
};

const HourStepper = ({ value, onChange, disabled }) => {
  const num = Number(value || 0);
  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(Math.max(0, num - STEP))}
        disabled={disabled}
        className="flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
      >
        <Minus className="h-3.5 w-3.5" />
      </button>
      <span className="w-8 text-center text-sm font-medium tabular-nums">{num}</span>
      <button
        type="button"
        onClick={() => onChange(Math.min(DAILY_HOURS_CAP, num + STEP))}
        disabled={disabled}
        className="flex h-7 w-7 items-center justify-center rounded-md border text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
      >
        <Plus className="h-3.5 w-3.5" />
      </button>
    </div>
  );
};

// One Service PO folder — its own row plus every hierarchy node beneath it (Parent/Child,
// indented, "Task / Feature" being the node's name since our data has no separate module
// concept). Defaults open since a day's entries are usually few and are the primary thing to
// see, unlike Monthly Summary's much bigger tree.
const ProjectGroup = ({ poRow, childrenByParent, day, edits, onCellChange, isPastOrToday }) => {
  const [isOpen, setIsOpen] = useState(true);

  const nodeRows = useMemo(() => flattenSubtree(poRow, 0, childrenByParent), [poRow, childrenByParent]);

  const cellValueOf = (r) => {
    const edited = edits?.[r.rowKey]?.[day];
    return edited !== undefined ? Number(edited || 0) : Number(r.hoursByDay?.[day] ?? 0);
  };
  const groupTotal = nodeRows.reduce((sum, r) => sum + cellValueOf(r), 0);

  return (
    <Card className="overflow-hidden">
      <button
        type="button"
        onClick={() => setIsOpen((o) => !o)}
        className="flex w-full items-center gap-2.5 px-4 py-3 text-left transition-colors hover:bg-muted/40"
      >
        <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
          <Folder className="h-4 w-4" />
        </span>
        <span className="flex-1 truncate text-sm font-semibold">{poRow.label}</span>
        <span className="text-sm font-semibold text-primary">{groupTotal} {groupTotal === 1 ? 'hr' : 'hrs'}</span>
        {isOpen ? <ChevronUp className="h-4 w-4 text-muted-foreground" /> : <ChevronDown className="h-4 w-4 text-muted-foreground" />}
      </button>

      {isOpen && (
        <div className="border-t">
          <div className="grid grid-cols-[2.5rem_1fr_7.5rem] gap-2 px-4 py-2 text-[11px] font-semibold uppercase tracking-wide text-muted-foreground">
            <span>#</span>
            <span>Task / Feature</span>
            <span className="text-right">Hours</span>
          </div>
          {nodeRows.map((row, i) => {
            const value = cellValueOf(row);
            const isDirty = edits?.[row.rowKey]?.[day] !== undefined;
            return (
              <div
                key={row.rowKey}
                className={cn('grid grid-cols-[2.5rem_1fr_7.5rem] items-center gap-2 px-4 py-2.5', i > 0 && 'border-t border-dashed')}
              >
                <span className="text-xs text-muted-foreground">{i + 1}</span>
                <span className={cn('truncate text-sm', row.relDepth > 0 && 'text-muted-foreground')} style={{ paddingLeft: row.relDepth * 14 }}>
                  {row.relDepth > 0 && <span className="mr-1 text-muted-foreground">{'└'}</span>}
                  {row.label}
                  {isDirty && <span className="ml-1.5 inline-block h-1.5 w-1.5 rounded-full bg-amber-400" title="Unsaved change" />}
                </span>
                <div className="flex justify-end">
                  {row.editable && isPastOrToday ? (
                    <HourStepper value={value} onChange={(v) => onCellChange(row.rowKey, day, String(v))} />
                  ) : (
                    <span className="text-sm font-medium tabular-nums text-muted-foreground">{value} hrs</span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </Card>
  );
};

// The Service PO -> hierarchy tree for one date, folder-per-Service-PO with an inner task
// table, since /employee-timesheets/daily returns that same aggregated tree Monthly Summary
// gets (no individual entry ids anymore, so entries are edited by node rather than listed one
// at a time). `rows` is pre-flattened by the caller (buildMonthlySummaryRows) so the day-level
// totals used elsewhere on the page and this table stay in sync off one computation.
const WorkLogEntryTable = ({ rows, day, isLoading, isPastOrToday, edits, onCellChange }) => {
  const childrenByParent = useMemo(() => buildChildrenByParent(rows), [rows]);
  const topLevelRows = useMemo(() => rows.filter((r) => (r.depth ?? 0) === 0), [rows]);

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-12 w-full" />)}
      </div>
    );
  }

  if (rows.length === 0) {
    return <EmptyState title="No Service POs mapped for this date." />;
  }

  return (
    <div className="space-y-3">
      <h3 className="text-sm font-semibold">Work Log Entries</h3>

      <div className="space-y-2">
        {topLevelRows.map((row) => (
          <ProjectGroup
            key={row.rowKey}
            poRow={row}
            childrenByParent={childrenByParent}
            day={day}
            edits={edits}
            onCellChange={onCellChange}
            isPastOrToday={isPastOrToday}
          />
        ))}
      </div>
    </div>
  );
};

export default WorkLogEntryTable;
