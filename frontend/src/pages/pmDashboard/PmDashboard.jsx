import { useCallback, useRef, useState } from 'react';
import { motion } from 'framer-motion';
import {
  ClipboardCheck, AlertTriangle, BatteryCharging, Users, Clock, FolderKanban, IndianRupee,
  CalendarOff, Landmark, AlertCircle, LayoutDashboard, CalendarDays, CalendarClock, Activity,
  PieChart, BarChart3,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSelectableBusinessUnits } from '@/hooks/useSelectableBusinessUnits';
import { usePmDashboardSummary, usePmDashboardActionRequired } from '@/hooks/usePmDashboard';
import { ROUTES } from '@/constants/routes';
import { formatCurrency, formatHours, formatNumber } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import PageHeader from '@/components/common/PageHeader';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Skeleton } from '@/components/ui/skeleton';
import PmKpiCard from '@/components/pmDashboard/PmKpiCard';
import ActionRequiredFeed from '@/components/pmDashboard/ActionRequiredFeed';
import ProjectOverviewTable from '@/components/pmDashboard/ProjectOverviewTable';
import ProjectHealthList from '@/components/pmDashboard/ProjectHealthList';
import TeamCapacityTable from '@/components/pmDashboard/TeamCapacityTable';
import WorkLogComplianceTable from '@/components/pmDashboard/WorkLogComplianceTable';
import UpcomingDeadlinesList from '@/components/pmDashboard/UpcomingDeadlinesList';
import ActionRequiredCompositionChart from '@/components/pmDashboard/ActionRequiredCompositionChart';
import ProjectHoursBarChart from '@/components/pmDashboard/ProjectHoursBarChart';

