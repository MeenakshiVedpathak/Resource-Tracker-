import { useCallback, useRef, useState } from 'react';
import {
  ClipboardCheck, AlertTriangle, BatteryCharging, Users, Clock, FolderKanban, IndianRupee,
  CalendarOff, Landmark, AlertCircle,
} from 'lucide-react';
import { useAuth } from '@/hooks/useAuth';
import { useSelectableBusinessUnits } from '@/hooks/useSelectableBusinessUnits';
import { usePmDashboardSummary, usePmDashboardActionRequired } from '@/hooks/usePmDashboard';
import { ROUTES } from '@/constants/routes';
import { formatCurrency, formatHours, formatNumber } from '@/utils/formatters';
import PageHeader from '@/components/common/PageHeader';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { SearchableSelect } from '@/components/ui/searchable-select';
import PmKpiCard from '@/components/pmDashboard/PmKpiCard';
import ActionRequiredFeed from '@/components/pmDashboard/ActionRequiredFeed';
import ProjectOverviewTable from '@/components/pmDashboard/ProjectOverviewTable';
import ProjectHealthList from '@/components/pmDashboard/ProjectHealthList';
import TeamCapacityTable from '@/components/pmDashboard/TeamCapacityTable';
import WorkLogComplianceTable from '@/components/pmDashboard/WorkLogComplianceTable';

// Same small section-label pattern pages/Dashboard.jsx defines locally (icon + title + a
// horizontal rule filling the rest of the row) — not exported as a shared component anywhere in
// this app yet, so redefined here rather than importing a private symbol from another page.
const SectionLabel = ({ icon: Icon, title }) => (
  <div className="mb-4 flex items-center gap-3">
    <div className="flex shrink-0 items-center gap-2">
      {Icon && <Icon className="h-4 w-4 text-muted-foreground" />}
      <h2 className="text-sm font-bold tracking-tight text-foreground">{title}</h2>
    </div>
    <div className="h-px flex-1 bg-border" />
  </div>
);

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

  const workLogComplianceRoute = `${ROUTES.REPORT_EMPLOYEE_WORK_LOG_COMPLIANCE}?month=${monthYear.month}&year=${monthYear.year}`;
  const timesheetApprovalRoute = `${ROUTES.TEAM_LEAD_TIMESHEET_APPROVAL}?month=${monthYear.month}&year=${monthYear.year}`;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Project Manager Dashboard"
        description={`${employee?.full_name ?? 'Project Manager'} · Portfolio overview for the selected month`}
        actions={(
          <div className="flex flex-wrap items-center gap-2">
            {showBuFilter && (
              <div className="flex items-center gap-1.5">
                <Landmark className="h-4 w-4 shrink-0 text-muted-foreground" />
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
            <MonthYearPicker
              value={monthYear}
              onChange={(v) => v && setMonthYear(v)}
              clearable={false}
              className="h-9 w-auto"
            />
          </div>
        )}
      />

      {/* KPI row — priority order per spec, each card a drill-down: the first four are the
          "something needs attention" set (external report/screen for 1/2, in-page scroll to the
          section below for 3/4 since those are just a filtered view of tables already on this
          page); the last four are informational counts, each opening the existing full screen
          for that data (this page's own tables are PM-specific rollups, not a replacement for
          those masters/reports). */}
      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        <PmKpiCard
          icon={CalendarOff}
          title="Missing Work Logs"
          value={formatNumber(summary?.missing_work_logs)}
          tone="red"
          to={workLogComplianceRoute}
          isLoading={isSummaryPending}
        />
        <PmKpiCard
          icon={ClipboardCheck}
          title="Pending Approvals"
          value={formatNumber(summary?.pending_approvals)}
          tone="amber"
          to={timesheetApprovalRoute}
          isLoading={isSummaryPending}
        />
        <PmKpiCard
          icon={AlertTriangle}
          title="At-Risk Projects"
          value={formatNumber(summary?.at_risk_projects)}
          tone="red"
          onClick={scrollToProjectHealth}
          isLoading={isSummaryPending}
        />
        <PmKpiCard
          icon={BatteryCharging}
          title="Overallocated Employees"
          value={formatNumber(summary?.overallocated_employees)}
          tone="amber"
          onClick={jumpToOverallocated}
          isLoading={isSummaryPending}
        />
        <PmKpiCard
          icon={Users}
          title="Team Size"
          value={formatNumber(summary?.team_size)}
          tone="violet"
          to={ROUTES.EMPLOYEES}
          isLoading={isSummaryPending}
        />
        <PmKpiCard
          icon={Clock}
          title="Logged Hours (MTD)"
          value={formatHours(summary?.logged_hours_mtd)}
          tone="blue"
          to={ROUTES.TIMESHEETS}
          isLoading={isSummaryPending}
        />
        <PmKpiCard
          icon={FolderKanban}
          title="Active Projects"
          value={formatNumber(summary?.active_projects)}
          subtext={`${formatNumber(summary?.active_service_pos)} / ${formatNumber(summary?.total_service_pos)} Service POs active`}
          tone="emerald"
          to={ROUTES.PROJECTS}
          isLoading={isSummaryPending}
        />
        <PmKpiCard
          icon={IndianRupee}
          title="Budget vs Billed"
          value={formatCurrency(summary?.budget?.variance, 'INR', 0)}
          subtext={`Invoiced ${formatCurrency(summary?.budget?.invoiced_amount, 'INR', 0)}`}
          tone="indigo"
          to={ROUTES.REPORT_BUDGET_VS_BILLED}
          isLoading={isSummaryPending}
        />
      </div>

      {/* Section 5 — Action Required. Placed right after the KPI row (not last, despite being
          "Section 5") per the spec's own instruction: "put it above the fold, don't bury it in a
          tab" — this is the "what needs my attention today" feed. */}
      <section>
        <SectionLabel icon={AlertCircle} title="Action Required" />
        <ActionRequiredFeed
          data={actionRequired}
          isPending={isActionPending}
          workLogComplianceRoute={workLogComplianceRoute}
          timesheetApprovalRoute={timesheetApprovalRoute}
          onScrollToProjects={scrollToProjectHealth}
          onScrollToTeam={scrollToTeamCapacity}
        />
      </section>

      {/* Section 1 — Project Overview (default view of GET /pm-dashboard/projects). Lazily
          mounted below the fold — see ProjectOverviewTable's own useInViewOnce. */}
      <section>
        <SectionLabel icon={FolderKanban} title="Project Overview" />
        <ProjectOverviewTable monthYear={monthYear} buId={buId} />
      </section>

      {/* Section 2 — Project Health (rows filtered to risk_flag=true). */}
      <section ref={projectHealthRef}>
        <SectionLabel icon={AlertTriangle} title="Project Health" />
        <ProjectHealthList monthYear={monthYear} buId={buId} />
      </section>

      {/* Section 3 — Team & Capacity. `key` forces a remount (and re-seed of
          `initialStatusFilter`) each time the Overallocated Employees KPI is clicked, even if the
          section is already mounted with a different filter showing. */}
      <section ref={teamCapacityRef}>
        <SectionLabel icon={Users} title="Team & Capacity" />
        <TeamCapacityTable
          key={teamFilterNonce}
          monthYear={monthYear}
          buId={buId}
          initialStatusFilter={teamInitialFilter}
        />
      </section>

      {/* Section 4 — Work Log / Effort (missing/shortfall list). */}
      <section>
        <SectionLabel icon={Clock} title="Work Log / Effort" />
        <WorkLogComplianceTable monthYear={monthYear} buId={buId} />
      </section>
    </div>
  );
};

export default PmDashboard;
