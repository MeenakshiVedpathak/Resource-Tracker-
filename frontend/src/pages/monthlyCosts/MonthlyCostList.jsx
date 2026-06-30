import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Plus, Pencil, Trash2, Calculator, Upload, Search } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from '@/components/ui/dialog';

const columnHelper = createColumnHelper();

const MONTH_OPTIONS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const MonthlyCostList = () => {
  const navigate = useNavigate();
  const { hasRole } = useAuth();
  const { success, error: showError } = useNotification();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState('all');
  const [yearFilter, setYearFilter] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);

  // Calculate dialog state
  const [calcOpen, setCalcOpen] = useState(false);
  const [calcMonth, setCalcMonth] = useState(String(new Date().getMonth() + 1));
  const [calcYear, setCalcYear] = useState(String(new Date().getFullYear()));

  const debouncedSearch = useDebounce(search, 400);
  const canManage = hasRole('Finance', 'Management');

  const params = {
    page,
    limit,
    ...(monthFilter !== 'all' && { month: Number(monthFilter) }),
    ...(yearFilter && { year: Number(yearFilter) }),
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { data, isPending } = useMonthlyCosts(params);
  const deleteMutation = useDeleteMonthlyCost();
  const calculateMutation = useCalculateMonthlyCosts();

  const records = data?.data ?? [];
  const meta = data?.meta ?? {};

  const columns = [
    columnHelper.accessor((row) => row.employee_name ?? row.employee?.full_name, {
      id: 'employee',
      header: 'Employee',
      cell: (info) => (
        <div>
          <p className="font-medium text-sm">{info.getValue() ?? '—'}</p>
          {(info.row.original.employee_code ?? info.row.original.employee?.employee_code) && (
            <p className="text-xs text-muted-foreground font-mono">
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
    columnHelper.display({
      id: 'actions',
      size: 88,
      cell: ({ row }) =>
        canManage ? (
          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <Button
              variant="ghost"
              size="icon-sm"
              title="Edit"
              onClick={() =>
                navigate(buildPath(ROUTES.MONTHLY_COST_EDIT, { id: row.original.id }))
              }
            >
              <Pencil className="h-3.5 w-3.5" />
            </Button>
            <Button
              variant="ghost"
              size="icon-sm"
              className="text-destructive hover:text-destructive hover:bg-destructive/10"
              title="Delete"
              onClick={() => setDeleteTarget(row.original)}
            >
              <Trash2 className="h-3.5 w-3.5" />
            </Button>
          </div>
        ) : null,
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

  const handleCalculate = () => {
    calculateMutation.mutate(
      { month: Number(calcMonth), year: Number(calcYear) },
      {
        onSuccess: () => {
          success(`Monthly costs calculated for ${formatMonthYear(Number(calcMonth), Number(calcYear))}.`);
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
            <Button
              variant="outline"
              size="sm"
              onClick={() => setCalcOpen(true)}
            >
              <Calculator className="mr-1.5 h-4 w-4" />
              Calculate Month
            </Button>
            {canManage && (
              <Button
                variant="outline"
                size="sm"
                onClick={() => navigate(ROUTES.MONTHLY_COST_IMPORT)}
              >
                <Upload className="mr-1.5 h-4 w-4" />
                Import Excel
              </Button>
            )}
            {canManage && (
              <Button size="sm" onClick={() => navigate(ROUTES.MONTHLY_COST_NEW)}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add Monthly Cost
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
          <>
            <Select
              value={monthFilter}
              onValueChange={(v) => {
                setMonthFilter(v);
                setPage(1);
              }}
            >
              <SelectTrigger className="h-9 w-36 text-sm bg-white">
                <SelectValue placeholder="All months" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All months</SelectItem>
                {MONTH_OPTIONS.map((m) => (
                  <SelectItem key={m.value} value={m.value}>
                    {m.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            <Input
              type="number"
              placeholder="Year"
              value={yearFilter}
              onChange={(e) => {
                setYearFilter(e.target.value);
                setPage(1);
              }}
              className="h-9 w-24 text-sm bg-white"
              min="2000"
              max="2100"
            />
          </>
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

          <div className="grid grid-cols-2 gap-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="calc-month">Month</Label>
              <Select value={calcMonth} onValueChange={setCalcMonth}>
                <SelectTrigger id="calc-month" className="w-full">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_OPTIONS.map((m) => (
                    <SelectItem key={m.value} value={m.value}>
                      {m.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label htmlFor="calc-year">Year</Label>
              <Input
                id="calc-year"
                type="number"
                value={calcYear}
                onChange={(e) => setCalcYear(e.target.value)}
                min="2000"
                max="2100"
                className="w-full"
              />
            </div>
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
              disabled={calculateMutation.isPending || !calcMonth || !calcYear}
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
