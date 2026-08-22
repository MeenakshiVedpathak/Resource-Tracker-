import { useMemo, useState } from 'react';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Building2, Check, X } from 'lucide-react';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import DataTable from '@/components/common/DataTable';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useCostBudgetsByServicePo, useCreateCostBudget } from '@/hooks/useCostBudgets';
import { useCanWrite } from '@/hooks/usePermissions';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { formatCurrency, formatMonthYear, formatDate } from '@/utils/formatters';
import { fromApiMonth, toApiMonth } from '@/utils/monthApi';

const columnHelper = createColumnHelper();

// Column widths mirror the DataTable `size`s below so this inline row lines up with the real rows.
const InlineAddRow = ({ servicePoId, nextPeriod, onDone }) => {
  const [period, setPeriod] = useState(nextPeriod);
  const [amount, setAmount] = useState('');
  const [description, setDescription] = useState('');
  const { success, error: showError } = useNotification();
  const createMutation = useCreateCostBudget();

  const canSave = !!period && amount !== '' && !Number.isNaN(Number(amount)) && Number(amount) >= 0;

  const handleSave = () => {
    if (!canSave) return;
    createMutation.mutate(
      {
        service_po_id: servicePoId,
        month: toApiMonth(period),
        invoice_amount: Number(amount),
        description: description || '',
      },
      {
        onSuccess: () => {
          success('Cost budget created successfully.');
          onDone();
        },
        onError: (err) => showError(extractApiError(err)),
      }
    );
  };

  return (
    <div className="flex items-stretch rounded-lg border border-primary/40 bg-primary/5">
      <div className="flex w-[150px] shrink-0 items-center px-3 py-2">
        {nextPeriod ? (
          <span className="text-sm font-medium whitespace-nowrap">{formatMonthYear(period?.month, period?.year)}</span>
        ) : (
          <MonthYearPicker
            value={period}
            onChange={setPeriod}
            placeholder="Select month"
            clearable={false}
            className="h-8 w-full bg-white"
          />
        )}
      </div>
      <div className="flex w-[160px] shrink-0 items-center px-3 py-2">
        <div className="relative w-full">
          <span className="pointer-events-none absolute inset-y-0 left-0 flex items-center pl-2.5 text-sm text-muted-foreground">₹</span>
          <Input
            type="number"
            min="0"
            step="0.01"
            autoFocus
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder="5,00,000"
            className="h-8 pl-6"
          />
        </div>
      </div>
      <div className="flex w-[240px] shrink-0 items-center px-3 py-2">
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Description (optional)"
          className="h-8"
        />
      </div>
      <div className="flex shrink-0 items-center gap-1 px-3 py-2">
        <Button
          size="sm"
          title="Save"
          disabled={!canSave || createMutation.isPending}
          onClick={handleSave}
          className="h-6 w-6 p-0 bg-emerald-500 hover:bg-emerald-600 text-white rounded transition-colors"
        >
          <Check className="h-3 w-3" />
        </Button>
        <Button
          size="sm"
          variant="outline"
          title="Cancel"
          disabled={createMutation.isPending}
          onClick={onDone}
          className="h-6 w-6 p-0 rounded"
        >
          <X className="h-3 w-3" />
        </Button>
      </div>
      <div className="flex-1" aria-hidden="true" />
    </div>
  );
};

