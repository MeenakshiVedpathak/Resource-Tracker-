import { useState, useMemo, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useQueryClient } from '@tanstack/react-query';
import { createColumnHelper } from '@tanstack/react-table';
import { ArrowLeft, FileSpreadsheet } from 'lucide-react';
import { timesheetsApi } from '@/api/timesheets.api';
import { useTimesheetImportRows } from '@/hooks/useTimesheets';
import { useTimesheetHistory } from '@/hooks/useTimesheets';
import { useActiveServiceCategories } from '@/hooks/useServiceCategories';
import { useActiveServiceTypes } from '@/hooks/useServiceTypes';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useNotification } from '@/hooks/useNotification';
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

const columnHelper = createColumnHelper();

/*
 * Every cell below is directly editable, spreadsheet-style — no separate
 * "edit mode" toggle. Dropdown cells (Employee/Service PO) are always
 * rendered as select controls; Hours is always an input, styled borderless
 * so the table still reads like a plain grid until focused. Each field
 * saves independently on change/blur via a partial PUT.
 */
const cellInputClass = 'h-8 text-xs bg-transparent border-transparent hover:border-input focus:border-input focus:bg-background transition-colors rounded-md px-2';

// Employee is intentionally read-only — reassigning a timesheet entry to a
// different employee isn't allowed here.
const EmployeeCell = ({ row }) => (
  <div>
    <p className="text-sm font-medium">{row.employee?.full_name ?? '—'}</p>
    <p className="text-xs text-muted-foreground font-mono">{row.employee?.employee_code ?? ''}</p>
  </div>
);

const ServicePOCell = ({ row, poOptions, onSave }) => {
  const [saving, setSaving] = useState(false);
  const value = row.servicePO?.id != null ? String(row.servicePO.id) : '';
  return (
    <SearchableSelect
      options={poOptions}
      value={value}
      disabled={saving}
      onValueChange={async (v) => {
        if (v === value) return;
        setSaving(true);
        try { await onSave(row.id, { service_po_id: Number(v), sub_project_id: null }); } finally { setSaving(false); }
      }}
      placeholder="Service PO"
      searchPlaceholder="Search PO..."
      className={cn('w-full', cellInputClass)}
    />
  );
};

const HoursCell = ({ row, onSave }) => {
  const initial = row.hours_logged != null ? String(row.hours_logged) : '';
  const [val, setVal] = useState(initial);
  const [saving, setSaving] = useState(false);
  useEffect(() => setVal(initial), [initial]);

  const commit = async () => {
    const num = Number(val);
    if (val === '' || Number.isNaN(num) || val === initial) { setVal(initial); return; }
    setSaving(true);
    try { await onSave(row.id, { hours_logged: num }); } catch { setVal(initial); } finally { setSaving(false); }
  };

  return (
    <input
      type="number"
      step="0.25"
      min="0"
      value={val}
      disabled={saving}
      onChange={(e) => setVal(e.target.value)}
      onBlur={commit}
      onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur(); }}
      className={cn('w-20 text-right tabular-nums font-semibold border', cellInputClass)}
    />
  );
};

const TimesheetImportDetail = () => {
  const navigate = useNavigate();
  const { id } = useParams();

  const { data: rowsData, isPending } = useTimesheetImportRows(id);
  // fetch history to get the import metadata (file name, importer, etc.)
  const { data: historyData } = useTimesheetHistory({ page: 1, limit: 100 });

  const rows = Array.isArray(rowsData?.data) ? rowsData.data : [];
  const importRecord = (historyData?.data ?? []).find((r) => String(r.id) === String(id));

  // ── per-cell inline edit: each field saves independently on change/blur ──
  const notify = useNotification();
  const queryClient = useQueryClient();

  const { data: activeServicePOsData } = useActiveServicePOs();

  const servicePOOptions = (activeServicePOsData?.data ?? activeServicePOsData ?? []).map((p) => ({
    value: String(p.service_po_id ?? p.id),
    label: p.service_po_name ?? p.name,
  }));

  const saveField = async (rowId, payload) => {
    try {
      await timesheetsApi.update(rowId, payload);
      await queryClient.invalidateQueries({ queryKey: ['timesheets'] });
      notify.success('Entry updated.');
    } catch (err) {
      notify.error(err?.response?.data?.message ?? 'Failed to update timesheet entry.');
      throw err;
    }
  };

  const [employeeFilter, setEmployeeFilter] = useState('all');
  const [poFilter, setPoFilter] = useState('all');
  const [clientFilter, setClientFilter] = useState('all');
  const [serviceCategoryFilter, setServiceCategoryFilter] = useState('all');
  const [serviceTypeFilter, setServiceTypeFilter] = useState('all');

  const { data: activeServiceCategories = [] } = useActiveServiceCategories();
  const { data: activeServiceTypes = [] } = useActiveServiceTypes();

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
  };

  const handleTypeChange = (v) => {
    setServiceTypeFilter(v);
    setPoFilter('all');
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

  const columns = [
    columnHelper.accessor('employee', {
      header: 'Employee',
      size: 200,
      cell: (info) => (
        <EmployeeCell row={info.row.original} />
      ),
    }),
    columnHelper.accessor('servicePO', {
      header: 'Service PO',
      size: 220,
      cell: (info) => (
        <ServicePOCell row={info.row.original} poOptions={servicePOOptions} onSave={saveField} />
      ),
    }),
    columnHelper.accessor('servicePO.client', {
      id: 'client',
      header: 'Client',
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
      cell: (info) => <HoursCell row={info.row.original} onSave={saveField} />,
    }),
    columnHelper.accessor('servicePO.serviceType.serviceCategory', {
      id: 'category',
      header: 'Category',
      size: 160,
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
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.TIMESHEETS)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
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
        <DataTable
          columns={columns}
          data={filteredRows}
          isLoading={false}
          toolbar={
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-5 gap-4 w-full mb-2">
              <SearchableSelect
                options={[
                  { label: "All Employees", value: "all" },
                  ...employees.map(emp => ({ label: emp, value: emp }))
                ]}
                value={employeeFilter}
                onValueChange={setEmployeeFilter}
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
                onValueChange={setClientFilter}
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
                onValueChange={setPoFilter}
                placeholder="All Service POs"
                searchPlaceholder="Search PO..."
                className="w-full h-9"
              />
            </div>
          }
        />
      )}
    </div>
  );
};

export default TimesheetImportDetail;
