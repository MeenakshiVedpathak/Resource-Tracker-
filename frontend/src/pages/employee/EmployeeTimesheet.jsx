import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import { Save, Calendar as CalendarIcon } from 'lucide-react';
import { useEmployeeCalendar, useEmployeeDailyWorkLog, useSaveWorkLogDay } from '@/hooks/useEmployeeWorkLog';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { buildMonthlySummaryRows, buildDayEntries, validateDayEntries } from '@/utils/employeeMonthlySummary';
import TimesheetCalendar from '@/components/employee/TimesheetCalendar';
import MonthlyHoursCard from '@/components/employee/MonthlyHoursCard';
import WorkLogDaySummary from '@/components/employee/WorkLogDaySummary';
import WorkLogEntryTable from '@/components/employee/WorkLogEntryTable';
import { DAILY_HOURS_CAP } from '@/components/employee/WorkLogEntryModal';
import { Button } from '@/components/ui/button';

// /employee-timesheets/daily now returns the same Service PO -> hierarchy tree Monthly Summary
// gets (aggregated per node, no individual entry ids), so this page edits leaf hours directly
// — same interaction model as Monthly Summary, just scoped to one selected date instead of a
// whole month. `edits` is `{ [rowKey]: { [day]: hoursString } }` (day is the single date's
// day-of-month) purely so it reuses the same rowKey/day shape the tree util already produces.
// `rows` is computed once here (not inside WorkLogEntryTable) so the day's stat tiles and the
// entry table itself never disagree on totals.
const EmployeeTimesheet = () => {
  const today = dayjs().startOf('day');
  const [month, setMonth] = useState(today.month() + 1);
  const [year, setYear] = useState(today.year());
  const [selectedDate, setSelectedDate] = useState(today);
  const [edits, setEdits] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const { success, error: showError } = useNotification();
  const qc = useQueryClient();
  const saveDayMutation = useSaveWorkLogDay();

  const {
    data: calendarDays = [], isLoading: isCalendarLoading, isError: isCalendarError,
  } = useEmployeeCalendar(month, year);

  const calendarByDate = useMemo(
    () => Object.fromEntries(calendarDays.map((d) => [d.date, d])),
    [calendarDays]
  );

  const selectedKey = selectedDate.format('YYYY-MM-DD');
  const {
    data: dailyData, isLoading: isDailyLoading, isError: isDailyError,
  } = useEmployeeDailyWorkLog(selectedKey);

  const day = dailyData?.date ? Number(dailyData.date.slice(-2)) : selectedDate.date();

  const rows = useMemo(
    () => (dailyData ? buildMonthlySummaryRows([{ date: dailyData.date ?? selectedKey, service_pos: dailyData.service_pos }]) : []),
    [dailyData, selectedKey]
  );

  const cellValue = (row) => {
    const edited = edits?.[row.rowKey]?.[day];
    return edited !== undefined ? Number(edited || 0) : Number(row.hoursByDay?.[day] ?? 0);
  };

  const totalHoursToday = rows.reduce((sum, row) => sum + cellValue(row), 0);

  const activeProjectsCount = useMemo(() => {
    const byPO = new Map();
    rows.forEach((row) => {
      const poId = String(row.servicePOId);
      byPO.set(poId, (byPO.get(poId) || 0) + cellValue(row));
    });
    return [...byPO.values()].filter((sum) => sum > 0).length;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [rows, edits, day]);

  const isSelectedPastOrToday = !selectedDate.isAfter(today, 'day');
  const editedCount = Object.values(edits).reduce((n, byDay) => n + Object.keys(byDay).length, 0);

  const handleMonthChange = (nextMonth, nextYear) => {
    setMonth(nextMonth);
    setYear(nextYear);
  };

  const handleSelectDate = (nextDay) => {
    setSelectedDate(nextDay);
    setEdits({});
  };

  const handleCellChange = (rowKey, cellDay, value) => {
    if (!rowKey) return;
    setEdits((prev) => ({
      ...prev,
      [rowKey]: { ...prev[rowKey], [cellDay]: value },
    }));
  };

  const handleDiscard = () => setEdits({});

  const handleSave = async () => {
    const flatEdits = Object.entries(edits).flatMap(([rowKey, byDay]) =>
      Object.entries(byDay).map(([, rawHours]) => ({ rowKey, hours: Number(rawHours || 0) }))
    );

    const overCap = flatEdits.find((e) => e.hours < 0 || e.hours > DAILY_HOURS_CAP);
    if (overCap) {
      showError(`Hours must be between 0 and ${DAILY_HOURS_CAP}.`);
      return;
    }

    // Whole-day replace: send every row that should survive for this date, not just the ones
    // edited this session — anything left out is deleted server-side.
    const entries = buildDayEntries(rows, day, edits);
    const validationError = validateDayEntries(entries, selectedKey, DAILY_HOURS_CAP);
    if (validationError) {
      showError(validationError);
      return;
    }

    setIsSaving(true);
    try {
      await saveDayMutation.mutateAsync({ timesheet_date: selectedKey, entries });
      success('Work log saved.');
      setEdits({});
      qc.invalidateQueries({ queryKey: ['employee-worklog'] });
    } catch (err) {
      showError(extractApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-3">
      <div>
        <h1 className="text-xl font-bold tracking-tight">My Work Log</h1>
        <p className="text-sm text-muted-foreground">
          Log your hours for each working day.
        </p>
      </div>

      {(isCalendarError || isDailyError) && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Unable to load work log entries. Please try again.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <div className="space-y-4">
          <TimesheetCalendar
            month={month}
            year={year}
            onMonthChange={handleMonthChange}
            calendarByDate={calendarByDate}
            selectedDate={selectedDate}
            onSelectDate={handleSelectDate}
            isLoading={isCalendarLoading}
          />
          <MonthlyHoursCard month={month} year={year} calendarDays={calendarDays} />
        </div>

        <div className="space-y-4 rounded-xl border bg-card p-4">
          <div className="flex items-center gap-2">
            <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
              <CalendarIcon className="h-4 w-4" />
            </span>
            <h3 className="text-base font-semibold">{selectedDate.format('dddd, DD MMMM YYYY')}</h3>
          </div>

          <WorkLogDaySummary totalHours={totalHoursToday} activeProjectsCount={activeProjectsCount} />

          <WorkLogEntryTable
            rows={rows}
            day={day}
            isLoading={isDailyLoading}
            isPastOrToday={isSelectedPastOrToday}
            edits={edits}
            onCellChange={handleCellChange}
          />
        </div>
      </div>

      {isSelectedPastOrToday && rows.length > 0 && (
        <div className="flex items-center justify-end gap-3 rounded-xl border bg-card px-4 py-3">
          <span className="mr-auto text-xs text-muted-foreground">
            {editedCount > 0 ? `${editedCount} unsaved change${editedCount === 1 ? '' : 's'}` : 'No changes to save'}
          </span>
          <Button variant="outline" size="sm" onClick={handleDiscard} disabled={editedCount === 0 || isSaving}>
            Discard
          </Button>
          <Button size="sm" onClick={handleSave} disabled={editedCount === 0 || isSaving}>
            <Save className="mr-1.5 h-4 w-4" />
            {isSaving ? 'Saving…' : 'Save'}
          </Button>
        </div>
      )}
    </div>
  );
};

export default EmployeeTimesheet;