// Plain heading — icon + bold title + a horizontal rule filling the rest of the row, optionally a
// small count pill and/or a muted subtitle underneath — used above EVERY section on this page
// (KPI row included), the same pattern pages/Dashboard.jsx defines locally for its own section
// headings. Deliberately outside/above any bordered box rather than baked into one, per the
// redesign's own reference: a heading reads as "here's what this whole area is," a card is for
// content that needs its own visual edge (a table, a list, a filter row).
const SectionLabel = ({ icon: Icon, title, subtitle, count }) => (
  <div>
    <div className="flex items-center gap-3">
      <div className="flex shrink-0 items-center gap-2">
        {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
        <h2 className="text-sm font-bold tracking-tight text-foreground">{title}</h2>
        {count != null && count > 0 && (
          <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-primary/10 px-1.5 text-[11px] font-bold text-primary">
            {count}
          </span>
        )}
      </div>
      <div className="h-px flex-1 bg-border" />
    </div>
    {subtitle && <p className="mt-1 pl-6 text-xs text-muted-foreground">{subtitle}</p>}
  </div>
);

// Plain bordered rounded-2xl content shell, no header of its own — every section's actual content
// (a table, a list, a filter row) sits inside one of these, with its own SectionLabel rendered
// just above it (see above). No "View All" link on any of them — these keep their existing full
// pagination in place rather than switching to a "top 5 rows, view the rest elsewhere" pattern,
// so there's no separate full page for such a link to point to.
const SectionBox = ({ className, children }) => (
  <div className={cn('rounded-2xl border bg-card p-5 shadow-sm', className)}>
    {children}
  </div>
);

// Same small colored-square icon badge pages/Dashboard.jsx defines locally for its own header
// filter controls (FilterIconBadge) — not exported as a shared component anywhere in this app
// yet, so redefined here rather than importing a private symbol from another page.
const FILTER_ICON_STYLES = {
  primary: 'bg-primary shadow-primary/30',
  violet: 'bg-violet-500 shadow-violet-500/30',
};
const FilterIconBadge = ({ icon: Icon, color = 'primary' }) => (
  <span className={`flex h-7 w-7 items-center justify-center rounded-lg shrink-0 text-white shadow-sm ${FILTER_ICON_STYLES[color]}`}>
    <Icon className="h-3.5 w-3.5" />
  </span>
);

// KPI row entrance — same stagger-fade pages/Dashboard.jsx's own KPI row uses, so the two
// dashboards feel like one product rather than one being "the animated one".
const kpiContainerVariants = { hidden: {}, show: { transition: { staggerChildren: 0.055 } } };
const kpiItemVariants = { hidden: { opacity: 0, y: 12 }, show: { opacity: 1, y: 0, transition: { duration: 0.22 } } };

const now = new Date();

const PmDashboard = () => {
  const { employee } = useAuth();
  const { units, canFilter: showBuFilter } = useSelectableBusinessUnits();
  const [monthYear, setMonthYear] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  // '' means every BU this login belongs to (aggregated) — same convention as Dashboard.jsx's own
  // header BU control. Never shown at all for a single-BU login (see showBuFilter above), so it
  // stays '' for them and the backend aggregates across their one BU same as "all" would.
  const [buId, setBuId] = useState('');
  // Bumped only when the Overallocated Employees KPI is clicked, forcing TeamCapacityTable to
  // remount with a fresh `initialStatusFilter` (see its own key prop below) — the component only
  // reads that prop once on mount, so a plain re-render wouldn't re-seed it a second time.
  const [teamFilterNonce, setTeamFilterNonce] = useState(0);
  const [teamInitialFilter, setTeamInitialFilter] = useState('all');

  const projectHealthRef = useRef(null);
  const teamCapacityRef = useRef(null);

  // Same scroll helper as pages/Dashboard.jsx's own scrollTo (accounts for MainLayout's <main>
  // being the actual scroll container, with room for the sticky page header).
  const scrollTo = useCallback((ref) => {
    const el = ref.current;
    if (!el) return;
    const main = document.querySelector('main') ?? document.documentElement;
    const offset = el.getBoundingClientRect().top - main.getBoundingClientRect().top + main.scrollTop - 80;
    main.scrollTo({ top: offset, behavior: 'smooth' });
  }, []);
  const scrollToProjectHealth = useCallback(() => scrollTo(projectHealthRef), [scrollTo]);
  const scrollToTeamCapacity = useCallback(() => scrollTo(teamCapacityRef), [scrollTo]);
  const jumpToOverallocated = useCallback(() => {
    setTeamInitialFilter('overallocated');
    setTeamFilterNonce((n) => n + 1);
    scrollToTeamCapacity();
  }, [scrollToTeamCapacity]);

  const params = { buId, month: monthYear.month, year: monthYear.year };

  // First-screen behavior: these two fire immediately on load, gated behind nothing but the
  // params object itself (always present) — the KPI row and Action Required feed populate the
  // instant the page opens, never behind the user picking a month/BU first. The table sections
  // further down are separate queries (Project Overview additionally lazy-loads via
  // useInViewOnce), so nothing here blocks on them.
  const { data: summary, isPending: isSummaryPending } = usePmDashboardSummary(params);
  const { data: actionRequired, isPending: isActionPending } = usePmDashboardActionRequired(params);

  // Same rows ActionRequiredFeed itself sums to decide its own empty state — kept as a light
  // duplication here rather than a shared export, purely to drive the SectionLabel's count pill.
  const actionRequiredCount = actionRequired
    ? (actionRequired.missing_work_logs?.length ?? 0)
      + (actionRequired.pending_approvals?.length ?? 0)
      + (actionRequired.at_risk_projects?.length ?? 0)
      + (actionRequired.overallocated_employees?.length ?? 0)
      + (actionRequired.bench_employees?.length ?? 0)
    : 0;

  const workLogComplianceRoute = `${ROUTES.REPORT_EMPLOYEE_WORK_LOG_COMPLIANCE}?month=${monthYear.month}&year=${monthYear.year}`;
  const timesheetApprovalRoute = `${ROUTES.TEAM_LEAD_TIMESHEET_APPROVAL}?month=${monthYear.month}&year=${monthYear.year}`;

  // Priority order per spec, each card a drill-down: the first four are the "something needs
  // attention" set (external report/screen for 1/2, in-page scroll to the section below for 3/4
  // since those are just a filtered view of tables already on this page); the last four are
  // informational counts, each opening the existing full screen for that data (this page's own
  // tables are PM-specific rollups, not a replacement for those masters/reports). Only Active
  // Projects and Budget vs Billed carry a `subtext` — real data the summary response already
  // carries (a Service PO count, an invoiced amount), not decorative filler, and not a trend/delta:
  // GET /pm-dashboard/summary returns only the current period's flat counts, with nothing to
  // compare against, so there's no honest "+3 vs last month" figure to show on any of these.
  const kpiCards = [
    { icon: CalendarOff, title: 'Missing Work Logs', value: formatNumber(summary?.missing_work_logs), tone: 'red', to: workLogComplianceRoute },
    { icon: ClipboardCheck, title: 'Pending Approvals', value: formatNumber(summary?.pending_approvals), tone: 'amber', to: timesheetApprovalRoute },
    { icon: AlertTriangle, title: 'At-Risk Projects', value: formatNumber(summary?.at_risk_projects), tone: 'red', onClick: scrollToProjectHealth },
    { icon: BatteryCharging, title: 'Overallocated Employees', value: formatNumber(summary?.overallocated_employees), tone: 'amber', onClick: jumpToOverallocated },
    { icon: Users, title: 'Team Size', value: formatNumber(summary?.team_size), tone: 'violet', to: ROUTES.EMPLOYEES },
    { icon: Clock, title: 'Logged Hours', value: formatHours(summary?.logged_hours_mtd), tone: 'blue', to: ROUTES.TIMESHEETS },
    {
      icon: FolderKanban, title: 'Active Projects', value: formatNumber(summary?.active_projects),
      subtext: `${formatNumber(summary?.active_service_pos)} / ${formatNumber(summary?.total_service_pos)} Service POs active`,
      tone: 'emerald', to: ROUTES.PROJECTS,
    },
    {
      icon: IndianRupee, title: 'Budget vs Billed', value: formatCurrency(summary?.budget?.variance, 'INR', 0),
      subtext: `Invoiced ${formatCurrency(summary?.budget?.invoiced_amount, 'INR', 0)}`,
      tone: 'indigo', to: ROUTES.REPORT_BUDGET_VS_BILLED,
    },
  ];

  return (
    <div className="space-y-6">
      <PageHeader
        title={(
          <span className="inline-flex items-center gap-2.5">
            <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-primary/10">
              <LayoutDashboard className="h-4.5 w-4.5 text-primary" />
            </span>
            Project Manager Dashboard
          </span>
        )}
        description={`${employee?.full_name ?? 'Project Manager'} · Portfolio overview for the selected month`}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            {showBuFilter && (
              <div className="flex items-center gap-1.5">
                <FilterIconBadge icon={Landmark} color="primary" />
                <SearchableSelect
                  options={units.map((u) => ({ value: String(u.id), label: u.name }))}
                  value={buId}
                  onValueChange={setBuId}
                  placeholder="All Business Units"
                  searchPlaceholder="Search business unit…"
                  showSearch={units.length > 6}
                  className="w-48 h-9 rounded-xl text-sm"
                />
              </div>
            )}
            <div className="flex items-center gap-1.5">
              <FilterIconBadge icon={CalendarDays} color="violet" />
              <MonthYearPicker
                value={monthYear}
                onChange={(v) => v && setMonthYear(v)}
                clearable={false}
                className="h-9 w-auto rounded-xl"
              />
            </div>
          </div>
        )}
      />

      {/* KPI row — 8 standalone bordered cards (left color bar + icon box + value + label),
          sized to all fit on one row from xl up (2 per row on mobile, 4 per row on tablet). */}
      <div className="flex flex-col gap-3">
        <SectionLabel icon={Activity} title="Key Performance Indicators" />
        {isSummaryPending ? (
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8">
            {Array.from({ length: 8 }).map((_, i) => (
              <Skeleton key={i} className="h-[140px] rounded-2xl" />
            ))}
          </div>
        ) : (
          <motion.div
            variants={kpiContainerVariants}
            initial="hidden"
            animate="show"
            className="grid grid-cols-2 gap-3 sm:grid-cols-4 xl:grid-cols-8"
          >
            {kpiCards.map((card) => (
              <motion.div key={card.title} variants={kpiItemVariants} className="h-full">
                <PmKpiCard {...card} />
              </motion.div>
            ))}
          </motion.div>
        )}
      </div>

      {/* Insights row — a composition donut for Action Required (same 5 category arrays already
          fetched above, just visualized as a breakdown instead of a scrollable list) and a bar
          chart comparing Logged vs Planned hours for the busiest projects (ProjectHoursBarChart's
          own wide GET /pm-dashboard/projects fetch, same pattern as Project Health/Upcoming
          Deadlines below). Both built entirely from data this page or its siblings already pull
          from real endpoints — no fabricated numbers, no new backend endpoint. The reference
          design's portfolio-wide Projects-by-Status donut and true 12-month trend chart still
          aren't here — those need data no endpoint returns today; see the backend request drafted
          alongside this change. */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1fr_1.6fr] items-stretch">
        <div className="flex min-w-0 flex-col gap-3">
          <SectionLabel icon={PieChart} title="Action Required Breakdown" subtitle="Composition of open items this period" />
          <SectionBox className="flex flex-1 flex-col justify-center">
            <ActionRequiredCompositionChart data={actionRequired} isPending={isActionPending} />
          </SectionBox>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <SectionLabel icon={BarChart3} title="Logged vs Planned Hours" subtitle="Top projects by logged hours this period" />
          <SectionBox className="flex flex-1 flex-col">
            <ProjectHoursBarChart monthYear={monthYear} buId={buId} className="flex-1" />
          </SectionBox>
        </div>
      </div>

      {/* Section 5 — Action Required, paired side-by-side with Upcoming Deadlines (left: the
          wider "what needs attention" feed; right: the narrower deadlines list) — same
          `min-w-0`-on-both-columns pattern as the Sections 1-4 grid below, and for the same
          reason: without it a long row (a full employee name + BU + badge) can force its column
          wider than its assigned share instead of wrapping/scrolling within it. Placed right
          after the KPI row (not last, despite being "Section 5") per the spec's own instruction:
          "put it above the fold, don't bury it in a tab" — this is the "what needs my attention
          today" feed. Upcoming Deadlines reuses the same wide GET /pm-dashboard/projects fetch
          pattern as Project Health (see UpcomingDeadlinesList's own FETCH_LIMIT), just sorted to
          the soonest N deadlines instead of filtered to risk_flag — no backend change needed. The
          reference design's other two bottom-row widgets (a Projects-by-Status donut and a
          12-month Logged-vs-Required-Hours trend chart) are deliberately NOT here yet — neither
          data set exists in any endpoint today; see the backend request drafted alongside this
          change. */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="flex min-w-0 flex-col gap-3">
          <SectionLabel
            icon={AlertCircle}
            title="Action Required"
            subtitle="What needs your attention today"
            count={isActionPending ? null : actionRequiredCount}
          />
          <SectionBox>
            <ActionRequiredFeed
              data={actionRequired}
              isPending={isActionPending}
              workLogComplianceRoute={workLogComplianceRoute}
              timesheetApprovalRoute={timesheetApprovalRoute}
              onScrollToProjects={scrollToProjectHealth}
              onScrollToTeam={scrollToTeamCapacity}
            />
          </SectionBox>
        </div>

        <div className="flex min-w-0 flex-col gap-3">
          <SectionLabel icon={CalendarClock} title="Upcoming Deadlines" subtitle="Soonest Service PO / project deadlines" />
          <SectionBox>
            <UpcomingDeadlinesList monthYear={monthYear} buId={buId} />
          </SectionBox>
        </div>
      </div>

      {/* Sections 1-4, two columns from xl up (left: the two wide tables; right: the two
          narrower rollup lists) — same pairing as the reference design. Single column below xl,
          in the original top-to-bottom priority order (Project Overview, Project Health, Team &
          Capacity, Work Log/Effort), so nothing here depends on the two-column split existing.
          `min-w-0` on both column wrappers overrides the grid item default of `min-width: auto` —
          without it, a wide table's own min-content width (many fixed-size columns) forces its
          GRID TRACK to grow to fit instead of the table scrolling within its assigned share,
          which is what was blowing the whole page out to a horizontal scrollbar. */}
      <div className="grid grid-cols-1 gap-5 xl:grid-cols-[1.6fr_1fr]">
        <div className="flex min-w-0 flex-col gap-5">
          {/* Section 1 — Project Overview (default view of GET /pm-dashboard/projects). Lazily
              mounted below the fold — see ProjectOverviewTable's own useInViewOnce. */}
          <div className="flex flex-col gap-3">
            <SectionLabel icon={FolderKanban} title="Project Overview" subtitle="Key project details and current status" />
            <SectionBox>
              <ProjectOverviewTable monthYear={monthYear} buId={buId} />
            </SectionBox>
          </div>

          {/* Section 4 — Work Log / Effort (missing/shortfall list). */}
          <div className="flex flex-col gap-3">
            <SectionLabel icon={Clock} title="Work Log / Effort" subtitle="Employee work log summary" />
            <SectionBox>
              <WorkLogComplianceTable monthYear={monthYear} buId={buId} />
            </SectionBox>
          </div>
        </div>

        <div className="flex min-w-0 flex-col gap-5">
          {/* Section 3 — Team & Capacity. `key` forces a remount (and re-seed of
              `initialStatusFilter`) each time the Overallocated Employees KPI is clicked, even if
              the section is already mounted with a different filter showing. */}
          <div className="flex flex-col gap-3">
            <SectionLabel icon={Users} title="Team & Capacity" subtitle="Team utilisation and availability" />
            <SectionBox>
              <div ref={teamCapacityRef}>
                <TeamCapacityTable
                  key={teamFilterNonce}
                  monthYear={monthYear}
                  buId={buId}
                  initialStatusFilter={teamInitialFilter}
                />
              </div>
            </SectionBox>
          </div>

          {/* Section 2 — Project Health (rows filtered to risk_flag=true). */}
          <div className="flex flex-col gap-3">
            <SectionLabel icon={AlertTriangle} title="Project Health" subtitle="Projects needing attention" />
            <SectionBox>
              <div ref={projectHealthRef}>
                <ProjectHealthList monthYear={monthYear} buId={buId} />
              </div>
            </SectionBox>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PmDashboard;
