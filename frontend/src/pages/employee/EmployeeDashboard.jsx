import dayjs from 'dayjs';
import { Link } from 'react-router-dom';
import { Clock, CalendarDays, ArrowRight } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { useAuth } from '@/hooks/useAuth';
import { useEmployeeCalendar, useEmployeeMonthlySummary } from '@/hooks/useEmployeeWorkLog';
import { ROUTES } from '@/constants/routes';

// Reuses the same calendar aggregate the Work Log page uses for "today", and the dedicated
// monthly-summary endpoint for "this month" — no client-side summing of raw entries. Both
// totals are pending+synced combined (drafts), not "official Timesheet hours" — see the
// caption below the "This Month" card.
const EmployeeDashboard = () => {
  const { user } = useAuth();
  const today = dayjs();
  const todayKey = today.format('YYYY-MM-DD');

  const {
    data: calendarDays = [], isLoading: isCalendarLoading, isError: isCalendarError,
  } = useEmployeeCalendar(today.month() + 1, today.year());
  const {
    data: summary, isLoading: isSummaryLoading, isError: isSummaryError,
  } = useEmployeeMonthlySummary(today.month() + 1, today.year());

  const isLoading = isCalendarLoading || isSummaryLoading;
  const isError = isCalendarError || isSummaryError;

  const todayHours = calendarDays.find((d) => d.date === todayKey)?.totalHours ?? 0;
  const monthHours = summary?.totalHours ?? 0;

  const displayName = user?.full_name ?? user?.name ?? user?.email_id ?? user?.email ?? 'there';

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-xl font-bold tracking-tight">Welcome back, {displayName}</h1>
        <p className="text-sm text-muted-foreground">Here's a snapshot of your logged hours.</p>
      </div>

      {isError && (
        <div className="rounded-lg border border-destructive/30 bg-destructive/5 p-4 text-sm text-destructive">
          Unable to load your work log summary. Please try again.
        </div>
      )}

      <div className="grid gap-4 sm:grid-cols-2">
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">Today's Hours</CardTitle>
            <Clock className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? <Skeleton className="h-8 w-16" /> : <p className="text-2xl font-bold">{todayHours} hrs</p>}
          </CardContent>
        </Card>
        <Card>
          <CardHeader className="flex flex-row items-center justify-between pb-2">
            <CardTitle className="text-sm font-medium text-muted-foreground">This Month</CardTitle>
            <CalendarDays className="h-4 w-4 text-muted-foreground" />
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <Skeleton className="h-8 w-16" />
            ) : (
              <>
                <p className="text-2xl font-bold">{monthHours} hrs</p>
                <p className="mt-1 text-[11px] text-muted-foreground">
                  Includes entries pending sync to the official Timesheet.
                </p>
              </>
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-semibold">Log today's work</p>
            <p className="text-xs text-muted-foreground">Add or review your work log entries.</p>
          </div>
          <Link to={ROUTES.EMPLOYEE_TIMESHEET} className={buttonVariants({ size: 'sm' })}>
            Go to My Work Log <ArrowRight className="h-4 w-4" />
          </Link>
        </CardContent>
      </Card>
    </div>
  );
};

export default EmployeeDashboard;
