import { useState } from 'react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  PieChart, Pie, Cell, ResponsiveContainer, Legend,
} from 'recharts';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/common/EmptyState';
import { Users, Calendar, Coffee, ShieldAlert, CheckCircle2, LayoutGrid, List, ChevronLeft, ChevronRight, BarChart2 } from 'lucide-react';
import { cn } from '@/utils/cn';

/* ── colour palette (hex — safe in recharts) ── */
const C = {
  billable : '#6366f1',
  leaves   : '#ef4444',
  idle     : '#f97316',
};

/* ── tier helper ── */
const getTier = (pct) => {
  if (pct >= 90) return { label: 'Healthy',  color: '#10b981', text: 'text-emerald-600 dark:text-emerald-400' };
  if (pct >= 75) return { label: 'Good',     color: '#6366f1', text: 'text-primary' };
  if (pct >= 60) return { label: 'At Risk',  color: '#f59e0b', text: 'text-amber-500' };
  return          { label: 'Critical', color: '#ef4444', text: 'text-red-500' };
};

const trunc = (str) => str;

/* ── custom tooltips ── */
const BarTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const { fullName, billablePct } = payload[0].payload;
  const tier = getTier(billablePct);
  return (
    <div className="rounded-lg border bg-popover p-2.5 shadow-md text-xs space-y-1 min-w-[150px]">
      <p className="font-semibold text-foreground leading-tight">{fullName}</p>
      <p className={cn('text-xs font-bold mb-1', tier.text)}>{billablePct?.toFixed(1)}% billable</p>
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-2">
          <span className="h-2 w-2 rounded-full shrink-0" style={{ background: p.fill }} />
          <span className="text-muted-foreground">{p.name}:</span>
          <span className="font-medium tabular-nums">{p.value}h</span>
        </div>
      ))}
    </div>
  );
};

const PieTip = ({ active, payload }) => {
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  const name    = entry.name;
  const value   = entry.value;
  const percent = entry.percent ?? entry.payload?.percent;
  const pctStr  = percent != null ? (percent * 100).toFixed(1) : null;
  return (
    <div className="rounded-lg border bg-popover p-2.5 shadow-md text-xs">
      <p className="font-semibold">{name}</p>
      <p className="text-muted-foreground">
        {value}h{pctStr ? ` · ${pctStr}%` : ''}
      </p>
    </div>
  );
};

/* ── sub-components ── */
const Stat = ({ label, value, icon: Icon, cardBg, borderColor, iconBg, iconColor, valueColor, subtext }) => (
  <div className={cn('flex items-center gap-2.5 rounded-lg border px-3 py-2', cardBg, borderColor)}>
    <div className={cn('flex h-8 w-8 items-center justify-center rounded-lg shrink-0', iconBg)}>
      <Icon className={cn('h-4 w-4', iconColor)} />
    </div>
    <div className="min-w-0">
      <p className={cn('text-base font-extrabold tabular-nums leading-none', valueColor)}>{value}</p>
      <p className="text-[10px] font-semibold uppercase tracking-wider text-muted-foreground mt-1 leading-none">{label}</p>
      {subtext && <p className="text-[9px] text-muted-foreground/60 mt-0.5 leading-none">{subtext}</p>}
    </div>
  </div>
);

const TierRow = ({ label, count, color }) => (
  <div className="flex items-center justify-between py-2 text-xs">
    <div className="flex items-center gap-1.5">
      <span className="h-2.5 w-2.5 rounded-full shrink-0" style={{ background: color }} />
      <span className="text-muted-foreground">{label}</span>
    </div>
    <span className="font-bold tabular-nums text-foreground">{count}</span>
  </div>
);

const NBBadge = ({ name, hours, type }) => (
  <span className={cn(
    'inline-flex items-center gap-1 rounded px-1.5 py-0.5 text-[10px] font-medium leading-none',
    type === 'Leaves'
      ? 'bg-red-500/10 text-red-700 dark:text-red-400'
      : 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
  )}>
    {name}: {hours}h
  </span>
);

