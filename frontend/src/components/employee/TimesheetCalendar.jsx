import { useMemo } from 'react';
import dayjs from 'dayjs';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';

const WEEKDAYS = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

const buildMonthGrid = (monthDate) => {
  const startOfGrid = monthDate.startOf('month').startOf('week');
  const endOfGrid = monthDate.endOf('month').endOf('week');
  const days = [];
  let cursor = startOfGrid;
  while (cursor.isBefore(endOfGrid) || cursor.isSame(endOfGrid, 'day')) {
    days.push(cursor);
    cursor = cursor.add(1, 'day');
  }
  return days;
};

// Month grid with per-day logged hours, driven directly by the backend's calendar aggregate
// (GET /employee-timesheets/calendar -> [{ date, totalHours, hasEntries, futureDisabled }]).
// A date is disabled if either the client's own "after today" check or the backend's
// `futureDisabled` flag says so — belt-and-suspenders, since the real enforcement is
// server-side on the entries endpoints regardless.
const TimesheetCalendar = ({ month, year, onMonthChange, calendarByDate, selectedDate, onSelectDate, isLoading }) => {
  const monthDate = dayjs(`${year}-${String(month).padStart(2, '0')}-01`);
  const today = dayjs().startOf('day');

  const days = useMemo(() => buildMonthGrid(monthDate), [monthDate]);

  const goPrev = () => {
    const prev = monthDate.subtract(1, 'month');
    onMonthChange(prev.month() + 1, prev.year());
  };
  const goNext = () => {
    const next = monthDate.add(1, 'month');
    onMonthChange(next.month() + 1, next.year());
  };

  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="flex items-center justify-between mb-4">
        <Button variant="outline" size="icon-sm" onClick={goPrev} aria-label="Previous month">
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <h2 className="text-sm font-semibold">{monthDate.format('MMMM YYYY')}</h2>
        <Button variant="outline" size="icon-sm" onClick={goNext} aria-label="Next month">
          <ChevronRight className="h-4 w-4" />
        </Button>
      </div>

      <div className="grid grid-cols-7 gap-1 text-center text-[11px] font-semibold text-muted-foreground mb-1">
        {WEEKDAYS.map((d) => <div key={d}>{d}</div>)}
      </div>

      <div className="grid grid-cols-7 gap-1">
        {days.map((day) => {
          const dateKey = day.format('YYYY-MM-DD');
          const inMonth = day.month() === monthDate.month();
          const dayInfo = calendarByDate?.[dateKey];
          const isFuture = day.isAfter(today, 'day') || !!dayInfo?.futureDisabled;
          const isToday = day.isSame(today, 'day');
          const isSelected = selectedDate && day.isSame(selectedDate, 'day');

          if (!inMonth) {
            return <div key={dateKey} aria-hidden="true" />;
          }

          return (
            <button
              key={dateKey}
              type="button"
              disabled={isFuture}
              onClick={() => onSelectDate(day)}
              className={cn(
                'flex flex-col items-center justify-center rounded-lg border py-2 text-xs transition-colors min-h-[56px]',
                isFuture
                  ? 'text-muted-foreground/40 cursor-not-allowed bg-muted/30 border-transparent'
                  : 'hover:bg-accent cursor-pointer border-transparent',
                isToday && 'border-primary',
                isSelected && 'bg-primary text-primary-foreground border-primary hover:bg-primary'
              )}
            >
              <span className="font-medium">{day.date()}</span>
              {isLoading ? (
                <Skeleton className="h-3 w-8 mt-1" />
              ) : dayInfo?.hasEntries ? (
                <span className={cn('mt-0.5 text-[10px]', isSelected ? 'text-primary-foreground/80' : 'text-muted-foreground')}>
                  {dayInfo.totalHours} hrs
                </span>
              ) : null}
            </button>
          );
        })}
      </div>
    </div>
  );
};

export default TimesheetCalendar;
