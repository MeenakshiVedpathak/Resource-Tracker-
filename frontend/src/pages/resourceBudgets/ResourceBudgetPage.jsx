import { useMemo, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Users, Check, X, Plus } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import DataTable from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useResourceBudgetMappedEmployees, useResourceBudgetsByServicePo, useBulkSaveResourceBudgets } from '@/hooks/useResourceBudgets';
import { useCanWrite } from '@/hooks/usePermissions';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { formatMonthYear } from '@/utils/formatters';
import { fromApiMonth, toApiMonth } from '@/utils/monthApi';

const MONTHLY_HOURS_CAP = 176;
const RESOURCE_COL_WIDTH = 220;
const TOTAL_COL_WIDTH = 110;

const matrixColumnHelper = createColumnHelper();

// Months must be added in strict sequence — the next entry is always the latest existing month +
// 1, never a gap or a jump. `null` (no months yet) means the very first month is still free to pick.
const computeNextPeriod = (sortedApiMonths) => {
  if (sortedApiMonths.length === 0) return null;
  const latest = fromApiMonth(sortedApiMonths[sortedApiMonths.length - 1]);
  const month = latest.month === 12 ? 1 : latest.month + 1;
  const year = latest.month === 12 ? latest.year + 1 : latest.year;
  return { month, year };
};

// Defined once at module scope (stable function identity) and fed live state through
// `table.options.meta` instead of closures baked into the column def — the column list itself
// only changes when months/employees change, not on every keystroke. If this cell were instead a
// fresh inline arrow function recreated on every keystroke, react-table would see a new `cell`
// function each render, React would treat it as a different component type, and the input would
// remount (and lose focus) after every character typed.
const AddMonthHeaderCell = ({ table }) => {
  const m = table.options.meta;
  if (!m.addingInline) {
    return (
      <Button size="sm" variant="outline" title="Add month" onClick={m.startAdding} className="h-6 w-6 p-0 rounded">
        <Plus className="h-3.5 w-3.5" />
      </Button>
    );
  }
  return (
    <div className="flex items-center gap-1.5">
      {m.nextPeriod ? (
        <span className="text-xs font-semibold whitespace-nowrap">{formatMonthYear(m.nextPeriod.month, m.nextPeriod.year)}</span>
      ) : (
        <MonthYearPicker
          value={m.draftPeriod}
          onChange={m.setDraftPeriod}
          placeholder="Month"
          clearable={false}
          className="h-7 w-28 bg-white text-xs"
        />
      )}
      <Button
        size="sm"
        title="Save"
        disabled={!m.canSaveDraft}
        onClick={m.handleSaveDraft}
        className="h-6 w-6 p-0 bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors"
      >
        <Check className="h-3 w-3" />
      </Button>
      <Button size="sm" variant="outline" title="Cancel" disabled={m.isSaving} onClick={m.cancelAdding} className="h-6 w-6 p-0 rounded">
        <X className="h-3 w-3" />
      </Button>
    </div>
  );
};

const AddMonthInputCell = ({ row, table }) => {
  const m = table.options.meta;
  if (!m.addingInline) return null;
  const empId = row.original.empId;
  if (!m.mappedEmployeeIds.has(empId)) return <span className="text-xs text-muted-foreground">—</span>;
  const err = m.draftErrors[String(empId)];
  return (
    <Input
      type="number"
      min="0"
      max={MONTHLY_HOURS_CAP}
      step="0.5"
      value={m.draftHours[empId] ?? ''}
      onChange={(e) => m.handleDraftChange(empId, e.target.value)}
      disabled={m.isSaving}
      placeholder="0"
      title={err || undefined}
      className={`h-8 w-24 text-sm ${err ? 'border-destructive focus-visible:ring-destructive' : ''}`}
    />
  );
};

