import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Download, Filter, Search, ChevronRight } from 'lucide-react';
import { useResourceProjectUtilization } from '@/hooks/useReports';
import { reportsApi } from '@/api/reports.api';
import { useDebounce } from '@/hooks/useDebounce';
import { useActiveEmployees } from '@/hooks/useEmployees';
import { useActiveClients } from '@/hooks/useClients';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useActiveServiceTypes } from '@/hooks/useServiceTypes';
import { useActiveServiceCategories } from '@/hooks/useServiceCategories';
import { formatHours, formatCurrency, formatMonthYear, getInitials } from '@/utils/formatters';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MultiSelect } from '@/components/ui/multi-select';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import { Sheet, SheetContent, SheetHeader, SheetTitle } from '@/components/ui/sheet';
import { cn } from '@/utils/cn';

const CATEGORY_COLORS = {
  billable: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  'non-billable': 'bg-orange-500/10 text-orange-700 dark:text-orange-400',
};

const PROJECT_TYPE_COLORS = {
  project: 'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  others: 'bg-slate-500/10 text-slate-700 dark:text-slate-400',
  leaves: 'bg-amber-500/10 text-amber-700 dark:text-amber-400',
};

const CategoryBadge = ({ value }) => (
  <span className={cn(
    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap',
    CATEGORY_COLORS[value?.toLowerCase()] ?? 'bg-muted text-muted-foreground'
  )}>
    {value || '—'}
  </span>
);

const ProjectTypeBadge = ({ value }) => (
  <span className={cn(
    'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium whitespace-nowrap',
    PROJECT_TYPE_COLORS[value?.toLowerCase()] ?? 'bg-muted text-muted-foreground'
  )}>
    {value || '—'}
  </span>
);

const AVATAR_COLORS = [
  'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  'bg-pink-500/10 text-pink-700 dark:text-pink-400',
  'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
];

const avatarColorFor = (name = '') => {
  const hash = name.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
  return AVATAR_COLORS[hash % AVATAR_COLORS.length];
};

const EmployeeAvatar = ({ name }) => (
  <span className={cn(
    'flex h-7 w-7 shrink-0 items-center justify-center rounded-full text-[10px] font-semibold',
    avatarColorFor(name)
  )}>
    {getInitials(name)}
  </span>
);

const sumBy = (projects, predicate) =>
  projects.reduce((acc, p) => (predicate(p) ? acc + (Number(p.projectHours) || 0) : acc), 0);

const isBillable = (p) => p.category?.toLowerCase() === 'billable';

const exportToExcel = (rows, monthLabel) => {
  const header = [
    'Employee', 'Total Hours', 'Billable Hours', 'Non-Billable Hours', 'Billable Amount',
    'Client', 'Project', 'Project Type', 'Category', 'Project Hours', 'Project Billable Amount',
  ];

  const dataRows = [];
  rows.forEach((r) => {
    const projects = r.projects ?? [];
    const billableHours = sumBy(projects, isBillable);
    const nonBillableHours = sumBy(projects, (p) => !isBillable(p));
    const billableAmount = projects.reduce((acc, p) => acc + (Number(p.billableAmount) || 0), 0);

    if (projects.length === 0) {
      dataRows.push([r.employeeName ?? '', r.totalHours ?? '', billableHours, nonBillableHours, billableAmount, '', '', '', '', '', '']);
      return;
    }

    projects.forEach((p, i) => {
      dataRows.push([
        i === 0 ? (r.employeeName ?? '') : '',
        i === 0 ? (r.totalHours ?? '') : '',
        i === 0 ? billableHours : '',
        i === 0 ? nonBillableHours : '',
        i === 0 ? billableAmount : '',
        p.client ?? '',
        p.projectName ?? '',
        p.projectType ?? '',
        p.category ?? '',
        p.projectHours ?? '',
        p.billableAmount ?? '',
      ]);
    });
  });

  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Resource Project Utilization');
  XLSX.writeFile(wb, `Resource_Project_Utilization_${monthLabel.replace(' ', '_')}.xlsx`);
};

