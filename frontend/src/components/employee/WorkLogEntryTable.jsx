import { useEffect, useMemo, useState } from 'react';
import { ChevronUp, ChevronDown, Clock, Folder, Minus, Plus } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { TimeRangePicker } from '@/components/ui/time-range-picker';
import EmptyState from '@/components/common/EmptyState';
import { cn } from '@/utils/cn';
import { DAILY_HOURS_CAP } from './WorkLogEntryModal';

const STEP = 0.5;

const timeToMinutes = (t) => {
  const [h, m] = t.split(':').map(Number);
  return h * 60 + m;
};

// null when either side is blank or the interval isn't a valid same-day span (end <= start) —
// mirrors the backend's own "end must be after start, no overnight spans" rule (see
// employeeWorkLog.api.js) so the displayed hours never show a value the save would reject.
const computeHoursFromTimes = (start, end) => {
  if (!start || !end) return null;
  const diffMinutes = timeToMinutes(end) - timeToMinutes(start);
  if (diffMinutes <= 0) return null;
  return Math.round((diffMinutes / 60) * 100) / 100;
};

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

const clampHours = (n, cap) => Math.min(cap, Math.max(0, n));

// `hoursCap` defaults to the Daily 12-hr cap so existing Daily callers (which don't pass it)
// are unaffected; Monthly mode passes a much larger cap since a node's hours there is a
// whole month's total, not one day's.
const HourStepper = ({ value, onChange, disabled, hoursCap = DAILY_HOURS_CAP }) => {
  const num = Number(value || 0);
  const [inputValue, setInputValue] = useState(String(num));

  useEffect(() => {
    setInputValue(String(num));
  }, [num]);

  const commit = () => {
    const parsed = Number(inputValue);
    const next = Number.isFinite(parsed) ? clampHours(parsed, hoursCap) : num;
    setInputValue(String(next));
    if (next !== num) onChange(next);
  };

  return (
    <div className="flex items-center gap-1">
      <button
        type="button"
        onClick={() => onChange(clampHours(num - STEP, hoursCap))}
        disabled={disabled}
        className="flex h-6 w-6 items-center justify-center rounded border text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
      >
        <Minus className="h-3 w-3" />
      </button>
      <input
        type="number"
        step={STEP}
        min="0"
        max={hoursCap}
        value={inputValue}
        onChange={(e) => setInputValue(e.target.value)}
        onBlur={commit}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
        disabled={disabled}
        className="w-9 rounded border bg-transparent text-center text-xs font-medium tabular-nums [appearance:textfield] focus:outline-none focus:ring-1 focus:ring-primary [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <button
        type="button"
        onClick={() => onChange(clampHours(num + STEP, hoursCap))}
        disabled={disabled}
        className="flex h-6 w-6 items-center justify-center rounded border text-muted-foreground transition-colors hover:bg-muted disabled:pointer-events-none disabled:opacity-40"
      >
        <Plus className="h-3 w-3" />
      </button>
    </div>
  );
};

