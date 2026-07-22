import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { Upload, Info, Download, Trash2, Loader2, Plus, Pencil } from 'lucide-react';
import * as XLSX from 'xlsx';
import {
  useTimesheetHistory, useDeleteTimesheetImport, useDeleteTimesheetImports,
  useTimesheets, useCreateTimesheet, useDeleteTimesheet,
} from '@/hooks/useTimesheets';
import { useActiveEmployees } from '@/hooks/useEmployees';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useSubProjectsByPO } from '@/hooks/useSubProjects';
import { useAuth } from '@/hooks/useAuth';
import { timesheetsApi } from '@/api/timesheets.api';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { ROUTES, buildPath } from '@/constants/routes';
import { formatDate } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import ConfirmDialog from '@/components/common/ConfirmDialog';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Label } from '@/components/ui/label';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';

const columnHelper = createColumnHelper();


const emptyEntryForm = { employee_id: '', service_po_id: '', sub_project_id: '', month_year: null, day: '', hours_logged: '' };

const monthYearToDateRange = (my) => {
  if (!my) return {};
  const { month, year } = my;
  const lastDay = new Date(year, month, 0).getDate();
  return {
    startDate: `${year}-${String(month).padStart(2, '0')}-01`,
    endDate: `${year}-${String(month).padStart(2, '0')}-${String(lastDay).padStart(2, '0')}`,
  };
};

