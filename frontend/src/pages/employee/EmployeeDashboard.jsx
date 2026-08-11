import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import {
  Clock, CalendarCheck, TrendingUp, ArrowRight, ListChecks, BarChart3,
} from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { Progress } from '@/components/ui/progress';
import { useAuth } from '@/hooks/useAuth';
import { useEmployeeCalendar } from '@/hooks/useEmployeeWorkLog';
import { STANDARD_MONTHLY_HOURS } from '@/components/employee/MonthlyHoursCard';
import { ROUTES } from '@/constants/routes';
import { cn } from '@/utils/cn';

const WEEK_STRIP_LENGTH = 7;
const WEEK_STRIP_MAX_HOURS = 10;

// Everything below is derived from the one calendar aggregate the Work Log page already relies
// on (GET /employee-timesheets/calendar) — no extra endpoints, so "This Month" here always
// matches MonthlyHoursCard on the Work Log page instead of drifting out of sync with it.
const EmployeeDashboard = () => {
  const { user, employee } = useAuth();
  const today = dayjs();
  const todayKey = today.format('YYYY-MM-DD');

  const {
    data: calendarDays = [], isLoading, isError,
  } = useEmployeeCalendar(today.month() + 1, today.year());

  const todayHours = calendarDays.find((d) => d.date === todayKey)?.totalHours ?? 0;
  const monthHours = calendarDays.reduce((sum, d) => sum + Number(d.totalHours || 0), 0);
  const daysLogged = calendarDays.filter((d) => d.date <= todayKey && d.hasEntries).length;
  const monthPct = Math.min(100, Math.round((monthHours / STANDARD_MONTHLY_HOURS) * 100));

  const weekStrip = Array.from({ length: WEEK_STRIP_LENGTH }, (_, i) => {
    const date = today.subtract(WEEK_STRIP_LENGTH - 1 - i, 'day');
    const key = date.format('YYYY-MM-DD');
    const hours = Number(calendarDays.find((d) => d.date === key)?.totalHours ?? 0);
    return { key, label: date.format('dd'), dayNum: date.date(), hours, isToday: key === todayKey };
  });

  const displayName = employee?.full_name ?? user?.full_name ?? user?.email ?? 'there';
  const firstName = displayName.split(' ')[0];

  const statCards = [
    {
      key: 'today', title: "Today's Hours", icon: Clock, value: `${todayHours} hrs`,
      bar: 'bg-orange-500', iconBg: 'bg-orange-50 dark:bg-orange-950/40', iconColor: 'text-orange-500',
      sub: today.format('dddd, DD MMM'),
    },
    {
      key: 'month', title: 'This Month', icon: TrendingUp, value: `${monthHours} hrs`,
      bar: 'bg-emerald-500', iconBg: 'bg-emerald-50 dark:bg-emerald-950/40', iconColor: 'text-emerald-600',
      sub: `${monthPct}% of ${STANDARD_MONTHLY_HOURS} hr target`,
      progress: monthPct,
    },
    {
      key: 'logged', title: 'Days Logged', icon: CalendarCheck, value: `${daysLogged} / ${today.date()}`,
      bar: 'bg-blue-500', iconBg: 'bg-blue-50 dark:bg-blue-950/40', iconColor: 'text-blue-500',
      sub: 'Days this month with an entry',
    },
  ];

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Welcome back, {firstName}</h1>
        <p className="text-sm text-muted-foreground">Here's a snapshot of your logged hours.</p>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Unable to load your work log summary. Please try again.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-3">
        {statCards.map((c) => (
          <div key={c.key} className="relative overflow-hidden rounded-2xl border bg-card shadow-sm transition-shadow hover:shadow-md">
            <div className={cn('absolute inset-x-0 top-0 h-[3px]', c.bar)} />
            <div className="px-4 pb-4 pt-5">
              <div className="mb-2.5 flex items-center justify-between gap-1">
                <p className="text-xs font-semibold uppercase tracking-wide text-muted-foreground">{c.title}</p>
                <div className={cn('shrink-0 rounded-lg p-1.5', c.iconBg)}>
                  <c.icon className={cn('h-4 w-4', c.iconColor)} />
                </div>
              </div>
              {isLoading ? (
                <>
                  <Skeleton className="h-7 w-20" />
                  <Skeleton className="mt-2 h-3 w-28" />
                </>
              ) : (
                <>
                  <p className="text-2xl font-bold leading-none tracking-tight">{c.value}</p>
                  {c.progress != null && <Progress value={c.progress} className="mt-3 h-1.5" />}
                  <p className="mt-2 text-xs text-muted-foreground">{c.sub}</p>
                </>
              )}
            </div>
          </div>
        ))}
      </div>

      <Card>
        <CardContent className="p-5">
          <div className="mb-4 flex items-center gap-2">
            <BarChart3 className="h-4 w-4 text-muted-foreground" />
            <h2 className="text-sm font-semibold">Last 7 Days</h2>
          </div>
          {isLoading ? (
            <div className="flex items-end justify-between gap-2">
              {Array.from({ length: WEEK_STRIP_LENGTH }).map((_, i) => (
                <Skeleton key={i} className="h-16 w-full" />
              ))}
            </div>
          ) : (
            <div className="flex items-end justify-between gap-2">
              {weekStrip.map((d) => (
                <div key={d.key} className="flex flex-1 flex-col items-center gap-1.5">
                  <span className="text-[11px] font-medium text-muted-foreground">
                    {d.hours > 0 ? `${d.hours}h` : ''}
                  </span>
                  <div className="flex h-16 w-full items-end rounded-md bg-muted/50">
                    <div
                      className={cn(
                        'w-full rounded-md transition-all',
                        d.isToday ? 'bg-primary' : 'bg-primary/40'
                      )}
                      style={{ height: `${Math.max(4, Math.min(100, (d.hours / WEEK_STRIP_MAX_HOURS) * 100))}%` }}
                    />
                  </div>
                  <span className={cn('text-xs', d.isToday ? 'font-bold text-primary' : 'text-muted-foreground')}>
                    {d.label} {d.dayNum}
                  </span>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
                <ListChecks className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">Log today's work</p>
                <p className="text-xs text-muted-foreground">Add or review your work log entries.</p>
              </div>
            </div>
            <Link to={ROUTES.EMPLOYEE_TIMESHEET} className={cn(buttonVariants({ size: 'sm' }), 'shrink-0')}>
              Go to My Work Log <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>

        <Card>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div className="flex items-center gap-3">
              <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400">
                <BarChart3 className="h-5 w-5" />
              </span>
              <div>
                <p className="text-sm font-semibold">Monthly Summary</p>
                <p className="text-xs text-muted-foreground">See hours by Service PO for the month.</p>
              </div>
            </div>
            <Link to={ROUTES.EMPLOYEE_MONTHLY_SUMMARY} className={cn(buttonVariants({ size: 'sm' }), 'shrink-0')}>
              View Summary <ArrowRight className="h-4 w-4" />
            </Link>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EmployeeDashboard;
