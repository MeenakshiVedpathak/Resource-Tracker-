import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Trash2, Calculator, Download, Upload } from 'lucide-react';
import { useMonthlyCostSummary } from '@/hooks/useReports';
import { useDeleteMonthlyCostPeriods, useCalculateMonthlyCosts } from '@/hooks/useMonthlyCosts';
import { useAuth } from '@/hooks/useAuth';
import { useCanWrite } from '@/hooks/usePermissions';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { buildPath, ROUTES } from '@/constants/routes';
import { formatCurrency, formatMonthYear } from '@/utils/formatters';
import { downloadMonthlyCostSample } from '@/utils/monthlyCostSample';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import FilterToggleButton from '@/components/common/FilterToggleButton';
import FilterPanel from '@/components/common/FilterPanel';
import BusinessUnitFilter from '@/components/common/BusinessUnitFilter';
import EntityFilter from '@/components/common/EntityFilter';
import { useMasterBuFilter } from '@/hooks/useMasterBuFilter';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

const columnHelper = createColumnHelper();

const periodKey = (row) => `${row.month}-${row.year}`;

// Maps DataTable column ids to the sortBy keys the monthly-cost-summary report accepts.
const sortByMap = {
  month_year: 'month_year',
  employee_count: 'employee_count',
  total_salary_cost: 'total_salary_cost',
  total_ops_cost: 'total_ops_cost',
  total_cost: 'total_cost',
};

