import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import * as XLSX from 'xlsx';
import { Trash2, Calculator, Download, Upload } from 'lucide-react';
import { useMonthlyCostSummary } from '@/hooks/useReports';
import { useDeleteMonthlyCostPeriods, useCalculateMonthlyCosts } from '@/hooks/useMonthlyCosts';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { buildPath, ROUTES } from '@/constants/routes';
import { formatCurrency, formatMonthYear } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
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

const MonthlyCostList = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { success, error: showError } = useNotification();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [monthYearFilter, setMonthYearFilter] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedKeys, setSelectedKeys] = useState([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);

  const [calcOpen, setCalcOpen] = useState(false);
  const [calcMonthYear, setCalcMonthYear] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  const canManage = hasRole('Finance', 'Management');

  const params = {
    page,
    limit,
    ...(monthYearFilter && { month: monthYearFilter.month, year: monthYearFilter.year }),
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

  const handleDownloadSample = () => {
    const wsData = [
      ['Employee Code', 'Name', 'Month Year', 'Salary Cost', 'Ops Cost', 'Total Cost', 'Billable Cost'],
      ['EMP-0201', 'Rajdoot Herlekar', 'Jul 2026', 284.09, 0, 422.88, 0],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 16 }, { wch: 25 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'MonthlyCosts');
    XLSX.writeFile(wb, 'MonthlyCost_Sample.xlsx');
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
    deletePeriodsMutation.mutate([{ month: deleteTarget.month, year: deleteTarget.year }], {
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
    deletePeriodsMutation.mutate(periods, {
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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Monthly Costs"
        description="Uploaded and calculated cost periods, grouped by month"
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={handleDownloadSample}>
              <Download className="mr-1.5 h-4 w-4" />
              Download Sample
            </Button>
            {canManage && (
              <>
                {/* <Button variant="outline" size="sm" onClick={() => setCalcOpen(true)}>
                  <Calculator className="mr-1.5 h-4 w-4" />
                  Calculate
                </Button> */}
                <Button size="sm" onClick={() => navigate(ROUTES.MONTHLY_COST_IMPORT)}>
                  <Upload className="mr-1.5 h-4 w-4" />
                  Upload Excel
                </Button>
              </>
            )}
          </div>
        }
      />

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
        toolbar={
          <MonthYearPicker
            value={monthYearFilter}
            onChange={(val) => { setMonthYearFilter(val); setPage(1); clearSelection(); }}
            placeholder="All months"
            className="w-44"
          />
        }
        pagination={
          meta.total != null
            ? { page: meta.page ?? page, limit: meta.limit ?? limit, total: meta.total }
            : undefined
        }
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
