import { useState, useMemo, useCallback, useRef, memo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { ArrowLeft, FileSpreadsheet, Plus } from 'lucide-react';
import { timesheetsApi } from '@/api/timesheets.api';
import { useTimesheetImportRows, useCreateTimesheet } from '@/hooks/useTimesheets';
import { useTimesheetHistory } from '@/hooks/useTimesheets';
import { useActiveServiceCategories } from '@/hooks/useServiceCategories';
import { useActiveServiceTypes } from '@/hooks/useServiceTypes';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useActiveEmployees } from '@/hooks/useEmployees';
import { useSubProjectsByPO } from '@/hooks/useSubProjects';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { ROUTES } from '@/constants/routes';
import { formatDate } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';

const columnHelper = createColumnHelper();

/*
 * Every cell below is directly editable, spreadsheet-style — no separate
 * "edit mode" toggle. Dropdown cells (Employee/Service PO) are always
 * rendered as select controls; Hours is always an input, styled borderless
 * so the table still reads like a plain grid until focused. Edits are
 * buffered locally and only sent to the server when the user clicks
 * "Save Changes".
 *
 * Each cell owns its own input state (initialized once from `initialValue`)
 * instead of being controlled from the parent on every keystroke — with a
 * few hundred rows on screen, lifting every keystroke up to the page
 * component would rebuild the whole table's column defs and re-render every
 * row each time a single character is typed. `onChange` only writes into a
 * ref, so typing/selecting doesn't trigger a page re-render at all.
 */
const cellInputClass = 'h-8 text-xs bg-transparent border-transparent hover:border-input focus:border-input focus:bg-background transition-colors rounded-md px-2';

// Employee is intentionally read-only — reassigning a timesheet entry to a
// different employee isn't allowed here.
const EmployeeCell = memo(({ row }) => (
  <div>
    <p className="text-sm font-medium">{row.employee?.full_name ?? '—'}</p>
    <p className="text-xs text-muted-foreground font-mono">{row.employee?.employee_code ?? ''}</p>
  </div>
));

const ServicePOCell = memo(({ row, poOptions, initialValue, onChange }) => {
  const [val, setVal] = useState(initialValue != null ? String(initialValue) : '');
  return (
    <SearchableSelect
      options={poOptions}
      value={val}
      onValueChange={(v) => {
        setVal(v);
        onChange(row.id, { service_po_id: Number(v), sub_project_id: null });
      }}
      placeholder="Service PO"
      searchPlaceholder="Search PO..."
      className={cn('w-full', cellInputClass)}
    />
  );
});

const HoursCell = memo(({ row, initialValue, onChange }) => {
  const [val, setVal] = useState(initialValue);
  return (
    <input
      type="number"
      step="0.25"
      min="0"
      value={val}
      onChange={(e) => {
        setVal(e.target.value);
        onChange(row.id, { hours_logged: e.target.value });
      }}
      className={cn('w-20 text-right tabular-nums font-semibold border', cellInputClass)}
    />
  );
});

const TimesheetImportDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: rowsData, isPending } = useTimesheetImportRows(id);
  // fetch history to get the import metadata (file name, importer, etc.)
  const { data: historyData } = useTimesheetHistory({ page: 1, limit: 100 });

  const rows = Array.isArray(rowsData?.data) ? rowsData.data : [];
  const importRecord = (historyData?.data ?? []).find((r) => String(r.id) === String(id));

  // ── per-cell inline edit: changes are buffered locally and only sent to
  // the server when the user clicks "Save Changes" ──
  const notify = useNotification();
  const queryClient = useQueryClient();
  const { hasRole, user } = useAuth();
  const canAddEntry = hasRole('Finance', 'HR', 'Management');

  const { data: activeServicePOsData } = useActiveServicePOs();

  const servicePOOptions = (activeServicePOsData?.data ?? activeServicePOsData ?? []).map((p) => ({
    value: String(p.service_po_id ?? p.id),
    label: p.service_po_name ?? p.name,
  }));

  // ── Add a single row to this import batch — the month is fixed to this
  // batch's own import_month/import_year, never typed in the form ──
  const emptyAddForm = { employee_id: '', service_po_id: '', sub_project_id: '', day: '1', hours_logged: '' };
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false);
  const [addForm, setAddForm] = useState(emptyAddForm);
  const [isSavingAdd, setIsSavingAdd] = useState(false);
  const createTimesheetMutation = useCreateTimesheet();
  const { data: activeEmployees = [] } = useActiveEmployees();
  const { data: addSubProjects = [] } = useSubProjectsByPO(addForm.service_po_id || null);

  const openAddRow = () => {
    setAddForm(emptyAddForm);
    setIsAddDialogOpen(true);
  };

  const handleAddSubmit = async () => {
    if (!addForm.employee_id || !addForm.service_po_id || !addForm.day || addForm.hours_logged === '') {
      notify.error('Please fill in all required fields.');
      return;
    }

    setIsSavingAdd(true);
    try {
      const timesheetDate = `${importRecord.import_year}-${String(importRecord.import_month).padStart(2, '0')}-${String(addForm.day).padStart(2, '0')}`;
      await createTimesheetMutation.mutateAsync({
        employee_id: Number(addForm.employee_id),
        service_po_id: Number(addForm.service_po_id),
        sub_project_id: addForm.sub_project_id ? Number(addForm.sub_project_id) : null,
        timesheet_date: timesheetDate,
        hours_logged: Number(addForm.hours_logged),
        timesheet_import_id: Number(id),
        created_by: user?.id,
        updated_by: user?.id,
      });
      notify.success('Timesheet entry added.');
      setIsAddDialogOpen(false);
    } catch (err) {
      notify.error(extractApiError(err));
    } finally {
      setIsSavingAdd(false);
    }
  };

  // rowId -> partial patch of unsaved edits for that row. Lives in a ref so
  // typing/selecting doesn't trigger a page re-render — only membership in
  // `dirtyRowIds` (one row entering/leaving the dirty set) does.
  const editsRef = useRef({});
  const [dirtyRowIds, setDirtyRowIds] = useState(() => new Set());
  const [saveVersion, setSaveVersion] = useState(0);
  const [isSaving, setIsSaving] = useState(false);
  const editedCount = dirtyRowIds.size;

  const updateEdit = useCallback((rowId, patch) => {
    const key = String(rowId);
    editsRef.current = {
      ...editsRef.current,
      [key]: { ...editsRef.current[key], ...patch },
    };
    setDirtyRowIds((prev) => (prev.has(key) ? prev : new Set(prev).add(key)));
  }, []);

  const discardChanges = () => {
    editsRef.current = {};
    setDirtyRowIds(new Set());
    setSaveVersion((v) => v + 1);
  };

  const buildSavePayload = (patch) => {
    const payload = {};
    if (patch.hours_logged !== undefined) {
      const num = Number(patch.hours_logged);
      if (patch.hours_logged !== '' && !Number.isNaN(num)) payload.hours_logged = num;
    }
    if (patch.service_po_id !== undefined) {
      payload.service_po_id = patch.service_po_id;
      payload.sub_project_id = patch.sub_project_id ?? null;
    }
    return payload;
  };

  const saveChanges = async () => {
    const entries = Object.entries(editsRef.current);
    if (entries.length === 0) return;

    setIsSaving(true);
    const failedEdits = {};
    const failureMessages = {};
    let savedCount = 0;

    await Promise.all(entries.map(async ([rowId, patch]) => {
      const payload = buildSavePayload(patch);
      if (Object.keys(payload).length === 0) return;
      try {
        await timesheetsApi.update(rowId, payload);
        savedCount += 1;
      } catch (err) {
        failedEdits[rowId] = patch;
        failureMessages[rowId] = extractApiError(err);
      }
    }));

    await queryClient.invalidateQueries({ queryKey: ['timesheets'] });
    editsRef.current = failedEdits;
    setDirtyRowIds(new Set(Object.keys(failedEdits)));
    setSaveVersion((v) => v + 1);
    setIsSaving(false);

    const failedCount = Object.keys(failedEdits).length;
    if (failedCount > 0) {
      const uniqueMessages = [...new Set(Object.values(failureMessages))];
      notify.error(`Saved ${savedCount} row(s); ${failedCount} failed. ${uniqueMessages.join(' ')}`);
    } else {
      notify.success(`${savedCount} row(s) updated.`);
    }
  };

  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [poFilter, setPoFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');

  // Rows aren't paginated server-side (the whole import is fetched in one
  // shot), but rendering every row at once — each wrapped in its own
  // animated <tr> — is what made this page hang for large imports. Slice
  // client-side so only one page's worth of rows ever mounts at a time.
  const [detailPage, setDetailPage] = useState(1);
  const [detailPageSize, setDetailPageSize] = useState(50);

  const { data: activeServiceCategories = [] } = useActiveServiceCategories();
  const { data: activeServiceTypes = [] } = useActiveServiceTypes();

  const totalHours = useMemo(
    () => rows.reduce((sum, r) => sum + (Number(r.hours_logged) || 0), 0),
    [rows]
  );

  const { employees, poOptions, clients } = useMemo(() => {
    const poMap = new Map();
    rows.forEach((r) => {
      const poName = r.servicePO?.service_po_name;
      if (poName && !poMap.has(poName)) {
        poMap.set(poName, {
          name: poName,
          serviceTypeId: r.servicePO?.serviceType?.id != null ? String(r.servicePO.serviceType.id) : null,
          categoryId: r.servicePO?.serviceType?.serviceCategory?.id != null ? String(r.servicePO.serviceType.serviceCategory.id) : null,
        });
      }
    });
    return {
      employees: Array.from(new Set(rows.map(r => r.employee?.full_name).filter(Boolean))).sort(),
      poOptions: Array.from(poMap.values()).sort((a, b) => a.name.localeCompare(b.name)),
      clients: Array.from(new Set(rows.map(r => r.servicePO?.client?.client_name).filter(Boolean))).sort(),
    };
  }, [rows]);

  // Category → Type: only show types belonging to the selected category
  const filteredServiceTypes = serviceCategoryFilter === 'all'
    ? activeServiceTypes
    : activeServiceTypes.filter((t) => String(t.service_category_id) === serviceCategoryFilter);

  // Type (or Category, if no type chosen yet) → Service PO
  const filteredPOOptions = poOptions.filter((po) => {
    if (serviceTypeFilter !== 'all') return po.serviceTypeId === serviceTypeFilter;
    if (serviceCategoryFilter !== 'all') return po.categoryId === serviceCategoryFilter;
    return true;
  });

  const handleCategoryChange = (v) => {
    setServiceCategoryFilter(v);
    setServiceTypeFilter('all');
    setPoFilter('all');
    setDetailPage(1);
  };

  const handleTypeChange = (v) => {
    setServiceTypeFilter(v);
    setPoFilter('all');
    setDetailPage(1);
  };

  const filteredRows = useMemo(() => {
    return rows.filter(row => {
      if (employeeFilter !== 'all' && row.employee?.full_name !== employeeFilter) return false;
      if (poFilter !== 'all' && row.servicePO?.service_po_name !== poFilter) return false;
      if (clientFilter !== 'all' && row.servicePO?.client?.client_name !== clientFilter) return false;
      if (serviceCategoryFilter !== 'all' && String(row.servicePO?.serviceType?.serviceCategory?.id) !== serviceCategoryFilter) return false;
      if (serviceTypeFilter !== 'all' && String(row.servicePO?.serviceType?.id) !== serviceTypeFilter) return false;
      return true;
    });
  }, [rows, employeeFilter, poFilter, clientFilter, serviceCategoryFilter, serviceTypeFilter]);

  const filteredHours = useMemo(
    () => filteredRows.reduce((sum, r) => sum + (Number(r.hours_logged) || 0), 0),
    [filteredRows]
  );

  const isFiltered = employeeFilter !== 'all' || poFilter !== 'all' || clientFilter !== 'all'
    || serviceCategoryFilter !== 'all' || serviceTypeFilter !== 'all';

  const pagedRows = filteredRows.slice((detailPage - 1) * detailPageSize, detailPage * detailPageSize);

  const columns = [
    columnHelper.accessor('employee', {
      header: 'Employee',
      size: 200,
      enableSorting: false,
      cell: (info) => (
        <EmployeeCell row={info.row.original} />
      ),
    }),
    columnHelper.accessor('servicePO', {
      header: 'Service PO',
      size: 220,
      enableSorting: false,
      cell: (info) => {
        const row = info.row.original;
        const patch = editsRef.current[row.id];
        const initialValue = patch?.service_po_id !== undefined ? patch.service_po_id : row.servicePO?.id;
        return (
          <ServicePOCell
            key={`${row.id}-${saveVersion}`}
            row={row}
            poOptions={servicePOOptions}
            initialValue={initialValue}
            onChange={updateEdit}
          />
        );
      },
    }),
    columnHelper.accessor('servicePO.client', {
      id: 'client',
      header: 'Client',
      enableSorting: false,
      cell: (info) => {
        const client = info.getValue();
        return client ? (
          <span className="text-sm">{client.client_name}</span>
        ) : (
          <span className="text-muted-foreground">—</span>
        );
      },
    }),
    columnHelper.accessor('hours_logged', {
      header: 'Hours',
      size: 100,
      enableSorting: false,
      cell: (info) => {
        const row = info.row.original;
        const patch = editsRef.current[row.id];
        const initialValue = patch?.hours_logged !== undefined
          ? patch.hours_logged
          : (row.hours_logged != null ? String(row.hours_logged) : '');
        return (
          <HoursCell key={`${row.id}-${saveVersion}`} row={row} initialValue={initialValue} onChange={updateEdit} />
        );
      },
    }),
    columnHelper.accessor('servicePO.serviceType.serviceCategory', {
      id: 'category',
      header: 'Category',
      size: 160,
      enableSorting: false,
      cell: (info) => {
        const cat = info.getValue();
        if (!cat) return <span className="text-muted-foreground">—</span>;
        const colorMap = {
          1: 'bg-green-100 text-green-700 dark:bg-green-900/30 dark:text-green-400 hover:bg-green-100',
          2: 'bg-slate-100 text-slate-600 dark:bg-slate-800/50 dark:text-slate-400 hover:bg-slate-100',
          3: 'bg-amber-100 text-amber-700 dark:bg-amber-900/30 dark:text-amber-400 hover:bg-amber-100',
        };
        return (
          <Badge className={`text-xs ${colorMap[cat.id] ?? 'bg-muted text-muted-foreground'}`}>
            {cat.name}
          </Badge>
        );
      },
    }),
  ];

  return (
    <div>
      <PageHeader
        title="Import Details"
        description={importRecord?.file_name ?? `Import #${id}`}
        actions={
          <div className="flex items-center gap-2">
            {editedCount > 0 && (
              <>
                <span className="text-xs text-muted-foreground">
                  {editedCount} unsaved change{editedCount !== 1 ? 's' : ''}
                </span>
                <Button variant="outline" size="sm" onClick={discardChanges} disabled={isSaving}>
                  Discard
                </Button>
              </>
            )}
            <Button size="sm" onClick={saveChanges} disabled={editedCount === 0 || isSaving}>
              {isSaving ? 'Saving…' : 'Save & Publish'}
            </Button>
            {canAddEntry && importRecord && (
              <Button variant="outline" size="sm" onClick={openAddRow}>
                <Plus className="mr-1.5 h-4 w-4" />
                Add New Record
              </Button>
            )}
            <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.TIMESHEETS)}>
              <ArrowLeft className="mr-1.5 h-4 w-4" />
              Back
            </Button>
          </div>
        }
      />

      {/* Import summary card */}
      {importRecord && (
        <Card className="mb-5">
          <CardContent className="flex flex-wrap gap-6 p-4">
            <div className="flex items-center gap-3">
              <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10">
                <FileSpreadsheet className="h-4 w-4 text-primary" />
              </div>
              <div>
                <p className="text-xs text-muted-foreground">File</p>
                <p className="text-sm font-medium truncate max-w-[240px]">{importRecord.file_name}</p>
              </div>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Imported By</p>
              <p className="text-sm font-medium">
                {importRecord.importer?.employee?.full_name ?? importRecord.importer?.email ?? '—'}
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Imported At</p>
              <p className="text-sm tabular-nums">{formatDate(importRecord.created_at)}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Rows</p>
              <p className="text-sm tabular-nums">
                <span className="text-green-600 font-semibold">{importRecord.valid_rows}</span>
                <span className="text-muted-foreground"> / {importRecord.total_rows}</span>
              </p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Employees</p>
              <p className="text-sm font-semibold tabular-nums">{employees.length}</p>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Total Hours</p>
              <p className="text-sm font-semibold tabular-nums">{totalHours.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-12 w-full" />
          ))}
        </div>
      ) : (
        <>
        <div className="flex justify-end mb-2">
          <p className="text-sm text-muted-foreground">
            {isFiltered ? 'Filtered total' : 'Total'}: <span className="font-semibold text-foreground tabular-nums">{filteredHours.toLocaleString(undefined, { minimumFractionDigits: 0, maximumFractionDigits: 2 })} hrs</span>
            {isFiltered && <span> across {filteredRows.length} rows</span>}
          </p>
        </div>
        <DataTable
          columns={columns}
          data={pagedRows}
          isLoading={false}
          rowClassName={(row) => (dirtyRowIds.has(String(row.id)) ? 'bg-amber-50 dark:bg-amber-950/20' : '')}
          pagination={{
            page: detailPage,
            limit: detailPageSize,
            total: filteredRows.length,
          }}
          onPageChange={setDetailPage}
          onPageSizeChange={(s) => { setDetailPageSize(s); setDetailPage(1); }}
          toolbar={
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 w-full mb-2">
              <SearchableSelect
                options={[
                  { label: "All Employees", value: "all" },
                  ...employees.map(emp => ({ label: emp, value: emp }))
                ]}
                value={employeeFilter}
                onValueChange={(v) => { setEmployeeFilter(v); setDetailPage(1); }}
                placeholder="All Employees"
                searchPlaceholder="Search employee..."
                className="w-full h-9"
              />

              <SearchableSelect
                options={[
                  { label: "All Clients", value: "all" },
                  ...clients.map(client => ({ label: client, value: client }))
                ]}
                value={clientFilter}
                onValueChange={(v) => { setClientFilter(v); setDetailPage(1); }}
                placeholder="All Clients"
                searchPlaceholder="Search client..."
                className="w-full h-9"
              />

              <SearchableSelect
                options={[
                  { label: "All Categories", value: "all" },
                  ...activeServiceCategories.map((sc) => ({
                    label: sc.name,
                    value: String(sc.id),
                  })),
                ]}
                value={serviceCategoryFilter}
                onValueChange={handleCategoryChange}
                placeholder="All Categories"
                searchPlaceholder="Search category..."
                className="w-full h-9"
              />

              <SearchableSelect
                options={[
                  { label: "All Types", value: "all" },
                  ...filteredServiceTypes.map((t) => ({
                    label: t.service_type_name,
                    value: String(t.id),
                  })),
                ]}
                value={serviceTypeFilter}
                onValueChange={handleTypeChange}
                placeholder="All Types"
                searchPlaceholder="Search type..."
                className="w-full h-9"
              />

              <SearchableSelect
                options={[
                  { label: "All Service POs", value: "all" },
                  ...filteredPOOptions.map(po => ({ label: po.name, value: po.name }))
                ]}
                value={poFilter}
                onValueChange={(v) => { setPoFilter(v); setDetailPage(1); }}
                placeholder="All Service POs"
                searchPlaceholder="Search PO..."
                className="w-full h-9"
              />
            </div>
          }
        />
        </>
      )}

      <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
        <DialogContent className="sm:max-w-[440px]">
          <DialogHeader>
            <DialogTitle>Add New Record</DialogTitle>
            <DialogDescription>
              Add a single record to this import — {importRecord?.file_name ?? `Import #${id}`}.
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
                value={addForm.employee_id}
                onValueChange={(v) => setAddForm((f) => ({ ...f, employee_id: v }))}
                placeholder="Select employee"
                searchPlaceholder="Search employee..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Service PO <span className="text-destructive">*</span></Label>
              <SearchableSelect
                options={servicePOOptions}
                value={addForm.service_po_id}
                onValueChange={(v) => setAddForm((f) => ({ ...f, service_po_id: v, sub_project_id: '' }))}
                placeholder="Select Service PO"
                searchPlaceholder="Search PO..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Sub Project</Label>
              <SearchableSelect
                options={[
                  { label: 'None', value: '' },
                  ...addSubProjects.map((sp) => ({ value: String(sp.id), label: sp.sub_project_name })),
                ]}
                value={addForm.sub_project_id}
                onValueChange={(v) => setAddForm((f) => ({ ...f, sub_project_id: v }))}
                disabled={!addForm.service_po_id}
                placeholder="Select sub project (optional)"
                searchPlaceholder="Search sub project..."
              />
            </div>
            <div className="grid gap-2">
              <Label>Hours Logged <span className="text-destructive">*</span></Label>
              <Input
                type="number"
                step="0.25"
                min="0"
                className="h-9 text-sm"
                value={addForm.hours_logged}
                onChange={(e) => setAddForm((f) => ({ ...f, hours_logged: e.target.value }))}
              />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleAddSubmit} disabled={isSavingAdd}>
              {isSavingAdd ? 'Saving…' : 'Add New Record'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default TimesheetImportDetail;