const MonthlyCostList = () => {
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();
  const { businessUnits } = useAuth();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [monthYearFilter, setMonthYearFilter] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const [uploadBuOpen, setUploadBuOpen] = useState(false);
  const [uploadBuId, setUploadBuId] = useState('');

  const [calcOpen, setCalcOpen] = useState(false);
  const [calcMonthYear, setCalcMonthYear] = useState(() => {
    const now = new Date();
    const prevMonth = new Date(now.getFullYear(), now.getMonth() - 1, 1);
    return { month: prevMonth.getMonth() + 1, year: prevMonth.getFullYear() };
  });
  const [sorting, setSorting] = useState([]);

  const canManage = useCanWrite();

  const {
    entityId, setEntityId, showEntityFilter, isEntityFiltered, resetEntityId,
    buId, setBuId, showBuFilter, isBuFiltered, resetBuId, buParams,
  } = useMasterBuFilter();

  const params = {
    page,
    limit,
    ...buParams,
    ...(monthYearFilter && { month: monthYearFilter.month, year: monthYearFilter.year }),
    ...(sorting[0] && { sortBy: sortByMap[sorting[0].id] ?? sorting[0].id, sortOrder: sorting[0].desc ? 'DESC' : 'ASC' }),
  };

  const { data, isPending } = useMonthlyCostSummary(params);
  const deletePeriodsMutation = useDeleteMonthlyCostPeriods();
  const calculateMutation = useCalculateMonthlyCosts();

  const records = Array.isArray(data?.data?.records) ? data.data.records : [];
  const meta = data?.meta ?? {};

  const allSelected = records.length > 0 && records.every((r) => selectedKeys.includes(periodKey(r)));
  const toggleSelectAll = () => setSelectedKeys(allSelected ? [] : records.map(periodKey));
  const toggleSelect = (key) =>
    setSelectedKeys((prev) => (prev.includes(key) ? prev.filter((x) => x !== key) : [...prev, key]));

  const clearSelection = () => setSelectedKeys([]);

  const activeFilterCount = (monthYearFilter ? 1 : 0) + (isEntityFiltered ? 1 : 0) + (isBuFiltered ? 1 : 0);

  const clearFilters = () => {
    setMonthYearFilter(null);
    resetEntityId();
    resetBuId();
    setPage(1);
    clearSelection();
  };

  // Narrowing the BU changes which periods (and which rows inside them) are on screen, so a
  // selection made against the previous scope must not survive into a bulk delete.
  const handleEntityChange = (v) => {
    setEntityId(v);
    setPage(1);
    clearSelection();
  };

  const handleBuChange = (v) => {
    setBuId(v);
    setPage(1);
    clearSelection();
  };

  const handleCalculate = () => {
    calculateMutation.mutate(
      { month: calcMonthYear.month, year: calcMonthYear.year },
      {
        onSuccess: () => {
          success(`Monthly costs calculated for ${formatMonthYear(calcMonthYear.month, calcMonthYear.year)}.`);
          setCalcOpen(false);
        },
        onError: (err) => showError(extractApiError(err)),
      }
    );
  };

  const handleDelete = () => {
    deletePeriodsMutation.mutate({ periods: [{ month: deleteTarget.month, year: deleteTarget.year }], buId: buParams.buId }, {
      onSuccess: () => {
        success(`${formatMonthYear(deleteTarget.month, deleteTarget.year)} records deleted.`);
        setDeleteTarget(null);
      },
      onError: (err) => {
        showError(extractApiError(err));
        setDeleteTarget(null);
      },
    });
  };

  const handleBulkDelete = () => {
    const periods = records
      .filter((r) => selectedKeys.includes(periodKey(r)))
      .map((r) => ({ month: r.month, year: r.year }));
    const count = periods.length;
    deletePeriodsMutation.mutate({ periods, buId: buParams.buId }, {
      onSuccess: () => {
        success(`${count} period${count !== 1 ? 's' : ''} deleted.`);
        clearSelection();
        setIsBulkDeleteOpen(false);
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  const columns = [
    columnHelper.display({
      id: 'select',
      header: () =>
        canManage ? (
          <Checkbox checked={allSelected} onCheckedChange={toggleSelectAll} aria-label="Select all" />
        ) : null,
      size: 36,
      cell: ({ row }) =>
        canManage ? (
          <div onClick={(e) => e.stopPropagation()}>
            <Checkbox
              checked={selectedKeys.includes(periodKey(row.original))}
              onCheckedChange={() => toggleSelect(periodKey(row.original))}
              aria-label="Select period"
            />
          </div>
        ) : null,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 90,
      cell: ({ row }) =>
        canManage ? (
          <div onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              className="h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
              title="Delete"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          </div>
        ) : null,
    }),
    columnHelper.accessor((row) => formatMonthYear(row.month, row.year), {
      id: 'month_year',
      header: 'Period',
      size: 140,
      cell: (info) => <span className="font-medium text-sm">{info.getValue()}</span>,
    }),
    columnHelper.accessor('employee_count', {
      header: 'Employees',
      size: 110,
      cell: (info) => (
        <span className="tabular-nums text-sm font-medium text-blue-600">{info.getValue() ?? '—'}</span>
      ),
    }),
    columnHelper.accessor('total_salary_cost', {
      header: 'Salary Cost',
      size: 140,
      cell: (info) => <span className="tabular-nums text-sm">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.accessor('total_ops_cost', {
      header: 'Ops Cost',
      size: 130,
      cell: (info) => <span className="tabular-nums text-sm">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.accessor('total_billable_cost', {
      header: 'Billable Cost',
      size: 140,
      enableSorting: false,
      cell: (info) => <span className="tabular-nums text-sm">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.accessor('total_cost', {
      header: 'Total Cost',
      size: 140,
      cell: (info) => (
        <span className="tabular-nums font-semibold text-sm">{formatCurrency(info.getValue())}</span>
      ),
    }),
  ];

  // Monthly costs are imported against exactly one BU, so the upload has to know which. Asking
  // is only meaningful when the user actually holds more than one — a single-BU user has no
  // choice to make, and an account with none (Platform Admin/Entity Admin) is already unscoped,
  // so both go straight to the import screen and the BU is resolved there.
  const handleUploadClick = () => {
    if (businessUnits.length > 1) {
      setUploadBuId('');
      setUploadBuOpen(true);
      return;
    }
    navigate(ROUTES.MONTHLY_COST_IMPORT);
  };

  const confirmUploadBu = () => {
    if (!uploadBuId) return;
    setUploadBuOpen(false);
    navigate(`${ROUTES.MONTHLY_COST_IMPORT}?buId=${encodeURIComponent(uploadBuId)}`);
  };

  return (
    <div className="space-y-4">
      <PageHeader
        title="Monthly Costs"
        description="Uploaded and calculated cost periods, grouped by month"
        actions={
          <div className="flex items-center gap-2">
            <FilterToggleButton
              isOpen={filtersOpen}
              onToggle={() => setFiltersOpen((prev) => !prev)}
              activeCount={activeFilterCount}
            />
            <Button variant="outline" size="sm" onClick={downloadMonthlyCostSample}>
              <Download className="mr-1.5 h-4 w-4" />
              Download Sample
            </Button>
            {canManage && (
              <>
                {/* <Button variant="outline" size="sm" onClick={() => setCalcOpen(true)}>
                  <Calculator className="mr-1.5 h-4 w-4" />
                  Calculate
                </Button> */}
                <Button size="sm" onClick={handleUploadClick}>
                  <Upload className="mr-1.5 h-4 w-4" />
                  Upload Excel
                </Button>
              </>
            )}
          </div>
        }
      />

      <FilterPanel
        isOpen={filtersOpen}
        maxHeightClass="max-h-[140px]"
        gridClassName="grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4 w-full"
        onClear={clearFilters}
        showClear={activeFilterCount > 0}
      >
        {showEntityFilter && (
          <EntityFilter value={entityId} onChange={handleEntityChange} />
        )}
        {showBuFilter && (
          <BusinessUnitFilter value={buId} entityId={entityId} onChange={handleBuChange} />
        )}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Month &amp; Year</Label>
          <MonthYearPicker
            value={monthYearFilter}
            onChange={(val) => { setMonthYearFilter(val); setPage(1); clearSelection(); }}
            placeholder="All months"
            className="w-44"
          />
        </div>
      </FilterPanel>

      {selectedKeys.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
          <span className="text-sm font-medium">{selectedKeys.length} selected</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={clearSelection}>
              Clear
            </Button>
            <Button
              size="sm"
              className="bg-red-500 hover:bg-red-600 text-white"
              onClick={() => setIsBulkDeleteOpen(true)}
            >
              <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Delete Selected
            </Button>
          </div>
        </div>
      )}

      <DataTable
        columns={columns}
        data={records}
        isLoading={isPending}
        toolbar={null}
        pagination={
          meta.total != null
            ? { page: meta.page ?? page, limit: meta.limit ?? limit, total: meta.total }
            : undefined
        }
        sorting={sorting}
        onSortingChange={(s) => { setSorting(s); setPage(1); }}
        onPageChange={(p) => { setPage(p); clearSelection(); }}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); clearSelection(); }}
        onRowClick={(row) => navigate(buildPath(ROUTES.MONTHLY_COST_DETAIL, { month: row.month, year: row.year }))}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this period?"
        description={`This will permanently remove all ${deleteTarget?.employee_count ?? ''} monthly cost record(s) for ${deleteTarget ? formatMonthYear(deleteTarget.month, deleteTarget.year) : ''}. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={deletePeriodsMutation.isPending}
      />

      <ConfirmDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        title={`Delete ${selectedKeys.length} period${selectedKeys.length !== 1 ? 's' : ''}?`}
        description="This will permanently remove every monthly cost record in the selected periods. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleBulkDelete}
        isLoading={deletePeriodsMutation.isPending}
      />

      {/* Asked only when the user holds more than one BU — see handleUploadClick. */}
      <Dialog open={uploadBuOpen} onOpenChange={setUploadBuOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Which Business Unit?</DialogTitle>
            <DialogDescription>
              Every row in the file you upload is imported against this Business Unit.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Label className="mb-2 block">Business Unit</Label>
            <SearchableSelect
              options={businessUnits.map((bu) => ({ label: bu.name, value: String(bu.id) }))}
              value={uploadBuId}
              onValueChange={setUploadBuId}
              placeholder="Select a Business Unit"
              searchPlaceholder="Search business unit..."
              showSearch={businessUnits.length > 6}
              className="h-9 w-full text-sm"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button variant="outline" size="sm" onClick={() => setUploadBuOpen(false)}>
              Cancel
            </Button>
            <Button size="sm" onClick={confirmUploadBu} disabled={!uploadBuId}>
              <Upload className="mr-1.5 h-4 w-4" />
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <Dialog open={calcOpen} onOpenChange={setCalcOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Calculate Monthly Costs</DialogTitle>
            <DialogDescription>
              Bulk-calculate costs for all employees for the selected month and year.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <Label className="mb-2 block">Month &amp; Year</Label>
            <MonthYearPicker
              value={calcMonthYear}
              onChange={(val) => val && setCalcMonthYear(val)}
              clearable={false}
              className="w-full"
            />
          </div>

          <DialogFooter className="gap-2">
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCalcOpen(false)}
              disabled={calculateMutation.isPending}
            >
              Cancel
            </Button>
            <Button
              size="sm"
              onClick={handleCalculate}
              disabled={calculateMutation.isPending || !calcMonthYear}
            >
              <Calculator className="mr-1.5 h-4 w-4" />
              {calculateMutation.isPending ? 'Calculating…' : 'Calculate'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MonthlyCostList;
