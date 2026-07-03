import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/common/EmptyState';
import { Briefcase, Users, AlertTriangle } from 'lucide-react';
import { cn } from '@/utils/cn';

const EMP_COLORS = ['#6366f1', '#3b82f6', '#10b981', '#f59e0b', '#8b5cf6'];

/* ── Summary pill ── */
const Pill = ({ label, value, icon: Icon, colorClass, subtext }) => (
  <div className="flex items-center gap-2.5 rounded-lg border bg-muted/20 px-3 py-2.5">
    {Icon && (
      <div className={cn('rounded-md p-1.5 bg-muted/50 shrink-0', colorClass)}>
        <Icon className="h-3.5 w-3.5" />
      </div>
    )}
    <div>
      <p className="text-[10px] text-muted-foreground uppercase tracking-wide leading-none mb-0.5 whitespace-nowrap">
        {label}
      </p>
      <p className={cn('text-sm font-bold tabular-nums leading-none', colorClass)}>{value}</p>
      {subtext && <p className="text-[10px] text-muted-foreground mt-0.5 leading-none">{subtext}</p>}
    </div>
  </div>
);

/* ── PO card ── */
const POCard = ({ po, rank }) => {
  const active = (po.top_employees ?? []).filter((e) => e.hours > 0);
  const totalH = active.reduce((s, e) => s + e.hours, 0);

  return (
    <div className="rounded-xl border bg-card flex flex-col overflow-hidden hover:shadow-md transition-shadow">

      {/* ── Card header ── */}
      <div className="px-4 pt-4 pb-3 flex items-start gap-3 border-b bg-muted/20">
        {/* Rank badge */}
        <div className="h-7 w-7 rounded-full bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
          <span className="text-[11px] font-bold text-primary">{rank}</span>
        </div>

        <div className="flex-1 min-w-0">
          <p className="font-semibold text-sm leading-snug text-foreground line-clamp-2">
            {po.service_po_name}
          </p>
          <p className="text-[11px] text-muted-foreground mt-0.5 truncate">
            {po.client_name}
          </p>
        </div>

        <div className="flex flex-col items-end gap-1.5 shrink-0">
          <span className={cn(
            'text-[10px] font-semibold px-2 py-0.5 rounded-full leading-none',
            po.is_billable
              ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
              : 'bg-orange-500/10 text-orange-700 dark:text-orange-400'
          )}>
            {po.is_billable ? 'Billable' : 'Non-Billable'}
          </span>
          {totalH > 0 && (
            <span className="text-xs font-bold tabular-nums text-foreground">
              {totalH}h
            </span>
          )}
        </div>
      </div>

      {/* ── Employee list ── */}
      <div className="px-4 py-3 flex-1">
        {active.length === 0 ? (
          <p className="text-xs text-muted-foreground italic py-2">No hours logged this month</p>
        ) : (
          <div className="space-y-3">
            {active.map((e, i) => {
              const pct   = totalH > 0 ? (e.hours / totalH) * 100 : 0;
              const color = EMP_COLORS[i % EMP_COLORS.length];
              const isTop = i === 0;

              return (
                <div key={e.employee_id}>
                  {/* Name + hours row */}
                  <div className="flex items-center justify-between gap-2 mb-1.5">
                    <div className="flex items-center gap-1.5 min-w-0">
                      {isTop && (
                        <span className="text-[9px] font-bold px-1 py-px rounded bg-primary/10 text-primary leading-none shrink-0">
                          #1
                        </span>
                      )}
                      <span className={cn(
                        'text-xs leading-tight truncate',
                        isTop ? 'font-semibold text-foreground' : 'text-muted-foreground'
                      )}>
                        {e.full_name}
                      </span>
                    </div>
                    <div className="flex items-center gap-2 shrink-0">
                      <span className="text-xs font-semibold tabular-nums" style={{ color }}>
                        {e.hours}h
                      </span>
                      <span className="text-[10px] text-muted-foreground tabular-nums w-8 text-right">
                        {pct.toFixed(0)}%
                      </span>
                    </div>
                  </div>

                  {/* Individual progress bar */}
                  <div className="h-1.5 w-full rounded-full bg-muted overflow-hidden">
                    <div
                      className="h-full rounded-full transition-all duration-500"
                      style={{ width: `${pct}%`, background: color }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* ── Footer ── */}
      {active.length > 0 && (
        <div className="px-4 py-2.5 border-t bg-muted/10 flex items-center justify-between">
          <span className="text-[10px] text-muted-foreground">
            {active.length} contributor{active.length !== 1 ? 's' : ''}
            {active.length === 1 && (
              <span className="ml-1.5 text-amber-500 font-medium">· sole contributor</span>
            )}
          </span>
          <span className="text-[10px] font-mono text-muted-foreground/60">{po.service_po_code}</span>
        </div>
      )}
    </div>
  );
};

/* ── Skeleton grid ── */
const SkeletonGrid = () => (
  <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
    {Array.from({ length: 6 }).map((_, i) => (
      <div key={i} className="rounded-xl border overflow-hidden">
        <div className="px-4 pt-4 pb-3 border-b bg-muted/20 flex gap-3">
          <Skeleton className="h-7 w-7 rounded-full shrink-0" />
          <div className="flex-1 space-y-1.5">
            <Skeleton className="h-4 w-3/4" />
            <Skeleton className="h-3 w-1/2" />
          </div>
          <Skeleton className="h-5 w-16 rounded-full shrink-0" />
        </div>
        <div className="px-4 py-3 space-y-4">
          {[...Array(3)].map((__, j) => (
            <div key={j} className="space-y-1.5">
              <div className="flex justify-between gap-2">
                <Skeleton className="h-3 w-2/3" />
                <Skeleton className="h-3 w-12" />
              </div>
              <Skeleton className="h-1.5 w-full rounded-full" />
            </div>
          ))}
        </div>
      </div>
    ))}
  </div>
);

/* ── Main component ── */
const TopEmployeesByPOPanel = ({ data = [], meta = {}, isLoading, month, year }) => {
  const monthLabel = month && year
    ? new Date(year, month - 1).toLocaleString('en-IN', { month: 'long', year: 'numeric' })
    : 'This Month';

  const activePOs = data.filter((po) =>
    (po.top_employees ?? []).some((e) => e.hours > 0)
  );

  const singleContributorCount = activePOs.filter(
    (po) => (po.top_employees ?? []).filter((e) => e.hours > 0).length === 1
  ).length;

  const totalHours = data.reduce(
    (s, po) => s + (po.top_employees ?? []).reduce((ps, e) => ps + (e.hours || 0), 0),
    0
  );

  return (
    <Card>
      <CardHeader>
        <CardTitle>Top Employees by Service PO</CardTitle>
        <CardDescription>
          Contributor hours per project · {monthLabel}
        </CardDescription>
      </CardHeader>

      <CardContent>
        {isLoading && <SkeletonGrid />}

        {!isLoading && data.length === 0 && (
          <EmptyState
            icon={Briefcase}
            title="No PO data for this period"
            description="Data will appear once timesheets are submitted against Service POs."
          />
        )}

        {!isLoading && data.length > 0 && (
          <>
            {/* Summary pills */}
            <div className="mb-5 flex flex-wrap gap-2">
              <Pill
                label="Active POs"
                value={activePOs.length}
                icon={Briefcase}
                colorClass="text-primary"
              />
              <Pill
                label="Total Hours"
                value={`${totalHours.toLocaleString('en-IN')}h`}
                icon={Users}
                colorClass="text-foreground"
                subtext="top contributors only"
              />
              {singleContributorCount > 0 && (
                <Pill
                  label="Sole Contributor"
                  value={singleContributorCount}
                  icon={AlertTriangle}
                  colorClass="text-amber-500"
                  subtext="POs with single person"
                />
              )}
            </div>

            {/* PO cards */}
            <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
              {data.map((po, idx) => (
                <POCard key={po.service_po_id} po={po} rank={idx + 1} />
              ))}
            </div>

            <p className="mt-4 text-xs text-muted-foreground">
              Showing {data.length} of {meta.total ?? data.length} service POs
              {(meta.total ?? 0) > data.length && ` · ${(meta.total ?? 0) - data.length} more on next page`}
            </p>
          </>
        )}
      </CardContent>
    </Card>
  );
};

export default TopEmployeesByPOPanel;
