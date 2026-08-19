import { useMemo, useState } from 'react';
import { Save, Ban, AlertCircle, Users } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { Table, TableHeader, TableBody, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import {
  useResourceBudgetMappedEmployees,
  useResourceBudgetsByServicePo,
  useBulkSaveResourceBudgets,
  useDeactivateResourceBudget,
} from '@/hooks/useResourceBudgets';
import { useCanWrite } from '@/hooks/usePermissions';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { formatMonthYear } from '@/utils/formatters';
import { toApiMonth } from '@/utils/monthApi';

const MONTHLY_HOURS_CAP = 176;

const now = new Date();
const DEFAULT_PERIOD = { month: now.getMonth() + 1, year: now.getFullYear() };

const ResourceBudgetPage = () => {
  const [servicePoId, setServicePoId] = useState('');
  const [period, setPeriod] = useState(DEFAULT_PERIOD);
  const [edits, setEdits] = useState({}); // { [empId]: hoursString }
  const [fieldErrors, setFieldErrors] = useState({}); // { [empId]: message }
  const [deactivateTarget, setDeactivateTarget] = useState(null);

  const canManage = useCanWrite();
  const { success, error: showError } = useNotification();

  const { data: servicePos = [] } = useActiveServicePOs();
  const { data: mappedEmployees = [], isPending: isEmployeesLoading } = useResourceBudgetMappedEmployees(servicePoId);
  const { data: poBudgets = [], isPending: isBudgetsLoading } = useResourceBudgetsByServicePo(servicePoId);

  const bulkSaveMutation = useBulkSaveResourceBudgets();
  const deactivateMutation = useDeactivateResourceBudget();

  const apiMonth = servicePoId ? toApiMonth(period) : null;
  const budgetByEmpId = useMemo(() => {
    const map = new Map();
    poBudgets.filter((b) => b.month === apiMonth).forEach((b) => map.set(String(b.emp_id), b));
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
          setEdits({});
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

  const servicePoOptions = servicePos.map((po) => ({
    value: String(po.id),
    label: `${po.service_po_name}${po.service_po_code ? ` (${po.service_po_code})` : ''}`,
    searchValue: `${po.service_po_name} ${po.service_po_code ?? ''} ${po.client?.client_name ?? ''}`,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Resource Budget"
        description="Planned monthly hours per employee for a Service PO — capped at 176 hrs/employee/month across all Service POs"
      />

      <div className="flex flex-col gap-4 rounded-lg border bg-muted/30 p-4 sm:flex-row sm:items-end">
        <div className="flex min-w-0 flex-1 flex-col gap-1.5">
          <Label className="text-xs">Service PO</Label>
          <SearchableSelect
            options={servicePoOptions}
            value={servicePoId}
            onValueChange={(v) => { if (v) { setServicePoId(v); setEdits({}); setFieldErrors({}); } }}
            placeholder="Select a Service PO"
            searchPlaceholder="Search Service PO…"
            emptyMessage="No Service POs available."
            className="bg-white"
          />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Month</Label>
          <MonthYearPicker
            value={period}
            onChange={(v) => { if (v) { setPeriod(v); setEdits({}); setFieldErrors({}); } }}
            clearable={false}
            className="w-44"
          />
        </div>
      </div>

      {!servicePoId ? (
        <EmptyState
          icon={Users}
          title="Select a Service PO"
          description="Choose a Service PO and month above to enter planned resource hours for its mapped employees."
        />
      ) : isLoading ? (
        <div className="space-y-2 rounded-lg border bg-white p-4">
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
          <Table containerClassName="rounded-lg border bg-white">
            <TableHeader>
              <TableRow>
                <TableHead>Employee Code</TableHead>
                <TableHead>Name</TableHead>
                <TableHead>Designation</TableHead>
                <TableHead className="w-40">Hours</TableHead>
                {canManage && <TableHead className="w-16">Actions</TableHead>}
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
                    <TableCell className="text-sm text-muted-foreground">{emp.designation ?? '—'}</TableCell>
                    <TableCell>
                      <div className="flex flex-col gap-1">
                        <Input
                          type="number"
                          min="0"
                          max={MONTHLY_HOURS_CAP}
                          step="0.5"
                          value={cellValue(emp.id)}
                          onChange={(e) => handleCellChange(emp.id, e.target.value)}
                          disabled={!canManage || isSaving}
                          className={`h-8 w-28 text-sm ${rowError ? 'border-destructive focus-visible:ring-destructive' : ''}`}
                        />
                        {rowError && (
                          <span className="flex items-start gap-1 text-xs text-destructive">
                            <AlertCircle className="mt-0.5 h-3 w-3 shrink-0" /> {rowError}
                          </span>
                        )}
                      </div>
                    </TableCell>
                    {canManage && (
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
                    )}
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>

          <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-4 py-3">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-muted-foreground">Total planned hours for this Service PO:</span>
              <Badge variant={totalHours > MONTHLY_HOURS_CAP ? 'destructive' : 'secondary'} className="tabular-nums">
                {totalHours}h
              </Badge>
            </div>
            {canManage && (
              <Button size="sm" className="gap-1.5" onClick={handleSave} disabled={isSaving}>
                <Save className="h-4 w-4" /> {isSaving ? 'Saving…' : 'Save'}
              </Button>
            )}
          </div>
        </>
      )}

      <ConfirmDialog
        open={!!deactivateTarget}
        onOpenChange={(open) => !open && setDeactivateTarget(null)}
        title="Deactivate Resource Budget"
        description="Deactivate this employee's resource budget entry for this Service PO and month?"
        confirmLabel="Deactivate"
        onConfirm={handleDeactivate}
        isLoading={deactivateMutation.isPending}
      />
    </div>
  );
};

export default ResourceBudgetPage;
