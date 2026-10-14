import { useState, useMemo } from 'react';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/common/EmptyState';
import {
  Landmark, ChevronLeft, ChevronRight,
  AlertTriangle, BarChart2, Users, Building2,
} from 'lucide-react';
import { formatHours, formatPercentage } from '@/utils/formatters';

const PAGE_SIZE = 10;

const TIERS = [
  { min: 80,  color: '#22c55e', label: 'Healthy',     dot: 'bg-emerald-500', badge: 'bg-emerald-50  text-emerald-700 border-emerald-200 dark:bg-emerald-900/30 dark:text-emerald-400 dark:border-emerald-800' },
  { min: 60,  color: '#3b82f6', label: 'Moderate',    dot: 'bg-blue-500',    badge: 'bg-blue-50     text-blue-700    border-blue-200    dark:bg-blue-900/30    dark:text-blue-400    dark:border-blue-800'    },
  { min: 30,  color: '#f59e0b', label: 'Low',         dot: 'bg-amber-500',   badge: 'bg-amber-50    text-amber-700   border-amber-200   dark:bg-amber-900/30   dark:text-amber-400   dark:border-amber-800'   },
  { min: 0.1, color: '#ef4444', label: 'Critical',    dot: 'bg-red-500',     badge: 'bg-red-50      text-red-700     border-red-200     dark:bg-red-900/30     dark:text-red-400     dark:border-red-800'     },
  { min: 0,   color: '#94a3b8', label: 'No Activity', dot: 'bg-slate-400',   badge: 'bg-slate-50    text-slate-500   border-slate-200   dark:bg-slate-800      dark:text-slate-400   dark:border-slate-700'   },
];

const getTier = (pct) => TIERS.find((t) => pct >= t.min) ?? TIERS[TIERS.length - 1];

// Mini KPI card used in the summary strip
const KpiCard = ({ icon: Icon, iconBg, label, value, valueColor }) => (
  <div className="flex items-center gap-2 rounded-lg border border-border bg-card px-3 py-2 min-w-[100px]">
    <span className={`flex h-6 w-6 shrink-0 items-center justify-center rounded-md ${iconBg}`}>
      <Icon className="h-3 w-3 text-white" />
    </span>
    <div className="min-w-0">
      <p className="text-[9px] font-medium text-muted-foreground leading-tight">{label}</p>
      <p className={`text-sm font-bold leading-tight tabular-nums ${valueColor ?? 'text-foreground'}`}>{value}</p>
    </div>
  </div>
);

