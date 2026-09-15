import { Link } from 'react-router-dom';
import {
  CalendarOff, ClipboardCheck, AlertTriangle, BatteryCharging, Armchair, Inbox,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/common/EmptyState';
import { formatDate, formatHours, formatPercentage } from '@/utils/formatters';
import { cn } from '@/utils/cn';

const ICON_STYLES = {
  destructive: 'bg-red-50 text-red-600 dark:bg-red-950/40 dark:text-red-400',
  warning: 'bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400',
};

// One row shape shared by every category below — icon + title/subtitle + a right-aligned badge,
// optionally a link (external route) or a click (in-page scroll to the section that has the full
// table for this row's category).
const FeedRow = ({ icon: Icon, tone, title, subtitle, badge, badgeVariant, to, onClick }) => {
  const content = (
    <div className="flex items-center gap-3 rounded-lg border bg-card px-3.5 py-2.5 transition-colors hover:bg-muted/40">
      <div className={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', ICON_STYLES[tone])}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium">{title}</p>
        <p className="truncate text-xs text-muted-foreground">{subtitle}</p>
      </div>
      {badge && <Badge variant={badgeVariant} className="shrink-0">{badge}</Badge>}
    </div>
  );

  if (to) return <Link to={to} className="block">{content}</Link>;
  if (onClick) return <button type="button" onClick={onClick} className="block w-full text-left">{content}</button>;
  return content;
};

// Section 5 — Action Required: every row from GET /pm-dashboard/action-required's five lists,
// concatenated into one feed in the spec's priority order (missing work logs + pending approvals
// first, then at-risk projects, then capacity issues) rather than five separate tabbed/accordioned
// sub-sections — this is "what needs my attention today", meant to be scanned as one list, above
// the fold.
const ActionRequiredFeed = ({ data, isPending, workLogComplianceRoute, timesheetApprovalRoute, onScrollToProjects, onScrollToTeam }) => {
  if (isPending) {
    return (
      <div className="space-y-2">
        {Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-14 w-full rounded-lg" />)}
      </div>
    );
  }

  const missingWorkLogs = data?.missing_work_logs ?? [];
  const pendingApprovals = data?.pending_approvals ?? [];
  const atRiskProjects = data?.at_risk_projects ?? [];
  const overallocated = data?.overallocated_employees ?? [];
  const bench = data?.bench_employees ?? [];

  const totalRows = missingWorkLogs.length + pendingApprovals.length + atRiskProjects.length
    + overallocated.length + bench.length;

  if (totalRows === 0) {
    return (
      <EmptyState
        icon={Inbox}
        title="Nothing needs your attention"
        description="No missing work logs, pending approvals, at-risk projects, or capacity issues this period."
      />
    );
  }

  return (
    <div className="space-y-2">
      {missingWorkLogs.map((r) => (
        <FeedRow
          key={`mwl-${r.employee_id}`}
          icon={CalendarOff}
          tone="destructive"
          title={`${r.employee_name} (${r.employee_code})`}
          subtitle={`${r.business_unit ?? '—'} · Logged ${formatHours(r.logged_hours)} of ${formatHours(r.required_hours)} required`}
          badge={`Short ${formatHours(r.shortfall_hours)}`}
          badgeVariant="destructive"
          to={workLogComplianceRoute}
        />
      ))}
      {pendingApprovals.map((r) => (
        <FeedRow
          key={`pa-${r.work_log_id}`}
          icon={ClipboardCheck}
          tone="warning"
          title={`${r.full_name} (${r.employee_code})`}
          subtitle={`${r.service_po_name} · ${formatDate(r.work_date)} · ${r.log_type}`}
          badge={`${formatHours(r.hours)} pending`}
          badgeVariant="warning"
          to={timesheetApprovalRoute}
        />
      ))}
      {atRiskProjects.map((r) => (
        <FeedRow
          key={`arp-${r.project_id}`}
          icon={AlertTriangle}
          tone="destructive"
          title={r.project_name}
          subtitle={`${r.client_name ?? '—'} · Deadline ${formatDate(r.nearest_end_date)}`}
          badge={r.overdue_po_count > 0 ? `${r.overdue_po_count} overdue PO${r.overdue_po_count > 1 ? 's' : ''}` : formatPercentage(r.variance_pct)}
          badgeVariant="destructive"
          onClick={onScrollToProjects}
        />
      ))}
      {overallocated.map((r) => (
        <FeedRow
          key={`oa-${r.employee_id}`}
          icon={BatteryCharging}
          tone="destructive"
          title={`${r.full_name} (${r.employee_code})`}
          subtitle="Overallocated this period"
          badge={`${formatPercentage(r.capacity_used_pct)} used`}
          badgeVariant="destructive"
          onClick={onScrollToTeam}
        />
      ))}
      {bench.map((r) => (
        <FeedRow
          key={`bn-${r.employee_id}`}
          icon={Armchair}
          tone="warning"
          title={`${r.full_name} (${r.employee_code})`}
          subtitle="On bench this period"
          badge={`${formatPercentage(r.capacity_used_pct)} used`}
          badgeVariant="warning"
          onClick={onScrollToTeam}
        />
      ))}
    </div>
  );
};

export default ActionRequiredFeed;