/* ── main component ── */
const BillableAnalyticsPanel = ({ data = [], meta = {}, isLoading, month, year, page = 1, onPageChange }) => {
  const [view, setView] = useState('charts');

  const monthLabel = month && year
    ? new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })
    : 'This Month';

  const records = data.filter((r) => r.total_hours > 0);

  /* ── totals ── */
  const totalBillable    = records.reduce((s, r) => s + (r.billable_hours     || 0), 0);
  const totalHours       = records.reduce((s, r) => s + (r.total_hours        || 0), 0);
  const overallPct       = totalHours > 0 ? (totalBillable / totalHours) * 100 : 0;

  let totalLeaves = 0, totalIdle = 0;
  records.forEach((r) =>
    (r.non_billable_reasons ?? []).forEach((nb) => {
      if (nb.service_type_name === 'Leaves') totalLeaves += nb.hours;
      else totalIdle += nb.hours;
    })
  );

  /* ── tier counts ── */
  const tiers = { Healthy: 0, Good: 0, 'At Risk': 0, Critical: 0 };
  records.forEach((r) => { tiers[getTier(r.billable_pct || 0).label]++; });
  const atRiskCount = tiers['At Risk'] + tiers['Critical'];

  /* ── bar chart data ── */
  const sortedRecords = [...records]
    .sort((a, b) => (b.non_billable_hours || 0) - (a.non_billable_hours || 0));

  const barData = sortedRecords.map((r) => {
      let leaves = 0, idle = 0;
      (r.non_billable_reasons ?? []).forEach((nb) => {
        if (nb.service_type_name === 'Leaves') leaves += nb.hours;
        else idle += nb.hours;
      });
      return {
        name       : trunc(r.full_name),
        fullName   : r.full_name,
        Billable   : r.billable_hours || 0,
        Leaves     : leaves,
        Idle       : idle,
        billablePct: r.billable_pct   || 0,
      };
    });

  /* ── donut data ── */
  const pieData = [
    { name: 'Billable', value: totalBillable, fill: C.billable },
    { name: 'Leaves',   value: totalLeaves,   fill: C.leaves   },
    { name: 'Idle',     value: totalIdle,     fill: C.idle     },
  ].filter((d) => d.value > 0);

  const barChartHeight = Math.max(280, barData.length * 38);

  const th = 'px-3 py-2.5 text-left text-xs font-semibold text-muted-foreground whitespace-nowrap';
  const td = 'px-3 py-2.5 text-xs align-middle';

  const effTier = getTier(overallPct);

  return (
    <Card className="overflow-hidden">
      {/* ── Header ── */}
      <div className="px-5 pt-4 pb-3 border-b bg-gradient-to-r from-primary/[0.04] via-primary/[0.02] to-transparent">
        <div className="flex items-center justify-between gap-3 flex-wrap">
          <div className="flex items-center gap-3 min-w-0">
            <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-primary/10 shrink-0">
              <BarChart2 className="h-4 w-4 text-primary" />
            </div>
            <div className="min-w-0">
              <p className="text-sm font-bold text-foreground leading-none">Billable Analytics</p>
              <p className="text-xs text-muted-foreground mt-1 leading-none">Billable vs non-billable per employee · {monthLabel}</p>
            </div>
          </div>

          {/* View toggle */}
          <div className="flex rounded-lg border overflow-hidden text-xs shrink-0 bg-background">
            <button
              onClick={() => setView('charts')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 transition-colors',
                view === 'charts' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'
              )}
            >
              <LayoutGrid className="h-3 w-3" /> Charts
            </button>
            <button
              onClick={() => setView('table')}
              className={cn(
                'flex items-center gap-1.5 px-3 py-1.5 border-l transition-colors',
                view === 'table' ? 'bg-primary text-primary-foreground' : 'hover:bg-muted/50 text-muted-foreground'
              )}
            >
              <List className="h-3 w-3" /> Table
            </button>
          </div>
        </div>

        {/* ── Stat cards ── */}
        {!isLoading && records.length > 0 && (
          <div className="mt-3 grid grid-cols-2 sm:grid-cols-4 gap-2">
            <Stat
              label="Billable Efficiency"
              value={`${overallPct.toFixed(1)}%`}
              icon={CheckCircle2}
              cardBg={overallPct >= 75 ? 'bg-emerald-50 dark:bg-emerald-950/30' : 'bg-red-50 dark:bg-red-950/30'}
              borderColor={overallPct >= 75 ? 'border-emerald-200 dark:border-emerald-800' : 'border-red-200 dark:border-red-800'}
              iconBg={overallPct >= 75 ? 'bg-emerald-100 dark:bg-emerald-900/50' : 'bg-red-100 dark:bg-red-900/50'}
              iconColor={overallPct >= 75 ? 'text-emerald-600 dark:text-emerald-400' : 'text-red-500'}
              valueColor={effTier.text}
              subtext={`${totalBillable}h of ${totalHours}h`}
            />
            <Stat
              label="Leave Hours"
              value={`${totalLeaves}h`}
              icon={Calendar}
              cardBg="bg-red-50 dark:bg-red-950/30"
              borderColor="border-red-200 dark:border-red-800"
              iconBg="bg-red-100 dark:bg-red-900/50"
              iconColor="text-red-500 dark:text-red-400"
              valueColor="text-red-600 dark:text-red-400"
              subtext={totalHours > 0 ? `${((totalLeaves / totalHours) * 100).toFixed(1)}% of total` : undefined}
            />
            <Stat
              label="Idle Hours"
              value={`${totalIdle}h`}
              icon={Coffee}
              cardBg="bg-orange-50 dark:bg-orange-950/30"
              borderColor="border-orange-200 dark:border-orange-800"
              iconBg="bg-orange-100 dark:bg-orange-900/50"
              iconColor="text-orange-500 dark:text-orange-400"
              valueColor="text-orange-600 dark:text-orange-400"
              subtext={totalHours > 0 ? `${((totalIdle / totalHours) * 100).toFixed(1)}% of total` : undefined}
            />
            <Stat
              label="At-Risk Employees"
              value={atRiskCount}
              icon={ShieldAlert}
              cardBg={atRiskCount > 0 ? 'bg-red-50 dark:bg-red-950/30' : 'bg-emerald-50 dark:bg-emerald-950/30'}
              borderColor={atRiskCount > 0 ? 'border-red-200 dark:border-red-800' : 'border-emerald-200 dark:border-emerald-800'}
              iconBg={atRiskCount > 0 ? 'bg-red-100 dark:bg-red-900/50' : 'bg-emerald-100 dark:bg-emerald-900/50'}
              iconColor={atRiskCount > 0 ? 'text-red-500' : 'text-emerald-600 dark:text-emerald-400'}
              valueColor={atRiskCount > 0 ? 'text-red-600 dark:text-red-400' : 'text-emerald-700 dark:text-emerald-300'}
              subtext="below 75% billable"
            />
          </div>
        )}
      </div>

      <CardContent className="pt-4">
        {/* ── Loading ── */}
        {isLoading && (
          <div className="space-y-3">
            <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
              {[...Array(4)].map((_, i) => <Skeleton key={i} className="h-16 rounded-xl" />)}
            </div>
            <Skeleton className="h-72 rounded-lg" />
          </div>
        )}

        {/* ── Empty ── */}
        {!isLoading && records.length === 0 && (
          <EmptyState
            icon={Users}
            title="No data for this period"
            description="Employee breakdown will appear once timesheets are submitted."
          />
        )}

        {!isLoading && records.length > 0 && (
          <>

            {/* ── CHARTS VIEW ── */}
            {view === 'charts' && (
              <div className="grid grid-cols-1 lg:grid-cols-3 gap-5">
                {/* Horizontal stacked bar chart */}
                <div className="lg:col-span-2">
                  <p className="text-xs font-semibold text-foreground mb-3">
                    Hours by Employee
                    <span className="ml-1.5 text-muted-foreground font-normal">sorted by non-billable</span>
                  </p>
                  <ResponsiveContainer width="100%" height={barChartHeight}>
                    <BarChart
                      data={barData}
                      layout="vertical"
                      margin={{ top: 0, right: 12, left: 0, bottom: 24 }}
                    >
                      <CartesianGrid strokeDasharray="3 3" horizontal={false} stroke="hsl(var(--border))" />
                      <XAxis
                        type="number"
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                        tickFormatter={(v) => `${v}h`}
                      />
                      <YAxis
                        type="category"
                        dataKey="name"
                        width={180}
                        tick={{ fontSize: 10, fill: 'hsl(var(--muted-foreground))' }}
                        tickLine={false}
                        axisLine={false}
                      />
                      <Tooltip content={<BarTip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
                      <Legend
                        iconType="circle"
                        iconSize={8}
                        wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                      />
                      <Bar dataKey="Billable" stackId="a" fill={C.billable} radius={[0, 0, 0, 0]} maxBarSize={22} />
                      <Bar dataKey="Leaves"   stackId="a" fill={C.leaves}   radius={[0, 0, 0, 0]} maxBarSize={22} />
                      <Bar dataKey="Idle"     stackId="a" fill={C.idle}     radius={[0, 4, 4, 0]} maxBarSize={22} />
                    </BarChart>
                  </ResponsiveContainer>
                </div>

                {/* Right column: donut + tier table */}
                <div className="flex flex-col gap-5">
                  {/* Donut */}
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">Hours Breakdown</p>
                    <div className="relative" style={{ height: 190 }}>
                      <ResponsiveContainer width="100%" height="100%">
                        <PieChart>
                          <Pie
                            data={pieData}
                            cx="50%"
                            cy="50%"
                            innerRadius={52}
                            outerRadius={78}
                            paddingAngle={2}
                            dataKey="value"
                          >
                            {pieData.map((entry) => (
                              <Cell key={entry.name} fill={entry.fill} />
                            ))}
                          </Pie>
                          <Tooltip content={<PieTip />} />
                        </PieChart>
                      </ResponsiveContainer>
                      {/* Center label */}
                      <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                        <span className={cn('text-xl font-bold tabular-nums', getTier(overallPct).text)}>
                          {overallPct.toFixed(1)}%
                        </span>
                        <span className="text-[10px] text-muted-foreground">Billable</span>
                      </div>
                    </div>
                    {/* Donut legend */}
                    <div className="flex flex-wrap justify-center gap-x-3 gap-y-1 mt-1">
                      {pieData.map((d) => (
                        <div key={d.name} className="flex items-center gap-1 text-[10px] text-muted-foreground">
                          <span className="h-2 w-2 rounded-full inline-block shrink-0" style={{ background: d.fill }} />
                          {d.name}: {d.value}h
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tier breakdown */}
                  <div>
                    <p className="text-xs font-semibold text-foreground mb-2">Employee Health Tiers</p>
                    <div className="rounded-md border px-3 divide-y divide-border">
                      <TierRow label="Healthy (≥ 90%)"   count={tiers['Healthy']}  color="#10b981" />
                      <TierRow label="Good (75 – 89%)"   count={tiers['Good']}     color={C.billable} />
                      <TierRow label="At Risk (60 – 74%)" count={tiers['At Risk']} color="#f59e0b" />
                      <TierRow label="Critical (< 60%)"  count={tiers['Critical']} color="#ef4444" />
                    </div>
                    <p className="mt-2 text-[10px] text-muted-foreground">
                      Showing {((page - 1) * (meta.limit ?? 10)) + 1}–{Math.min(page * (meta.limit ?? 10), meta.total ?? records.length)} of {meta.total ?? records.length} employees
                    </p>
                    {meta.totalPages > 1 && (
                      <div className="mt-2 flex items-center justify-between gap-2">
                        <button
                          onClick={() => onPageChange?.(page - 1)}
                          disabled={!meta.hasPrev}
                          className="flex items-center gap-1 rounded border px-2 py-1 text-[10px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/50"
                        >
                          <ChevronLeft className="h-2.5 w-2.5" /> Prev
                        </button>
                        <span className="text-[10px] text-muted-foreground tabular-nums">
                          {page} / {meta.totalPages}
                        </span>
                        <button
                          onClick={() => onPageChange?.(page + 1)}
                          disabled={!meta.hasNext}
                          className="flex items-center gap-1 rounded border px-2 py-1 text-[10px] transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/50"
                        >
                          Next <ChevronRight className="h-2.5 w-2.5" />
                        </button>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            )}

            {/* ── TABLE VIEW ── */}
            {view === 'table' && (
              <>
                <div className="rounded-md border overflow-hidden">
                  <div className="overflow-x-auto">
                    <table className="w-full border-collapse text-sm">
                      <thead className="bg-muted/50 border-b">
                        <tr>
                          <th className={cn(th, 'w-8 text-center')}>#</th>
                          <th className={cn(th, 'min-w-[160px]')}>Employee</th>
                          <th className={cn(th, 'min-w-[140px]')}>Billable %</th>
                          <th className={cn(th, 'min-w-[170px]')}>Top Billable Projects</th>
                          <th className={cn(th, 'min-w-[160px]')}>Non-Billable Reasons</th>
                          <th className={cn(th, 'text-right')}>Total</th>
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-border">
                        {sortedRecords.map((row, idx) => {
                          const pct    = row.billable_pct || 0;
                          const tier   = getTier(pct);
                          const topB   = (row.billable_reasons ?? []).filter((r) => r.hours > 0).slice(0, 2);
                          const nbR    = (row.non_billable_reasons ?? []).filter((r) => r.hours > 0);
                          const offset = ((meta.page ?? 1) - 1) * (meta.limit ?? 10);

                          return (
                            <tr key={row.employee_id} className="hover:bg-muted/30 transition-colors">
                              <td className={cn(td, 'text-center text-muted-foreground w-8')}>{offset + idx + 1}</td>
                              <td className={td}>
                                <p className="font-medium text-foreground leading-tight">{row.full_name}</p>
                                <p className="text-[10px] text-muted-foreground mt-0.5">
                                  {row.employee_code} · {row.designation}
                                </p>
                              </td>
                              <td className={td}>
                                <div className="flex items-center gap-2">
                                  <div className="flex-1 h-1.5 rounded-full bg-muted overflow-hidden min-w-[60px]">
                                    <div
                                      className="h-full rounded-full"
                                      style={{ width: `${Math.min(pct, 100)}%`, background: tier.color }}
                                    />
                                  </div>
                                  <span className={cn('tabular-nums font-semibold text-xs w-[42px] text-right', tier.text)}>
                                    {pct.toFixed(1)}%
                                  </span>
                                </div>
                                <p className="text-[10px] text-muted-foreground mt-0.5 tabular-nums">
                                  {row.billable_hours}h / {row.total_hours}h
                                </p>
                              </td>
                              <td className={td}>
                                {topB.length > 0 ? (
                                  <div className="flex flex-col gap-0.5">
                                    {topB.map((r) => (
                                      <span key={r.service_po_id} className="inline-flex items-center gap-1 text-[10px] text-foreground">
                                        <span className="inline-block h-1.5 w-1.5 rounded-full shrink-0" style={{ background: C.billable }} />
                                        <span className="truncate max-w-[130px]" title={r.service_po_name}>{r.service_po_name}</span>
                                        <span className="text-muted-foreground shrink-0">{r.hours}h</span>
                                      </span>
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-muted-foreground/40">—</span>
                                )}
                              </td>
                              <td className={td}>
                                {nbR.length > 0 ? (
                                  <div className="flex flex-wrap gap-1">
                                    {nbR.map((r) => (
                                      <NBBadge key={r.service_po_id} name={r.service_po_name} hours={r.hours} type={r.service_type_name} />
                                    ))}
                                  </div>
                                ) : (
                                  <span className="text-[10px] text-emerald-600 font-medium">Fully billable</span>
                                )}
                              </td>
                              <td className={cn(td, 'text-right tabular-nums font-medium')}>{row.total_hours}h</td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  </div>
                </div>
                <div className="mt-3 flex items-center justify-between gap-3">
                  <p className="text-xs text-muted-foreground">
                    Showing {((page - 1) * (meta.limit ?? 10)) + 1}–{Math.min(page * (meta.limit ?? 10), meta.total ?? records.length)} of {meta.total ?? records.length} employees
                  </p>
                  {meta.totalPages > 1 && (
                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => onPageChange?.(page - 1)}
                        disabled={!meta.hasPrev}
                        className="flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/50"
                      >
                        <ChevronLeft className="h-3 w-3" /> Prev
                      </button>
                      <span className="text-xs text-muted-foreground tabular-nums">
                        {page} / {meta.totalPages}
                      </span>
                      <button
                        onClick={() => onPageChange?.(page + 1)}
                        disabled={!meta.hasNext}
                        className="flex items-center gap-1 rounded border px-2 py-1 text-xs transition-colors disabled:opacity-40 disabled:cursor-not-allowed hover:bg-muted/50"
                      >
                        Next <ChevronRight className="h-3 w-3" />
                      </button>
                    </div>
                  )}
                </div>
              </>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default BillableAnalyticsPanel;