const BuWiseUtilizationChart = ({ data = [], summary, isLoading, periodLabel }) => {
  const [page, setPage] = useState(1);

  const sorted = useMemo(
    () => [...data].sort((a, b) => (b.utilization_percentage ?? 0) - (a.utilization_percentage ?? 0)),
    [data],
  );
  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const pageData = sorted.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE);

  const criticalCount = useMemo(
    () => data.filter((bu) => (bu.total_employees ?? 0) > 0 && (bu.utilization_percentage ?? 0) < 30).length,
    [data],
  );
  const totalEmployees = useMemo(
    () => data.reduce((sum, bu) => sum + (bu.total_employees ?? 0), 0),
    [data],
  );
  const overallUtil  = summary?.utilization_percentage ?? summary?.utilizationPercentage;
  const totalBuCount = summary?.bu_count ?? data.length;

  // ── Loading skeleton ──────────────────────────────────────────────────────
  if (isLoading) {
    return (
      <Card className="flex flex-col h-full">
        <CardContent className="flex-1 p-5 flex flex-col gap-4">
          <div className="flex items-start justify-between gap-4">
            <div className="space-y-1.5">
              <Skeleton className="h-5 w-44" />
              <Skeleton className="h-3 w-60" />
              <Skeleton className="h-3 w-48 mt-1" />
            </div>
            <div className="flex gap-2">
              {[120, 120, 150, 130].map((w, i) => <Skeleton key={i} className="h-16 rounded-xl" style={{ width: w }} />)}
            </div>
          </div>
          <Skeleton className="h-7 w-full rounded" />
          {Array.from({ length: 7 }).map((_, i) => <Skeleton key={i} className="h-11 w-full rounded" />)}
        </CardContent>
      </Card>
    );
  }

  // ── Main render ───────────────────────────────────────────────────────────
  return (
    <Card className="flex flex-col h-full overflow-hidden">
      <CardContent className="flex-1 flex flex-col p-5 gap-4 min-h-0">

        {/* ── Top: title + legend  ⟷  KPI strip ── */}
        <div className="flex items-start justify-between gap-4 flex-wrap">
          {/* Left: title + subtitle + legend */}
          <div>
            <h2 className="text-lg font-bold leading-tight text-foreground">BU-wise Utilization</h2>
            <p className="text-[11px] text-muted-foreground mt-0.5">
              Expected vs Logged hours &nbsp;·&nbsp; {periodLabel}
            </p>
            <div className="mt-2 flex flex-wrap gap-x-3 gap-y-1">
              {TIERS.map(({ dot, label }) => (
                <span key={label} className="inline-flex items-center gap-1 text-[10px] text-muted-foreground">
                  <span className={`h-2 w-2 rounded-full ${dot}`} />
                  {label}
                </span>
              ))}
            </div>
          </div>

          {/* Right: KPI cards */}
          {data.length > 0 && (
            <div className="flex flex-wrap gap-2 shrink-0">
              <KpiCard
                icon={Building2}
                iconBg="bg-blue-500"
                label="Total BUs"
                value={totalBuCount}
              />
              <KpiCard
                icon={AlertTriangle}
                iconBg="bg-red-500"
                label="Critical BUs"
                value={criticalCount}
                valueColor={criticalCount > 0 ? 'text-red-600 dark:text-red-400' : undefined}
              />
              <KpiCard
                icon={BarChart2}
                iconBg="bg-emerald-500"
                label="Average Utilization"
                value={overallUtil != null ? formatPercentage(overallUtil, 1) : '—'}
              />
              <KpiCard
                icon={Users}
                iconBg="bg-violet-500"
                label="Total Employees"
                value={totalEmployees}
              />
            </div>
          )}
        </div>

        {/* ── Table ── */}
        {data.length === 0 ? (
          <EmptyState
            icon={Landmark}
            title="No BU utilization data"
            description="BU-wise utilization will appear once timesheets are processed."
            className="py-10"
          />
        ) : (
          <div className="flex-1 flex flex-col min-h-0 overflow-auto">
            <table className="w-full border-collapse text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/40">
                  <th className="py-2 pl-3 pr-4 text-left text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                    Business Unit
                  </th>
                  <th className="py-2 px-4 text-left text-[11px] font-semibold text-muted-foreground w-[260px]">
                    Utilization
                  </th>
                  <th className="py-2 px-3 text-left text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                    Status
                  </th>
                  <th className="py-2 px-3 text-right text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                    Utilization %
                  </th>
                  <th className="py-2 px-3 text-right text-[11px] font-semibold text-muted-foreground">
                    Employees
                  </th>
                  <th className="py-2 px-3 text-right text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                    Logged Hours
                  </th>
                  <th className="py-2 px-3 text-right text-[11px] font-semibold text-muted-foreground whitespace-nowrap">
                    Expected Hours
                  </th>
                </tr>
              </thead>

              <tbody className="divide-y divide-border/50">
                {pageData.map((bu) => {
                  const rawPct = bu.utilization_percentage ?? 0;
                  const barPct = Math.min(rawPct, 100);
                  const tier   = getTier(rawPct);
                  const name   = bu.sub_bu_name ? `${bu.bu_name} › ${bu.sub_bu_name}` : bu.bu_name;

                  return (
                    <tr
                      key={bu.bu_id ?? name}
                      className="hover:bg-muted/40 transition-colors"
                    >
                      {/* Business Unit name */}
                      <td className="py-2.5 pl-3 pr-4">
                        <div className="flex items-center gap-2 min-w-0">
                          <span
                            className={`h-2.5 w-2.5 rounded-full shrink-0 ${tier.dot}`}
                          />
                          <span className="font-medium text-foreground truncate max-w-[180px]" title={name}>
                            {name}
                          </span>
                        </div>
                      </td>

                      {/* Progress bar + inline % */}
                      <td className="py-2.5 px-4 w-[260px]">
                        <div className="flex items-center gap-2.5">
                          <div className="flex-1 h-2 rounded-full bg-muted overflow-hidden">
                            <div
                              className="h-full rounded-full transition-[width] duration-500 ease-out"
                              style={{ width: `${barPct}%`, background: tier.color }}
                            />
                          </div>
                          <span
                            className="w-10 shrink-0 text-right text-xs font-semibold tabular-nums"
                            style={{ color: tier.color }}
                          >
                            {formatPercentage(rawPct, 1)}
                          </span>
                        </div>
                      </td>

                      {/* Status badge */}
                      <td className="py-2.5 px-3">
                        <span className={`inline-flex items-center justify-center rounded border w-24 py-0.5 text-[10px] font-semibold ${tier.badge}`}>
                          {tier.label}
                        </span>
                      </td>

                      {/* Utilization % (numeric) */}
                      <td className="py-2.5 px-3 text-right tabular-nums text-sm font-medium text-muted-foreground">
                        {formatPercentage(rawPct, 1)}
                      </td>

                      {/* Employees */}
                      <td className="py-2.5 px-3 text-right tabular-nums text-sm text-muted-foreground">
                        {bu.total_employees ?? 0}
                      </td>

                      {/* Logged Hours */}
                      <td className="py-2.5 px-3 text-right tabular-nums text-sm text-muted-foreground">
                        {formatHours(bu.total_logged_hours)}&thinsp;h
                      </td>

                      {/* Expected Hours */}
                      <td className="py-2.5 px-3 text-right tabular-nums text-sm text-muted-foreground">
                        {formatHours(bu.expected_hours)}&thinsp;h
                      </td>

                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}

        {/* ── Pagination ── */}
        {totalPages > 1 && (
          <div className="pt-2 border-t border-border/50 flex items-center justify-between text-[11px] text-muted-foreground shrink-0">
            <span className="tabular-nums">
              {(page - 1) * PAGE_SIZE + 1}–{Math.min(page * PAGE_SIZE, sorted.length)} of {sorted.length} BUs
            </span>
            <div className="flex items-center gap-1">
              <button
                onClick={() => setPage((p) => p - 1)}
                disabled={page <= 1}
                className="flex items-center gap-0.5 rounded border border-border px-2 py-1 hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                <ChevronLeft className="h-3 w-3" /> Prev
              </button>
              <span className="tabular-nums px-1.5">{page}/{totalPages}</span>
              <button
                onClick={() => setPage((p) => p + 1)}
                disabled={page >= totalPages}
                className="flex items-center gap-0.5 rounded border border-border px-2 py-1 hover:bg-muted transition-colors disabled:opacity-40 disabled:cursor-not-allowed"
              >
                Next <ChevronRight className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}

      </CardContent>
    </Card>
  );
};

export default BuWiseUtilizationChart;
