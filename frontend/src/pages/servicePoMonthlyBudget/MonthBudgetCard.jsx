import { CalendarClock, AlertTriangle, Pencil, PlusCircle } from 'lucide-react';
import { Card, CardHeader, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';
import { formatDate, formatMonthYear } from '@/utils/formatters';
import { getDeadlineSeverity, DEADLINE_SEVERITY } from '@/hooks/useDeadlineCountdown';

const SEVERITY_TEXT_CLASS = {
  [DEADLINE_SEVERITY.NORMAL]: 'text-muted-foreground',
  [DEADLINE_SEVERITY.WARNING]: 'text-warning',
  [DEADLINE_SEVERITY.CRITICAL]: 'text-destructive',
  [DEADLINE_SEVERITY.PASSED]: 'text-destructive',
};

// `deadline` (with `.deadline`/`.days_remaining`/`.deadline_passed`) is only known for the true
// current period — the `/current` endpoint is the sole source of that countdown data. Every
// other month on the year grid renders the same card without that prop and just shows a plain
// filled/not-filled line instead of a deadline countdown.
const MonthBudgetCard = ({ month, year, servicePos, isLoading, deadline, isCurrent, onFillData }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-6 w-32" />
        </CardHeader>
        <CardContent className="space-y-3">
          <Skeleton className="h-4 w-full" />
          <Skeleton className="h-4 w-2/3" />
          <Skeleton className="h-9 w-28" />
        </CardContent>
      </Card>
    );
  }

  const pos = servicePos ?? [];
  const hasServicePos = pos.length > 0;
  // No `status` field comes back from the API — a period counts as filled once every row has
  // been saved at least once (updated_at is only ever null for a never-filled row).
  const isCompleted = hasServicePos && pos.every((po) => po.updated_at != null);
  const severity = deadline ? getDeadlineSeverity(deadline.days_remaining, deadline.deadline_passed) : null;

  return (
    <Card className={cn(isCurrent && 'ring-1 ring-primary')}>
      <CardHeader className="flex-row items-center justify-between space-y-0">
        <h2 className="text-lg font-semibold">{formatMonthYear(month, year)}</h2>
        {hasServicePos && (
          <Badge variant={isCompleted ? 'success' : 'warning'} className="gap-1.5">
            <span className={cn('h-1.5 w-1.5 rounded-full', isCompleted ? 'bg-success' : 'bg-warning')} />
            {isCompleted ? 'Completed' : 'Active'}
          </Badge>
        )}
      </CardHeader>

      <CardContent className="space-y-4">
        <p className="text-sm text-muted-foreground">Monthly Service PO Financial Data</p>

        {hasServicePos ? (
          <>
            {deadline ? (
              <>
                <div>
                  <p className="text-xs font-medium text-muted-foreground">Deadline</p>
                  <p className="mt-0.5 flex items-center gap-1.5 text-sm font-medium">
                    <CalendarClock className="h-3.5 w-3.5 text-muted-foreground" />
                    {formatDate(deadline.deadline, 'DD MMMM YYYY')}
                  </p>
                </div>

                <p className={cn('flex items-center gap-1.5 text-sm font-semibold', SEVERITY_TEXT_CLASS[severity])}>
                  {(severity === DEADLINE_SEVERITY.CRITICAL || severity === DEADLINE_SEVERITY.PASSED) && (
                    <AlertTriangle className="h-4 w-4" />
                  )}
                  {deadline.deadline_passed
                    ? 'Overdue — you can still submit'
                    : `Fill by ${formatDate(deadline.deadline, 'DD MMM YYYY')} — ${deadline.days_remaining} ${deadline.days_remaining === 1 ? 'day' : 'days'} left`}
                </p>
              </>
            ) : (
              <p className="text-sm text-muted-foreground">
                {isCompleted ? 'All Service POs filled for this month.' : 'Not filled yet.'}
              </p>
            )}

            <div className="flex justify-end">
              <Button onClick={onFillData}>
                {isCompleted ? (
                  <>
                    <Pencil className="mr-1.5 h-4 w-4" /> Edit Data
                  </>
                ) : (
                  <>
                    <PlusCircle className="mr-1.5 h-4 w-4" /> Fill Data
                  </>
                )}
              </Button>
            </div>
          </>
        ) : (
          <p className="py-6 text-center text-sm text-muted-foreground">
            No active Service POs for your company
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default MonthBudgetCard;