const TimesheetList = () => {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { success, error: showError } = useNotification();
  const { hasRole, user } = useAuth();
  const canManageEntries = hasRole('Finance', 'HR', 'Management');
  const canDeleteEntries = hasRole('Finance');

  const [activeTab, setActiveTab] = useState('imports');

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

  // ── Timesheet Entries tab: single-record add/edit/delete, independent of any import batch ──
  const [entryPage, setEntryPage] = useState(1);
  const [entryLimit, setEntryLimit] = useState(10);
  const [entrySorting, setEntrySorting] = useState([]);
  const [entryMonthYearFilter, setEntryMonthYearFilter] = useState(null);
  const [entryEmployeeFilter, setEntryEmployeeFilter] = useState('all');
  const [isEntryDialogOpen, setIsEntryDialogOpen] = useState(false);
  const [editingEntry, setEditingEntry] = useState(null);
  const [entryForm, setEntryForm] = useState(emptyEntryForm);
  const [entryDeleteTarget, setEntryDeleteTarget] = useState(null);
  const [isSavingEntry, setIsSavingEntry] = useState(false);
  // The import batch that owns the picked month — timesheet_import_id and the
  // date's year/month are both taken from this record, never typed in the form.
  const [entryImportInfo, setEntryImportInfo] = useState(null);
  const [isResolvingImport, setIsResolvingImport] = useState(false);

  const entryParams = {
    page: entryPage,
    limit: entryLimit,
    ...monthYearToDateRange(entryMonthYearFilter),
    ...(entryEmployeeFilter !== 'all' && { employeeId: entryEmployeeFilter }),
    ...(entrySorting[0] && { sortBy: entrySorting[0].id, sortOrder: entrySorting[0].desc ? 'desc' : 'asc' }),
  };

  const { data: entriesData, isPending: isEntriesPending } = useTimesheets(entryParams, { enabled: activeTab === 'entries' });
  const createEntryMutation = useCreateTimesheet();
  const deleteEntryMutation = useDeleteTimesheet();

  const { data: activeEmployees = [] } = useActiveEmployees();
  const { data: activeServicePOsData } = useActiveServicePOs();
  const servicePOs = activeServicePOsData?.data ?? activeServicePOsData ?? [];
  const { data: entrySubProjects = [] } = useSubProjectsByPO(entryForm.service_po_id || null);

  const entries = Array.isArray(entriesData?.data) ? entriesData.data : [];
  const entriesMeta = entriesData?.meta ?? {};

  const openAddEntry = () => {
    setEditingEntry(null);
    setEntryForm(emptyEntryForm);
    setEntryImportInfo(null);
    setIsEntryDialogOpen(true);
  };

  const openEditEntry = (row) => {
    setEditingEntry(row);
    const [year, month, day] = row.timesheet_date.split('-').map(Number);
    setEntryForm({
      employee_id: String(row.employee_id),
      service_po_id: String(row.service_po_id),
      sub_project_id: row.sub_project_id ? String(row.sub_project_id) : '',
      month_year: { month, year },
      day: String(day),
      hours_logged: String(row.hours_logged),
    });
    // Editing keeps the entry's existing import batch — month isn't re-resolved.
    setEntryImportInfo({ id: row.timesheet_import_id, import_month: month, import_year: year });
    setIsEntryDialogOpen(true);
  };

  // A manual entry attaches to the existing import batch for its month (the
  // upload that already covers that month) — the user never picks this directly,
  // and the date's year/month are taken from that same record, not typed in the form.
  const handleMonthYearChange = async (val) => {
    setEntryForm((f) => ({ ...f, month_year: val }));
    if (!val) {
      setEntryImportInfo(null);
      return;
    }
    setIsResolvingImport(true);
    try {
      const res = await timesheetsApi.getHistory({ month: val.month, year: val.year, limit: 5 });
      const records = Array.isArray(res?.data) ? res.data : [];
      const found = records.find((r) => r.status === 'completed');
      setEntryImportInfo(found ? { id: found.id, import_month: found.import_month, import_year: found.import_year } : null);
    } finally {
      setIsResolvingImport(false);
    }
  };

  const handleEntrySubmit = async () => {
    if (!entryForm.employee_id || !entryForm.service_po_id || !entryForm.month_year || !entryForm.day || entryForm.hours_logged === '') {
      showError('Please fill in all required fields.');
      return;
    }
    if (!entryImportInfo) {
      const { month, year } = entryForm.month_year;
      const monthLabel = new Date(year, month - 1).toLocaleString('default', { month: 'long' });
      showError(`No timesheet import found for ${monthLabel} ${year}. Upload that month's timesheet first before adding a manual entry.`);
      return;
    }

    setIsSavingEntry(true);
    try {
      const timesheetDate = `${entryImportInfo.import_year}-${String(entryImportInfo.import_month).padStart(2, '0')}-${String(entryForm.day).padStart(2, '0')}`;
      const payload = {
        employee_id: Number(entryForm.employee_id),
        service_po_id: Number(entryForm.service_po_id),
        sub_project_id: entryForm.sub_project_id ? Number(entryForm.sub_project_id) : null,
        timesheet_date: timesheetDate,
        hours_logged: Number(entryForm.hours_logged),
        timesheet_import_id: entryImportInfo.id,
        created_by: user?.id,
        updated_by: user?.id,
      };

      if (editingEntry) {
        await timesheetsApi.update(editingEntry.id, payload);
        await queryClient.invalidateQueries({ queryKey: ['timesheets'] });
        success('Timesheet entry updated.');
      } else {
        await createEntryMutation.mutateAsync(payload);
        success('Timesheet entry added.');
      }
      setIsEntryDialogOpen(false);
    } catch (err) {
      showError(extractApiError(err));
    } finally {
      setIsSavingEntry(false);
    }
  };

  const handleEntryDelete = () => {
    deleteEntryMutation.mutate(entryDeleteTarget.id, {
      onSuccess: () => {
        success('Timesheet entry deleted.');
        setEntryDeleteTarget(null);
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

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

  const entryColumns = [
    columnHelper.display({
      id: 'actions',
      header: 'Actions',
      size: 80,
      cell: ({ row }) => (
        <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
          {canManageEntries && (
            <Button
              size="sm"
              title="Edit"
              className="h-6 w-6 p-0 bg-blue-500 hover:bg-blue-600 text-white rounded transition-colors"
              onClick={() => openEditEntry(row.original)}
            >
              <Pencil className="h-3 w-3" />
            </Button>
          )}
          {canDeleteEntries && (
            <Button
              size="sm"
              title="Delete"
              className="h-6 w-6 p-0 bg-red-500 hover:bg-red-600 text-white rounded transition-colors"
              onClick={() => setEntryDeleteTarget(row.original)}
            >
              <Trash2 className="h-3 w-3" />
            </Button>
          )}
        </div>
      ),
    }),
    columnHelper.accessor('employee', {
      header: 'Employee',
      cell: (info) => {
        const emp = info.getValue();
        return (
          <div>
            <p className="text-sm font-medium">{emp?.full_name ?? '—'}</p>
            {emp?.employee_code && <p className="text-xs text-muted-foreground font-mono">{emp.employee_code}</p>}
          </div>
        );
      },
    }),
    columnHelper.accessor('servicePO', {
      header: 'Service PO',
      cell: (info) => info.getValue()?.service_po_name ?? '—',
    }),
    columnHelper.accessor('servicePO.client', {
      id: 'client',
      header: 'Client',
      cell: (info) => info.getValue()?.client_name ?? '—',
    }),
    columnHelper.accessor('subProject', {
      header: 'Sub Project',
      cell: (info) => info.getValue()?.sub_project_name ?? '—',
    }),
    columnHelper.accessor('timesheet_date', {
      header: 'Date',
      size: 110,
      cell: (info) => (
        <span className="text-sm tabular-nums">{formatDate(info.getValue())}</span>
      ),
    }),
    columnHelper.accessor('hours_logged', {
      header: 'Hours',
      size: 90,
      cell: (info) => (
        <span className="text-sm font-semibold tabular-nums">{info.getValue()}</span>
      ),
    }),
  ];

  return (
    <div className="space-y-4">
      <PageHeader
        title={activeTab === 'entries' ? 'Timesheet Entries' : 'Timesheet Imports'}
        description={activeTab === 'entries'
          ? 'Individual timesheet rows — add a single entry if one was skipped in a monthly upload'
          : 'History of all uploaded timesheet files'}
        actions={
          activeTab === 'entries' ? (
            canManageEntries && (
              <Button size="sm" onClick={openAddEntry}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add Entry
              </Button>
            )
          ) : (
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
          )
        }
      />

      <Tabs value={activeTab} onValueChange={setActiveTab}>
        <TabsList>
          <TabsTrigger value="imports">Import History</TabsTrigger>
          <TabsTrigger value="entries">Timesheet Entries</TabsTrigger>
        </TabsList>
      </Tabs>

      {activeTab === 'imports' && selectedIds.length > 0 && (
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

      {activeTab === 'imports' && (
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
      )}

      {activeTab === 'entries' && (
        <DataTable
          columns={entryColumns}
          data={entries}
          isLoading={isEntriesPending}
          toolbar={
            <div className="flex items-center gap-2">
              <MonthYearPicker
                value={entryMonthYearFilter}
                onChange={(val) => { setEntryMonthYearFilter(val); setEntryPage(1); }}
                placeholder="All months"
                className="w-44"
              />
              <SearchableSelect
                options={[
                  { label: 'All Employees', value: 'all' },
                  ...activeEmployees.map((e) => ({ value: String(e.id), label: e.full_name })),
                ]}
                value={entryEmployeeFilter}
                onValueChange={(v) => { setEntryEmployeeFilter(v); setEntryPage(1); }}
                placeholder="All Employees"
                searchPlaceholder="Search employee..."
                className="w-56"
              />
            </div>
          }
          pagination={entriesMeta.total != null ? {
            page: entriesMeta.current_page ?? entryPage,
            limit: entriesMeta.per_page ?? entryLimit,
            total: entriesMeta.total,
          } : undefined}
          sorting={entrySorting}
          onSortingChange={(s) => { setEntrySorting(s); setEntryPage(1); }}
          onPageChange={setEntryPage}
          onPageSizeChange={(s) => { setEntryLimit(s); setEntryPage(1); }}
        />
      )}

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

      <Dialog open={isEntryDialogOpen} onOpenChange={setIsEntryDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>{editingEntry ? 'Edit Timesheet Entry' : 'Add Timesheet Entry'}</DialogTitle>
            <DialogDescription>
              {editingEntry
                ? 'Update this timesheet entry.'
                : 'Add a single entry for a day that was skipped in a monthly upload.'}
            </DialogDescription>
          </DialogHeader>
          <div className="grid gap-4 py-2">
            <div className="grid gap-2">
              <Label>Employee <span className="text-destructive">*</span></Label>
              <SearchableSelect
                options={activeEmployees.map((e) => ({
                  value: String(e.id),
                  label: `${e.full_name}${e.employee_code ? ` (${e.employee_code})` : ''}`,
                }))}
                value={entryForm.employee_id}
                onValueChange={(v) => setEntryForm((f) => ({ ...f, employee_id: v }))}
                disabled={!!editingEntry}
                placeholder="Select employee"
                searchPlaceholder="Search employee..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Service PO <span className="text-destructive">*</span></Label>
              <SearchableSelect
                options={servicePOs.map((p) => ({
                  value: String(p.service_po_id ?? p.id),
                  label: p.service_po_name ?? p.name,
                }))}
                value={entryForm.service_po_id}
                onValueChange={(v) => setEntryForm((f) => ({ ...f, service_po_id: v, sub_project_id: '' }))}
                placeholder="Select Service PO"
                searchPlaceholder="Search PO..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Sub Project</Label>
              <SearchableSelect
                options={[
                  { label: 'None', value: '' },
                  ...entrySubProjects.map((sp) => ({ value: String(sp.id), label: sp.sub_project_name })),
                ]}
                value={entryForm.sub_project_id}
                onValueChange={(v) => setEntryForm((f) => ({ ...f, sub_project_id: v }))}
                disabled={!entryForm.service_po_id}
                placeholder="Select sub project (optional)"
                searchPlaceholder="Search sub project..."
              />
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div className="grid gap-2">
                <Label>Month <span className="text-destructive">*</span></Label>
                <MonthYearPicker
                  value={entryForm.month_year}
                  onChange={handleMonthYearChange}
                  placeholder="Select month"
                  className="w-full"
                  clearable={false}
                />
              </div>
              <div className="grid gap-2">
                <Label>Day <span className="text-destructive">*</span></Label>
                <Input
                  type="number"
                  min="1"
                  max="31"
                  className="h-9 text-sm"
                  value={entryForm.day}
                  onChange={(e) => setEntryForm((f) => ({ ...f, day: e.target.value }))}
                  disabled={!!editingEntry}
                />
              </div>
            </div>
            {entryForm.month_year && (
              <p className={cn('text-xs', entryImportInfo ? 'text-muted-foreground' : 'text-destructive')}>
                {isResolvingImport
                  ? 'Checking for an import in this month…'
                  : entryImportInfo
                    ? `Will attach to the existing import for ${new Date(entryImportInfo.import_year, entryImportInfo.import_month - 1).toLocaleString('default', { month: 'long' })} ${entryImportInfo.import_year}.`
                    : 'No timesheet import found for this month — upload it first.'}
              </p>
            )}
            <div className="grid gap-2">
              <Label>Hours Logged <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                step="0.25"
                min="0"
                className="h-9 text-sm"
                value={entryForm.hours_logged}
                onChange={(e) => setEntryForm((f) => ({ ...f, hours_logged: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsEntryDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleEntrySubmit} disabled={isSavingEntry || isResolvingImport}>
              {isSavingEntry ? 'Saving…' : editingEntry ? 'Save Changes' : 'Add Entry'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!entryDeleteTarget}
        onOpenChange={(open) => !open && setEntryDeleteTarget(null)}
        title="Delete this timesheet entry?"
        description={`This will permanently remove the ${entryDeleteTarget?.hours_logged ?? ''} hrs entry for ${entryDeleteTarget?.employee?.full_name ?? 'this employee'} on ${entryDeleteTarget ? formatDate(entryDeleteTarget.timesheet_date) : ''}. This cannot be undone.`}
        confirmLabel="Delete"
        onConfirm={handleEntryDelete}
        isLoading={deleteEntryMutation.isPending}
      />
    </div>
  );
};

export default TimesheetList;
