import { useEffect, useMemo, useState } from 'react';
import dayjs from 'dayjs';
import * as XLSX from 'xlsx';
import { useQueryClient } from '@tanstack/react-query';
import { Save, Download } from 'lucide-react';
import { useEmployeeMonthlySummary, useSaveWorkLogDay } from '@/hooks/useEmployeeWorkLog';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { buildMonthlySummaryRows, buildDayEntries, validateDayEntries } from '@/utils/employeeMonthlySummary';
import MonthNavigator from '@/components/employee/MonthNavigator';
import SummaryTable from '@/components/employee/SummaryTable';
import MonthlySummaryMonthTable from '@/components/employee/MonthlySummaryMonthTable';
import { DAILY_HOURS_CAP } from '@/components/employee/WorkLogEntryModal';
import { Button } from '@/components/ui/button';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

// Mirrors SummaryTable's own cell/total computation so the export matches exactly what's on
// screen, including any unsaved edits — not a separate re-fetch of server values.
const exportSummaryToExcel = (rows, edits, month, year) => {
  const daysInMonth = dayjs(`${year}-${String(month).padStart(2, '0')}-01`).daysInMonth();
  const days = Array.from({ length: daysInMonth }, (_, i) => i + 1);

  const cellValue = (row, day) => {
    const edited = edits?.[row.rowKey]?.[day];
    return edited !== undefined ? Number(edited || 0) : Number(row.hoursByDay?.[day] ?? 0);
  };

  const header = ['Service / Project', ...days.map((d) => String(d)), 'Total'];
  const dataRows = rows.map((row) => {
    const values = days.map((day) => cellValue(row, day));
    const total = values.reduce((sum, v) => sum + v, 0);
    return [`${'  '.repeat(row.depth ?? 0)}${row.label}`, ...values, total];
  });
  const totalsRow = ['Total', ...days.map((day) => rows.reduce((sum, row) => sum + cellValue(row, day), 0)), rows.reduce((sum, row) => sum + days.reduce((s, day) => s + cellValue(row, day), 0), 0)];

  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows, totalsRow]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Monthly Summary');
  XLSX.writeFile(wb, `Monthly_Summary_${dayjs(`${year}-${String(month).padStart(2, '0')}-01`).format('MMMM_YYYY')}.xlsx`);
};