const ResourceBudgetPage = () => {
  const [servicePoId, setServicePoId] = useState('');
  const [addingInline, setAddingInline] = useState(false);
  const [draftPeriod, setDraftPeriod] = useState(null);
  const [draftHours, setDraftHours] = useState({}); // { [empId]: hoursString }
  const [draftErrors, setDraftErrors] = useState({}); // { [empId]: message }

  const canManage = useCanWrite();
  const { success, error: showError } = useNotification();

  const { data: servicePos = [] } = useActiveServicePOs();

  const { data: mappedEmployees = [] } = useResourceBudgetMappedEmployees(servicePoId);
  const { data: poBudgets = [], isPending: isBudgetsLoading } = useResourceBudgetsByServicePo(servicePoId);
  const bulkSaveMutation = useBulkSaveResourceBudgets();

  const mappedEmployeeIds = useMemo(() => new Set(mappedEmployees.map((e) => String(e.id))), [mappedEmployees]);

  // Resource × Month matrix — every active month ever saved for this PO, pivoted so each
  // resource is one row and each month is its own column, with a running Total. Deactivated
  // entries are left out entirely (deactivating a month is meant to remove it from the picture,
  // not show as a zeroed-out column).
  const activeBudgets = useMemo(() => poBudgets.filter((b) => b.status === 'active'), [poBudgets]);

  const matrixMonths = useMemo(
    () => [...new Set(activeBudgets.map((b) => b.month))].sort(),
    [activeBudgets]
  );

  const nextPeriod = useMemo(() => computeNextPeriod(matrixMonths), [matrixMonths]);

  // Union of currently-mapped employees and anyone with a historical entry — an employee who
  // was later unmapped from this PO shouldn't make their past months vanish from the matrix.
  const matrixEmployees = useMemo(() => {
    const map = new Map(mappedEmployees.map((e) => [String(e.id), e]));
    activeBudgets.forEach((b) => {
      const key = String(b.emp_id);
      if (!map.has(key)) map.set(key, null);
    });
    return [...map.entries()]
      .map(([id, emp]) => ({ id, emp }))
      .sort((a, b) => (a.emp?.full_name ?? `Employee #${a.id}`).localeCompare(b.emp?.full_name ?? `Employee #${b.id}`));
  }, [mappedEmployees, activeBudgets]);

  const hoursByEmpMonth = useMemo(() => {
    const map = new Map();
    activeBudgets.forEach((b) => {
      const key = String(b.emp_id);
      if (!map.has(key)) map.set(key, new Map());
      map.get(key).set(b.month, b.hours);
    });
    return map;
  }, [activeBudgets]);

  const matrixRows = useMemo(
    () =>
      matrixEmployees.map(({ id, emp }) => {
        const monthly = hoursByEmpMonth.get(id) ?? new Map();
        const total = matrixMonths.reduce((sum, m) => sum + Number(monthly.get(m) ?? 0), 0);
        return { empId: id, employee: emp, monthly, total };
      }),
    [matrixEmployees, hoursByEmpMonth, matrixMonths]
  );

  const startAdding = () => {
    setDraftPeriod(nextPeriod);
    setDraftHours({});
    setDraftErrors({});
    setAddingInline(true);
  };

  const cancelAdding = () => {
    setAddingInline(false);
    setDraftHours({});
    setDraftErrors({});
  };

  const handleDraftChange = (empId, value) => {
    setDraftHours((prev) => ({ ...prev, [empId]: value }));
    setDraftErrors((prev) => {
      if (!(empId in prev)) return prev;
      const next = { ...prev };
      delete next[empId];
      return next;
    });
  };

  const canSaveDraft = !!draftPeriod && mappedEmployees.length > 0 && !bulkSaveMutation.isPending;

  const handleSaveDraft = () => {
    if (!canSaveDraft) return;
    const resources = mappedEmployees.map((emp) => ({ emp_id: emp.id, hours: Number(draftHours[emp.id] || 0) }));
    setDraftErrors({});
    bulkSaveMutation.mutate(
      { service_po_id: Number(servicePoId), month: toApiMonth(draftPeriod), resources },
      {
        onSuccess: () => {
          success(`Resource budget saved for ${formatMonthYear(draftPeriod.month, draftPeriod.year)}.`);
          setAddingInline(false);
          setDraftHours({});
          setDraftErrors({});
        },
        onError: (err) => {
          const errors = err?.response?.data?.errors;
          if (Array.isArray(errors) && errors.length) {
            setDraftErrors(Object.fromEntries(errors.map((e) => [String(e.emp_id), e.message])));
            showError('Some employees exceeded the 176-hour monthly cap. See the highlighted cells.');
          } else {
            showError(extractApiError(err));
          }
        },
      }
    );
  };

  const matrixColumns = useMemo(() => {
    const cols = [
      // Resource + Total are frozen (sticky) so they stay visible while scrolling through months.
      matrixColumnHelper.accessor((row) => row.employee?.full_name, {
        id: 'resource',
        header: 'Resource',
        size: RESOURCE_COL_WIDTH,
        meta: { sticky: true, left: 0 },
        cell: (info) => {
          const row = info.row.original;
          const label = row.employee ? `${row.employee.full_name} (${row.employee.employee_code})` : `Employee #${row.empId}`;
          return (
            <div className="truncate text-sm font-medium" title={label}>
              {label}
            </div>
          );
        },
      }),
      matrixColumnHelper.accessor('total', {
        header: 'Total',
        size: TOTAL_COL_WIDTH,
        meta: { sticky: true, left: RESOURCE_COL_WIDTH },
        cell: (info) => (
          <span className={`tabular-nums text-sm font-semibold whitespace-nowrap ${info.getValue() > MONTHLY_HOURS_CAP ? 'text-destructive' : ''}`}>
            {info.getValue()}h
          </span>
        ),
      }),
    ];

    matrixMonths.forEach((month) => {
      const p = fromApiMonth(month);
      cols.push(
        matrixColumnHelper.accessor((row) => row.monthly.get(month) ?? null, {
          id: `month-${month}`,
          header: formatMonthYear(p?.month, p?.year),
          size: 110,
          cell: (info) => {
            const v = info.getValue();
            return <span className="tabular-nums text-sm whitespace-nowrap">{v != null ? `${v}h` : '—'}</span>;
          },
        })
      );
    });

    // The "add next month" affordance sits right next to the month columns — either a small "+"
    // trigger, or (once clicked) a live column with one hours input per mapped employee. Its
    // cell/header read fast-changing draft state via `table.options.meta` (set below) rather than
    // via closures, so this array doesn't need to — and must not — be rebuilt on every keystroke.
    if (canManage && matrixRows.length > 0) {
      cols.push(
        matrixColumnHelper.display({
          id: 'add-month',
          enableSorting: false,
          size: 190,
          header: AddMonthHeaderCell,
          cell: AddMonthInputCell,
        })
      );
    }

    return cols;
  }, [matrixMonths, canManage, matrixRows.length]);

  const servicePoOptions = servicePos.map((po) => ({
    value: String(po.id),
    label: `${po.service_po_name}${po.service_po_code ? ` (${po.service_po_code})` : ''}`,
    searchValue: `${po.service_po_name} ${po.service_po_code ?? ''} ${po.client?.client_name ?? ''}`,
  }));

  return (
    <div className="space-y-4">
      <PageHeader
        title="Resource Budget"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SearchableSelect
              options={servicePoOptions}
              value={servicePoId}
              onValueChange={(v) => {
                if (!v) return;
                setServicePoId(v);
                cancelAdding();
              }}
              placeholder="Select a Service PO"
              searchPlaceholder="Search Service PO…"
              emptyMessage="No Service POs available."
              className="w-72 bg-white"
            />
          </div>
        }
      />

      {!servicePoId ? (
        <EmptyState
          icon={Users}
          title="Select a Service PO"
          description="Choose a Service PO above to see every month resource hours have been added for it."
        />
      ) : (
        <DataTable
          columns={matrixColumns}
          data={matrixRows}
          isLoading={isBudgetsLoading}
          toolbar={null}
          meta={{
            addingInline,
            draftPeriod,
            setDraftPeriod,
            draftHours,
            draftErrors,
            handleDraftChange,
            mappedEmployeeIds,
            nextPeriod,
            canSaveDraft,
            handleSaveDraft,
            startAdding,
            cancelAdding,
            isSaving: bulkSaveMutation.isPending,
          }}
          emptyState={
            <EmptyState
              title="No resource budgets yet"
              description="No months have been added for this Service PO yet."
            />
          }
        />
      )}
    </div>
  );
};

export default ResourceBudgetPage;
