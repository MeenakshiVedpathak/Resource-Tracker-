import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { createColumnHelper } from '@tanstack/react-table';
import { Download, Filter, Search } from 'lucide-react';
import { useTimesheetSummary } from '@/hooks/useReports';
import { reportsApi } from '@/api/reports.api';
import { useDebounce } from '@/hooks/useDebounce';
import { useActiveEmployees } from '@/hooks/useEmployees';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useActiveServiceTypes } from '@/hooks/useServiceTypes';
import { useActiveServiceCategories } from '@/hooks/useServiceCategories';
import { useActiveClients } from '@/hooks/useClients';
import { formatDate, formatHours } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/utils/cn';

const columnHelper = createColumnHelper();

const exportToExcel = (rows) => {
  const header = ['Employee Code', 'Employee Name', 'Designation', 'Client', 'Service PO', 'PO Code', 'Sub-Project', 'Service Type', 'Billable', 'Date', 'Hours'];
  const dataRows = rows.map((r) => [
    r.employee_code ?? '',
    r.full_name ?? '',
    r.designation ?? '',
    r.client_name ?? '',
    r.service_po_name ?? '',
    r.service_po_code ?? '',
    r.sub_project_name ?? '',
    r.service_type_name ?? '',
    r.is_billable ? 'Yes' : 'No',
    r.timesheet_date ?? '',
    r.hours_logged != null ? Number(r.hours_logged) : '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Timesheet Summary');
  XLSX.writeFile(wb, 'Timesheet_Summary.xlsx');
};

const columns = [
  columnHelper.accessor('employee_code', {
    header: 'Code',
    meta: { sticky: true, left: 0 },
    size: 120,
    cell: (info) => (
      <span className="font-mono text-xs text-muted-foreground">{info.getValue() || '—'}</span>
    ),
  }),
  columnHelper.accessor('full_name', {
    header: 'Employee',
    meta: { sticky: true, left: 120 },
    size: 220,
    cell: (info) => (
      <div>
        <p className="font-medium text-xs">{info.getValue() || '—'}</p>
        {info.row.original.designation && (
          <p className="text-[10px] text-muted-foreground">{info.row.original.designation}</p>
        )}
      </div>
    ),
  }),
  columnHelper.accessor('client_name', {
    header: 'Client',
    size: 200,
    cell: (info) => info.getValue() || <span className="text-muted-foreground">—</span>,
  }),
  columnHelper.accessor('service_po_name', {
    header: 'Service PO',
    size: 220,
    cell: (info) => (
      <div>
        <p className="text-xs">{info.getValue() || '—'}</p>
        {info.row.original.service_po_code && (
          <p className="text-[10px] font-mono text-muted-foreground">{info.row.original.service_po_code}</p>
        )}
      </div>
    ),
  }),
  columnHelper.accessor('sub_project_name', {
    header: 'Sub-Project',
    meta: { sticky: true, left: 140 },
    size: 250,
    cell: (info) => info.getValue() || <span className="text-muted-foreground text-xs">—</span>,
  }),
  columnHelper.accessor('service_type_name', {
    header: 'Service Type',
    size: 160,
    cell: (info) => info.getValue() || <span className="text-muted-foreground">—</span>,
  }),
  columnHelper.accessor('is_billable', {
    header: 'Billable',
    size: 110,
    cell: (info) => {
      const v = info.getValue();
      return (
        <span className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
          v ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
            : 'bg-muted text-muted-foreground'
        )}>
          {v ? 'Yes' : 'No'}
        </span>
      );
    },
  }),
  columnHelper.accessor('timesheet_date', {
    header: 'Date',
    size: 110,
    cell: (info) => (
      <span className="text-xs tabular-nums">{formatDate(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor('hours_logged', {
    header: 'Hours',
    size: 110,
    cell: (info) => (
      <span className="font-semibold tabular-nums">{formatHours(info.getValue())}</span>
    ),
  }),
];

const TimesheetSummary = () => {
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  const [employeeId, setEmployeeId] = useState('all');
  const [categoryId, setCategoryId] = useState('all');
  const [typeId, setTypeId] = useState('all');
  const [poId, setPoId] = useState('all');
  const [clientId, setClientId] = useState('all');
  const [billable, setBillable] = useState('all');
  const [hoursSource, setHoursSource] = useState('M');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  const { data: activeEmployees = [] } = useActiveEmployees();
  const { data: activePOs = [] } = useActiveServicePOs();
  const { data: activeClients = [] } = useActiveClients();
  const { data: activeServiceCategories = [] } = useActiveServiceCategories();
  const { data: activeServiceTypes = [] } = useActiveServiceTypes();

  // Category → Type: only show types belonging to the selected category
  const filteredServiceTypes = categoryId === 'all'
    ? activeServiceTypes
    : activeServiceTypes.filter((t) => String(t.service_category_id) === categoryId);

  // Type (or Category, if no type chosen yet) → Service PO
  const typeCategoryMap = useMemo(() => {
    const map = new Map();
    activeServiceTypes.forEach((t) => map.set(String(t.id), String(t.service_category_id)));
    return map;
  }, [activeServiceTypes]);

  const filteredPOs = activePOs.filter((po) => {
    const poTypeId = po.serviceType?.id != null ? String(po.serviceType.id) : null;
    if (typeId !== 'all') return poTypeId === typeId;
    if (categoryId !== 'all') return poTypeId != null && typeCategoryMap.get(poTypeId) === categoryId;
    return true;
  });

  const handleCategoryChange = (v) => {
    setCategoryId(v);
    setTypeId('all');
    setPoId('all');
    setPage(1);
  };

  const handleTypeChange = (v) => {
    setTypeId(v);
    setPoId('all');
    setPage(1);
  };

  const params = {
    page,
    limit,
    hoursSource,
    ...(startDate && { startDate }),
    ...(endDate && { endDate }),
    ...(employeeId !== 'all' && { employeeId }),
    ...(categoryId !== 'all' && { serviceCategoryId: categoryId }),
    ...(typeId !== 'all' && { serviceTypeId: typeId }),
    ...(poId !== 'all' && { poId }),
    ...(clientId !== 'all' && { clientId }),
    ...(billable !== 'all' && { isBillable: billable === 'yes' }),
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { data, isPending } = useTimesheetSummary(params);

  // data.data = { records: [...], summary: { total_hours_on_page } }
  const rows    = Array.isArray(data?.data?.records) ? data.data.records : [];
  const summary = data?.data?.summary ?? {};
  const meta    = data?.meta ?? {};

  const activeFilterCount = [
    startDate !== '',
    endDate !== '',
    employeeId !== 'all',
    categoryId !== 'all',
    typeId !== 'all',
    poId !== 'all',
    clientId !== 'all',
    billable !== 'all',
  ].filter(Boolean).length;

  // Export pulls every matching record (not just the current page) with one extra request.
  const handleExport = async () => {
    setExporting(true);
    try {
      const total = meta.total > 0 ? meta.total : 1000;
      const res = await reportsApi.getTimesheetSummary({ ...params, page: 1, limit: total });
      const all = Array.isArray(res?.data?.records) ? res.data.records : [];
      exportToExcel(all);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Timesheet Summary"
        description="Review timesheet entries by employee, PO, and sub-project."
      />

      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Employee, PO…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="h-9 w-56 pl-9 text-sm"
          />
        </div>

        <SearchableSelect
          showSearch={false}
          options={[
            { label: 'Modified', value: 'M' },
            { label: 'Original', value: 'O' },
          ]}
          value={hoursSource}
          onValueChange={(v) => { setHoursSource(v); setPage(1); }}
          placeholder="Hours Source"
          className="h-9 w-36 text-sm shrink-0"
        />

        <Button
          size="sm"
          className="h-9 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => setFiltersOpen((o) => !o)}
        >
          <Filter className="h-4 w-4" />
          Filters
          {activeFilterCount > 0 && (
            <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">{activeFilterCount}</span>
          )}
        </Button>

        {rows.length > 0 && (
          <Button variant="outline" size="sm" className="h-9" onClick={handleExport} disabled={exporting}>
            <Download className="mr-1.5 h-4 w-4" />{exporting ? 'Exporting…' : 'Export Excel'}
          </Button>
        )}
      </div>

      {/* Collapsible filter panel */}
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${filtersOpen ? 'max-h-[420px] opacity-100 mb-5' : 'max-h-0 opacity-0 mb-0'}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full rounded-lg border bg-muted/30 p-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Start Date</Label>
            <Input
              type="date"
              value={startDate}
              onChange={(e) => { setStartDate(e.target.value); setPage(1); }}
              className="h-9 w-full text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">End Date</Label>
            <Input
              type="date"
              value={endDate}
              onChange={(e) => { setEndDate(e.target.value); setPage(1); }}
              className="h-9 w-full text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Employee</Label>
            <SearchableSelect
              options={[
                { label: "All Employees", value: "all" },
                ...activeEmployees.map((e) => ({
                  label: e.full_name,
                  value: String(e.id)
                }))
              ]}
              value={employeeId}
              onValueChange={(v) => { setEmployeeId(v); setPage(1); }}
              placeholder="All Employees"
              searchPlaceholder="Search employee..."
              className="h-9 w-full text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Service Category</Label>
            <SearchableSelect
              options={[
                { label: "All Categories", value: "all" },
                ...activeServiceCategories.map((sc) => ({
                  label: sc.name,
                  value: String(sc.id)
                }))
              ]}
              value={categoryId}
              onValueChange={handleCategoryChange}
              placeholder="All Categories"
              searchPlaceholder="Search category..."
              className="h-9 w-full text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Service Type</Label>
            <SearchableSelect
              options={[
                { label: "All Types", value: "all" },
                ...filteredServiceTypes.map((t) => ({
                  label: t.service_type_name,
                  value: String(t.id)
                }))
              ]}
              value={typeId}
              onValueChange={handleTypeChange}
              placeholder="All Types"
              searchPlaceholder="Search type..."
              className="h-9 w-full text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Service PO</Label>
            <SearchableSelect
              options={[
                { label: "All POs", value: "all" },
                ...filteredPOs.map((po) => ({
                  label: po.service_po_name || po.service_po_code || String(po.id),
                  value: String(po.id)
                }))
              ]}
              value={poId}
              onValueChange={(v) => { setPoId(v); setPage(1); }}
              placeholder="All POs"
              searchPlaceholder="Search PO..."
              className="h-9 w-full text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Client</Label>
            <SearchableSelect
              options={[
                { label: "All Clients", value: "all" },
                ...activeClients.map((c) => ({
                  label: c.client_name,
                  value: String(c.id)
                }))
              ]}
              value={clientId}
              onValueChange={(v) => { setClientId(v); setPage(1); }}
              placeholder="All Clients"
              searchPlaceholder="Search client..."
              className="h-9 w-full text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Billable</Label>
            <SearchableSelect showSearch={false}
              options={[
                { label: "All", value: "all" },
                { label: "Yes", value: "yes" },
                { label: "No", value: "no" },
              ]}
              value={billable}
              onValueChange={(v) => { setBillable(v); setPage(1); }}
              placeholder="All"
              className="h-9 w-full text-sm"
            />
          </div>
        </div>
      </div>

      {/* Summary chip */}
      {!isPending && summary.total_hours_on_page != null && (
        <div className="mb-4 flex flex-wrap gap-3">
          <div className="rounded-md border bg-blue-500/10 px-3 py-1.5 text-xs text-blue-700 dark:text-blue-400">
            <span>Total Hours (this page) </span>
            <span className="font-semibold tabular-nums">{Number(summary.total_hours_on_page).toFixed(1)}</span>
          </div>
        </div>
      )}

      <DataTable
        tableContainerClassName="max-h-[50vh]"
        columns={columns}
        data={rows}
        isLoading={isPending}
        pagination={meta.total != null ? {
          page: meta.page ?? page,
          limit: meta.limit ?? limit,
          total: meta.total,
        } : undefined}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
      />
    </div>
  );
};

export default TimesheetSummary;
