import { useEffect, useMemo, useState } from 'react';
import { Loader2 } from 'lucide-react';
import { useSyncEmployeeWorkLogs, useConfirmImport } from '@/hooks/useTimesheets';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import ImportPreviewPanel from './ImportPreviewPanel';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MonthYearPicker } from '@/components/ui/month-year-picker';

const now = new Date();
const currentMonthYear = { month: now.getMonth() + 1, year: now.getFullYear() };

// One dialog, one step of choices (Entity -> Business Unit -> Month/Year), then Sync -> Preview ->
// Confirm — previously Entity/BU lived in a separate dialog TimesheetList opened first, which read
// as two popups for one action. `activeBusinessUnits` is the login's own active BU mappings (each
// possibly carrying entity_id/entity_name); Entity only renders when they actually span more than
// one, same "nothing to narrow" rule as every other Entity/BU filter pair in the app.
const SyncWorkLogsDialog = ({ open, onOpenChange, activeBusinessUnits = [] }) => {
  const [entityId, setEntityId] = useState('all');
  const [buId, setBuId] = useState('');
  const [monthYear, setMonthYear] = useState(currentMonthYear);
  const [preview, setPreview] = useState(null);

  const { success, error: showError } = useNotification();
  const syncMutation = useSyncEmployeeWorkLogs();
  const confirmMutation = useConfirmImport();

  const buEntityOptions = useMemo(() => {
    const byId = new Map();
    activeBusinessUnits.forEach((bu) => {
      const id = bu.entity_id ?? bu.entityId;
      const name = bu.entity_name ?? bu.entityName;
      if (id != null && name && !byId.has(id)) byId.set(id, { id, name });
    });
    return Array.from(byId.values());
  }, [activeBusinessUnits]);

  const buOptionsForEntity = (id) =>
    id && id !== 'all'
      ? activeBusinessUnits.filter((bu) => String(bu.entity_id ?? bu.entityId) === String(id))
      : activeBusinessUnits;

  // Re-seed on every open (not just mount) — a single-BU login gets it pre-selected, a multi-BU
  // one starts blank so they must choose, and a stale choice from the last time this dialog was
  // open never survives into a new one.
  useEffect(() => {
    if (!open) return;
    setEntityId('all');
    setBuId(activeBusinessUnits.length === 1 ? String(activeBusinessUnits[0].id) : '');
    setMonthYear(currentMonthYear);
    setPreview(null);
  }, [open, activeBusinessUnits]);

  const buName = activeBusinessUnits.find((bu) => String(bu.id) === buId)?.name ?? null;
  const needsBuChoice = activeBusinessUnits.length > 1;
  const canSync = !!buId && !!monthYear;

  const resetAndClose = (nextOpen) => onOpenChange(nextOpen);

  const handleSync = () => {
    syncMutation.mutate({ month: monthYear.month, year: monthYear.year, buId: Number(buId) }, {
      onSuccess: (result) => {
        setPreview({
          importId: result?.importId,
          totalRows: result?.totalRows ?? 0,
          validCount: result?.validRows ?? 0,
          errorCount: result?.errorRows ?? 0,
          valid_rows: result?.preview ?? [],
          error_rows: result?.errors ?? [],
          canConfirm: result?.canConfirm ?? false,
        });
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  const handleConfirm = () => {
    confirmMutation.mutate({ importId: preview.importId, buId: Number(buId) }, {
      onSuccess: (res) => {
        const inserted = res?.data?.insertedRows ?? res?.insertedRows ?? preview.validCount;
        success(`${inserted} row(s) synced to the Timesheet.`);
        resetAndClose(false);
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  return (
    <Dialog open={open} onOpenChange={resetAndClose}>
      <DialogContent className={preview ? 'sm:max-w-3xl' : 'sm:max-w-[420px]'}>
        <DialogHeader>
          <DialogTitle>Sync Employee Work Logs</DialogTitle>
          <DialogDescription>
            {buName
              ? `Pull pending ${buName} work logs into the official Timesheet for a given month.`
              : 'Pull pending employee-entered work logs into the official Timesheet for a given month.'}
          </DialogDescription>
        </DialogHeader>

        {!preview ? (
          <>
            <div className="grid gap-4 py-4">
              {needsBuChoice && buEntityOptions.length > 1 && (
                <div className="grid gap-2">
                  <Label>Entity</Label>
                  <SearchableSelect
                    options={[{ label: 'All Entities', value: 'all' }, ...buEntityOptions.map((e) => ({ label: e.name, value: String(e.id) }))]}
                    value={entityId}
                    onValueChange={(v) => { setEntityId(v ?? 'all'); setBuId(''); }}
                    placeholder="All Entities"
                    searchPlaceholder="Search entity..."
                    showSearch={buEntityOptions.length > 6}
                  />
                </div>
              )}
              {needsBuChoice && (
                <div className="grid gap-2">
                  <Label>Business Unit</Label>
                  <SearchableSelect
                    options={buOptionsForEntity(entityId).map((bu) => ({ label: bu.name, value: String(bu.id) }))}
                    value={buId}
                    onValueChange={setBuId}
                    placeholder="Select a Business Unit"
                    searchPlaceholder="Search business unit..."
                    showSearch={activeBusinessUnits.length > 6}
                  />
                </div>
              )}
              <div className="grid gap-2">
                <Label>Month &amp; Year</Label>
                <MonthYearPicker value={monthYear} onChange={setMonthYear} clearable={false} className="w-full" />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => resetAndClose(false)} disabled={syncMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleSync} disabled={!canSync || syncMutation.isPending}>
                {syncMutation.isPending ? (
                  <span className="flex items-center gap-2">
                    <Loader2 className="h-4 w-4 animate-spin" /> Syncing…
                  </span>
                ) : (
                  'Sync'
                )}
              </Button>
            </DialogFooter>
          </>
        ) : !preview.canConfirm ? (
          <div className="py-8 text-center">
            <p className="text-sm text-muted-foreground">
              No pending employee work log entries found for this month.
            </p>
            <Button variant="outline" size="sm" className="mt-4" onClick={() => setPreview(null)}>
              Try a different month
            </Button>
          </div>
        ) : (
          <ImportPreviewPanel
            preview={preview}
            onConfirm={handleConfirm}
            onCancel={() => setPreview(null)}
            isConfirming={confirmMutation.isPending}
          />
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SyncWorkLogsDialog;