// One Service PO folder — its own row plus every hierarchy node beneath it (Parent/Child,
// indented, "Task / Feature" being the node's name since our data has no separate module
// concept). Defaults collapsed so every mapped project's total hrs is visible in one glance
// as a single line; expand only the one(s) you want to edit.
const ProjectGroup = ({
  poRow, childrenByParent, day, edits, onCellChange, isPastOrToday, hoursCap, defaultOpen,
  timeEdits, onTimeEntryChange, allowTimeEntry, alwaysTimeEntry,
}) => {
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [collapsedKeys, setCollapsedKeys] = useState(() => new Set());

  const nodeRows = useMemo(() => flattenSubtree(poRow, 0, childrenByParent), [poRow, childrenByParent]);
  const visibleRows = useMemo(
    () => nodeRows.filter((row) => !row.ancestorKeys?.some((key) => collapsedKeys.has(key))),
    [nodeRows, collapsedKeys],
  );

  const toggleRowCollapse = (rowKey) => {
    setCollapsedKeys((prev) => {
      const next = new Set(prev);
      if (next.has(rowKey)) next.delete(rowKey);
      else next.add(rowKey);
      return next;
    });
  };

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
        className="flex w-full items-center gap-1.5 px-3 py-1.5 text-left transition-colors hover:bg-muted/40"
      >
        <span className="flex h-5 w-5 shrink-0 items-center justify-center rounded-md bg-sky-50 text-sky-600 dark:bg-sky-950/40 dark:text-sky-400">
          <Folder className="h-3 w-3" />
        </span>
        <span className="flex-1 truncate text-xs font-semibold">{poRow.label}</span>
        <span className="text-xs font-semibold text-primary">{groupTotal} {groupTotal === 1 ? 'hr' : 'hrs'}</span>
        {isOpen ? <ChevronUp className="h-3.5 w-3.5 text-muted-foreground" /> : <ChevronDown className="h-3.5 w-3.5 text-muted-foreground" />}
      </button>

      {isOpen && (
        <div className="border-t">
          {visibleRows.map((row, i) => {
            const value = cellValueOf(row);
            const isDirty = edits?.[row.rowKey]?.[day] !== undefined;
            const hasChildren = (childrenByParent.get(row.rowKey)?.length ?? 0) > 0;
            const isRowCollapsed = collapsedKeys.has(row.rowKey);
            const canEditRow = row.editable && isPastOrToday;
            const canUseTimeEntry = canEditRow && allowTimeEntry && typeof onTimeEntryChange === 'function';
            const timeEntry = timeEdits?.[row.rowKey]?.[day];
            // With `alwaysTimeEntry`, exact time is the only way to log hours — no stepper, no
            // toggle — so every editable row counts as "in time mode" whether or not it has a
            // timeEdits entry yet (a row with no start/end typed still submits as a plain-hours
            // entry unchanged, see buildDayEntries).
            const isTimeMode = alwaysTimeEntry ? canUseTimeEntry : timeEntry !== undefined;

            const toggleTimeMode = () => {
              if (isTimeMode) onTimeEntryChange(row.rowKey, day, null);
              else onTimeEntryChange(row.rowKey, day, { start_time: '', end_time: '', hours: null });
            };
            const changeTimeRange = (start, end) => {
              onTimeEntryChange(row.rowKey, day, { start_time: start, end_time: end, hours: computeHoursFromTimes(start, end) });
            };

            return (
              <div key={row.rowKey} className={cn(i > 0 && 'border-t border-dashed')}>
                <div className="grid grid-cols-[1.5rem_1fr_1.25rem_6.5rem] items-center gap-1.5 px-3 py-0.5 leading-tight">
                  <span className="text-[11px] text-muted-foreground">{i + 1}</span>
                  <span className={cn('flex items-center truncate text-xs', row.relDepth > 0 && 'text-muted-foreground')} style={{ paddingLeft: row.relDepth * 12 }}>
                    {row.relDepth > 0 && <span className="mr-1 text-muted-foreground">{'└'}</span>}
                    {hasChildren && (
                      <button
                        type="button"
                        onClick={() => toggleRowCollapse(row.rowKey)}
                        className="mr-1 flex h-3.5 w-3.5 shrink-0 items-center justify-center text-muted-foreground hover:text-foreground"
                      >
                        {isRowCollapsed ? <ChevronDown className="h-3 w-3" /> : <ChevronUp className="h-3 w-3" />}
                      </button>
                    )}
                    <span className="truncate">{row.label}</span>
                    {isDirty && <span className="ml-1.5 inline-block h-1.5 w-1.5 shrink-0 rounded-full bg-amber-400" title="Unsaved change" />}
                  </span>
                  {canUseTimeEntry && !alwaysTimeEntry ? (
                    <button
                      type="button"
                      onClick={toggleTimeMode}
                      title={isTimeMode ? 'Switch back to entering hours directly' : 'Log exact start/end time instead'}
                      className={cn(
                        'flex h-5 w-5 shrink-0 items-center justify-center rounded text-muted-foreground transition-colors hover:bg-muted hover:text-foreground',
                        isTimeMode && 'bg-primary/10 text-primary'
                      )}
                    >
                      <Clock className="h-3 w-3" />
                    </button>
                  ) : <span />}
                  <div className="flex justify-end">
                    {isTimeMode ? (
                      <span className="text-xs font-medium tabular-nums text-muted-foreground">
                        {value} {value === 1 ? 'hr' : 'hrs'}
                      </span>
                    ) : canEditRow ? (
                      <HourStepper value={value} onChange={(v) => onCellChange(row.rowKey, day, String(v))} hoursCap={hoursCap} />
                    ) : (
                      <span className="text-xs font-medium tabular-nums text-muted-foreground">{value} hrs</span>
                    )}
                  </div>
                </div>

                {isTimeMode && (
                  <div className="flex flex-wrap items-center gap-3 px-3 pb-2" style={{ paddingLeft: `${row.relDepth * 12 + 12}px` }}>
                    <TimeRangePicker
                      startValue={timeEntry?.start_time ?? ''}
                      endValue={timeEntry?.end_time ?? ''}
                      onChange={changeTimeRange}
                      className="w-64 text-xs"
                    />
                    {!timeEntry?.start_time !== !timeEntry?.end_time && (
                      <span className="text-[11px] text-destructive">Both start and end time are required.</span>
                    )}
                  </div>
                )}
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
const WorkLogEntryTable = ({
  rows, day, isLoading, isPastOrToday, edits, onCellChange, hoursCap = DAILY_HOURS_CAP,
  emptyMessage = 'No Service POs mapped.',
  timeEdits, onTimeEntryChange, allowTimeEntry = true, alwaysTimeEntry = false,
}) => {
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
    return <EmptyState title={emptyMessage} />;
  }

  return (
    <div className="space-y-2">
      <h3 className="text-xs font-semibold">Work Log Entries</h3>

      <div className="space-y-1.5">
        {topLevelRows.map((row) => (
          <ProjectGroup
            key={row.rowKey}
            poRow={row}
            childrenByParent={childrenByParent}
            day={day}
            edits={edits}
            onCellChange={onCellChange}
            isPastOrToday={isPastOrToday}
            hoursCap={hoursCap}
            defaultOpen={topLevelRows.length === 1}
            timeEdits={timeEdits}
            onTimeEntryChange={onTimeEntryChange}
            allowTimeEntry={allowTimeEntry}
            alwaysTimeEntry={alwaysTimeEntry}
          />
        ))}
      </div>
    </div>
  );
};

export default WorkLogEntryTable;
