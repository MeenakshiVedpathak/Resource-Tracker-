import { useMemo } from 'react';
import dayjs from 'dayjs';
import { EXPECTED_DAILY_HOURS } from './WorkLogEntryModal';

const RADIUS = 22;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

// Sums the same per-day `totalHours` the calendar heatmap reads (GET /employee-timesheets/
// calendar), against a target of (weekdays in the month) x EXPECTED_DAILY_HOURS — both purely
// client-side derivations, since the backend has no monthly-target concept.
const MonthlyHoursCard = ({ month, year, calendarDays }) => {
  const workedHours = useMemo(
    () => calendarDays.reduce((sum, d) => sum + Number(d.totalHours || 0), 0),
    [calendarDays]
  );

  const targetHours = useMemo(() => {
    const daysInMonth = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).daysInMonth();
    const weekdayCount = Array.from({ length: daysInMonth }, (_, i) => {
      const weekday = dayjs(`${year}-${String(month).padStart(2, '0')}-${i + 1}`).day();
      return weekday !== 0 && weekday !== 6;
    }).filter(Boolean).length;
    return weekdayCount * EXPECTED_DAILY_HOURS;
  }, [month, year]);

  const pct = targetHours ? Math.min(100, Math.round((workedHours / targetHours) * 100)) : 0;
  const dashOffset = CIRCUMFERENCE * (1 - pct / 100);

  return (
    <div className="flex items-center gap-4 rounded-xl border bg-card px-4 py-3">
      <div>
        <p className="text-xs text-muted-foreground">This Month</p>
        <p className="text-lg font-bold leading-tight">
          {workedHours} / {targetHours} <span className="text-xs font-normal text-muted-foreground">hrs</span>
        </p>
        <p className="text-xs text-muted-foreground">Logged</p>
      </div>

      <div className="relative flex h-14 w-14 shrink-0 items-center justify-center">
        <svg width="56" height="56" viewBox="0 0 56 56" className="-rotate-90">
          <circle cx="28" cy="28" r={RADIUS} fill="none" strokeWidth="6" className="stroke-muted" />
          <circle
            cx="28" cy="28" r={RADIUS} fill="none" strokeWidth="6" strokeLinecap="round"
            strokeDasharray={CIRCUMFERENCE}
            strokeDashoffset={dashOffset}
            className="stroke-primary transition-all"
          />
        </svg>
        <span className="absolute text-xs font-semibold">{pct}%</span>
      </div>
    </div>
  );
};

export default MonthlyHoursCard;