// Beside My Work Log — a day-by-day view of the same pending+synced work log entries,
// grouped by Service/Project instead of by date. Reuses the monthly-summary endpoint My
// Work Log's dashboard card already calls; `buildMonthlySummaryRows` flattens its per-day
// Service PO + hierarchy breakdown into one row per node.
//
// Only a leaf node is editable — either a Service PO with no breakdown, or a hierarchy
// Parent/Child node with no further breakdown of its own. A cell maps 1:1 to a work log entry
// for that employee/PO(/hierarchy node)/date; any row with children underneath it is a rollup
// display only. A shared description covers the whole batch (the entries API requires one)
// rather than asking for 100+ per-cell descriptions. Nothing is sent to the server until Save
// is pressed.
//
// Neither /daily nor /monthly-summary exposes individual entry ids anymore (both return an
// aggregated tree), which is moot for saving now anyway: POST /entries is a whole-day replace,
// not a per-row create/update. One call per edited date, each carrying every row that should
// survive that date (edited cells overlaid on the already-loaded hours) — any row left out of
// the array is deleted server-side, so a save must never send just the touched cells.
const MonthlySummaryPage = () => {
  const today = dayjs().startOf('day');
  const [month, setMonth] = useState(today.month() + 1);
  const [year, setYear] = useState(today.year());
  // 'day' (default) keeps today's calendar/day rendering untouched; 'month' swaps in the flat
  // Service PO totals table. Toggling only changes viewType on the same month/year — the
  // underlying useQuery key includes viewType, so it refetches fresh instead of reusing stale data.
  const [viewMode, setViewMode] = useState('day');
  // { [rowKey]: { [day]: hoursString } } — unsaved cell overrides, cleared on save/month change.
  // rowKey is `po:<servicePOId>` or `h:<hierarchyId>` (see buildMonthlySummaryRows) since a
  // hierarchy node and a Service PO don't share an id space. Day View only — Month View has no
  // per-day cells to edit.
  const [edits, setEdits] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const { success, error: showError } = useNotification();
  const qc = useQueryClient();

  const {
    data: summary, isLoading, isError, error: summaryError,
  } = useEmployeeMonthlySummary(month, year, viewMode);

  const saveDayMutation = useSaveWorkLogDay();

  // Day View's own tree-flattening; a no-op call in Month View since `summary` is then the flat
  // { service_pos, total_hours } shape, not the day-entries array this expects.
  const rows = useMemo(() => (viewMode === 'day' ? buildMonthlySummaryRows(summary) : []), [summary, viewMode]);
  const editedCount = Object.values(edits).reduce((n, byDay) => n + Object.keys(byDay).length, 0);

  // Month View has no inline error banner of its own (unlike Day View below), so its fetch
  // errors — this endpoint only 422s on a missing/invalid month, year, or viewType — surface via
  // the same toast used for save errors, showing the server's message as-is.
  useEffect(() => {
    if (viewMode === 'month' && isError) {
      showError(extractApiError(summaryError));
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [viewMode, isError, summaryError]);

  const handleMonthChange = (m, y) => {
    setMonth(m);
    setYear(y);
    setEdits({});
  };

  const handleCellChange = (rowKey, day, value) => {
    if (!rowKey) return;
    setEdits((prev) => ({
      ...prev,
      [rowKey]: { ...prev[rowKey], [day]: value },
    }));
  };

  const handleDiscard = () => setEdits({});

  const handleSave = async () => {
    // Edits can span multiple days in the grid, but a whole-day save is per-date — one POST per
    // edited date, each carrying every row (edited + carried-over) that should survive that date.
    const editedDays = new Set();
    Object.values(edits).forEach((byDay) => Object.keys(byDay).forEach((day) => editedDays.add(Number(day))));

    const overCap = Object.values(edits)
      .flatMap((byDay) => Object.values(byDay).map((rawHours) => Number(rawHours || 0)))
      .find((hours) => hours < 0 || hours > DAILY_HOURS_CAP);
    if (overCap !== undefined) {
      showError(`Hours must be between 0 and ${DAILY_HOURS_CAP}.`);
      return;
    }

    const dayPayloads = [...editedDays].map((day) => {
      const date = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`).format('YYYY-MM-DD');
      return { date, entries: buildDayEntries(rows, day, edits) };
    });

    for (const { date, entries } of dayPayloads) {
      const validationError = validateDayEntries(entries, date, DAILY_HOURS_CAP);
      if (validationError) {
        showError(validationError);
        return;
      }
    }

    setIsSaving(true);
    try {
      for (const { date, entries } of dayPayloads) {
        await saveDayMutation.mutateAsync({ timesheet_date: date, entries });
      }
      success('Monthly summary saved.');
      setEdits({});
      qc.invalidateQueries({ queryKey: ['employee-worklog'] });
    } catch (err) {
      showError(extractApiError(err));
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold tracking-tight">Monthly Summary</h1>
          <p className="text-sm text-muted-foreground">
            {viewMode === 'day'
              ? 'Hours logged per Service/Project for each day of the month.'
              : 'Total hours logged per Service/Project for the whole month.'}
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Tabs value={viewMode} onValueChange={setViewMode}>
            <TabsList>
              <TabsTrigger value="day">Day View</TabsTrigger>
              <TabsTrigger value="month">Month View</TabsTrigger>
            </TabsList>
          </Tabs>
          {viewMode === 'day' && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => exportSummaryToExcel(rows, edits, month, year)}
              disabled={isLoading || rows.length === 0}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export Excel
            </Button>
          )}
        </div>
      </div>

      {viewMode === 'day' && isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Unable to load your monthly summary. Please try again.
        </div>
      )}

      <MonthNavigator month={month} year={year} onChange={handleMonthChange} />

      {viewMode === 'day' ? (
        <SummaryTable
          month={month}
          year={year}
          rows={rows}
          isLoading={isLoading}
          edits={edits}
          onCellChange={handleCellChange}
        />
      ) : (
        <MonthlySummaryMonthTable data={summary} isLoading={isLoading} />
      )}

      {/* Save sits last — after the table, only relevant once something's actually changed.
          Month View has no per-day cells, so there's nothing here to save/discard. */}
      {viewMode === 'day' && (
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

export default MonthlySummaryPage;
