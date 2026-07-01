import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Search } from 'lucide-react';
import { useMonthlyResourceUtilization } from '@/hooks/useReports';
import { useActiveEmployees } from '@/hooks/useEmployees';
import { formatMonthYear } from '@/utils/formatters';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';

const MONTH_OPTIONS = [
  { value: '1',  label: 'January' },
  { value: '2',  label: 'February' },
  { value: '3',  label: 'March' },
  { value: '4',  label: 'April' },
  { value: '5',  label: 'May' },
  { value: '6',  label: 'June' },
  { value: '7',  label: 'July' },
  { value: '8',  label: 'August' },
  { value: '9',  label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const STATIC_COLUMNS = [
  {
    category_id: 1,
    category_name: 'Billable',
    service_types: [
      { id: 's-1', name: 'Project' },
      { id: 's-2', name: 'Staff Augmentation' },
      { id: 's-3', name: 'ServicePack' },
      { id: 's-4', name: 'AMC' },
    ]
  },
  {
    category_id: 2,
    category_name: 'Customer Non-Billable',
    service_types: [
      { id: 's-5', name: 'Customer Work ( Presales, POC, L&D, Extended support)' },
      { id: 's-6', name: 'Complimentary Hours' },
    ]
  },
  {
    category_id: 3,
    category_name: 'Non-Billable',
    service_types: [
      { id: 's-7', name: 'Product / Solution / Framework Development' },
      { id: 's-8', name: 'Internal Support ( HR / Marketing / Finance etc.,)' },
      { id: 's-9', name: 'Team Management' },
      { id: 's-10', name: 'Leaves (hours)' },
      { id: 's-11', name: 'L&D' },
      { id: 's-12', name: 'Others (Non-work)' },
    ]
  }
];

const fh = (val) => {
  const n = Number(val);
  if (val == null || isNaN(n) || n === 0) return null;
  return n % 1 === 0 ? String(n) : n.toFixed(1);
};

const HoursCell = ({ value }) => {
  const v = fh(value);
  return <span className="tabular-nums">{v || '0'}</span>;
};

const exportToExcel = (records, columns, month, year) => {
  const monthLabel = MONTH_OPTIONS.find((m) => m.value === String(month))?.label ?? month;

  const headerRow1 = [
    '', '', '', '', '', '', '', '', '', // 9 Fixed cols empty
  ];
  const headerRow2 = [
    'Sr. No.', 'Name', 'Designation', 'Total Exp', 'Co. Exp',
    'Resource Description', 'Monthly Cap (hrs)', 'Billing Cap (hrs)', 'Client(s)'
  ];

  columns.forEach(cat => {
    headerRow1.push(cat.category_name);
    for (let i = 1; i < cat.service_types.length; i++) headerRow1.push(''); // span
    cat.service_types.forEach(st => headerRow2.push(st.name));
  });

  headerRow1.push('Summary', '', '');
  headerRow2.push('Billable Total (hrs)', 'Non-Billable Total (hrs)', 'Total Utilization (hrs)');

  const dataRows = records.map((r, i) => {
    const row = [
      i + 1,
      r.full_name ?? '',
      r.designation ?? '',
      r.total_experience ?? '',
      r.company_experience ?? '',
      r.resource_description ?? '',
      r.monthly_capacity ?? '',
      r.monthly_billing_capacity ?? '',
      r.clients ?? '',
    ];

    columns.forEach(cat => {
      cat.service_types.forEach(st => {
        row.push(r.hours?.[st.id] ?? 0);
      });
    });

    row.push(r.billable_total ?? 0, r.non_billable_total ?? 0, r.total_utilization ?? 0);
    return row;
  });

  const ws = XLSX.utils.aoa_to_sheet([headerRow1, headerRow2, ...dataRows]);
  
  // merge cells for top header
  const merges = [];
  let colIndex = 9;
  columns.forEach(cat => {
    const len = cat.service_types.length;
    if (len > 1) {
      merges.push({ s: { r: 0, c: colIndex }, e: { r: 0, c: colIndex + len - 1 } });
    }
    colIndex += len;
  });
  merges.push({ s: { r: 0, c: colIndex }, e: { r: 0, c: colIndex + 2 } });
  ws['!merges'] = merges;

  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Resource Utilization');
  XLSX.writeFile(wb, `Monthly_Resource_Utilization_${monthLabel}_${year}.xlsx`);
};

// ─── column helpers ──────────────────────────────────────────────────────────
const th = (...cls) =>
  cn('px-2.5 py-2 text-left text-xs font-semibold border-r border-border whitespace-nowrap last:border-r-0', ...cls);
const td = (...cls) =>
  cn('px-2.5 py-2 text-xs border-r border-border last:border-r-0', ...cls);

// ─── component ───────────────────────────────────────────────────────────────
const MonthlyResourceUtilization = () => {
  const [month,  setMonth]  = useState(String(new Date().getMonth() + 1));
  const [year,   setYear]   = useState(String(new Date().getFullYear()));
  const [employeeId, setEmployeeId] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data: activeEmployees = [] } = useActiveEmployees();

  const enabled = !!(month && year && Number(year) >= 2000 && Number(year) <= 2100);

  const params = enabled ? {
    month: Number(month),
    year:  Number(year),
    ...(employeeId !== 'all' && { employeeId }),
    page,
    limit,
    ...(search.trim() && { search: search.trim() }),
  } : undefined;

  const { data, isPending } = useMonthlyResourceUtilization(params);

  const dynamicColumns = data?.data?.columns ?? [];
  
  const columns = STATIC_COLUMNS.map(staticCat => {
    const dynCat = dynamicColumns.find(c => 
      c.category_name.toLowerCase().replace(/[^a-z]/g, '') === staticCat.category_name.toLowerCase().replace(/[^a-z]/g, '')
    );
    
    const mergedServiceTypes = staticCat.service_types.map(staticSt => {
      const dynSt = dynCat?.service_types.find(st => {
        const cleanDyn = st.name.trim().toLowerCase().replace(/\s+/g, ' ');
        const cleanStatic = staticSt.name.trim().toLowerCase().replace(/\s+/g, ' ');
        return cleanDyn === cleanStatic || cleanStatic.includes(cleanDyn) || cleanDyn.includes(cleanStatic);
      });
      return dynSt ? dynSt : staticSt;
    });

    if (dynCat) {
      dynCat.service_types.forEach(dynSt => {
        const cleanDyn = dynSt.name.trim().toLowerCase().replace(/\s+/g, ' ');
        if (!mergedServiceTypes.find(st => {
          const cleanStatic = st.name.trim().toLowerCase().replace(/\s+/g, ' ');
          return cleanDyn === cleanStatic || cleanStatic.includes(cleanDyn) || cleanDyn.includes(cleanStatic);
        })) {
          mergedServiceTypes.push(dynSt);
        }
      });
    }

    return {
      ...staticCat,
      category_id: dynCat ? dynCat.category_id : staticCat.category_id,
      service_types: mergedServiceTypes
    };
  });

  dynamicColumns.forEach(dynCat => {
    if (!columns.find(c => c.category_name.toLowerCase().replace(/[^a-z]/g, '') === dynCat.category_name.toLowerCase().replace(/[^a-z]/g, ''))) {
      columns.push(dynCat);
    }
  });

  const records = Array.isArray(data?.data?.records) ? data.data.records : [];
  const meta    = data?.meta    ?? {};
  const summary = data?.data?.summary ?? {};

  const monthLabel = month ? formatMonthYear(Number(month), Number(year)) : '';

  const handleMonthChange  = (v) => { setMonth(v);        setPage(1); };
  const handleSearchChange = (e) => { setSearch(e.target.value); setPage(1); };

  const getCategoryColorClass = (catId) => {
    switch(catId) {
      case 1: return 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400';
      case 2: return 'bg-blue-500/10 text-blue-700 dark:text-blue-400';
      case 3: return 'bg-orange-500/10 text-orange-700 dark:text-orange-400';
      default: return 'bg-muted/40 text-foreground';
    }
  };

  const getCellColorClass = (catId) => {
    switch(catId) {
      case 1: return 'bg-emerald-500/[0.02]';
      case 2: return 'bg-blue-500/[0.02]';
      case 3: return 'bg-orange-500/[0.02]';
      default: return '';
    }
  };

  return (
    <div>
      <PageHeader
        title="Monthly Utilization"
        description="Detailed resource utilization based on service categories"
        actions={
          records.length > 0 ? (
            <Button variant="outline" size="sm" onClick={() => exportToExcel(records, columns, month, year)}>
              <Download className="mr-1.5 h-4 w-4" />
              Export Excel
            </Button>
          ) : null
        }
      />

      {/* ── Filters ── */}
      <div className="mb-5 flex flex-wrap items-end gap-4 w-full">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium">Month <span className="text-destructive">*</span></Label>
          <Select value={month} onValueChange={handleMonthChange}>
            <SelectTrigger className="h-9 text-sm w-36">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium">Year <span className="text-destructive">*</span></Label>
          <Select value={year} onValueChange={(v) => { setYear(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm w-24">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <Label className="text-xs font-medium">Employee</Label>
          <Select value={employeeId} onValueChange={(v) => { setEmployeeId(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm w-full">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {activeEmployees.map((e) => (
                <SelectItem key={e.id} value={String(e.id)}>{e.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <Label className="text-xs font-medium">Search Employee</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Name…"
              value={search}
              onChange={handleSearchChange}
              className="h-9 pl-8 sm: text-sm w-full"
              disabled={!enabled}
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
            {summary.total_utilization != null && (
              <div className="rounded-md border bg-blue-500/10 px-3 py-1.5 text-xs text-blue-700 dark:text-blue-400">
                Total Utilization&nbsp;
                <span className="font-semibold tabular-nums">{Number(summary.total_utilization).toFixed(1)} hrs</span>
              </div>
            )}
            {summary.leaves_hours != null && (
              <div className="rounded-md border bg-muted/40 px-3 py-1.5 text-xs">
                Leaves&nbsp;
                <span className="font-semibold tabular-nums">{Number(summary.leaves_hours).toFixed(1)} hrs</span>
              </div>
            )}
          </div>

          {/* ── Table ── */}
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-auto max-h-[50vh]">
              <table className="min-w-max w-full border-collapse text-sm">
                <thead className="sticky top-0 z-20 bg-background">
                  <tr className="border-b bg-muted/60">
                    <th colSpan={2} className="sticky left-0 z-30 bg-muted" />
                    <th colSpan={7} className="border-r border-border" />
                    {columns.map(cat => (
                      <th 
                        key={cat.category_id} 
                        colSpan={cat.service_types.length} 
                        className={cn('px-3 py-1.5 text-center text-xs font-semibold border-r border-border', getCategoryColorClass(cat.category_id))}
                      >
                        {cat.category_name}
                      </th>
                    ))}
                    <th colSpan={3} className="px-3 py-1.5 text-center text-xs font-semibold bg-primary/10 text-primary">
                      Summary
                    </th>
                  </tr>

                  <tr className="border-b bg-muted/40">
                    <th className={th('sticky left-0 z-30 bg-muted w-[50px] text-center')}>#</th>
                    <th className={th('sticky left-[50px] z-30 bg-muted border-r border-border shadow-[1px_0_0_0_var(--border)] w-[220px] min-w-[220px] max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap')}>Name</th>
                    <th className={th('min-w-[160px]')}>Designation</th>
                    <th className={th('w-[90px] text-right')}>Total Exp</th>
                    <th className={th('w-[90px] text-right')}>Co. Exp</th>
                    <th className={th('min-w-[150px]')}>Resource Description</th>
                    <th className={th('w-[100px] text-right')}>Cap. (hrs)</th>
                    <th className={th('w-[100px] text-right')}>Bill. Cap.</th>
                    <th className={th('min-w-[180px]')}>Client(s)</th>
                    
                    {columns.map(cat => 
                      cat.service_types.map(st => (
                        <th key={st.id} className={th('w-[110px] text-right', getCellColorClass(cat.category_id))}>
                          {st.name}
                        </th>
                      ))
                    )}
                    
                    <th className={th('w-[120px] text-right bg-primary/[0.04] font-bold')}>Billable (hrs)</th>
                    <th className={th('w-[120px] text-right bg-primary/[0.04] font-bold')}>Non-Bill. (hrs)</th>
                    <th className={th('w-[150px] text-right bg-primary/[0.04] font-bold border-r-0')}>Total Utilization</th>
                  </tr>
                </thead>

                <tbody className="divide-y divide-border">
                  {records.map((row, i) => (
                    <tr key={row.employee_id ?? i} className="group hover:bg-muted/30 transition-colors">
                      <td className={td('sticky left-0 z-10 bg-background group-hover:bg-slate-50 dark:group-hover:bg-slate-800/80 w-[50px] text-center text-muted-foreground transition-colors')}>
                        {((meta.page ?? page) - 1) * (meta.limit ?? limit) + i + 1}
                      </td>
                      <td className={td('sticky left-[50px] z-10 bg-background border-r border-border shadow-[1px_0_0_0_var(--border)] group-hover:bg-slate-50 dark:group-hover:bg-slate-800/80 transition-colors w-[220px] min-w-[220px] max-w-[220px] overflow-hidden text-ellipsis whitespace-nowrap')}>
                        <p className="font-medium">{row.full_name ?? '—'}</p>
                        {row.employee_code && (
                          <p className="text-[10px] text-muted-foreground font-mono">{row.employee_code}</p>
                        )}
                      </td>
                      <td className={td()}>{row.designation || <span className="text-muted-foreground">—</span>}</td>
                      <td className={td('text-right tabular-nums')}>{row.total_experience ?? '—'}</td>
                      <td className={td('text-right tabular-nums')}>{row.company_experience ?? '—'}</td>
                      <td className={td('truncate max-w-[150px]')} title={row.resource_description}>{row.resource_description || <span className="text-muted-foreground">—</span>}</td>
                      <td className={td('text-right tabular-nums')}>{row.monthly_capacity ?? '—'}</td>
                      <td className={td('text-right tabular-nums')}>{row.monthly_billing_capacity ?? '—'}</td>
                      <td className={td('max-w-[200px] truncate')} title={row.clients}>{row.clients || <span className="text-muted-foreground">—</span>}</td>
                      
                      {columns.map(cat => 
                        cat.service_types.map(st => (
                          <td key={st.id} className={td('text-right', getCellColorClass(cat.category_id))}>
                            <HoursCell value={row.hours?.[st.id]} />
                          </td>
                        ))
                      )}

                      <td className={td('text-right font-semibold bg-primary/[0.02]')}>
                        <HoursCell value={row.billable_total} />
                      </td>
                      <td className={td('text-right font-semibold bg-primary/[0.02]')}>
                        <HoursCell value={row.non_billable_total} />
                      </td>
                      <td className={td('text-right font-semibold bg-primary/[0.02] border-r-0')}>
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
              {(meta.totalPages ?? 1) > 1 && (
                <div className="flex items-center gap-1">
                  <Button
                    variant="outline" size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={!meta.hasPrevPage}
                    onClick={() => setPage((p) => Math.max(1, p - 1))}
                  >
                    Previous
                  </Button>
                  <span className="text-xs text-muted-foreground px-1">
                    {meta.page ?? page} / {meta.totalPages}
                  </span>
                  <Button
                    variant="outline" size="sm"
                    className="h-7 px-2 text-xs"
                    disabled={!meta.hasNextPage}
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

export default MonthlyResourceUtilization;
