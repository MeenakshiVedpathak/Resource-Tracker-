import { useEffect, useMemo, useState } from 'react';
import { Save, Ban, AlertCircle, Users } from 'lucide-react';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription, SheetFooter,
} from '@/components/ui/sheet';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import EmptyState from '@/components/common/EmptyState';
import {
  useResourceBudgetMappedEmployees,
  useResourceBudgetsByServicePo,
  useBulkSaveResourceBudgets,
  useDeactivateResourceBudget,
} from '@/hooks/useResourceBudgets';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { formatMonthYear } from '@/utils/formatters';
import { toApiMonth } from '@/utils/monthApi';

const MONTHLY_HOURS_CAP = 176;

const now = new Date();
const DEFAULT_PERIOD = { month: now.getMonth() + 1, year: now.getFullYear() };

// A dedicated slide-over for entering a month's hours — the list page's job is showing history
// (the Resource × Month matrix); adding/editing a month is an occasional action that belongs
// behind an explicit "Add" button rather than an always-visible grid.
const ResourceBudgetEntrySheet = ({ open, onOpenChange, servicePoId, servicePoLabel }) => {
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [edits, setEdits] = useState({}); // { [empId]: hoursString }
  const [fieldErrors, setFieldErrors] = useState({}); // { [empId]: message }
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  const { success, error: showError } = useNotification();

  const { data: mappedEmployees = [], isPending: isEmployeesLoading } = useResourceBudgetMappedEmployees(servicePoId);
  const { data: poBudgets = [], isPending: isBudgetsLoading } = useResourceBudgetsByServicePo(servicePoId);

  const bulkSaveMutation = useBulkSaveResourceBudgets();
  const deactivateMutation = useDeactivateResourceBudget();

  useEffect(() => {
    if (open) {
      setPeriod(DEFAULT_PERIOD);
      setEdits({});
      setFieldErrors({});
    }
  }, [open]);

  const apiMonth = toApiMonth(period);
  const budgetByEmpId = useMemo(() => {
    const map = new Map();
    poBudgets.filter((b) => b.month === apiMonth && b.status === 'active').forEach((b) => map.set(String(b.emp_id), b));
    return map;
  }, [poBudgets, apiMonth]);

  const cellValue = (empId) => {
    const edited = edits[empId];
    if (edited !== undefined) return edited;
    const existing = budgetByEmpId.get(String(empId));
    return existing?.hours != null ? String(existing.hours) : '';
  };

  const handleCellChange = (empId, value) => {
    setEdits((prev) => ({ ...prev, [empId]: value }));
    setFieldErrors((prev) => {
      if (!(empId in prev)) return prev;
      const next = { ...prev };
      delete next[empId];
      return next;
    });
  };

  const totalHours = mappedEmployees.reduce((sum, emp) => sum + Number(cellValue(emp.id) || 0), 0);
  const isLoading = isEmployeesLoading || isBudgetsLoading;
  const isSaving = bulkSaveMutation.isPending;

  const handleSave = () => {
    const resources = mappedEmployees.map((emp) => ({ emp_id: emp.id, hours: Number(cellValue(emp.id) || 0) }));

    setFieldErrors({});
    bulkSaveMutation.mutate(
      { service_po_id: Number(servicePoId), month: apiMonth, resources },
      {
        onSuccess: () => {
          success(`Resource budget saved for ${formatMonthYear(period.month, period.year)}.`);
          onOpenChange(false);
        },
        onError: (err) => {
          const errors = err?.response?.data?.errors;
          if (Array.isArray(errors) && errors.length) {
            setFieldErrors(Object.fromEntries(errors.map((e) => [String(e.emp_id), e.message])));
            showError('Some employees exceeded the 176-hour monthly cap. See the highlighted rows below.');
          } else {
            showError(extractApiError(err));
          }
        },
      }
    );
  };

  const handleDeactivate = () => {
    if (!deactivateTarget) return;
    deactivateMutation.mutate(deactivateTarget.id, {
      onSuccess: () => {
        success('Resource budget entry deactivated.');
        setDeactivateTarget(null);
      },
      onError: (err) => {
        showError(extractApiError(err));
        setDeactivateTarget(null);
      },
    });
  };

  return (
    <>
      <Sheet open={open} onOpenChange={(next) => !isSaving && onOpenChange(next)}>
        <SheetContent
          side="right"
          className="flex w-full flex-col gap-0 p-0 sm:max-w-2xl"
          onInteractOutside={(e) => isSaving && e.preventDefault()}
        >
          <SheetHeader className="border-b px-5 py-4">
            <SheetTitle>Add Resource Budget</SheetTitle>
            <SheetDescription>{servicePoLabel}</SheetDescription>
          </SheetHeader>

          <div className="flex-1 space-y-4 overflow-y-auto px-5 py-4">
            <div className="flex max-w-[220px] flex-col gap-1.5">
              <Label className="text-xs">Month</Label>
              <MonthYearPicker
                value={period}
                onChange={(v) => { if (v) { setPeriod(v); setEdits({}); setFieldErrors({}); } }}
                clearable={false}
                className="w-full"
              />
            </div>

            {isLoading ? (
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => <Skeleton key={i} className="h-9 w-full" />)}
              </div>
            ) : mappedEmployees.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No mapped employees"
                description="No employees are currently allocated to this Service PO."
              />
            ) : (
              <>
                <Table containerClassName="rounded-lg border">
                  <TableHeader>
                    <TableRow>
                      <TableHead>Employee Code</TableHead>
                      <TableHead>Name</TableHead>
                      <TableHead className="w-40">Hours</TableHead>
                      <TableHead className="w-16">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {mappedEmployees.map((emp) => {
                      const rowError = fieldErrors[String(emp.id)];
                      const existing = budgetByEmpId.get(String(emp.id));
                      return (
                        <TableRow key={emp.id}>
                          <TableCell className="text-sm font-medium">{emp.employee_code}</TableCell>
                          <TableCell className="text-sm">{emp.full_name}</TableCell>
                          <TableCell>
                            <div className="flex flex-col gap-1">
                              <Input
                                type="number"
                                min="0"
                                max={MONTHLY_HOURS_CAP}
                                step="0.5"
                                value={cellValue(emp.id)}
                                onChange={(e) => handleCellChange(emp.id, e.target.value)}
                                disabled={isSaving}
                                className={`h-8 w-28 text-sm ${rowError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                              />
                              {rowError && (
                                <span className="flex items-start gap-1 text-xs text-destructive">
                                  <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> {rowError}
                                </span>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            {existing && (
                              <Button
                                size="sm"
                                title="Deactivate"
                                onClick={() => setDeactivateTarget(existing)}
                                className="h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
                              >
                                <Ban className="h-3 w-3" />
                              </Button>
                            )}
                          </TableCell>
                        </TableRow>
                      );
                    })}
                  </TableBody>
                </Table>

                <div className="flex items-center gap-2 text-sm">
                  <span className="text-muted-foreground">Total planned hours:</span>
                  <Badge variant={totalHours > MONTHLY_HOURS_CAP ? 'destructive' : 'secondary'} className="tabular-nums">
                    {totalHours}h
                  </Badge>
                </div>
              </>
            )}
          </div>

          <SheetFooter className="border-t px-5 py-4">
            <Button type="button" variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={isSaving || isLoading || mappedEmployees.length === 0}>
              <Save className="mr-1.5 h-4 w-4" />
              {isSaving ? 'Saving…' : 'Save'}
            </Button>
          </SheetFooter>
        </SheetContent>
      </Sheet>

      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(nextOpen) => !nextOpen && setDeactivateTarget(null)}
        title="Deactivate Resource Budget"
        description="Deactivate this employee's resource budget entry for this Service PO and month?"
        confirmLabel="Deactivate"
        onConfirm={handleDeactivate}
        isLoading={deactivateMutation.isPending}
      />
    </>
  );
};

export default ResourceBudgetEntrySheet;
