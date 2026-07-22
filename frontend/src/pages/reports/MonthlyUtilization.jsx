import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Filter, Search } from 'lucide-react';
import { useMonthlyUtilization } from '@/hooks/useReports';
import { reportsApi } from '@/api/reports.api';
import { useActiveEmployees } from '@/hooks/useEmployees';
import { useActiveServiceTypes } from '@/hooks/useServiceTypes';
import { useActiveServiceCategories } from '@/hooks/useServiceCategories';
import { formatMonthYear } from '@/utils/formatters';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/utils/cn';

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const fh = (val) => {
  const n = Number(val);
  if (val == null || isNaN(n) || n === 0) return null;
  return n % 1 === 0 ? String(n) : n.toFixed(1);
};

const HoursCell = ({ value }) => {
  const v = fh(value);
  return v
    ? <span className="tabular-nums">{v}</span>
    : <span className="text-muted-foreground/30">—</span>;
};

const exportToExcel = (records, columns, month, year) => {
  const monthLabel = MONTH_NAMES[(month - 1)] ?? month;

  const dynamicHeaders = columns.flatMap((cat) =>
    cat.service_types.map((st) => `${st.name} (hrs)`)
  );

  const header = [
    'Sr. No.', 'Name', 'Designation', 'Total Exp', 'Co. Exp',
    'Monthly Cap (hrs)', 'Billing Cap (hrs)', 'Client(s)',
    ...dynamicHeaders,
    'Billable Total (hrs)', 'Non-Billable Total (hrs)', 'Leaves (hrs)', 'Total (hrs)', 'Total Utilization (hrs)',
  ];

  const dataRows = records.map((r, i) => [
    i + 1,
    r.full_name ?? '',
    r.designation ?? '',
    r.total_experience ?? '',
    r.company_experience ?? '',
    r.monthly_capacity ?? '',
    r.monthly_billing_capacity ?? '',
    r.clients ?? '',
    ...columns.flatMap((cat) => cat.service_types.map((st) => r.hours?.[st.id] ?? 0)),
    r.billable_total ?? 0,
    r.non_billable_total ?? 0,
    r.leaves_hours ?? 0,
    r.total_hours ?? 0,
    r.total_utilization ?? 0,
  ]);

  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Utilization');
  XLSX.writeFile(wb, `Monthly_Utilization_${monthLabel}_${year}.xlsx`);
};

// ─── column helpers ──────────────────────────────────────────────────────────
const th = (...cls) =>
  cn('px-2.5 py-2 text-left text-xs font-semibold border-r border-border whitespace-nowrap last:border-r-0', ...cls);
const td = (...cls) =>
  cn('px-2.5 py-2 text-xs border-r border-border last:border-r-0', ...cls);

