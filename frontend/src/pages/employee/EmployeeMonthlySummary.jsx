import { useState } from 'react';
import dayjs from 'dayjs';
import { useQueryClient } from '@tanstack/react-query';
import { Save } from 'lucide-react';
import {
  useEmployeeMonthlySummary,
  useCreateWorkLogEntry,
  useUpdateWorkLogEntry,
  useDeleteWorkLogEntry,
} from '@/hooks/useEmployeeWorkLog';
import { employeeWorkLogApi } from '@/api/employeeWorkLog.api';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import MonthNavigator from '@/components/employee/MonthNavigator';
import SummaryTable from '@/components/employee/SummaryTable';
import { DAILY_HOURS_CAP } from '@/components/employee/WorkLogEntryModal';
import { Button } from '@/components/ui/button';

// Beside My Work Log — a day-by-day view of the same pending+synced work log entries,
// grouped by Service/Project instead of by date. Reuses the monthly-summary endpoint My
// Work Log's dashboard card already calls; once the backend adds the per-day breakdown
// (`data.rows[].hoursByDay`) alongside its existing per-PO totals, this table lights up.
//
// Cells are editable: typing a value here writes/updates the same underlying work log
// entry My Work Log's modal creates, just without opening a modal per cell. A shared
// description covers the whole batch (the entries API requires one) rather than asking
// for 100+ per-cell descriptions. Nothing is sent to the server until Save is pressed.
const MonthlySummaryPage = () => {
  const today = dayjs().startOf('day');
  const [month, setMonth] = useState(today.month() + 1);
  const [year, setYear] = useState(today.year());
  // { [servicePOId]: { [day]: hoursString } } — unsaved cell overrides, cleared on save/month change.
  const [edits, setEdits] = useState({});
  const [isSaving, setIsSaving] = useState(false);

  const { success, error: showError } = useNotification();
  const qc = useQueryClient();

  const {
    data: summary, isLoading, isError,
  } = useEmployeeMonthlySummary(month, year);

  const createMutation = useCreateWorkLogEntry();
  const updateMutation = useUpdateWorkLogEntry();
  const deleteMutation = useDeleteWorkLogEntry();

  const rows = summary?.rows ?? [];
  const editedCount = Object.values(edits).reduce((n, byDay) => n + Object.keys(byDay).length, 0);

  const handleMonthChange = (m, y) => {
    setMonth(m);
    setYear(y);
    setEdits({});
  };

  const handleCellChange = (servicePOId, day, value) => {
    if (!servicePOId) return;
    setEdits((prev) => ({
      ...prev,
      [servicePOId]: { ...prev[servicePOId], [day]: value },
    }));
  };

  const handleDiscard = () => setEdits({});

  const handleSave = async () => {
    // Group by date first so each day's existing entries are only fetched once, no matter
    // how many Service/Project rows changed on that date.
    const byDate = {};
    Object.entries(edits).forEach(([servicePOId, byDay]) => {
      Object.entries(byDay).forEach(([day, rawHours]) => {
        const date = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`).format('YYYY-MM-DD');
        (byDate[date] ??= []).push({ servicePOId, hours: Number(rawHours || 0) });
      });
    });

    const overCap = Object.values(byDate).flat().find((e) => e.hours < 0 || e.hours > DAILY_HOURS_CAP);
    if (overCap) {
      showError(`Hours must be between 0 and ${DAILY_HOURS_CAP}.`);
      return;
    }

    setIsSaving(true);
    try {
      for (const [date, cellEdits] of Object.entries(byDate)) {
        const existing = await employeeWorkLogApi.getDaily(date);
        for (const { servicePOId, hours } of cellEdits) {
          const match = existing.find((e) => String(e.service_po_id) === String(servicePOId));
          if (hours <= 0) {
            if (match) await deleteMutation.mutateAsync(match.id);
            continue;
          }
          const row = rows.find((r) => String(r.servicePOId) === String(servicePOId));
          const payload = {
            service_po_id: servicePOId,
            sub_project_id: null,
            hours,
            description: row?.label ?? 'Logged via Monthly Summary',
            timesheet_date: date,
          };
          if (match) {
            await updateMutation.mutateAsync({ id: match.id, payload });
          } else {
            await createMutation.mutateAsync(payload);
          }
        }
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
      <div>
        <h1 className="text-xl font-bold tracking-tight">Monthly Summary</h1>
        <p className="text-sm text-muted-foreground">
          Hours logged per Service/Project for each day of the month.
        </p>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Unable to load your monthly summary. Please try again.
        </div>
      )}

      <MonthNavigator month={month} year={year} onChange={handleMonthChange} />

      <SummaryTable
        month={month}
        year={year}
        rows={rows}
        isLoading={isLoading}
        edits={edits}
        onCellChange={handleCellChange}
      />

      {/* Save sits last — after the table, only relevant once something's actually changed. */}
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
    </div>
  );
};

export default MonthlySummaryPage;
