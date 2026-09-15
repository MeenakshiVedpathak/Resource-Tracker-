import { Link } from 'react-router-dom';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';

// Same visual language as pages/Dashboard.jsx's own KpiCard (rounded-xl card, left color bar,
// icon in a tinted box, bold value, muted title) — kept separate rather than reusing that one
// directly since these are clickable drill-downs (`to` or `onClick`) and Dashboard's isn't.
// `tone` picks a semantic accent (red/amber/blue/violet/emerald/indigo) rather than the app's
// single brand accent color, so an at-a-glance KPI row can read "this one needs attention"
// before the user even reads the number — same intent as the semantic Badge variants
// (success/warning/destructive) used on the Team & Work Log tables below.
const TONE_STYLES = {
  red: { bar: 'bg-red-500', iconBg: 'bg-red-50 dark:bg-red-950/40', iconColor: 'text-red-600 dark:text-red-400' },
  amber: { bar: 'bg-amber-500', iconBg: 'bg-amber-50 dark:bg-amber-950/40', iconColor: 'text-amber-600 dark:text-amber-400' },
  blue: { bar: 'bg-blue-500', iconBg: 'bg-blue-50 dark:bg-blue-950/40', iconColor: 'text-blue-600 dark:text-blue-400' },
  violet: { bar: 'bg-violet-500', iconBg: 'bg-violet-50 dark:bg-violet-950/40', iconColor: 'text-violet-600 dark:text-violet-400' },
  emerald: { bar: 'bg-emerald-500', iconBg: 'bg-emerald-50 dark:bg-emerald-950/40', iconColor: 'text-emerald-600 dark:text-emerald-400' },
  indigo: { bar: 'bg-indigo-500', iconBg: 'bg-indigo-50 dark:bg-indigo-950/40', iconColor: 'text-indigo-600 dark:text-indigo-400' },
};

const PmKpiCard = ({ icon: Icon, title, value, subtext, tone = 'violet', to, onClick, isLoading }) => {
  if (isLoading) return <Skeleton className="h-[100px] rounded-xl" />;

  const styles = TONE_STYLES[tone] ?? TONE_STYLES.violet;
  const Wrapper = to ? Link : 'button';
  const wrapperProps = to ? { to } : { type: 'button', onClick };

  return (
    <Wrapper
      {...wrapperProps}
      className="group block w-full text-left cursor-pointer"
    >
      <div className="relative flex flex-col gap-2 rounded-xl border border-border bg-card pl-4 pr-3 py-3.5 shadow-sm overflow-hidden transition-all duration-200 group-hover:shadow-md group-hover:-translate-y-0.5">
        <div className={cn('absolute left-0 top-0 h-full w-[3px]', styles.bar)} />

        <div className="flex items-start justify-between gap-1">
          <div className={cn('flex h-7 w-7 items-center justify-center rounded-md shrink-0', styles.iconBg)}>
            <Icon className={cn('h-3.5 w-3.5', styles.iconColor)} />
          </div>
        </div>

        <p className="text-[17px] font-extrabold text-foreground leading-tight tabular-nums whitespace-nowrap overflow-hidden text-ellipsis">
          {value}
        </p>

        <p className="text-[11px] font-semibold text-muted-foreground leading-tight">
          {title}
        </p>
        {subtext && (
          <p className="text-[10px] text-muted-foreground/80 leading-tight -mt-1">{subtext}</p>
        )}
      </div>
    </Wrapper>
  );
};

export default PmKpiCard;
