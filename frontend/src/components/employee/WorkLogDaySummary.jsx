import { Clock, Timer, FolderKanban } from 'lucide-react';
import { Progress } from '@/components/ui/progress';
import { cn } from '@/utils/cn';
import { EXPECTED_DAILY_HOURS } from './WorkLogEntryModal';

const StatTile = ({ icon: Icon, iconClassName, label, value, sub }) => (
  <div className="flex items-center gap-3 rounded-lg border px-3 py-2.5">
    <span className={cn('flex h-9 w-9 shrink-0 items-center justify-center rounded-full', iconClassName)}>
      <Icon className="h-4 w-4" />
    </span>
    <div className="min-w-0">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p className="truncate text-base font-semibold leading-tight">{value}</p>
      <p className="text-[11px] text-muted-foreground">{sub}</p>
    </div>
  </div>
);

// Worked/Remaining/Progress are all read against EXPECTED_DAILY_HOURS, a client-side standard
// workday — the backend has no daily target field. "Projects" counts Service POs with any
// hours logged today (own or via a hierarchy node beneath them), not every mapped PO.
const WorkLogDaySummary = ({ totalHours, activeProjectsCount }) => {
  const remaining = Math.max(EXPECTED_DAILY_HOURS - totalHours, 0);
  const progressPct = Math.min(100, Math.round((totalHours / EXPECTED_DAILY_HOURS) * 100));

  return (
    <div className="space-y-4">
      <div className="grid grid-cols-3 gap-3">
        <StatTile
          icon={Clock}
          iconClassName="bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
          label="Worked"
          value={`${totalHours} hrs`}
          sub={`of ${EXPECTED_DAILY_HOURS} hrs`}
        />
        <StatTile
          icon={Timer}
          iconClassName="bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400"
          label="Remaining"
          value={`${remaining} hrs`}
          sub="to complete"
        />
        <StatTile
          icon={FolderKanban}
          iconClassName="bg-violet-50 text-violet-600 dark:bg-violet-950/40 dark:text-violet-400"
          label="Projects"
          value={activeProjectsCount}
          sub="active"
        />
      </div>

      <div>
        <div className="mb-1.5 flex items-center justify-between text-xs">
          <span className="font-medium text-muted-foreground">Daily Progress</span>
          <span className="font-medium tabular-nums">{totalHours} / {EXPECTED_DAILY_HOURS} hrs</span>
        </div>
        <Progress value={progressPct} indicatorClassName="bg-emerald-500" />
      </div>
    </div>
  );
};

export default WorkLogDaySummary;
