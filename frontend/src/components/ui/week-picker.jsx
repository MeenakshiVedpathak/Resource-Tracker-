import { useState } from 'react';
import { CalendarDays, ChevronLeft, ChevronRight } from 'lucide-react';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import {
  getWeekRange, getCurrentWeekRange, getLastWeekRange, shiftWeekRange, formatWeekRange,
} from '@/utils/weekUtils';
import { cn } from '@/utils/cn';

const MONTH_NAMES = [
  'January', 'February', 'March', 'April', 'May', 'June',
  'July', 'August', 'September', 'October', 'November', 'December',
];
const DAY_NAMES = ['Su', 'Mo', 'Tu', 'We', 'Th', 'Fr', 'Sa'];

function getDaysInMonth(year, month) {
  return new Date(year, month, 0).getDate();
}

function getFirstDayOfWeek(year, month) {
  return new Date(year, month - 1, 1).getDay();
}

const PILL_BASE = 'flex-1 rounded-full px-3 py-1.5 text-xs font-semibold text-center transition-colors whitespace-nowrap';
const STEP_BUTTON = 'flex h-9 w-9 shrink-0 items-center justify-center rounded-md border border-input bg-background text-muted-foreground transition-colors hover:bg-accent hover:text-foreground disabled:pointer-events-none disabled:opacity-50';

