import { useEffect } from 'react';
import { AlertTriangle, Pencil, PlusCircle, ArrowRight } from 'lucide-react';
import { TableRow, TableCell } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Progress } from '@/components/ui/progress';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';
import { formatDate, formatMonthYear, formatCompactCurrency } from '@/utils/formatters';
import { useResolvedMonthServicePos } from './useResolvedMonthServicePos';
import { computeMonthStatus, getCompletionState, MONTH_STATUS, MONTH_STATUS_META } from './monthStatus';

const sum = (rows, key) => rows.reduce((total, po) => total + (Number(po[key]) || 0), 0);

// One row per calendar month in the Monthly Data table. Reports its resolved Service PO rows up
// to the page (via onResolved) so the KPI strip can aggregate across the whole year — filters are
// applied here, after status/completion are known, rather than duplicating the fetch at the page
// level just to decide visibility.
const MonthlyBudgetRow = ({ month, year, activePOs, currentData, isCurrentLoading, filters, onFillData, onResolved }) => {
  const { servicePos, isLoading, isCurrent } = useResolvedMonthServicePos(
    month, year, activePOs, currentData, isCurrentLoading
  );

  useEffect(() => {
    if (isLoading) return;
    onResolved(month, servicePos ?? []);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [month, isLoading, servicePos]);

  if (isLoading) {
    return (
      <TableRow>
        {Array.from({ length: 7 }, (_, i) => (
          <TableCell key={i}><Skeleton className="h-4 w-full max-w-[120px]" /></TableCell>
        ))}
      </TableRow>
    );
  }

  const pos = servicePos ?? [];
  const hasServicePos = pos.length > 0;
  const filledRows = pos.filter((po) => po.updated_at != null);
  const filledCount = filledRows.length;
  const totalCount = pos.length;
  const isCompleted = hasServicePos && filledCount === totalCount;
  const deadline = isCurrent && currentData
    ? { deadline: currentData.deadline, days_remaining: currentData.days_remaining, deadline_passed: currentData.deadline_passed }
    : null;

  const status = computeMonthStatus({ hasServicePos, isCompleted, filledCount, deadline });
  const completionState = getCompletionState(filledCount, totalCount);

  if (filters.month !== 'all' && filters.month !== month) return null;
  if (filters.status !== 'all' && filters.status !== status) return null;
  if (filters.completion !== 'all' && filters.completion !== completionState) return null;

  const meta = MONTH_STATUS_META[status];
  const progressPct = totalCount > 0 ? Math.round((filledCount / totalCount) * 100) : 0;
  const invoicedTotal = filledCount > 0 ? sum(filledRows, 'invoice_amount') : null;
  const billedTotal = filledCount > 0 ? sum(filledRows, 'billed_amount') : null;

  const handleFill = (e) => {
    e.stopPropagation();
    onFillData({ month, year, servicePos });
  };

  return (
    <TableRow
      className={cn(
        'cursor-pointer',
        status === MONTH_STATUS.OVERDUE && 'bg-destructive/5 hover:bg-destructive/10'
      )}
      onClick={() => onFillData({ month, year, servicePos })}
    >
      <TableCell className="font-medium text-foreground">
        {formatMonthYear(month, year)}
        {isCurrent && <span className="ml-2 text-xs font-normal text-muted-foreground">Current</span>}
      </TableCell>

      <TableCell>
        <Badge variant="outline" className={cn('gap-1.5 border-transparent', meta.badgeClass)}>
          <meta.Icon className="h-3.5 w-3.5" />
          {meta.label}
        </Badge>
      </TableCell>

      <TableCell className="text-sm">
        {deadline ? (
          <div>
            <p className="text-foreground">{formatDate(deadline.deadline, 'DD MMMM YYYY')}</p>
            {status === MONTH_STATUS.OVERDUE && (
              <p className="mt-0.5 flex items-center gap-1 text-xs font-medium text-destructive">
                <AlertTriangle className="h-3 w-3" /> Overdue — you can still submit
              </p>
            )}
            {status === MONTH_STATUS.DUE_SOON && (
              <p className="mt-0.5 text-xs font-medium text-warning">
                {deadline.days_remaining} {deadline.days_remaining === 1 ? 'day' : 'days'} left
              </p>
            )}
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell className="min-w-[140px]">
        {hasServicePos && filledCount > 0 ? (
          <div className="space-y-1">
            <p className="text-xs font-medium text-foreground">{filledCount} / {totalCount}</p>
            <Progress value={progressPct} className="h-1.5" indicatorClassName={isCompleted ? 'bg-success' : 'bg-info'} />
          </div>
        ) : (
          <span className="text-muted-foreground">—</span>
        )}
      </TableCell>

      <TableCell className="text-sm text-foreground">
        {invoicedTotal != null ? formatCompactCurrency(invoicedTotal) : <span className="text-muted-foreground">—</span>}
      </TableCell>

      <TableCell className="text-sm text-foreground">
        {billedTotal != null ? formatCompactCurrency(billedTotal) : <span className="text-muted-foreground">—</span>}
      </TableCell>

      <TableCell className="text-right">
        <Button
          size="sm"
          variant="ghost"
          className="gap-1 text-primary hover:bg-primary/10 hover:text-primary"
          onClick={handleFill}
        >
          {isCompleted ? <Pencil className="h-3.5 w-3.5" /> : <PlusCircle className="h-3.5 w-3.5" />}
          {isCompleted ? 'Edit' : 'Fill'}
          <ArrowRight className="h-3.5 w-3.5" />
        </Button>
      </TableCell>
    </TableRow>
  );
};

export default MonthlyBudgetRow;
