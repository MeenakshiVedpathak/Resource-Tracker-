import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import { Save, Trash2, Calendar as CalendarIcon } from 'lucide-react';
import {
  useEmployeeCalendar,
  useEmployeeDailyWorkLog,
  useSaveWorkLogDay,
  useEmployeeMonthlyYearOverview,
  useSaveWorkLogMonth,
  useDeleteWorkLogMonth,
} from '@/hooks/useEmployeeWorkLog';
import { useAuth } from '@/hooks/useAuth';
import { useMyTeamEmployees } from '@/hooks/useMyTeam';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { buildMonthlySummaryRows, buildDayEntries, validateDayEntries } from '@/utils/employeeMonthlySummary';
import TimesheetCalendar from '@/components/employee/TimesheetCalendar';
import MonthlyHoursCard from '@/components/employee/MonthlyHoursCard';
import MonthSelector from '@/components/employee/MonthSelector';
import WorkLogDaySummary from '@/components/employee/WorkLogDaySummary';
import WorkLogEntryTable from '@/components/employee/WorkLogEntryTable';
import ManagerTeamTimesheetView from '@/components/employee/ManagerTeamTimesheetView';
import { DAILY_HOURS_CAP, MONTHLY_HOURS_CAP } from '@/components/employee/WorkLogEntryModal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Alert, AlertDescription } from '@/components/ui/alert';
import ConfirmDialog from '@/components/common/ConfirmDialog';

// buildMonthlySummaryRows/buildDayEntries key rows by a "day" number pulled from a date
// string's last two characters — Monthly mode has no real day, so every month is bucketed
// under this one pseudo-day key, letting it reuse the exact same row-building/entry-building
// utils and the same WorkLogEntryTable component Daily mode uses, unmodified in behavior.
const MONTH_DAY_KEY = 1;
const pseudoMonthDate = (year, month) => `${year}-${String(month).padStart(2, '0')}-01`;