const CATEGORY_STYLES = {
  billable:     { header: 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400', cell: 'bg-emerald-500/[0.02]' },
  'non-billable': { header: 'bg-orange-500/10 text-orange-700 dark:text-orange-400', cell: 'bg-orange-500/[0.02]' },
};

function getCategoryStyle(name = '') {
  const key = name.toLowerCase().replace(/\s+/g, '-');
  return CATEGORY_STYLES[key] ?? { header: '', cell: '' };
}

// ─── component ───────────────────────────────────────────────────────────────
const MonthlyUtilization = () => {
  const [monthYear, setMonthYear] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [employeeId, setEmployeeId] = useState('all');
  const [serviceTypeId, setServiceTypeId] = useState('all');
  const [serviceCategoryId, setServiceCategoryId] = useState('all');
  const [search, setSearch] = useState('');
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [exporting, setExporting] = useState(false);

  const { data: activeEmployees = [] }         = useActiveEmployees();
  const { data: activeServiceTypes = [] }      = useActiveServiceTypes();
  const { data: activeServiceCategories = [] } = useActiveServiceCategories();

  const enabled = !!(monthYear?.year >= 2000 && monthYear?.year <= 2100);

  const params = enabled ? {
    month: monthYear.month,
    year:  monthYear.year,
    ...(employeeId !== 'all'        && { employeeId }),
    ...(serviceTypeId !== 'all'     && { serviceTypeId }),
    ...(serviceCategoryId !== 'all' && { serviceCategoryId }),
    page,
    limit,
    ...(search.trim() && { search: search.trim() }),
  } : undefined;

  const { data, isPending } = useMonthlyUtilization(params);

  const columns = Array.isArray(data?.data?.columns) ? data.data.columns : [];
  const records = Array.isArray(data?.data?.records) ? data.data.records : [];
  const meta    = data?.meta    ?? {};
  const summary = data?.data?.summary ?? {};

  const monthLabel = monthYear ? formatMonthYear(monthYear.month, monthYear.year) : '';

  const handleSearchChange = (e) => { setSearch(e.target.value); setPage(1); };

  // Export pulls every matching record (not just the current page) with one extra request.
  const handleExport = async () => {
    setExporting(true);
    try {
      const total = meta.total > 0 ? meta.total : 1000;
      const res = await reportsApi.getMonthlyUtilization({ ...params, page: 1, limit: total });
      const allRecords = Array.isArray(res?.data?.records) ? res.data.records : [];
      exportToExcel(allRecords, columns, monthYear?.month, monthYear?.year);
    } finally {
      setExporting(false);
    }
  };

  const activeFilterCount = [
    employeeId !== 'all',
    serviceTypeId !== 'all',
    serviceCategoryId !== 'all',
  ].filter(Boolean).length;

  return (
    <div>
      <PageHeader
        title="Monthly Utilization"
        description="Employee utilization summary for a selected month"
        actions={
          <div className="flex items-center gap-2">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search employee…"
                value={search}
                onChange={handleSearchChange}
                className="h-9 pl-9 w-56 text-sm"
                disabled={!enabled}
              />
            </div>
            <Button
              size="sm"
              onClick={() => setFiltersOpen((p) => !p)}
              className="h-9 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {records.length > 0 && (
              <Button variant="outline" size="sm" className="h-9" onClick={handleExport} disabled={exporting}>
                <Download className="mr-1.5 h-4 w-4" />{exporting ? 'Exporting…' : 'Export Excel'}
              </Button>
            )}
          </div>
        }
      />

      {/* ── Collapsible filter panel ── */}
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
                { label: "All Employees", value: "all" },
                ...activeEmployees.map((e) => ({ label: e.full_name, value: String(e.id) }))
              ]}
              value={employeeId}
              onValueChange={(v) => { setEmployeeId(v); setPage(1); }}
              placeholder="All Employees"
              searchPlaceholder="Search employee..."
              className="h-9 w-full text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Service Category</Label>
            <SearchableSelect
              options={[
                { label: "All Categories", value: "all" },
                ...activeServiceCategories.map((sc) => ({ label: sc.name, value: String(sc.id) }))
              ]}
              value={serviceCategoryId}
              onValueChange={(v) => { setServiceCategoryId(v); setPage(1); }}
              placeholder="All Categories"
              searchPlaceholder="Search category..."
              className="h-9 w-full text-sm"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Service Type</Label>
            <SearchableSelect
              options={[
                { label: "All Service Types", value: "all" },
                ...activeServiceTypes.map((st) => ({ label: st.service_type_name, value: String(st.id) }))
              ]}
              value={serviceTypeId}
              onValueChange={(v) => { setServiceTypeId(v); setPage(1); }}
              placeholder="All Service Types"
              searchPlaceholder="Search service type..."
              className="h-9 w-full text-sm"
            />
          </div>
        </div>
      </div>

      {/* ── States ── */}
      {!enabled ? (
        <div className="rounded-lg border-2 border-dashed border-muted py-20 text-center">
          <p className="text-sm text-muted-foreground">Select a month and year to view utilization data.</p>
        </div>
      ) : isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => <Skeleton key={i} className="h-10 w-full" />)}
        </div>
      ) : records.length === 0 ? (
        <div className="rounded-lg border py-20 text-center">
          <p className="text-sm text-muted-foreground">No utilization data found for {monthLabel}.</p>
        </div>
      ) : (
        <>
          {/* ── Summary chips ── */}
          <div className="mb-4 flex flex-wrap gap-3">
            {summary.billable_total != null && (
              <div className="rounded-md border bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-400">
                Billable Total&nbsp;
                <span className="font-semibold tabular-nums">{Number(summary.billable_total).toFixed(1)} hrs</span>
              </div>
            )}
            {summary.non_billable_total != null && (
              <div className="rounded-md border bg-orange-500/10 px-3 py-1.5 text-xs text-orange-700 dark:text-orange-400">
                Non-Billable Total&nbsp;
                <span className="font-semibold tabular-nums">{Number(summary.non_billable_total).toFixed(1)} hrs</span>
              </div>
            )}
            {summary.leaves_hours != null && (
              <div className="rounded-md border bg-muted/40 px-3 py-1.5 text-xs">
                Leaves&nbsp;
                <span className="font-semibold tabular-nums">{Number(summary.leaves_hours).toFixed(1)} hrs</span>
              </div>
            )}
            {summary.total_hours != null && (
              <div className="rounded-md border bg-blue-500/10 px-3 py-1.5 text-xs text-blue-700 dark:text-blue-400">
                Total Hours&nbsp;
                <span className="font-semibold tabular-nums">{Number(summary.total_hours).toFixed(1)} hrs</span>
              </div>
            )}
          </div>

          {/* ── Table ── */}
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-auto max-h-[50vh]">
              <table className="min-w-max w-full border-collapse text-sm">

                {/* Group header row */}
                <thead className="sticky top-0 z-20 bg-background">
                  <tr className="border-b bg-muted/60">
                    <th colSpan={2} className="sticky left-0 z-30 bg-muted" />
                    <th colSpan={6} className="border-r border-border" />
                    {columns.map((cat) => {
                      const style = getCategoryStyle(cat.category_name);
                      return (
                        <th
                          key={cat.category_id}
                          colSpan={cat.service_types.length}
                          className={cn('px-3 py-1.5 text-center text-xs font-semibold border-r border-border', style.header)}
                        >
                          {cat.category_name}
                        </th>
                      );
                    })}
                    <th colSpan={5} className="px-3 py-1.5 text-center text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400">
                      Summary
                    </th>
                  </tr>

                  {/* Column headers */}
                  <tr className="border-b bg-muted/40">
                    <th className={th('sticky left-0 z-30 bg-muted w-[50px] text-center')}>#</th>
                    <th className={th('sticky left-[50px] z-30 bg-muted border-r border-border shadow-[1px_0_0_0_var(--border)] w-[220px] min-w-[220px] max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap')}>Name</th>
                    <th className={th('min-w-[160px]')}>Designation</th>
                    <th className={th('w-[90px] text-right')}>Total Exp</th>
                    <th className={th('w-[90px] text-right')}>Co. Exp</th>
                    <th className={th('w-[100px] text-right')}>Cap. (hrs)</th>
                    <th className={th('w-[100px] text-right')}>Bill. Cap.</th>
                    <th className={th('min-w-[180px]')}>Client(s)</th>
                    {columns.flatMap((cat) => {
                      const style = getCategoryStyle(cat.category_name);
                      return cat.service_types.map((st) => (
                        <th key={st.id} className={th('w-[110px] text-right', style.cell)}>
                          {st.name}
                        </th>
                      ));
                    })}
                    <th className={th('w-[120px] text-right bg-blue-500/[0.04] font-bold')}>Billable (hrs)</th>
                    <th className={th('w-[130px] text-right bg-blue-500/[0.04] font-bold')}>Non-Bill. (hrs)</th>
                    <th className={th('w-[90px] text-right bg-blue-500/[0.04]')}>Leaves (hrs)</th>
                    <th className={th('w-[90px] text-right bg-blue-500/[0.04]')}>Total (hrs)</th>
                    <th className={th('w-[170px] text-right bg-blue-500/[0.04] font-bold border-r-0')}>Total Utilization (hrs)</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {records.map((row, i) => (
                    <tr key={row.employee_id ?? i} className="group hover:bg-muted/30 transition-colors">
                      {/* # */}
                      <td className={td('sticky left-0 z-10 bg-background group-hover:bg-slate-50 dark:group-hover:bg-slate-800/80 w-[50px] text-center text-muted-foreground transition-colors')}>
                        {((meta.page ?? page) - 1) * (meta.limit ?? limit) + i + 1}
                      </td>
                      {/* Name */}
                      <td className={td('sticky left-[50px] z-10 bg-background border-r border-border shadow-[1px_0_0_0_var(--border)] group-hover:bg-slate-50 dark:group-hover:bg-slate-800/80 transition-colors w-[220px] min-w-[220px] max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap')}>
                        <p className="font-medium">{row.full_name ?? '—'}</p>
                        {row.employee_code && (
                          <p className="text-[10px] text-muted-foreground font-mono">{row.employee_code}</p>
                        )}
                      </td>
                      <td className={td()}>{row.designation || <span className="text-muted-foreground">—</span>}</td>
                      <td className={td('text-right tabular-nums')}>{row.total_experience ?? '—'}</td>
                      <td className={td('text-right tabular-nums')}>{row.company_experience ?? '—'}</td>
                      <td className={td('text-right tabular-nums')}>{row.monthly_capacity ?? '—'}</td>
                      <td className={td('text-right tabular-nums')}>{row.monthly_billing_capacity ?? '—'}</td>
                      <td className={td('max-w-[200px] truncate')} title={row.clients}>{row.clients || <span className="text-muted-foreground">—</span>}</td>
                      {/* Dynamic service type columns */}
                      {columns.flatMap((cat) => {
                        const style = getCategoryStyle(cat.category_name);
                        return cat.service_types.map((st) => (
                          <td key={st.id} className={td('text-right', style.cell)}>
                            <HoursCell value={row.hours?.[st.id]} />
                          </td>
                        ));
                      })}
                      {/* Summary */}
                      <td className={td('text-right font-semibold bg-blue-500/[0.02]')}>
                        <HoursCell value={row.billable_total} />
                      </td>
                      <td className={td('text-right font-semibold bg-blue-500/[0.02]')}>
                        <HoursCell value={row.non_billable_total} />
                      </td>
                      <td className={td('text-right bg-blue-500/[0.02]')}>
                        <HoursCell value={row.leaves_hours} />
                      </td>
                      <td className={td('text-right bg-blue-500/[0.02]')}>
                        <HoursCell value={row.total_hours} />
                      </td>
                      <td className={td('text-right font-semibold bg-blue-500/[0.02] border-r-0')}>
                        <HoursCell value={row.total_utilization} />
                      </td>
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
                ? `${meta.total} employee${meta.total !== 1 ? 's' : ''} · page ${meta.page ?? page} of ${meta.totalPages ?? 1}`
                : `${records.length} employee${records.length !== 1 ? 's' : ''}`}
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
                    {[10, 20, 50, 100].map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {(meta.totalPages ?? 1) > 1 && (() => {
                const currentPage = meta.page ?? page;
                const totalPages  = meta.totalPages ?? 1;
                return (
                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline" size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={currentPage <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      Previous
                    </Button>
                    <span className="text-xs text-muted-foreground px-1">
                      {currentPage} / {totalPages}
                    </span>
                    <Button
                      variant="outline" size="sm"
                      className="h-7 px-2 text-xs"
                      disabled={currentPage >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      Next
                    </Button>
                  </div>
                );
              })()}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default MonthlyUtilization;
