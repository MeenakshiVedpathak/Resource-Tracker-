import { useState } from 'react';
import * as XLSX from 'xlsx';
import { Download, Search } from 'lucide-react';
import { useMonthlyUtilization } from '@/hooks/useReports';
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

// Non-billable hour columns
const NON_BILLABLE_COLS = [
  { key: 'internal_support_hours', label: 'Internal Support' },
  { key: 'team_management_hours',  label: 'Team Mgmt.' },
];

// Leave & other columns
const OTHER_COLS = [
  { key: 'leaves_hours', label: 'Leaves' },
  { key: 'lnd_hours',    label: 'L&D' },
  { key: 'others_hours', label: 'Others' },
];

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

const exportToExcel = (records, month, year) => {
  const monthLabel = MONTH_OPTIONS.find((m) => m.value === String(month))?.label ?? month;

  const header = [
    'Sr. No.', 'Name', 'Designation', 'Total Exp', 'Co. Exp',
    'Monthly Cap (hrs)', 'Billing Cap (hrs)', 'Client(s)',
    'Internal Support (hrs)', 'Team Mgmt. (hrs)',
    'Leaves (hrs)', 'L&D (hrs)', 'Others (hrs)',
    'Billable Total (hrs)', 'Non-Billable Total (hrs)', 'Total Utilization excl. Leaves (hrs)',
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
    r.internal_support_hours ?? 0,
    r.team_management_hours ?? 0,
    r.leaves_hours ?? 0,
    r.lnd_hours ?? 0,
    r.others_hours ?? 0,
    r.billable_total ?? 0,
    r.non_billable_total ?? 0,
    r.total_utilization_excl_leaves_pct ?? 0,
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

// ─── component ───────────────────────────────────────────────────────────────
const MonthlyUtilization = () => {
  const [month,  setMonth]  = useState(String(new Date().getMonth() + 1));
  const [year,   setYear]   = useState(String(new Date().getFullYear()));
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const enabled = !!(month && year && Number(year) >= 2000 && Number(year) <= 2100);

  const params = enabled ? {
    month: Number(month),
    year:  Number(year),
    page,
    limit,
    ...(search.trim() && { search: search.trim() }),
  } : undefined;

  const { data, isPending } = useMonthlyUtilization(params);

  // data.data = { records: [...], summary: {...} }
  const records = Array.isArray(data?.data?.records) ? data.data.records : [];
  const meta    = data?.meta    ?? {};
  const summary = data?.data?.summary ?? {};

  const monthLabel = month ? formatMonthYear(Number(month), Number(year)) : '';

  const handleMonthChange  = (v) => { setMonth(v);        setPage(1); };
  const handleSearchChange = (e) => { setSearch(e.target.value); setPage(1); };

  // Total columns: 8 fixed + 2 non-billable + 3 other + 3 summary = 16
  return (
    <div>
      <PageHeader
        title="Monthly Utilization"
        description="Employee utilization summary for a selected month"
        actions={
          records.length > 0 ? (
            <Button variant="outline" size="sm" onClick={() => exportToExcel(records, month, year)}>
              <Download className="mr-1.5 h-4 w-4" />
              Export Excel
            </Button>
          ) : null
        }
      />

      {/* ── Filters ── */}
      <div className="mb-6 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium">Month <span className="text-destructive">*</span></Label>
          <Select value={month} onValueChange={handleMonthChange}>
            <SelectTrigger className="h-9 w-36 text-sm">
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
            <SelectTrigger className="h-9 w-24 text-sm">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium">Search Employee</Label>
          <div className="relative">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground" />
            <Input
              placeholder="Name…"
              value={search}
              onChange={handleSearchChange}
              className="h-9 pl-8 w-44 text-sm"
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

                {/* Group header row */}
                <thead className="sticky top-0 z-20 bg-background">
                  <tr className="border-b bg-muted/60">
                    <th colSpan={2} className="sticky left-0 z-30 bg-muted" />
                    <th colSpan={6} className="border-r border-border" />
                    <th colSpan={2} className="px-3 py-1.5 text-center text-xs font-semibold border-r border-border bg-orange-500/10 text-orange-700 dark:text-orange-400">
                      Non-Billable
                    </th>
                    <th colSpan={3} className="px-3 py-1.5 text-center text-xs font-semibold border-r border-border text-muted-foreground">
                      Leave &amp; Others
                    </th>
                    <th colSpan={3} className="px-3 py-1.5 text-center text-xs font-semibold bg-blue-500/10 text-blue-700 dark:text-blue-400">
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
                    {NON_BILLABLE_COLS.map((c) => (
                      <th key={c.key} className={th('w-[130px] text-right bg-orange-500/[0.04]')}>{c.label}</th>
                    ))}
                    {OTHER_COLS.map((c) => (
                      <th key={c.key} className={th('w-[90px] text-right')}>{c.label}</th>
                    ))}
                    <th className={th('w-[120px] text-right bg-blue-500/[0.04] font-bold')}>Billable (hrs)</th>
                    <th className={th('w-[120px] text-right bg-blue-500/[0.04] font-bold')}>Non-Bill. (hrs)</th>
                    <th className={th('w-[180px] text-right bg-blue-500/[0.04] font-bold border-r-0')}>Total Utilization (excl. Leaves)</th>
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
                      {/* Non-Billable */}
                      {NON_BILLABLE_COLS.map((c) => (
                        <td key={c.key} className={td('text-right bg-orange-500/[0.02]')}>
                          <HoursCell value={row[c.key]} />
                        </td>
                      ))}
                      {/* Leave & Others */}
                      {OTHER_COLS.map((c) => (
                        <td key={c.key} className={td('text-right')}>
                          <HoursCell value={row[c.key]} />
                        </td>
                      ))}
                      {/* Summary */}
                      <td className={td('text-right font-semibold bg-blue-500/[0.02]')}>
                        <HoursCell value={row.billable_total} />
                      </td>
                      <td className={td('text-right font-semibold bg-blue-500/[0.02]')}>
                        <HoursCell value={row.non_billable_total} />
                      </td>
                      <td className={td('text-right font-semibold bg-blue-500/[0.02] border-r-0')}>
                        <HoursCell value={row.total_utilization_excl_leaves_pct} />
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
            {(meta.totalPages ?? 1) > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={!meta.hasPrev}
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
                  disabled={!meta.hasNext}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
          </div>
        </>
      )}
    </div>
  );
};

export default MonthlyUtilization;