// Compact "stepper" week picker for the Reports suite's Weekly mode: a ◀ [range] ▶ row (click
// either arrow to walk one real week at a time — see weekUtils.js's shiftWeekRange — or the
// calendar icon to jump to any week by clicking a day, which snaps to that day's whole Mon-Sat
// week the same way the arrows do) plus a persistent This Week / Last Week pill row below it for
// the common case. Emits the exact same {startDate, endDate} shape DateRangePicker does, so any
// report can swap one for the other without touching its param-building logic.
//
// No future week is selectable at all — every report this feeds (budgets, billed hours, approval
// status, work logs) is a report on what's already happened, so a week that hasn't happened yet
// has nothing to show. The ▶ arrow disables once the selection reaches This Week, there is no
// "Next Week" pill, and every calendar day past This Week's Saturday is disabled too — see
// `atOrPastThisWeek` below, the one flag all three of those read.
export function WeekPicker({ value, onChange, placeholder = 'Select week', className }) {
  const [open, setOpen] = useState(false);
  const [hoverDate, setHoverDate] = useState(null);
  const [navDate, setNavDate] = useState(() => {
    if (value?.startDate) {
      const [year, month] = value.startDate.split('-').map(Number);
      if (year && month) return { year, month };
    }
    const now = new Date();
    return { year: now.getFullYear(), month: now.getMonth() + 1 };
  });

  const startDate = value?.startDate || null;
  const endDate = value?.endDate || null;
  const triggerLabel = startDate && endDate ? formatWeekRange(startDate, endDate) : null;

  // With nothing selected yet, ◀ still does something useful — it steps off THIS week, landing on
  // Last Week, the same as if This Week had been explicitly picked first.
  const stepBy = (deltaWeeks) => {
    const anchorStart = startDate ?? getCurrentWeekRange().startDate;
    onChange(shiftWeekRange(anchorStart, deltaWeeks));
  };

  const prevMonth = () =>
    setNavDate((d) => (d.month === 1 ? { year: d.year - 1, month: 12 } : { ...d, month: d.month - 1 }));
  const nextMonth = () =>
    setNavDate((d) => (d.month === 12 ? { year: d.year + 1, month: 1 } : { ...d, month: d.month + 1 }));

  const selectWeekContaining = (dateStr) => {
    onChange(getWeekRange(dateStr));
    setOpen(false);
  };

  const daysInMonth = getDaysInMonth(navDate.year, navDate.month);
  const firstDay = getFirstDayOfWeek(navDate.year, navDate.month);
  const days = [
    ...Array(firstDay).fill(null),
    ...Array.from({ length: daysInMonth }, (_, i) => {
      const d = i + 1;
      return `${navDate.year}-${String(navDate.month).padStart(2, '0')}-${String(d).padStart(2, '0')}`;
    }),
  ];

  const highlightRange = hoverDate
    ? getWeekRange(hoverDate)
    : (startDate && endDate ? { startDate, endDate } : null);

  function dayStatus(dateStr) {
    if (!highlightRange) return 'none';
    if (dateStr < highlightRange.startDate || dateStr > highlightRange.endDate) return 'none';
    if (dateStr === highlightRange.startDate) return 'start';
    if (dateStr === highlightRange.endDate) return 'end';
    return 'mid';
  }

  // Which quick-pick pill (if any) matches the current selection — compared by value, not by
  // remembering which button was last clicked, so restoring a persisted `value` still lights up
  // the right pill on first render.
  const thisWeek = getCurrentWeekRange();
  const lastWeek = getLastWeekRange();
  const matches = (r) => startDate === r.startDate && endDate === r.endDate;

  // No future week is selectable — treats "nothing picked yet" the same as "This Week" for this
  // check, so ▶ starts disabled rather than needing one click to discover the wall.
  const atOrPastThisWeek = (startDate ?? thisWeek.startDate) >= thisWeek.startDate;

  return (
    <div className={cn('flex flex-col gap-2', className)}>
      <div className="flex items-center gap-2">
        <button type="button" onClick={() => stepBy(-1)} aria-label="Previous week" className={STEP_BUTTON}>
          <ChevronLeft className="h-4 w-4" />
        </button>

        <div className="flex h-9 flex-1 items-center justify-center rounded-md border border-input bg-background px-2 text-sm font-semibold truncate">
          {triggerLabel || <span className="font-normal text-muted-foreground">{placeholder}</span>}
        </div>

        <button
          type="button"
          onClick={() => stepBy(1)}
          disabled={atOrPastThisWeek}
          aria-label="Next week"
          className={STEP_BUTTON}
        >
          <ChevronRight className="h-4 w-4" />
        </button>

        <Popover
          open={open}
          onOpenChange={(o) => {
            setOpen(o);
            if (!o) setHoverDate(null);
          }}
        >
          <PopoverTrigger asChild>
            <button type="button" aria-label="Open calendar" className={STEP_BUTTON}>
              <CalendarDays className="h-4 w-4" />
            </button>
          </PopoverTrigger>

          <PopoverContent className="w-auto p-3" align="end">
            <div className="flex items-center justify-between mb-2">
              <button type="button" onClick={prevMonth} className="rounded p-1 hover:bg-accent transition-colors">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold select-none">
                {MONTH_NAMES[navDate.month - 1]} {navDate.year}
              </span>
              <button type="button" onClick={nextMonth} className="rounded p-1 hover:bg-accent transition-colors">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>

            <p className="text-[10px] text-center text-muted-foreground mb-2">
              Click any day to select its full week
            </p>

            <div className="grid grid-cols-7 mb-1">
              {DAY_NAMES.map((d) => (
                <div key={d} className="text-center text-[10px] font-medium text-muted-foreground py-1">
                  {d}
                </div>
              ))}
            </div>

            <div className="grid grid-cols-7">
              {days.map((dateStr, i) => {
                if (!dateStr) return <div key={`e-${i}`} className="h-8 w-8" />;

                // Same cap as the ▶ arrow — a day past This Week's Saturday hasn't happened yet.
                const dayDisabled = dateStr > thisWeek.endDate;
                const status = dayStatus(dateStr);
                const day = parseInt(dateStr.split('-')[2], 10);

                return (
                  <button
                    key={dateStr}
                    type="button"
                    disabled={dayDisabled}
                    onClick={() => selectWeekContaining(dateStr)}
                    onMouseEnter={() => !dayDisabled && setHoverDate(dateStr)}
                    onMouseLeave={() => setHoverDate(null)}
                    className={cn(
                      'h-8 w-8 text-xs flex items-center justify-center transition-colors relative',
                      dayDisabled && 'cursor-not-allowed text-muted-foreground/40',
                      !dayDisabled && status === 'none' && 'hover:bg-accent rounded-full',
                      !dayDisabled && status !== 'none' && 'bg-primary/15 text-foreground font-medium',
                      !dayDisabled && status === 'start' && 'rounded-l-full',
                      !dayDisabled && status === 'end' && 'rounded-r-full'
                    )}
                  >
                    {day}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>
      </div>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={() => onChange(thisWeek)}
          className={cn(PILL_BASE, matches(thisWeek) ? 'bg-primary text-primary-foreground' : 'border border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground')}
        >
          This Week
        </button>
        <button
          type="button"
          onClick={() => onChange(lastWeek)}
          className={cn(PILL_BASE, matches(lastWeek) ? 'bg-primary text-primary-foreground' : 'border border-input bg-background text-muted-foreground hover:bg-accent hover:text-foreground')}
        >
          Last Week
        </button>
      </div>
    </div>
  );
}

export default WeekPicker;
