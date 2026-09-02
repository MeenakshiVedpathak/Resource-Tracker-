import { useState } from 'react';
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

const currentDate = new Date();

// Same two-stage flow as the Excel upload (pick a period -> preview -> confirm), but the
// preview comes from the employee Work Log drafts for that month instead of a file. Reuses
// ImportPreviewPanel and the existing confirm endpoint — both sources feed the same import
// pipeline on the backend.
const SyncWorkLogsDialog = ({ open, onOpenChange, buId = null, buName = null }) => {
  const [month, setMonth] = useState(String(currentDate.getMonth() + 1));
  const [year, setYear] = useState(String(currentDate.getFullYear()));
  const [preview, setPreview] = useState(null);

  const { success, error: showError } = useNotification();
  const syncMutation = useSyncEmployeeWorkLogs();
  const confirmMutation = useConfirmImport();

  const resetAndClose = (nextOpen) => {
    if (!nextOpen) {
      setPreview(null);
      setMonth(String(currentDate.getMonth() + 1));
      setYear(String(currentDate.getFullYear()));
    }
    onOpenChange(nextOpen);
  };

  const handleSync = () => {
    syncMutation.mutate({ month, year, buId }, {
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
    confirmMutation.mutate({ importId: preview.importId, buId }, {
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
      <DialogContent className={preview ? 'sm:max-w-3xl' : 'sm:max-w-[400px]'}>
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
              <div className="grid gap-2">
                <Label>Month</Label>
                <SearchableSelect
                  showSearch={false}
                  options={Array.from({ length: 12 }, (_, i) => {
                    const m = i + 1;
                    return { label: new Date(0, m - 1).toLocaleString('default', { month: 'long' }), value: String(m) };
                  })}
                  value={month}
                  onValueChange={setMonth}
                  placeholder="Select month"
                  searchPlaceholder="Search month..."
                />
              </div>
              <div className="grid gap-2">
                <Label>Year</Label>
                <SearchableSelect
                  showSearch={false}
                  options={Array.from({ length: 5 }, (_, i) => {
                    const y = currentDate.getFullYear() - 2 + i;
                    return { label: String(y), value: String(y) };
                  })}
                  value={year}
                  onValueChange={setYear}
                  placeholder="Select year"
                  searchPlaceholder="Search year..."
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => resetAndClose(false)} disabled={syncMutation.isPending}>
                Cancel
              </Button>
              <Button onClick={handleSync} disabled={syncMutation.isPending}>
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