// /employee-timesheets/daily now returns the same Service PO -> hierarchy tree Monthly Summary
// gets (aggregated per node, no individual entry ids), so this page edits leaf hours directly
// — same interaction model as Monthly Summary, just scoped to one selected date instead of a
// whole month. `edits` is `{ [rowKey]: { [day]: hoursString } }` (day is the single date's
// day-of-month) purely so it reuses the same rowKey/day shape the tree util already produces.
// `rows` is computed once here (not inside WorkLogEntryTable) so the day's stat tiles and the
// entry table itself never disagree on totals.
const EmployeeTimesheet = () => {
  const today = dayjs().startOf('day');
  const { hasRole } = useAuth();
  const isManager = hasRole('Manager');
  const { data: mappedEmployees = [] } = useMyTeamEmployees({ enabled: isManager });
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(''); // '' = My Timesheet
  const selectedEmployee = mappedEmployees.find((e) => String(e.id) === selectedEmployeeId);
  const employeeOptions = [
    { value: '', label: 'My Timesheet' },
    ...mappedEmployees.map((e) => ({ value: String(e.id), label: e.full_name })),
  ];

  const [mode, setMode] = useState('daily'); // 'daily' | 'monthly'
  const [month, setMonth] = useState(today.month() + 1);
  const [year, setYear] = useState(today.year());
  const [selectedDate, setSelectedDate] = useState(today);
  const [edits, setEdits] = useState({});
  const [timeEdits, setTimeEdits] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const [monthlyYear, setMonthlyYear] = useState(today.year());
  const [selectedMonth, setSelectedMonth] = useState(today.month() + 1);
  const [monthlyEdits, setMonthlyEdits] = useState({});
  const [isMonthlySaving, setIsMonthlySaving] = useState(false);
  const [isMonthlyDeleting, setIsMonthlyDeleting] = useState(false);
  const [confirmSaveOpen, setConfirmSaveOpen] = useState(false);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);

  const { success, error: showError } = useNotification();
  const qc = useQueryClient();
  const saveDayMutation = useSaveWorkLogDay();
  const saveMonthMutation = useSaveWorkLogMonth();
  const deleteMonthMutation = useDeleteWorkLogMonth();

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
  // Counts rows dirtied via either the hour stepper or the time-block inputs (even a
  // half-filled start/end pair counts as dirty) so Save stays enabled and its validation can
  // surface the "both times required" error instead of leaving the user stuck with a disabled
  // button and no feedback.
  const editedCount = useMemo(() => {
    const keys = new Set();
    Object.entries(edits).forEach(([rowKey, byDay]) => { if (byDay?.[day] !== undefined) keys.add(rowKey); });
    Object.entries(timeEdits).forEach(([rowKey, byDay]) => {
      const t = byDay?.[day];
      if (t && (t.start_time || t.end_time)) keys.add(rowKey);
    });
    return keys.size;
  }, [edits, timeEdits, day]);

  const handleMonthChange = (nextMonth, nextYear) => {
    setMonth(nextMonth);
    setYear(nextYear);
  };

  const handleSelectDate = (nextDay) => {
    setSelectedDate(nextDay);
    setEdits({});
    setTimeEdits({});
  };

  const handleCellChange = (rowKey, cellDay, value) => {
    if (!rowKey) return;
    setEdits((prev) => ({
      ...prev,
      [rowKey]: { ...prev[rowKey], [cellDay]: value },
    }));
  };

  // `patch` is either `null` (row switched back to plain-hours mode — drop its time pair,
  // leaving whatever hours value was already there for the stepper to keep editing) or
  // `{ start_time, end_time, hours }` from WorkLogEntryTable's per-row time inputs. `hours` is
  // the client-computed duration for display/total purposes only — the backend recalculates it
  // from start_time/end_time server-side and ignores what's sent (see employeeWorkLog.api.js) —
  // so it's only pushed into `edits` once both times are valid; a partial pair leaves the
  // existing hours value untouched but still records the partial time so handleSave's
  // validation can catch and explain it rather than silently dropping it.
  const handleTimeEntryChange = (rowKey, cellDay, patch) => {
    if (!rowKey) return;
    setTimeEdits((prev) => {
      if (patch === null) {
        const rowTimes = { ...prev[rowKey] };
        delete rowTimes[cellDay];
        return { ...prev, [rowKey]: rowTimes };
      }
      return {
        ...prev,
        [rowKey]: { ...prev[rowKey], [cellDay]: { start_time: patch.start_time, end_time: patch.end_time } },
      };
    });
    if (patch?.hours != null) {
      handleCellChange(rowKey, cellDay, String(patch.hours));
    }
  };

  const handleDiscard = () => {
    setEdits({});
    setTimeEdits({});
  };

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
    const entries = buildDayEntries(rows, day, edits, timeEdits);
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
      setTimeEdits({});
      qc.invalidateQueries({ queryKey: ['employee-worklog'] });
    } catch (err) {
      showError(extractApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  // Monthly mode — fetches all 12 months of the selected year in parallel so the Month
  // Selector strip can show every month's total hours at once; switching the selected month
  // just re-reads the same already-fetched array (no extra request) unless the year changes.
  const monthlyYearQueries = useEmployeeMonthlyYearOverview(monthlyYear, mode === 'monthly');

  const monthRowsByMonth = useMemo(() => {
    const map = {};
    monthlyYearQueries.forEach((q, i) => {
      const m = i + 1;
      map[m] = buildMonthlySummaryRows([
        { date: pseudoMonthDate(monthlyYear, m), service_pos: q.data?.service_pos ?? [] },
      ]);
    });
    return map;
  }, [monthlyYearQueries, monthlyYear]);

  const monthStats = useMemo(() => {
    const stats = {};
    monthlyYearQueries.forEach((q, i) => {
      const m = i + 1;
      const rows = monthRowsByMonth[m] ?? [];
      const hours = rows.reduce((sum, r) => sum + Number(r.hoursByDay?.[MONTH_DAY_KEY] ?? 0), 0);
      stats[m] = { hours, eligible: q.data?.eligible, isLoading: q.isLoading };
    });
    return stats;
  }, [monthlyYearQueries, monthRowsByMonth]);

  const selectedMonthlyQuery = monthlyYearQueries[selectedMonth - 1];
  const monthlyData = selectedMonthlyQuery?.data ?? null;
  const isMonthlyLoading = selectedMonthlyQuery?.isLoading ?? false;
  const isMonthlyError = selectedMonthlyQuery?.isError ?? false;
  const monthlyRows = monthRowsByMonth[selectedMonth] ?? [];

  // `eligible` comes straight from the backend response — never computed here.
  const isMonthlyIneligible = !isMonthlyLoading && monthlyData != null && monthlyData.eligible === false;

  const monthlyCellValue = (row) => {
    const edited = monthlyEdits?.[row.rowKey]?.[MONTH_DAY_KEY];
    return edited !== undefined ? Number(edited || 0) : Number(row.hoursByDay?.[MONTH_DAY_KEY] ?? 0);
  };

  const totalHoursThisMonth = monthlyRows.reduce((sum, row) => sum + monthlyCellValue(row), 0);
  const hasExistingMonthlyEntries = monthlyRows.some((r) => Number(r.hoursByDay?.[MONTH_DAY_KEY] ?? 0) > 0);
  const monthlyEditedCount = Object.values(monthlyEdits).reduce((n, byDay) => n + Object.keys(byDay).length, 0);

  const handleSelectMonth = (nextMonth) => {
    setSelectedMonth(nextMonth);
    setMonthlyEdits({});
  };

  const handleMonthlyYearChange = (nextYear) => {
    setMonthlyYear(nextYear);
    setMonthlyEdits({});
  };

  const handleMonthlyCellChange = (rowKey, cellDay, value) => {
    if (!rowKey) return;
    setMonthlyEdits((prev) => ({
      ...prev,
      [rowKey]: { ...prev[rowKey], [cellDay]: value },
    }));
  };

  const handleMonthlyDiscard = () => setMonthlyEdits({});

  const handleMonthlySaveConfirmed = async () => {
    const entries = buildDayEntries(monthlyRows, MONTH_DAY_KEY, monthlyEdits);
    setIsMonthlySaving(true);
    try {
      await saveMonthMutation.mutateAsync({ month: selectedMonth, year: monthlyYear, entries });
      success('Monthly work log saved.');
      setMonthlyEdits({});
      setConfirmSaveOpen(false);
      qc.invalidateQueries({ queryKey: ['employee-worklog'] });
    } catch (err) {
      showError(extractApiError(err));
    } finally {
      setIsMonthlySaving(false);
    }
  };

  const handleDeleteMonthConfirmed = async () => {
    setIsMonthlyDeleting(true);
    try {
      await deleteMonthMutation.mutateAsync({ month: selectedMonth, year: monthlyYear });
      success('Monthly work log deleted.');
      setMonthlyEdits({});
      setConfirmDeleteOpen(false);
      qc.invalidateQueries({ queryKey: ['employee-worklog'] });
    } catch (err) {
      showError(extractApiError(err));
    } finally {
      setIsMonthlyDeleting(false);
    }
  };

  const yearOptions = Array.from({ length: 5 }, (_, i) => {
    const y = today.year() - 2 + i;
    return { label: String(y), value: String(y) };
  });

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">My Work Log</h1>
          <p className="text-sm text-muted-foreground">
            {selectedEmployeeId
              ? `Viewing ${selectedEmployee?.full_name ?? 'this Employee'}'s complete timesheet.`
              : mode === 'daily' ? 'Log your hours for each working day.' : 'Log your total hours for a whole month.'}
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3">
          {isManager && (
            <SearchableSelect
              options={employeeOptions}
              value={selectedEmployeeId}
              onValueChange={setSelectedEmployeeId}
              placeholder="My Timesheet"
              searchPlaceholder="Search…"
              className="w-56"
            />
          )}

          {!selectedEmployeeId && (
            <Tabs value={mode} onValueChange={setMode}>
              <TabsList>
                <TabsTrigger value="daily">Daily</TabsTrigger>
                <TabsTrigger value="monthly">Monthly</TabsTrigger>
              </TabsList>
            </Tabs>
          )}
        </div>
      </div>

      {selectedEmployeeId && (
        <ManagerTeamTimesheetView
          key={selectedEmployeeId}
          employeeId={selectedEmployeeId}
          employeeName={selectedEmployee?.full_name}
        />
      )}

      {!selectedEmployeeId && mode === 'daily' && (
        <>
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
                timeEdits={timeEdits}
                onTimeEntryChange={handleTimeEntryChange}
                alwaysTimeEntry
              />
            </div>
          </div>

          {isSelectedPastOrToday && rows.length > 0 && (
            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 rounded-xl border bg-card px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
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
        </>
      )}

      {!selectedEmployeeId && mode === 'monthly' && (
        <>
          {isMonthlyError && (
            <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
              Unable to load monthly work log. Please try again.
            </div>
          )}

          <div className="grid gap-6 lg:grid-cols-[380px_1fr]">
            <div className="space-y-4 rounded-xl border bg-card p-4">
              <div className="flex items-center justify-between gap-2">
                <h2 className="text-sm font-semibold">Select Month</h2>
                <div className="w-28">
                  <SearchableSelect
                    options={yearOptions}
                    value={String(monthlyYear)}
                    onValueChange={(v) => handleMonthlyYearChange(Number(v))}
                    placeholder="Year"
                    searchPlaceholder="Search year..."
                  />
                </div>
              </div>
              <MonthSelector selectedMonth={selectedMonth} onSelectMonth={handleSelectMonth} monthStats={monthStats} />
            </div>

            <div className="space-y-4 rounded-xl border bg-card p-4">
              <div className="flex items-center gap-2">
                <span className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                  <CalendarIcon className="h-4 w-4" />
                </span>
                <h3 className="text-base font-semibold">
                  {dayjs(pseudoMonthDate(monthlyYear, selectedMonth)).format('MMMM YYYY')}
                  <span className="ml-2 font-normal text-muted-foreground">{totalHoursThisMonth} hrs</span>
                </h3>
              </div>

              {isMonthlyIneligible && (
                <Alert variant="warning">
                  <AlertDescription>
                    {monthlyData?.message || 'This month is not open for editing.'}
                  </AlertDescription>
                </Alert>
              )}

              <WorkLogEntryTable
                rows={monthlyRows}
                day={MONTH_DAY_KEY}
                isLoading={isMonthlyLoading}
                isPastOrToday={!isMonthlyIneligible}
                edits={monthlyEdits}
                onCellChange={handleMonthlyCellChange}
                hoursCap={MONTHLY_HOURS_CAP}
                emptyMessage="No Service POs mapped."
                allowTimeEntry={false}
              />
            </div>
          </div>

          {monthlyRows.length > 0 && (
            <div className="sticky bottom-0 z-10 flex items-center justify-end gap-3 rounded-xl border bg-card px-4 py-3 shadow-[0_-4px_12px_rgba(0,0,0,0.06)]">
              <span className="mr-auto text-xs text-muted-foreground">
                {monthlyEditedCount > 0 ? `${monthlyEditedCount} unsaved change${monthlyEditedCount === 1 ? '' : 's'}` : 'No changes to save'}
              </span>
              {hasExistingMonthlyEntries && !isMonthlyIneligible && (
                <Button
                  variant="outline"
                  size="sm"
                  className="text-destructive"
                  onClick={() => setConfirmDeleteOpen(true)}
                  disabled={isMonthlyDeleting || isMonthlySaving}
                >
                  <Trash2 className="mr-1.5 h-4 w-4" />
                  Delete
                </Button>
              )}
              <Button variant="outline" size="sm" onClick={handleMonthlyDiscard} disabled={monthlyEditedCount === 0 || isMonthlySaving}>
                Discard
              </Button>
              <Button
                size="sm"
                onClick={() => setConfirmSaveOpen(true)}
                disabled={monthlyEditedCount === 0 || isMonthlySaving || isMonthlyIneligible}
              >
                <Save className="mr-1.5 h-4 w-4" />
                {isMonthlySaving ? 'Saving…' : 'Save'}
              </Button>
            </div>
          )}

          <ConfirmDialog
            open={confirmSaveOpen}
            onOpenChange={setConfirmSaveOpen}
            title="Replace Daily Work Logs?"
            description="Saving a Monthly Work Log will replace all existing Daily Work Logs for the selected month. Do you want to continue?"
            confirmLabel="Continue"
            cancelLabel="Cancel"
            variant="destructive"
            onConfirm={handleMonthlySaveConfirmed}
            isLoading={isMonthlySaving}
          />

          <ConfirmDialog
            open={confirmDeleteOpen}
            onOpenChange={setConfirmDeleteOpen}
            title="Delete Monthly Work Log?"
            description={`This will delete the Monthly Work Log for ${dayjs(pseudoMonthDate(monthlyYear, selectedMonth)).format('MMMM YYYY')}.`}
            confirmLabel="Delete"
            cancelLabel="Cancel"
            variant="destructive"
            onConfirm={handleDeleteMonthConfirmed}
            isLoading={isMonthlyDeleting}
          />
        </>
      )}
    </div>
  );
};

export default EmployeeTimesheet;