const now = new Date();

const ResourceProjectUtilization = () => {
  const [monthYear, setMonthYear] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });
  const [employeeIds, setEmployeeIds] = useState([]);
  const [clientIds, setClientIds] = useState([]);
  const [poIds, setPoIds] = useState([]);
  const [category, setCategory] = useState('all');
  const [typeIds, setTypeIds] = useState([]);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [selectedEmployeeId, setSelectedEmployeeId] = useState(null);
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  const { data: activeEmployees = [] } = useActiveEmployees();
  const { data: activeClients = [] } = useActiveClients();
  const { data: activePOs = [] } = useActiveServicePOs();
  const { data: activeServiceCategories = [] } = useActiveServiceCategories();
  const { data: activeServiceTypes = [] } = useActiveServiceTypes();

  const selectedCategoryName = category !== 'all'
    ? activeServiceCategories.find((sc) => String(sc.id) === category)?.name
    : undefined;

  // Category → Type: only show types belonging to the selected category
  const filteredServiceTypes = category === 'all'
    ? activeServiceTypes
    : activeServiceTypes.filter((t) => String(t.service_category_id) === category);

  // Type (or Category, if no type chosen yet) → Service PO
  const typeCategoryMap = useMemo(() => {
    const map = new Map();
    activeServiceTypes.forEach((t) => map.set(String(t.id), String(t.service_category_id)));
    return map;
  }, [activeServiceTypes]);

  const filteredPOs = activePOs.filter((po) => {
    const poTypeId = po.serviceType?.id != null ? String(po.serviceType.id) : null;
    if (typeIds.length > 0) return poTypeId != null && typeIds.includes(poTypeId);
    if (category !== 'all') return poTypeId != null && typeCategoryMap.get(poTypeId) === category;
    return true;
  });

  const handleCategoryChange = (v) => {
    setCategory(v);
    setTypeIds([]);
    setPoIds([]);
    setPage(1);
  };

  const handleTypeChange = (v) => {
    setTypeIds(v);
    setPoIds([]);
    setPage(1);
  };

  const params = {
    month: monthYear.month,
    year: monthYear.year,
    page,
    limit,
    ...(employeeIds.length > 0 && { employeeIds: employeeIds.join(',') }),
    ...(clientIds.length > 0 && { clientIds: clientIds.join(',') }),
    ...(poIds.length > 0 && { projectIds: poIds.join(',') }),
    ...(category !== 'all' && { serviceCategoryId: category }),
    ...(typeIds.length > 0 && { serviceTypeIds: typeIds.join(',') }),
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { data, isPending } = useResourceProjectUtilization(params);

  const allRows = Array.isArray(data?.data) ? data.data : [];
  const meta = data?.meta ?? {};
  const monthLabel = formatMonthYear(monthYear.month, monthYear.year);

  // Client-side safety net: filters this page's rows by employee name even if
  // the backend doesn't (yet) honor the `search` query param for this report.
  const searchTerm = debouncedSearch.trim().toLowerCase();
  const rawRows = searchTerm
    ? allRows.filter((r) => r.employeeName?.toLowerCase().includes(searchTerm))
    : allRows;

  const rows = rawRows.map((r) => {
    const projects = r.projects ?? [];
    const filteredProjects = !selectedCategoryName
      ? projects
      : projects.filter((p) => p.category?.toLowerCase() === selectedCategoryName.toLowerCase());
    return {
      ...r,
      billableHours: sumBy(projects, isBillable),
      nonBillableHours: sumBy(projects, (p) => !isBillable(p)),
      billableAmount: projects.reduce((acc, p) => acc + (Number(p.billableAmount) || 0), 0),
      filteredProjects,
    };
  });

  const pageTotals = rows.reduce(
    (acc, r) => {
      acc.totalHours += Number(r.totalHours) || 0;
      acc.billableHours += r.billableHours;
      acc.nonBillableHours += r.nonBillableHours;
      acc.billableAmount += r.billableAmount;
      return acc;
    },
    { totalHours: 0, billableHours: 0, nonBillableHours: 0, billableAmount: 0 }
  );

  // Export pulls every matching record (not just the current page) with one extra request.
  const handleExport = async () => {
    setExporting(true);
    try {
      const total = meta.total > 0 ? meta.total : 1000;
      const res = await reportsApi.getResourceProjectUtilization({ ...params, page: 1, limit: total });
      const all = Array.isArray(res?.data) ? res.data : [];
      const exportRows = searchTerm
        ? all.filter((r) => r.employeeName?.toLowerCase().includes(searchTerm))
        : all;
      exportToExcel(exportRows, monthLabel);
    } finally {
      setExporting(false);
    }
  };

  const selectedRow = rows.find((r) => r.employeeId === selectedEmployeeId) ?? null;

  const activeFilterCount = [
    employeeIds.length > 0 ? 1 : 0,
    clientIds.length > 0 ? 1 : 0,
    category !== 'all' ? 1 : 0,
    typeIds.length > 0 ? 1 : 0,
    poIds.length > 0 ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  const totalPages = meta.totalPages ?? 1;
  const currentPage = meta.page ?? page;

  return (
    <div>
      <PageHeader
        title="Resource Project Utilization"
        description="Per-employee hours breakdown across projects, for a given month."
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee…"
                value={search}
                onChange={(e) => { setSearch(e.target.value); setPage(1); }}
                className="h-9 pl-9 w-56 text-sm"
              />
            </div>
            <Button
              size="sm"
              className="h-9 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setFiltersOpen((prev) => !prev)}
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {(meta.total ?? rows.length) > 0 && (
              <Button variant="outline" size="sm" className="h-9" onClick={handleExport} disabled={exporting}>
                <Download className="mr-1.5 h-4 w-4" />{exporting ? 'Exporting…' : 'Export Excel'}
              </Button>
            )}
          </div>
        }
      />

      {/* Collapsible filter panel */}
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${filtersOpen ? 'max-h-[420px] opacity-100 mb-5' : 'max-h-0 opacity-0 mb-0'}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full rounded-lg border bg-muted/30 p-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Month &amp; Year <span className="text-destructive">*</span></Label>
            <MonthYearPicker
              value={monthYear}
              onChange={(val) => { setMonthYear(val); setPage(1); }}
              placeholder="Select month"
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Employee</Label>
            <MultiSelect
              options={activeEmployees.map((e) => ({ label: e.full_name, value: String(e.id) }))}
              value={employeeIds}
              onValueChange={(v) => { setEmployeeIds(v); setPage(1); }}
              placeholder="All Employees"
              searchPlaceholder="Search employee..."
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Client</Label>
            <MultiSelect
              options={activeClients.map((c) => ({ label: c.client_name, value: String(c.id) }))}
              value={clientIds}
              onValueChange={(v) => { setClientIds(v); setPage(1); }}
              placeholder="All Clients"
              searchPlaceholder="Search client..."
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Service Category</Label>
            <SearchableSelect
              options={[
                { label: 'All Categories', value: 'all' },
                ...activeServiceCategories.map((sc) => ({ label: sc.name, value: String(sc.id) })),
              ]}
              value={category}
              onValueChange={handleCategoryChange}
              placeholder="All Categories"
              searchPlaceholder="Search category..."
              className="h-9 text-sm w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Service Type</Label>
            <MultiSelect
              options={filteredServiceTypes.map((t) => ({ label: t.service_type_name, value: String(t.id) }))}
              value={typeIds}
              onValueChange={handleTypeChange}
              placeholder="All Types"
              searchPlaceholder="Search type..."
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Service PO</Label>
            <MultiSelect
              options={filteredPOs.map((po) => ({ label: po.service_po_name || po.service_po_code || String(po.id), value: String(po.id) }))}
              value={poIds}
              onValueChange={(v) => { setPoIds(v); setPage(1); }}
              placeholder="All POs"
              searchPlaceholder="Search PO..."
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* States */}
      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : rows.length === 0 ? (
        <EmptyState title="No utilization data found" description={`No records found for ${monthLabel}.`} />
      ) : (
        <>
          {/* Summary chips */}
          <div className="mb-4 flex flex-wrap gap-3">
            <div className="rounded-md border bg-blue-500/10 px-3 py-1.5 text-xs text-blue-700 dark:text-blue-400">
              Total Hours&nbsp;
              <span className="font-semibold tabular-nums">{pageTotals.totalHours.toFixed(1)} hrs</span>
            </div>
            <div className="rounded-md border bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-400">
              Billable&nbsp;
              <span className="font-semibold tabular-nums">{pageTotals.billableHours.toFixed(1)} hrs</span>
            </div>
            <div className="rounded-md border bg-orange-500/10 px-3 py-1.5 text-xs text-orange-700 dark:text-orange-400">
              Non-Billable&nbsp;
              <span className="font-semibold tabular-nums">{pageTotals.nonBillableHours.toFixed(1)} hrs</span>
            </div>
            <div className="rounded-md border bg-muted/40 px-3 py-1.5 text-xs">
              Billable Amount&nbsp;
              <span className="font-semibold tabular-nums">{formatCurrency(pageTotals.billableAmount)}</span>
            </div>
          </div>

          {/* Table */}
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-auto max-h-[55vh]">
              <table className="min-w-full w-full table-fixed border-collapse text-sm">
                <colgroup>
                  <col className="w-9" />
                  <col />
                  <col className="w-[110px]" />
                  <col className="w-[110px]" />
                  <col className="w-[120px]" />
                  <col className="w-[140px]" />
                  <col className="w-[140px]" />
                </colgroup>
                <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_3px_0_rgb(0,0,0,0.1)]">
                  <tr className="border-b">
                    <th className="px-2.5 py-2 text-left text-xs font-semibold" />
                    <th className="px-2.5 py-2 text-left text-xs font-semibold">Employee</th>
                    <th className="px-2.5 py-2 text-right text-xs font-semibold">Total Hours</th>
                    <th className="px-2.5 py-2 text-right text-xs font-semibold">Billable</th>
                    <th className="px-2.5 py-2 text-right text-xs font-semibold">Non-Billable</th>
                    <th className="px-2.5 py-2 text-right text-xs font-semibold">Billable Amount</th>
                    <th className="px-2.5 py-2 text-left text-xs font-semibold">Projects</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row, i) => (
                    <tr
                      key={row.employeeId ?? i}
                      className={cn(
                        'transition-colors cursor-pointer border-l-2 border-l-transparent hover:bg-muted/40',
                        i % 2 === 1 && 'bg-muted/[0.15]'
                      )}
                      onClick={() => setSelectedEmployeeId(row.employeeId)}
                    >
                      <td className="px-2.5 py-2 text-center">
                        <span className="inline-flex h-6 w-6 items-center justify-center rounded-md text-muted-foreground">
                          <ChevronRight className="h-4 w-4" />
                        </span>
                      </td>
                      <td className="px-2.5 py-2">
                        <div className="flex items-center gap-2">
                          <EmployeeAvatar name={row.employeeName} />
                          <p className="font-medium text-xs">{row.employeeName || '—'}</p>
                        </div>
                      </td>
                      <td className="px-2.5 py-2 text-right tabular-nums font-medium">{formatHours(row.totalHours)}</td>
                      <td className="px-2.5 py-2 text-right tabular-nums text-emerald-700 dark:text-emerald-400">{formatHours(row.billableHours)}</td>
                      <td className="px-2.5 py-2 text-right tabular-nums text-orange-700 dark:text-orange-400">{formatHours(row.nonBillableHours)}</td>
                      <td className="px-2.5 py-2 text-right tabular-nums font-medium">{formatCurrency(row.billableAmount)}</td>
                      <td className="px-2.5 py-2 text-xs text-muted-foreground">{row.projects?.length ?? 0} project{(row.projects?.length ?? 0) !== 1 ? 's' : ''}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>

          {/* Pagination */}
          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {meta.total != null
                ? `${meta.total} employee${meta.total !== 1 ? 's' : ''} · page ${currentPage} of ${totalPages}`
                : `${rows.length} employee${rows.length !== 1 ? 's' : ''}`}
              {monthLabel ? ` · ${monthLabel}` : ''}
            </p>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
                <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-7 text-xs bg-white w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50, 100].map((s) => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {totalPages > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline" size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={!meta.hasPrev}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground px-1">{currentPage} / {totalPages}</span>
                  <Button
                    variant="outline" size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={!meta.hasNext}
                    onClick={() => setPage((p) => p + 1)}
                  >
                    Next
                  </Button>
                </div>
              )}
            </div>
          </div>
        </>
      )}

      <Sheet open={!!selectedRow} onOpenChange={(open) => !open && setSelectedEmployeeId(null)}>
        <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col bg-white overflow-hidden">
          {selectedRow && (
            <>
              <SheetHeader className="px-5 py-4 border-b">
                <div className="flex items-center gap-3">
                  <EmployeeAvatar name={selectedRow.employeeName} />
                  <div>
                    <SheetTitle className="text-left">{selectedRow.employeeName || '—'}</SheetTitle>
                    <p className="text-xs text-muted-foreground">{monthLabel}</p>
                  </div>
                </div>
              </SheetHeader>

              <div className="flex-1 overflow-y-auto px-5 py-4">
                {/* Summary stats */}
                <div className="mb-5 grid grid-cols-2 gap-2.5">
                  <div className="rounded-md border bg-blue-500/10 px-3 py-2 text-xs text-blue-700 dark:text-blue-400">
                    Total Hours
                    <p className="text-sm font-semibold tabular-nums">{formatHours(selectedRow.totalHours)}</p>
                  </div>
                  <div className="rounded-md border bg-muted/40 px-3 py-2 text-xs">
                    Billable Amount
                    <p className="text-sm font-semibold tabular-nums">{formatCurrency(selectedRow.billableAmount)}</p>
                  </div>
                  <div className="rounded-md border bg-emerald-500/10 px-3 py-2 text-xs text-emerald-700 dark:text-emerald-400">
                    Billable
                    <p className="text-sm font-semibold tabular-nums">{formatHours(selectedRow.billableHours)}</p>
                  </div>
                  <div className="rounded-md border bg-orange-500/10 px-3 py-2 text-xs text-orange-700 dark:text-orange-400">
                    Non-Billable
                    <p className="text-sm font-semibold tabular-nums">{formatHours(selectedRow.nonBillableHours)}</p>
                  </div>
                </div>

                {selectedRow.remarks && (
                  <p className="mb-5 rounded-md border bg-muted/30 px-3 py-2 text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Remarks: </span>{selectedRow.remarks}
                  </p>
                )}

                {/* Project list */}
                <p className="mb-2 text-xs font-semibold text-muted-foreground uppercase tracking-wide">
                  Projects ({selectedRow.filteredProjects.length})
                </p>
                {selectedRow.filteredProjects.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No projects match the current filter.</p>
                ) : (
                  <div className="space-y-2">
                    {selectedRow.filteredProjects.map((p, pi) => (
                      <div key={pi} className="rounded-md border px-3 py-2.5">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="truncate text-sm font-medium" title={p.client}>{p.client || '—'}</p>
                            <p className="truncate text-xs text-muted-foreground" title={p.projectName}>{p.projectName || '—'}</p>
                          </div>
                          <div className="shrink-0 text-right">
                            <p className="text-sm font-semibold tabular-nums">{formatHours(p.projectHours)}</p>
                            <p className="text-xs text-muted-foreground tabular-nums">
                              {p.billableAmount ? formatCurrency(p.billableAmount) : '—'}
                            </p>
                          </div>
                        </div>
                        <div className="mt-2 flex items-center gap-1.5">
                          <ProjectTypeBadge value={p.projectType} />
                          <CategoryBadge value={p.category} />
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </SheetContent>
      </Sheet>
    </div>
  );
};

export default ResourceProjectUtilization;
