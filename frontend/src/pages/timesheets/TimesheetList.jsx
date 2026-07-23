import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { Upload, Info, Download, Trash2, Loader2 } from 'lucide-react';
import * as XLSX from 'xlsx';
import { useTimesheetHistory, useDeleteTimesheetImport, useDeleteTimesheetImports } from '@/hooks/useTimesheets';
import { timesheetsApi } from '@/api/timesheets.api';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { ROUTES, buildPath } from '@/constants/routes';
import { formatDate } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Label } from '@/components/ui/label';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';

const columnHelper = createColumnHelper();


const TimesheetList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: showError } = useNotification();

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const currentDate = new Date();
  const [isUploadDialogOpen, setIsUploadDialogOpen] = useState(false);
  const [selectedMonth, setSelectedMonth] = useState(String(currentDate.getMonth() + 1));
  const [selectedYear, setSelectedYear] = useState(String(currentDate.getFullYear()));
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [isBulkDeleteOpen, setIsBulkDeleteOpen] = useState(false);
  const [monthYearFilter, setMonthYearFilter] = useState(null);
  const [openingId, setOpeningId] = useState(null);

  const [sorting, setSorting] = useState([]);

  const params = {
    page,
    limit,
    ...(monthYearFilter && { month: monthYearFilter.month, year: monthYearFilter.year }),
    ...(sorting[0] && { sortBy: sorting[0].id, sortOrder: sorting[0].desc ? 'desc' : 'asc' }),
  };

  const { data, isPending } = useTimesheetHistory(params);
  const deleteMutation = useDeleteTimesheetImport();
  const bulkDeleteMutation = useDeleteTimesheetImports();

  const allRecords = Array.isArray(data?.data) ? data.data : [];
  const records    = allRecords.filter((r) => r.status === 'completed');
  const meta       = data?.meta ?? {};

  const allSelected = records.length > 0 && records.every((r) => selectedIds.includes(r.id));
  const toggleSelectAll = () => setSelectedIds(allSelected ? [] : records.map((r) => r.id));
  const toggleSelect = (id) =>
    setSelectedIds((prev) => (prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]));

  const handleDownloadSample = () => {
    const wsData = [
      ['Employee Code', 'Name', 'Project 1', 'Project 2', 'Is Working'],
      ['EMP-0201', 'Aditya Uday patil', '00:00:00', '00:10:00', 'F'],
    ];

    const ws = XLSX.utils.aoa_to_sheet(wsData);
    const wb = XLSX.utils.book_new();

    ws['!cols'] = [
      { wch: 15 },
      { wch: 25 },
      { wch: 20 },
      { wch: 20 },
      { wch: 12 },
    ];

    const currentMonth = new Date().toLocaleString('default', { month: 'short' });
    XLSX.utils.book_append_sheet(wb, ws, currentMonth);
    XLSX.writeFile(wb, 'Timesheet_Sample.xlsx');
  };

  const handleDelete = () => {
    deleteMutation.mutate(deleteTarget.id, {
      onSuccess: () => {
        success(`Import "${deleteTarget.file_name}" has been deleted.`);
        setDeleteTarget(null);
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  const handleBulkDelete = () => {
    const count = selectedIds.length;
    bulkDeleteMutation.mutate(selectedIds, {
      onSuccess: () => {
        success(`${count} import${count !== 1 ? 's' : ''} deleted.`);
        setSelectedIds([]);
        setIsBulkDeleteOpen(false);
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  const columns = [
    columnHelper.display({
      id: 'select',
      header: () => (
        <Checkbox
          checked={allSelected}
          onCheckedChange={toggleSelectAll}
          aria-label="Select all"
        />
      ),
      size: 36,
      cell: ({ row }) => (
        <div onClick={(e) => e.stopPropagation()}>
          <Checkbox
            checked={selectedIds.includes(row.original.id)}
            onCheckedChange={() => toggleSelect(row.original.id)}
            aria-label="Select row"
          />
        </div>
      ),
    }),
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 90,
      cell: ({ row }) => (
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
      ),
    }),
    columnHelper.accessor('file_name', {
      header: 'File Name',
      cell: (info) => (
        <div className="flex items-center gap-2 max-w-[220px]">
          <span className="font-medium text-sm truncate" title={info.getValue()}>
            {info.getValue() ?? '—'}
          </span>
          {openingId === info.row.original.id && (
            <Loader2 className="h-3.5 w-3.5 shrink-0 animate-spin text-primary" />
          )}
        </div>
      ),
    }),
    columnHelper.accessor('importer', {
      header: 'Imported By',
      cell: (info) => {
        const imp = info.getValue();
        const name = imp?.employee?.full_name ?? imp?.email ?? '—';
        const code = imp?.employee?.employee_code;
        return (
          <div>
            <p className="text-sm font-medium">{name}</p>
            {code && <p className="text-xs text-muted-foreground font-mono">{code}</p>}
          </div>
        );
      },
    }),
    columnHelper.accessor('total_rows', {
      header: 'Total',
      size: 70,
      cell: (info) => (
        <span className="tabular-nums text-sm">{info.getValue() ?? '—'}</span>
      ),
    }),
    // columnHelper.accessor('valid_rows', {
    //   header: 'Valid',
    //   size: 70,
    //   cell: (info) => (
    //     <span className="tabular-nums text-sm text-green-600 font-medium">{info.getValue() ?? '—'}</span>
    //   ),
    // }),
    // columnHelper.accessor('error_rows', {
    //   header: 'Errors',
    //   size: 70,
    //   cell: (info) => {
    //     const v = info.getValue();
    //     return (
    //       <span className={`tabular-nums text-sm font-medium ${v > 0 ? 'text-destructive' : 'text-muted-foreground'}`}>
    //         {v ?? '—'}
    //       </span>
    //     );
    //   },
    // }),
    columnHelper.accessor('total_employees', {
      header: 'Employees',
      size: 100,
      cell: (info) => {
        const v = info.getValue();
        return (
          <span className="tabular-nums text-sm font-medium text-blue-600">
            {v ?? '—'}
          </span>
        );
      },
    }),
    columnHelper.accessor('is_publish', {
      header: 'Status',
      size: 100,
      cell: (info) => {
        const v = !!info.getValue();
        return (
          <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${v ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400' : 'bg-muted text-muted-foreground'}`}>
            {v ? 'Published' : 'Unpublished'}
          </span>
        );
      },
    }),
    columnHelper.accessor('created_at', {
      header: 'Imported At',
      size: 150,
      cell: (info) => (
        <span className="text-xs text-muted-foreground tabular-nums">
          {formatDate(info.getValue())}
        </span>
      ),
    }),
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title="Timesheet Imports"
        description="History of all uploaded timesheet files"
        actions={
          <div className="flex items-center gap-2">
            <TooltipProvider>
              <Tooltip>
                <TooltipTrigger asChild>
                  <Info className="h-4 w-4 text-muted-foreground cursor-help" />
                </TooltipTrigger>
                <TooltipContent side="bottom" className="max-w-xs text-xs space-y-1">
                  <ul className="list-disc pl-3">
                    <li>Worksheet name should be short of month like Jan, Feb etc.</li>
                    <li>The employee and project should be present in their respective masters with status active</li>
                  </ul>
                </TooltipContent>
              </Tooltip>
            </TooltipProvider>
            <Button variant="outline" size="sm" onClick={handleDownloadSample}>
              <Download className="mr-1.5 h-4 w-4" />
              Download Sample
            </Button>
            <Button size="sm" onClick={() => setIsUploadDialogOpen(true)}>
              <Upload className="mr-1.5 h-4 w-4" />
              Upload Excel
            </Button>
          </div>
        }
      />

      {selectedIds.length > 0 && (
        <div className="flex items-center justify-between rounded-lg border bg-muted/30 px-3 py-2">
          <span className="text-sm font-medium">{selectedIds.length} selected</span>
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={() => setSelectedIds([])}>
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
            onChange={(val) => { setMonthYearFilter(val); setPage(1); setSelectedIds([]); }}
            placeholder="All months"
            className="w-44"
          />
        }
        pagination={
          records.length > 0
            ? {
                page:  1,
                limit: records.length,
                total: records.length,
              }
            : undefined
        }
        sorting={sorting}
        onSortingChange={(s) => { setSorting(s); setPage(1); }}
        onPageChange={(p) => { setPage(p); setSelectedIds([]); }}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); setSelectedIds([]); }}
        rowClassName={(row) => (openingId && openingId !== row.id ? 'opacity-50 pointer-events-none' : '')}
        onRowClick={async (row) => {
          if (openingId) return;
          setOpeningId(row.id);
          // Prefetch the (potentially large) row set so the spinner covers the
          // whole wait here, and the details page mounts with data already cached
          // instead of showing its own skeleton right after this one.
          try {
            await queryClient.prefetchQuery({
              queryKey: QUERY_KEYS.TIMESHEET_IMPORT_ROWS(String(row.id)),
              queryFn: () => timesheetsApi.getImportRows(row.id),
            });
          } finally {
            navigate(buildPath(ROUTES.TIMESHEET_IMPORT_DETAIL, { id: row.id }));
          }
        }}
      />

      <Dialog open={isUploadDialogOpen} onOpenChange={setIsUploadDialogOpen}>
        <DialogContent className="sm:max-w-[400px]">
          <DialogHeader>
            <DialogTitle>Select Period</DialogTitle>
            <DialogDescription>
              Choose the month and year for this timesheet import.
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-4">
            <div className="grid gap-2">
              <Label>Month</Label>
              <SearchableSelect showSearch={false}
                options={Array.from({ length: 12 }, (_, i) => {
                  const m = i + 1;
                  return { label: new Date(0, m - 1).toLocaleString('default', { month: 'long' }), value: String(m) };
                })}
                value={selectedMonth}
                onValueChange={setSelectedMonth}
                placeholder="Select month"
                searchPlaceholder="Search month..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Year</Label>
              <SearchableSelect showSearch={false}
                options={Array.from({ length: 5 }, (_, i) => {
                  const y = currentDate.getFullYear() - 2 + i;
                  return { label: String(y), value: String(y) };
                })}
                value={selectedYear}
                onValueChange={setSelectedYear}
                placeholder="Select year"
                searchPlaceholder="Search year..."
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsUploadDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={() => {
              setIsUploadDialogOpen(false);
              navigate(ROUTES.TIMESHEET_UPLOAD, { state: { month: selectedMonth, year: selectedYear } });
            }}>
              Continue
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleteTarget}
        onOpenChange={(open) => !open && setDeleteTarget(null)}
        title="Delete this upload?"
        description={`This will permanently remove "${deleteTarget?.file_name}" and all ${deleteTarget?.total_rows ?? ''} timesheet rows it imported. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleDelete}
        isLoading={deleteMutation.isPending}
      />

      <ConfirmDialog
        open={isBulkDeleteOpen}
        onOpenChange={setIsBulkDeleteOpen}
        title={`Delete ${selectedIds.length} upload${selectedIds.length !== 1 ? 's' : ''}?`}
        description="This will permanently remove the selected imports and all timesheet rows they contain. This cannot be undone."
        confirmLabel="Delete"
        onConfirm={handleBulkDelete}
        isLoading={bulkDeleteMutation.isPending}
      />
    </div>
  );
};

export default TimesheetList;
