import { useState } from 'react';
import dayjs from 'dayjs';
import { Plus, Pencil, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { useDeleteWorkLogEntry } from '@/hooks/useEmployeeWorkLog';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';

// Work Log entries for one selected date — "+ Add Entry" above the table, Edit/Delete per row,
// a daily total. Entries with status === 'synced' have already been promoted to the official
// Timesheet by an Admin's Sync step and are read-only here — Edit/Delete are disabled entirely
// (not just caught as a 409) so the "can't edit a synced entry" rule is visible up front.
const WorkLogEntryTable = ({ entries = [], isLoading, isPastOrToday, onAdd, onEdit }) => {
  const [deleteTarget, setDeleteTarget] = useState(null);
  const deleteMutation = useDeleteWorkLogEntry();
  const { success, error: showError } = useNotification();

  const totalHours = entries.reduce((sum, e) => sum + Number(e.hours || 0), 0);

  const handleDelete = () => {
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        success('Entry deleted.');
        setDeleteTarget(null);
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  if (isLoading) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
      </div>
    );
  }

  if (entries.length === 0) {
    return (
      <EmptyState
        title="No work log entries for this date."
        action={isPastOrToday ? { label: 'Add Entry', icon: Plus, onClick: onAdd } : undefined}
      />
    );
  }

  return (
    <TooltipProvider>
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-semibold">Work Log Entries</h3>
          {isPastOrToday && (
            <Button size="sm" onClick={onAdd}>
              <Plus className="h-4 w-4" /> Add Entry
            </Button>
          )}
        </div>

        <Table containerClassName="bg-white border rounded-lg overflow-auto">
          <TableHeader>
            <TableRow>
              <TableHead>Project</TableHead>
              <TableHead>Hours</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Created Time</TableHead>
              <TableHead>Status</TableHead>
              {isPastOrToday && <TableHead className="text-right">Actions</TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {entries.map((entry) => {
              const isSynced = entry.status === 'synced';
              return (
                <TableRow key={entry.id}>
                  <TableCell>
                    {entry.servicePO?.service_po_name ?? entry.servicePO?.service_po_code ?? `PO #${entry.service_po_id}`}
                  </TableCell>
                  <TableCell>{entry.hours}</TableCell>
                  <TableCell className="max-w-xs truncate">{entry.description}</TableCell>
                  <TableCell>{entry.created_at ? dayjs(entry.created_at).format('hh:mm A') : '—'}</TableCell>
                  <TableCell>
                    <Badge variant={isSynced ? 'success' : 'muted'}>{isSynced ? 'Synced' : 'Pending'}</Badge>
                  </TableCell>
                  {isPastOrToday && (
                    <TableCell className="text-right">
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={isSynced ? 0 : -1}>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Edit"
                              disabled={isSynced}
                              onClick={() => !isSynced && onEdit(entry)}
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {isSynced && <TooltipContent>Synced to Timesheet — read-only</TooltipContent>}
                      </Tooltip>
                      <Tooltip>
                        <TooltipTrigger asChild>
                          <span tabIndex={isSynced ? 0 : -1}>
                            <Button
                              variant="ghost"
                              size="icon-sm"
                              aria-label="Delete"
                              disabled={isSynced}
                              onClick={() => !isSynced && setDeleteTarget(entry)}
                            >
                              <Trash2 className={isSynced ? 'h-4 w-4' : 'h-4 w-4 text-destructive'} />
                            </Button>
                          </span>
                        </TooltipTrigger>
                        {isSynced && <TooltipContent>Synced to Timesheet — read-only</TooltipContent>}
                      </Tooltip>
                    </TableCell>
                  )}
                </TableRow>
              );
            })}
          </TableBody>
        </Table>

        <p className="text-sm font-medium">Total: {totalHours} hrs</p>

        <ConfirmDialog
          open={!!deleteTarget}
          onOpenChange={(open) => !open && setDeleteTarget(null)}
          title="Delete this entry?"
          description="This work log entry will be permanently removed."
          confirmLabel="Delete"
          onConfirm={handleDelete}
          isLoading={deleteMutation.isPending}
        />
      </div>
    </TooltipProvider>
  );
};

export default WorkLogEntryTable;
