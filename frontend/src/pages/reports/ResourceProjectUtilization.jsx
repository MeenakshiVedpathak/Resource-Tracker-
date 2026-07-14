import { useState, Fragment } from 'react';
import * as XLSX from 'xlsx';
import { Download, Filter, Search, ChevronRight, ChevronsUpDown } from 'lucide-react';
import { useResourceProjectUtilization } from '@/hooks/useReports';
import { reportsApi } from '@/api/reports.api';
import { useDebounce } from '@/hooks/useDebounce';
import { useActiveEmployees } from '@/hooks/useEmployees';
import { useActiveClients } from '@/hooks/useClients';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useActiveServiceCategories } from '@/hooks/useServiceCategories';
import { formatHours, formatCurrency, formatMonthYear, getInitials } from '@/utils/formatters';
import PageHeader from '@/components/common/PageHeader';
import EmptyState from '@/components/common/EmptyState';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
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
  const [employeeId, setEmployeeId] = useState('all');
  const [clientId, setClientId] = useState('all');
  const [poId, setPoId] = useState('all');
  const [category, setCategory] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [expandedRows, setExpandedRows] = useState(() => new Set());
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  const { data: activeEmployees = [] } = useActiveEmployees();
  const { data: activeClients = [] } = useActiveClients();
  const { data: activePOs = [] } = useActiveServicePOs();
  const { data: activeServiceCategories = [] } = useActiveServiceCategories();

  const selectedCategoryName = category !== 'all'
    ? activeServiceCategories.find((sc) => String(sc.id) === category)?.name
    : undefined;

  const params = {
    month: monthYear.month,
    year: monthYear.year,
    page,
    limit,
    ...(employeeId !== 'all' && { employeeId }),
    ...(clientId !== 'all' && { clientId }),
    ...(poId !== 'all' && { projectId: poId }),
    ...(category !== 'all' && { serviceCategoryId: category }),
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

  const toggleRow = (employeeId) => {
    setExpandedRows((prev) => {
      const next = new Set(prev);
      if (next.has(employeeId)) next.delete(employeeId);
      else next.add(employeeId);
      return next;
    });
  };

  const allExpanded = rows.length > 0 && rows.every((r) => expandedRows.has(r.employeeId));
  const toggleAll = () => setExpandedRows(allExpanded ? new Set() : new Set(rows.map((r) => r.employeeId)));

  const activeFilterCount = [
    employeeId !== 'all' ? 1 : 0,
    clientId !== 'all' ? 1 : 0,
    poId !== 'all' ? 1 : 0,
    category !== 'all' ? 1 : 0,
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
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${filtersOpen ? 'max-h-[220px] opacity-100 mb-5' : 'max-h-0 opacity-0 mb-0'}`}>
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
            <SearchableSelect
              options={[
                { label: 'All Employees', value: 'all' },
                ...activeEmployees.map((e) => ({ label: e.full_name, value: String(e.id) })),
              ]}
              value={employeeId}
              onValueChange={(v) => { setEmployeeId(v); setPage(1); }}
              placeholder="All Employees"
              searchPlaceholder="Search employee..."
              className="h-9 text-sm w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Client</Label>
            <SearchableSelect
              options={[
                { label: 'All Clients', value: 'all' },
                ...activeClients.map((c) => ({ label: c.client_name, value: String(c.id) })),
              ]}
              value={clientId}
              onValueChange={(v) => { setClientId(v); setPage(1); }}
              placeholder="All Clients"
              searchPlaceholder="Search client..."
              className="h-9 text-sm w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Service PO</Label>
            <SearchableSelect
              options={[
                { label: 'All POs', value: 'all' },
                ...activePOs.map((po) => ({ label: po.service_po_name || po.service_po_code || String(po.id), value: String(po.id) })),
              ]}
              value={poId}
              onValueChange={(v) => { setPoId(v); setPage(1); }}
              placeholder="All POs"
              searchPlaceholder="Search PO..."
              className="h-9 text-sm w-full"
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
              onValueChange={(v) => { setCategory(v); setPage(1); }}
              placeholder="All Categories"
              searchPlaceholder="Search category..."
              className="h-9 text-sm w-full"
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

          {/* Table toolbar */}
          <div className="mb-2 flex items-center justify-between">
            <button
              type="button"
              onClick={toggleAll}
              className="inline-flex items-center gap-1.5 text-xs font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              <ChevronsUpDown className="h-3.5 w-3.5" />
              {allExpanded ? 'Collapse all' : 'Expand all'}
            </button>
            <span className="text-xs text-muted-foreground">{expandedRows.size} of {rows.length} expanded</span>
          </div>

          {/* Table */}
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-auto max-h-[55vh]">
              <table className="min-w-full w-full border-collapse text-sm">
                <thead className="sticky top-0 z-10 bg-slate-50 shadow-[0_1px_3px_0_rgb(0,0,0,0.1)]">
                  <tr className="border-b">
                    <th className="px-2.5 py-2 text-left text-xs font-semibold w-[36px]" />
                    <th className="px-2.5 py-2 text-left text-xs font-semibold">Employee</th>
                    <th className="px-2.5 py-2 text-right text-xs font-semibold w-[110px]">Total Hours</th>
                    <th className="px-2.5 py-2 text-right text-xs font-semibold w-[110px]">Billable</th>
                    <th className="px-2.5 py-2 text-right text-xs font-semibold w-[120px]">Non-Billable</th>
                    <th className="px-2.5 py-2 text-right text-xs font-semibold w-[140px]">Billable Amount</th>
                    <th className="px-2.5 py-2 text-left text-xs font-semibold w-[100px]">Projects</th>
                    <th className="px-2.5 py-2 text-left text-xs font-semibold">Remarks</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border">
                  {rows.map((row, i) => {
                    const isOpen = expandedRows.has(row.employeeId);
                    const projectsToShow = row.filteredProjects;
                    return (
                      <Fragment key={row.employeeId ?? i}>
                        <tr
                          className={cn(
                            'transition-colors cursor-pointer border-l-2',
                            isOpen
                              ? 'bg-primary/[0.04] border-l-primary hover:bg-primary/[0.06]'
                              : cn('border-l-transparent hover:bg-muted/40', i % 2 === 1 && 'bg-muted/[0.15]')
                          )}
                          onClick={() => toggleRow(row.employeeId)}
                        >
                          <td className="px-2.5 py-2 text-center">
                            <span className={cn(
                              'inline-flex h-6 w-6 items-center justify-center rounded-md transition-colors',
                              isOpen ? 'bg-primary/10 text-primary' : 'text-muted-foreground hover:bg-muted'
                            )}>
                              <ChevronRight className={cn('h-4 w-4 transition-transform duration-200', isOpen && 'rotate-90')} />
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
                          <td className="px-2.5 py-2 text-xs text-muted-foreground">{row.remarks || '—'}</td>
                        </tr>
                        {isOpen && (
                          <tr>
                            <td colSpan={8} className="bg-primary/[0.02] p-0">
                              {projectsToShow.length === 0 ? (
                                <p className="px-6 py-3 text-xs text-muted-foreground">No projects match the current filter.</p>
                              ) : (
                                <table className="w-full border-collapse text-xs">
                                  <thead>
                                    <tr className="border-b border-primary/20 bg-primary/10">
                                      <th className="px-3 py-2 pl-10 text-left font-semibold text-primary">Client</th>
                                      <th className="px-3 py-2 text-left font-semibold text-primary">Project</th>
                                      <th className="px-3 py-2 text-left font-semibold text-primary w-[110px]">Type</th>
                                      <th className="px-3 py-2 text-left font-semibold text-primary w-[120px]">Category</th>
                                      <th className="px-3 py-2 text-right font-semibold text-primary w-[100px]">Hours</th>
                                      <th className="px-3 py-2 text-right font-semibold text-primary w-[140px]">Billable Amount</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-border/60">
                                    {projectsToShow.map((p, pi) => (
                                      <tr key={pi}>
                                        <td className="px-3 py-1.5 pl-10">{p.client || '—'}</td>
                                        <td className="px-3 py-1.5">{p.projectName || '—'}</td>
                                        <td className="px-3 py-1.5"><ProjectTypeBadge value={p.projectType} /></td>
                                        <td className="px-3 py-1.5"><CategoryBadge value={p.category} /></td>
                                        <td className="px-3 py-1.5 text-right tabular-nums">{formatHours(p.projectHours)}</td>
                                        <td className="px-3 py-1.5 text-right tabular-nums">{p.billableAmount ? formatCurrency(p.billableAmount) : '—'}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              )}
                            </td>
                          </tr>
                        )}
                      </Fragment>
                    );
                  })}
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
    </div>
  );
};

export default ResourceProjectUtilization;
