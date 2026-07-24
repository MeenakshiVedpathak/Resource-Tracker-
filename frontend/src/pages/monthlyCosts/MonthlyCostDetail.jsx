import { useState } from 'react';
import { useNavigate, useParams, Outlet } from 'react-router-dom';
import { createColumnHelper } from '@tanstack/react-table';
import { Pencil, Trash2, ArrowLeft, Plus, Search } from 'lucide-react';
import { useMonthlyCosts, useDeleteMonthlyCost, useDeleteMonthlyCosts } from '@/hooks/useMonthlyCosts';
import { useCanWrite } from '@/hooks/usePermissions';
import { useNotification } from '@/hooks/useNotification';
import { useDebounce } from '@/hooks/useDebounce';
import { extractApiError } from '@/services/apiClient';
import { buildPath, ROUTES } from '@/constants/routes';
import { formatCurrency, formatMonthYear } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';

const columnHelper = createColumnHelper();

const MonthlyCostDetail = () => {
  const navigate = useNavigate();
  const { month, year } = useParams();
  const { success, error: showError } = useNotification();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [search, setSearch] = useState('');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [sorting, setSorting] = useState([]);

  const debouncedSearch = useDebounce(search, 400);
  const canManage = useCanWrite();

  const params = {
    page,
    limit,
    month,
    year,
    ...(debouncedSearch && { search: debouncedSearch }),
    ...(sorting[0] && { sort_by: sorting[0].id, sort_order: sorting[0].desc ? 'desc' : 'asc' }),
  };

  const { data, isPending } = useMonthlyCosts(params);
  const deleteMutation = useDeleteMonthlyCost();
  const bulkDeleteMutation = useDeleteMonthlyCosts();

  const records = data?.data ?? [];
  const meta = data?.meta ?? {};

  const allSelected = records.length > 0 && records.every((r) => selectedIds.includes(r.id));
  const toggleSelectAll = () => setSelectedIds(allSelected ? [] : records.map((r) => r.id));
  const toggleSelect = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));
  const clearSelection = () => setSelectedIds([]);

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

  const handleBulkDelete = () => {
    const count = selectedIds.length;
    bulkDeleteMutation.mutate(selectedIds, {
      onSuccess: () => {
        success(`${count} monthly cost record${count !== 1 ? 's' : ''} deleted.`);
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
              checked={selectedIds.includes(row.original.id)}
              onCheckedChange={() => toggleSelect(row.original.id)}
              aria-label="Select row"
            />
          </div>
        ) : null,
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 96,
      cell: ({ row }) =>
        canManage ? (
          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
            <Button
              size="sm"
              title="Edit"
              onClick={() => navigate(buildPath(ROUTES.MONTHLY_COST_EDIT, { month, year, id: row.original.id }))}
              className="h-6 w-6 p-0 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
            >
              <Pencil className="h-3 w-3" />
            </Button>
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
    columnHelper.accessor((row) => row.employee_name ?? row.employee?.full_name, {
      id: 'employee',
      header: 'Employee',
      size: 200,
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
    columnHelper.accessor('salary_cost', {
      header: 'Salary Cost',
      size: 150,
      cell: (info) => <span className="tabular-nums text-sm">{formatCurrency(info.getValue())}</span>,
    }),
    columnHelper.accessor('ops_cost', {
      header: 'Ops Cost',
      size: 130,
      cell: (info) => <span className="tabular-nums text-sm">{formatCurrency(info.getValue())}</span>,
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

  return (
    <div>
      <PageHeader
        title="Monthly Costs"
        description={formatMonthYear(Number(month), Number(year))}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.MONTHLY_COSTS)}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
            {canManage && (
              <Button size="sm" onClick={() => navigate(buildPath(ROUTES.MONTHLY_COST_NEW, { month, year }))}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add Record
              </Button>
            )}
          </div>
        }
      />

      {selectedIds.length > 0 && (
        <div className="mb-4 flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
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
          <div className="relative w-full sm:w-72">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Search by employee..."
              className="pl-9"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); clearSelection(); }}
            />
          </div>
        }
        pagination={
          meta.total != null
            ? { page: meta.page ?? page, limit: meta.limit ?? limit, total: meta.total }
            : undefined
        }
        sorting={sorting}
        onSortingChange={(s) => { setSorting(s); setPage(1); }}
        onPageChange={(p) => { setPage(p); clearSelection(); }}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); clearSelection(); }}
      />

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete monthly cost record?"
        description="This record will be permanently deleted and cannot be recovered."
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />

      <ConfirmDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        title={`Delete ${selectedIds.length} monthly cost record${selectedIds.length !== 1 ? 's' : ''}?`}
        description="These records will be permanently deleted and cannot be recovered."
        confirmLabel="Delete"
        onConfirm={handleBulkDelete}
        isLoading={bulkDeleteMutation.isPending}
      />

      <Outlet />
    </div>
  );
};

export default MonthlyCostDetail;