const CostBudgetList = () => {
  const [servicePoId, setServicePoId] = useState('');
  const [addingInline, setAddingInline] = useState(false);

  const canManage = useCanWrite();

  const { data: servicePos = [] } = useActiveServicePOs();
  const selectedPo = servicePos.find((po) => String(po.id) === servicePoId);

  // Every month ever saved for this PO (active + inactive) — the whole point of this screen is
  // to show all added months at once, not force picking one month at a time.
  const { data: records = [], isPending } = useCostBudgetsByServicePo(servicePoId);

  // "YYYY-MM" sorts correctly as a plain string — most recent month first.
  const sortedRecords = useMemo(
    () => [...records].sort((a, b) => (a.month < b.month ? 1 : a.month > b.month ? -1 : 0)),
    [records]
  );

  // Months must be added in strict sequence — the next entry is always latest existing month + 1,
  // never a gap or a jump. `null` (no records yet) means the very first month is still free to pick.
  const nextPeriod = useMemo(() => {
    if (sortedRecords.length === 0) return null;
    const latest = fromApiMonth(sortedRecords[0].month);
    const month = latest.month === 12 ? 1 : latest.month + 1;
    const year = latest.month === 12 ? latest.year + 1 : latest.year;
    return { month, year };
  }, [sortedRecords]);

  const servicePoOptions = servicePos.map((po) => ({
    value: String(po.id),
    label: `${po.service_po_name}${po.service_po_code ? ` (${po.service_po_code})` : ''}`,
    searchValue: `${po.service_po_name} ${po.service_po_code ?? ''} ${po.client?.client_name ?? ''}`,
  }));

  const columns = [
    columnHelper.accessor((row) => fromApiMonth(row.month), {
      id: 'month',
      header: 'Month',
      size: 150,
      cell: (info) => {
        const p = info.getValue();
        return <span className="text-sm font-medium whitespace-nowrap">{formatMonthYear(p?.month, p?.year)}</span>;
      },
    }),
    columnHelper.accessor('invoice_amount', {
      header: 'Invoice Amount',
      size: 160,
      cell: (info) => <span className="tabular-nums text-sm font-medium whitespace-nowrap">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.accessor('description', {
      header: 'Description',
      size: 240,
      cell: (info) => (
        <div className="truncate text-sm text-muted-foreground" title={info.getValue() || ''}>
          {info.getValue() || '—'}
        </div>
      ),
    }),
    // columnHelper.accessor('updated_at', {
    //   header: 'Updated',
    //   size: 140,
    //   cell: (info) => <span className="text-xs text-muted-foreground whitespace-nowrap">{formatDate(info.getValue())}</span>,
    // }),
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Cost Budget"
        actions={
          <div className="flex flex-wrap items-center gap-2">
            <SearchableSelect
              options={servicePoOptions}
              value={servicePoId}
              onValueChange={(v) => {
                if (!v) return;
                setServicePoId(v);
                setAddingInline(false);
              }}
              placeholder="Select a Service PO"
              searchPlaceholder="Search Service PO…"
              emptyMessage="No Service POs available."
              className="w-72 bg-white"
            />
          </div>
        }
      >
        {selectedPo?.client?.client_name && (
          <p className="mt-1 flex items-center gap-1.5 text-sm text-muted-foreground">
            <Building2 className="h-3.5 w-3.5" /> {selectedPo.client.client_name}
          </p>
        )}
      </PageHeader>

      {!servicePoId ? (
        <EmptyState
          title="Select a Service PO"
          description="Choose a Service PO above to see every month a cost budget has been added for it."
        />
      ) : (
        <>
          <DataTable
            columns={columns}
            data={sortedRecords}
            isLoading={isPending}
            toolbar={null}
            rowClassName={(r) => (r.status !== 'active' ? 'opacity-50' : '')}
            emptyState={
              <EmptyState
                title="No cost budgets yet"
                description="No months have been added for this Service PO yet."
                action={canManage && !addingInline ? { label: 'Add Cost Budget', icon: Plus, onClick: () => setAddingInline(true) } : undefined}
              />
            }
          />
          {canManage && (
            addingInline ? (
              <InlineAddRow
                servicePoId={servicePoId}
                nextPeriod={nextPeriod}
                onDone={() => setAddingInline(false)}
              />
            ) : sortedRecords.length > 0 && (
              <button
                type="button"
                onClick={() => setAddingInline(true)}
                className="flex w-full items-center justify-center gap-1.5 rounded-lg border border-dashed py-2 text-sm text-muted-foreground transition-colors hover:border-primary hover:text-primary"
              >
                <Plus className="h-4 w-4" /> Add Cost Budget
                {nextPeriod && (
                  <span className="text-xs">({formatMonthYear(nextPeriod.month, nextPeriod.year)})</span>
                )}
              </button>
            )
          )}
        </>
      )}
    </div>
  );
};

export default CostBudgetList;
