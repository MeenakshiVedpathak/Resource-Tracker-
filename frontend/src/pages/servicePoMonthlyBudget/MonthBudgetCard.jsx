import { CalendarClock, AlertTriangle, Pencil, PlusCircle } from 'lucide-react';
import { Card } from '@/components/ui/card';
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
      <Card className="space-y-2 p-3">
        <Skeleton className="h-5 w-28" />
        <Skeleton className="h-3.5 w-full" />
        <Skeleton className="ml-auto h-7 w-20" />
      </Card>
    );
  }

  const pos = servicePos ?? [];
  const hasServicePos = pos.length > 0;
  // No `status` field comes back from the API — a period counts as filled once every row has
  // been saved at least once (updated_at is only ever null for a never-filled row).
  const isCompleted = hasServicePos && pos.every((po) => po.updated_at != null);
  const isOverdue = !!deadline?.deadline_passed;
  const severity = deadline ? getDeadlineSeverity(deadline.days_remaining, deadline.deadline_passed) : null;

  return (
    <Card
      className={cn(
        'p-3',
        isOverdue && 'border-destructive/30 bg-destructive/[0.03]',
        isCurrent && !isOverdue && 'border-primary/30'
      )}
    >
      <div className="flex items-center justify-between gap-2">
        <h2 className="text-sm font-semibold text-foreground">{formatMonthYear(month, year)}</h2>
        {hasServicePos && (
          <Badge variant={isCompleted ? 'success' : 'warning'} className="gap-1 px-2 py-0.5 text-[11px] font-medium">
            <span className={cn('h-1.5 w-1.5 rounded-full', isCompleted ? 'bg-success' : 'bg-warning')} />
            {isCompleted ? 'Completed' : 'Active'}
          </Badge>
        )}
      </div>

      {hasServicePos ? (
        <>
          <div className="mt-2">
            {deadline ? (
              <div className="space-y-0.5">
                <p className="flex items-center gap-1.5 text-xs text-muted-foreground">
                  <CalendarClock className="h-3.5 w-3.5" />
                  {formatDate(deadline.deadline, 'DD MMM YYYY')}
                </p>
                <p className={cn('flex items-center gap-1 text-xs font-medium', SEVERITY_TEXT_CLASS[severity])}>
                  {(severity === DEADLINE_SEVERITY.CRITICAL || severity === DEADLINE_SEVERITY.PASSED) && (
                    <AlertTriangle className="h-3.5 w-3.5" />
                  )}
                  {deadline.deadline_passed
                    ? 'Overdue — you can still submit'
                    : `${deadline.days_remaining} ${deadline.days_remaining === 1 ? 'day' : 'days'} left`}
                </p>
              </div>
            ) : (
              <p className="text-xs text-muted-foreground">
                {isCompleted ? 'All Service POs filled for this month.' : 'Not filled yet.'}
              </p>
            )}
          </div>

          <div className="mt-2 flex justify-end border-t pt-2">
            <Button size="sm" variant={isCompleted ? 'outline' : 'default'} onClick={onFillData} className="h-7 gap-1.5 px-2.5 text-xs">
              {isCompleted ? <Pencil className="h-3 w-3" /> : <PlusCircle className="h-3 w-3" />}
              {isCompleted ? 'Edit Data' : 'Fill Data'}
            </Button>
          </div>
        </>
      ) : (
        <p className="mt-2 py-1 text-center text-xs text-muted-foreground">
          No active Service POs for your company
        </p>
      )}
    </Card>
  );
};

export default MonthBudgetCard;
