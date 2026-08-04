import { useMemo, useState } from 'react';
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
import { buildMonthlySummaryRows } from '@/utils/employeeMonthlySummary';
import MonthNavigator from '@/components/employee/MonthNavigator';
import SummaryTable from '@/components/employee/SummaryTable';
import { DAILY_HOURS_CAP } from '@/components/employee/WorkLogEntryModal';
import { Button } from '@/components/ui/button';

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
const MonthlySummaryPage = () => {
  const today = dayjs().startOf('day');
  const [month, setMonth] = useState(today.month() + 1);
  const [year, setYear] = useState(today.year());
  // { [rowKey]: { [day]: hoursString } } — unsaved cell overrides, cleared on save/month change.
  // rowKey is `po:<servicePOId>` or `h:<hierarchyId>` (see buildMonthlySummaryRows) since a
  // hierarchy node and a Service PO don't share an id space.
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

  const rows = useMemo(() => buildMonthlySummaryRows(summary), [summary]);
  const editedCount = Object.values(edits).reduce((n, byDay) => n + Object.keys(byDay).length, 0);

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
    // Group by date first so each day's existing entries are only fetched once, no matter
    // how many rows changed on that date.
    const byDate = {};
    Object.entries(edits).forEach(([rowKey, byDay]) => {
      Object.entries(byDay).forEach(([day, rawHours]) => {
        const date = dayjs(`${year}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`).format('YYYY-MM-DD');
        (byDate[date] ??= []).push({ rowKey, hours: Number(rawHours || 0) });
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
        for (const { rowKey, hours } of cellEdits) {
          const row = rows.find((r) => r.rowKey === rowKey);
          if (!row) continue;
          // A hierarchy node's entry is matched by hierarchy_id; a plain Service PO entry is
          // matched by service_po_id with no hierarchy_id, so the two never get conflated.
          const match = row.hierarchyId
            ? existing.find((e) => String(e.hierarchy_id) === String(row.hierarchyId))
            : existing.find((e) => String(e.service_po_id) === String(row.servicePOId) && !e.hierarchy_id);
          if (hours <= 0) {
            if (match) await deleteMutation.mutateAsync(match.id);
            continue;
          }
          const payload = {
            service_po_id: row.servicePOId,
            sub_project_id: null,
            ...(row.hierarchyId && { hierarchy_id: row.hierarchyId }),
            hours,
            description: row.label ?? 'Logged via Monthly Summary',
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
