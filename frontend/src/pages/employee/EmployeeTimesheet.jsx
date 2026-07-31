import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useEmployeeCalendar, useEmployeeDailyWorkLog } from '@/hooks/useEmployeeWorkLog';
import TimesheetCalendar from '@/components/employee/TimesheetCalendar';
import WorkLogEntryTable from '@/components/employee/WorkLogEntryTable';
import WorkLogEntryModal from '@/components/employee/WorkLogEntryModal';

const EmployeeTimesheet = () => {
  const today = dayjs().startOf('day');
  const [month, setMonth] = useState(today.month() + 1);
  const [year, setYear] = useState(today.year());
  const [selectedDate, setSelectedDate] = useState(today);
  const [modalState, setModalState] = useState({ open: false, task: null });

  const {
    data: calendarDays = [], isLoading: isCalendarLoading, isError: isCalendarError,
  } = useEmployeeCalendar(month, year);

  const calendarByDate = useMemo(
    () => Object.fromEntries(calendarDays.map((d) => [d.date, d])),
    [calendarDays]
  );

  const selectedKey = selectedDate.format('YYYY-MM-DD');
  const {
    data: dailyEntries = [], isLoading: isDailyLoading, isError: isDailyError,
  } = useEmployeeDailyWorkLog(selectedKey);

  const isSelectedPastOrToday = !selectedDate.isAfter(today, 'day');

  const handleMonthChange = (nextMonth, nextYear) => {
    setMonth(nextMonth);
    setYear(nextYear);
  };

  // Case 1 (spec): no entries for the clicked date -> open the entry modal directly.
  // Case 2: entries exist -> just select the date, the daily Work Log table below reflects it.
  // `hasEntries` comes from the already-loaded calendar aggregate, so this doesn't wait on
  // the per-date fetch to decide.
  const handleSelectDate = (day) => {
    setSelectedDate(day);
    const hasEntries = !!calendarByDate[day.format('YYYY-MM-DD')]?.hasEntries;
    setModalState({ open: !hasEntries, task: null });
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">My Work Log</h1>
        <p className="text-sm text-muted-foreground">
          Log your hours for each working day. Entries stay pending until an Admin syncs them into the official Timesheet.
        </p>
      </div>

      {(isCalendarError || isDailyError) && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Unable to load work log entries. Please try again.
        </div>
      )}

      <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
        <TimesheetCalendar
          month={month}
          year={year}
          onMonthChange={handleMonthChange}
          calendarByDate={calendarByDate}
          selectedDate={selectedDate}
          onSelectDate={handleSelectDate}
          isLoading={isCalendarLoading}
        />

        <div className="rounded-xl border bg-card p-4">
          <h3 className="mb-3 text-sm font-semibold">{selectedDate.format('DD MMMM YYYY')}</h3>
          <WorkLogEntryTable
            entries={dailyEntries}
            isLoading={isDailyLoading}
            isPastOrToday={isSelectedPastOrToday}
            onAdd={() => setModalState({ open: true, task: null })}
            onEdit={(task) => setModalState({ open: true, task })}
          />
        </div>
      </div>

      <WorkLogEntryModal
        open={modalState.open}
        onOpenChange={(open) => setModalState((s) => ({ ...s, open }))}
        date={selectedDate}
        task={modalState.task}
      />
    </div>
  );
};

export default EmployeeTimesheet;
