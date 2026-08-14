import { CheckCircle2, Clock, AlertTriangle, Circle, PlayCircle } from 'lucide-react';
import { getDeadlineSeverity, DEADLINE_SEVERITY } from '@/hooks/useDeadlineCountdown';

export const MONTH_STATUS = {
  COMPLETED: 'completed',
  DUE_SOON: 'due_soon',
  OVERDUE: 'overdue',
  NOT_STARTED: 'not_started',
  IN_PROGRESS: 'in_progress',
};

// Icon + color + label together (never color alone) for the status badge.
export const MONTH_STATUS_META = {
  [MONTH_STATUS.COMPLETED]: { label: 'Completed', Icon: CheckCircle2, badgeClass: 'bg-success/15 text-success', dotClass: 'bg-success' },
  [MONTH_STATUS.DUE_SOON]: { label: 'Due Soon', Icon: Clock, badgeClass: 'bg-warning/15 text-warning', dotClass: 'bg-warning' },
  [MONTH_STATUS.OVERDUE]: { label: 'Overdue', Icon: AlertTriangle, badgeClass: 'bg-destructive/15 text-destructive', dotClass: 'bg-destructive' },
  [MONTH_STATUS.NOT_STARTED]: { label: 'Not Started', Icon: Circle, badgeClass: 'bg-muted text-muted-foreground', dotClass: 'bg-muted-foreground/50' },
  [MONTH_STATUS.IN_PROGRESS]: { label: 'In Progress', Icon: PlayCircle, badgeClass: 'bg-info/15 text-info', dotClass: 'bg-info' },
};

// Single source of truth for a month's badge state — completed always wins, then the deadline
// clock (only known for the true current period), then whether anything has been saved at all.
export const computeMonthStatus = ({ hasServicePos, isCompleted, filledCount, deadline }) => {
  if (!hasServicePos) return MONTH_STATUS.NOT_STARTED;
  if (isCompleted) return MONTH_STATUS.COMPLETED;
  if (deadline?.deadline_passed) return MONTH_STATUS.OVERDUE;
  if (deadline) {
    const severity = getDeadlineSeverity(deadline.days_remaining, deadline.deadline_passed);
    if (severity === DEADLINE_SEVERITY.WARNING || severity === DEADLINE_SEVERITY.CRITICAL) return MONTH_STATUS.DUE_SOON;
  }
  return filledCount > 0 ? MONTH_STATUS.IN_PROGRESS : MONTH_STATUS.NOT_STARTED;
};

export const COMPLETION_STATE = { FULL: 'full', PARTIAL: 'partial', NONE: 'none' };

export const getCompletionState = (filledCount, totalCount) => {
  if (totalCount > 0 && filledCount === totalCount) return COMPLETION_STATE.FULL;
  if (filledCount > 0) return COMPLETION_STATE.PARTIAL;
  return COMPLETION_STATE.NONE;
};
