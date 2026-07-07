import { useState } from 'react';
import { useNavigate, Outlet } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import * as XLSX from 'xlsx';
import { Pencil, Trash2, Calculator, Download, Upload, Search } from 'lucide-react';
import { useMonthlyCosts, useDeleteMonthlyCost, useCalculateMonthlyCosts } from '@/hooks/useMonthlyCosts';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';
import { useDebounce } from '@/hooks/useDebounce';
import { extractApiError } from '@/services/apiClient';
import { buildPath, ROUTES } from '@/constants/routes';
import { formatCurrency, formatMonthYear } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
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


const MonthlyCostList = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { success, error: showError } = useNotification();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [monthYearFilter, setMonthYearFilter] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Calculate dialog state
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcMonthYear, setCalcMonthYear] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });

  const debouncedSearch = useDebounce(search, 400);
  const canManage = hasRole('Finance', 'Management');

  const params = {
    page,
    limit,
    ...(monthYearFilter && { month: monthYearFilter.month }),
    ...(monthYearFilter && { year: monthYearFilter.year }),
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { data, isPending } = useMonthlyCosts(params);
  const deleteMutation = useDeleteMonthlyCost();
  const calculateMutation = useCalculateMonthlyCosts();

  const records = data?.data ?? [];
  const meta = data?.meta ?? {};

  const columns = [
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 180,
      meta: { sticky: true, left: 0 },
      cell: ({ row }) =>
        canManage ? (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              onClick={() => navigate(buildPath(ROUTES.MONTHLY_COST_EDIT, { id: row.original.id }))}
              className="h-6 px-2 bg-blue-500 hover:bg-blue-600 text-white rounded font-normal text-[11px] transition-colors"
            >
              <Pencil className="h-3 w-3 mr-1" /> Edit
            </Button>
            <Button
              size="sm"
              className="h-6 px-2 bg-red-500 hover:bg-red-600 text-white rounded font-normal text-[11px] transition-colors"
              title="Delete"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="h-3 w-3 mr-1" /> Delete
            </Button>
          </div>
        ) : null,
    }),
    columnHelper.accessor((row) => row.employee_name ?? row.employee?.full_name, {
      id: 'employee',
      header: 'Employee',
      size: 200,
      meta: { sticky: true, left: 180 },
      cell: (info) => (
        <div>
          <p className="font-medium text-sm truncate">{info.getValue() ?? '—'}</p>
          {(info.row.original.employee_code ?? info.row.original.employee?.employee_code) && (
            <p className="text-xs text-muted-foreground font-mono truncate">
              {info.row.original.employee_code ?? info.row.original.employee?.employee_code}
            </p>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('month', {
      header: 'Month',
      size: 140,
      cell: (info) => (
        <span className="text-sm">{formatMonthYear(info.getValue(), info.row.original.year)}</span>
      ),
    }),
    columnHelper.accessor('salary_cost', {
      header: 'Salary Cost',
      size: 150,
      cell: (info) => (
        <span className="tabular-nums text-sm">{formatCurrency(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('ops_cost', {
      header: 'Ops Cost',
      size: 130,
      cell: (info) => (
        <span className="tabular-nums text-sm">{formatCurrency(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('total_cost', {
      header: 'Total Cost',
      size: 140,
      cell: (info) => (
        <span className="tabular-nums font-semibold text-sm">{formatCurrency(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('billable_cost', {
      header: 'Billable Cost',
      size: 140,
      cell: (info) =>
        info.getValue() != null ? (
          <span className="tabular-nums text-sm">{formatCurrency(info.getValue())}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        ),
    }),
  ];

  const handleDelete = () => {
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        success('Monthly cost record deleted.');
        setDeleteTarget(null);
      },
      onError: (err) => {
        showError(extractApiError(err));
        setDeleteTarget(null);
      },
    });
  };

  const handleDownloadSample = () => {
    const wsData = [
      ['Name', 'Month Year', 'Salary Cost', 'Ops Cost', 'Total Cost', 'Billable Cost'],
      ['Rajdoot Herlekar', 'Jul 2026', 284.09, 0, 422.88, 0],
    ];
    const ws = XLSX.utils.aoa_to_sheet(wsData);
    ws['!cols'] = [{ wch: 25 }, { wch: 12 }, { wch: 14 }, { wch: 12 }, { wch: 14 }, { wch: 14 }];
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

  return (
    <div className="space-y-4">
      <PageHeader
        title="Monthly Costs"
        description="Manage and review monthly employee cost records"
        actions={
          <div className="flex items-center gap-3">
            <div className="relative">
              <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search by employee..."
                className="pl-9 w-[250px] h-9 text-sm bg-white"
                value={search}
                onChange={(e) => {
                  setSearch(e.target.value);
                  setPage(1);
                }}
              />
            </div>
           
            <Button variant="outline" size="sm" onClick={handleDownloadSample}>
              <Download className="mr-1.5 h-4 w-4" />
              Download Sample
            </Button>

            {canManage && (
             

               <Button size="sm" onClick={() => navigate(ROUTES.MONTHLY_COST_IMPORT)}>
              <Upload className="mr-1.5 h-4 w-4" />
              Upload Excel
            </Button>
            )}
           
          </div>
        }
      />

      <DataTable
        columns={columns}
        data={records}
        isLoading={isPending}
        toolbar={
          <MonthYearPicker
            value={monthYearFilter}
            onChange={(val) => {
              setMonthYearFilter(val);
              setPage(1);
            }}
            placeholder="All months"
            className="w-44"
          />
        }
        pagination={
          meta.total != null
            ? {
                page: meta.page ?? page,
                limit: meta.limit ?? limit,
                total: meta.total,
              }
            : undefined
        }
        onPageChange={setPage}
        onPageSizeChange={(s) => {
          setLimit(s);
          setPage(1);
        }}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete monthly cost record?"
        description="This record will be permanently deleted and cannot be recovered."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />

      {/* Calculate Month dialog */}
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

      <Outlet />
    </div>
  );
};

export default MonthlyCostList;
