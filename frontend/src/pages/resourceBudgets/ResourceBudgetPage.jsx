import { useMemo, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Users } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import DataTable from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import ResourceBudgetEntrySheet from './ResourceBudgetEntrySheet';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useResourceBudgetMappedEmployees, useResourceBudgetsByServicePo } from '@/hooks/useResourceBudgets';
import { useCanWrite } from '@/hooks/usePermissions';
import { formatMonthYear } from '@/utils/formatters';
import { fromApiMonth } from '@/utils/monthApi';

const MONTHLY_HOURS_CAP = 176;

const matrixColumnHelper = createColumnHelper();

const ResourceBudgetPage = () => {
  const [servicePoId, setServicePoId] = useState('');
  const [sheetOpen, setSheetOpen] = useState(false);

  const canManage = useCanWrite();

  const { data: servicePos = [] } = useActiveServicePOs();
  const selectedPo = servicePos.find((po) => String(po.id) === servicePoId);

  const { data: mappedEmployees = [] } = useResourceBudgetMappedEmployees(servicePoId);
  const { data: poBudgets = [], isPending: isBudgetsLoading } = useResourceBudgetsByServicePo(servicePoId);

  // Resource × Month matrix — every active month ever saved for this PO, pivoted so each
  // resource is one row and each month is its own column, with a running Total. Deactivated
  // entries are left out entirely (deactivating a month is meant to remove it from the picture,
  // not show as a zeroed-out column).
  const activeBudgets = useMemo(() => poBudgets.filter((b) => b.status === 'active'), [poBudgets]);

  const matrixMonths = useMemo(
    () => [...new Set(activeBudgets.map((b) => b.month))].sort(),
    [activeBudgets]
  );

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

  const matrixColumns = useMemo(() => {
    const cols = [
      matrixColumnHelper.accessor((row) => row.employee?.full_name, {
        id: 'resource',
        header: 'Resource',
        size: 220,
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

    cols.push(
      matrixColumnHelper.accessor('total', {
        header: 'Total',
        size: 110,
        cell: (info) => (
          <span className={`tabular-nums text-sm font-semibold whitespace-nowrap ${info.getValue() > MONTHLY_HOURS_CAP ? 'text-destructive' : ''}`}>
            {info.getValue()}h
          </span>
        ),
      })
    );

    return cols;
  }, [matrixMonths]);

  const servicePoOptions = servicePos.map((po) => ({
    value: String(po.id),
    label: `${po.service_po_name}${po.service_po_code ? ` (${po.service_po_code})` : ''}`,
    searchValue: `${po.service_po_name} ${po.service_po_code ?? ''} ${po.client?.client_name ?? ''}`,
  }));

  const selectedPoLabel = selectedPo
    ? `${selectedPo.service_po_name}${selectedPo.service_po_code ? ` (${selectedPo.service_po_code})` : ''}`
    : '';

  return (
    <div className="space-y-4">
      <PageHeader
        title="Resource Budget"
        // description="Planned monthly hours per employee for a Service PO — capped at 176 hrs/employee/month across all Service POs"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SearchableSelect
              options={servicePoOptions}
              value={servicePoId}
              onValueChange={(v) => v && setServicePoId(v)}
              placeholder="Select a Service PO"
              searchPlaceholder="Search Service PO…"
              emptyMessage="No Service POs available."
              className="w-72 bg-white"
            />
            {canManage && servicePoId && (
              <Button size="sm" className="gap-1.5" onClick={() => setSheetOpen(true)}>
                <Plus className="h-4 w-4" /> Add Resource Budget
              </Button>
            )}
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
          emptyState={
            <EmptyState
              title="No resource budgets yet"
              description="No months have been added for this Service PO yet."
              action={canManage ? { label: 'Add Resource Budget', icon: Plus, onClick: () => setSheetOpen(true) } : undefined}
            />
          }
        />
      )}

      <ResourceBudgetEntrySheet
        open={sheetOpen}
        onOpenChange={setSheetOpen}
        servicePoId={servicePoId}
        servicePoLabel={selectedPoLabel}
      />
    </div>
  );
};

export default ResourceBudgetPage;
