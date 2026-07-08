import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import {
  Clock, DollarSign, TrendingUp, Users, Building2, Briefcase, BarChart2,
  RefreshCw, X, ChevronDown, CalendarDays, SlidersHorizontal,
} from 'lucide-react';
import {
  useEmployeeBillableBreakdown,
  useTopEmployeesByPO,
  useDashboardAnalytics,
} from '@/hooks/useDashboard';
import { useActiveEmployees } from '@/hooks/useEmployees';
import { useActiveClients } from '@/hooks/useClients';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import MonthlyHoursTrendChart from '@/components/charts/MonthlyHoursTrendChart';
import HoursByClientChart from '@/components/charts/HoursByClientChart';
import HoursByEmployeeChart from '@/components/charts/HoursByEmployeeChart';
import ClientPOMatrixChart from '@/components/charts/ClientPOMatrixChart';
import EmployeeBenchChart from '@/components/charts/EmployeeBenchChart';
import BillableAnalyticsPanel from '@/components/charts/BillableAnalyticsPanel';
import TopEmployeesByPOPanel from '@/components/charts/TopEmployeesByPOPanel';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { formatCurrency, formatHours, formatDate } from '@/utils/formatters';

const CollapsibleSection = ({ title, badge, open, onToggle, children }) => (
  <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
    <button
      onClick={onToggle}
      className="w-full flex items-center justify-between px-5 py-3.5 hover:bg-muted/30 transition-colors text-left group"
    >
      <div className="flex items-center gap-2.5">
        <span className="text-sm font-semibold tracking-tight text-foreground">{title}</span>
        {badge && (
          <span className="rounded-full bg-primary/10 text-primary border border-primary/20 px-2.5 py-0.5 text-[10px] font-semibold">
            {badge}
          </span>
        )}
      </div>
      <ChevronDown
        className={`h-4 w-4 text-muted-foreground transition-transform duration-200 group-hover:text-foreground ${open ? '' : '-rotate-90'}`}
      />
    </button>
    <AnimatePresence initial={false}>
      {open && (
        <motion.div
          key="content"
          initial={{ height: 0, opacity: 0 }}
          animate={{ height: 'auto', opacity: 1 }}
          exit={{ height: 0, opacity: 0 }}
          transition={{ duration: 0.22, ease: 'easeInOut' }}
          style={{ overflow: 'hidden' }}
        >
          <div className="border-t px-5 pb-5 pt-1">{children}</div>
        </motion.div>
      )}
    </AnimatePresence>
  </div>
);

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const now = new Date();
const currentFY = now.getMonth() >= 3 ? now.getFullYear() : now.getFullYear() - 1;
const FY_OPTIONS = Array.from({ length: 5 }, (_, i) => currentFY - 2 + i).map((fy) => ({
  value: fy,
  label: `FY ${fy}–${String(fy + 1).slice(-2)}`,
}));

const QUARTERS = [
  { value: 1, label: 'Q1', sub: 'Apr–Jun' },
  { value: 2, label: 'Q2', sub: 'Jul–Sep' },
  { value: 3, label: 'Q3', sub: 'Oct–Dec' },
  { value: 4, label: 'Q4', sub: 'Jan–Mar' },
];

const QUARTER_MONTHS = { 1: [4, 5, 6], 2: [7, 8, 9], 3: [10, 11, 12], 4: [1, 2, 3] };

const Dashboard = () => {
  const [fiscalYear, setFiscalYear] = useState(currentFY);
  const [bottomMonthYear, setBottomMonthYear] = useState({ month: now.getMonth() + 1, year: now.getFullYear() });
  const [open, setOpen] = useState({
    filters: true,
    kpis: true,
    trend: true,
    hoursCharts: true,
    matrixCharts: true,
    monthlyDetail: true,
  });
  const toggle = (key) => setOpen((prev) => ({ ...prev, [key]: !prev[key] }));
  const [quarter, setQuarter] = useState(null);
  const [employeeId, setEmployeeId] = useState('');
  const [clientId, setClientId] = useState('');
  const [servicePOId, setServicePOId] = useState('');
  const [billablePage, setBillablePage] = useState(1);

  const month = String(bottomMonthYear.month);
  const year = String(bottomMonthYear.year);

  const analyticsParams = {
    fiscalYear,
    ...(quarter && { quarter }),
    ...(employeeId && { employeeId }),
    ...(clientId && { clientId }),
    ...(servicePOId && { poId: servicePOId }),
  };

  const {
    data: analyticsData,
    isPending: isAnalyticsPending,
    refetch,
    isFetching,
    dataUpdatedAt,
  } = useDashboardAnalytics(analyticsParams);

  const { data: topEmployeesByPOData, isPending: isTopEmployeesByPOPending } = useTopEmployeesByPO({
    month: Number(month),
    year: Number(year),
    limit: 100,
  });

  const { data: billableBreakdownData, isPending: isBillableBreakdownPending } = useEmployeeBillableBreakdown({
    month: Number(month),
    year: Number(year),
    limit: 10,
    page: billablePage,
  });

  const { data: employeesData } = useActiveEmployees();
  const { data: clientsData } = useActiveClients();
  const { data: servicePOsData } = useActiveServicePOs();

  const tiles = analyticsData?.tiles ?? {};
  const charts = analyticsData?.charts ?? {};

  // Quarter-filtered trend data — use d.month directly (no label parsing)
  const trendData = (() => {
    const raw = charts.monthly_hours_trend ?? [];
    if (!quarter) return raw;
    const allowed = QUARTER_MONTHS[quarter] ?? [];
    return raw.filter((d) => allowed.includes(d.month));
  })();

  const employeeOptions = (employeesData?.data ?? employeesData ?? []).map((e) => ({
    value: String(e.employee_id ?? e.id),
    label: e.full_name ?? `${e.first_name ?? ''} ${e.last_name ?? ''}`.trim(),
  }));

  const clientOptions = (clientsData?.data ?? clientsData ?? []).map((c) => ({
    value: String(c.client_id ?? c.id),
    label: c.client_name ?? c.name,
  }));

  const servicePOOptions = (servicePOsData?.data ?? servicePOsData ?? []).map((p) => ({
    value: String(p.service_po_id ?? p.id),
    label: p.service_po_name ?? p.name,
  }));

  const hasFilters = !!(quarter || employeeId || clientId || servicePOId);

  const clearFilters = () => {
    setQuarter(null);
    setEmployeeId('');
    setClientId('');
    setServicePOId('');
  };

  const lastUpdated = dataUpdatedAt
    ? formatDate(new Date(dataUpdatedAt), 'DD MMM YYYY, hh:mm A')
    : null;

  return (
    <div className="space-y-4">
      <PageHeader
        title="Dashboard"
        description={lastUpdated ? `Last refreshed ${lastUpdated}` : `FY ${fiscalYear}–${String(fiscalYear + 1).slice(-2)} overview`}
        actions={
          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-medium">Fiscal Year</Label>
              <select
                value={fiscalYear}
                onChange={(e) => setFiscalYear(Number(e.target.value))}
                className="h-9 rounded-md border border-input bg-background px-3 text-sm shadow-sm focus:outline-none focus:ring-1 focus:ring-ring w-36"
              >
                {FY_OPTIONS.map((opt) => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => refetch()}
              disabled={isFetching}
              className="h-8"
            >
              <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
              Refresh
            </Button>
          </div>
        }
      />

      {/* ── Filters ── */}
      <CollapsibleSection
        title="Filters"
        badge={hasFilters ? `${[quarter, employeeId, clientId, servicePOId].filter(Boolean).length} active` : undefined}
        open={open.filters}
        onToggle={() => toggle('filters')}
      >
        <div className="space-y-4 pt-3">

          {/* ── Controls row ── */}
          <div className="flex flex-wrap gap-3 items-end">

            {/* Quarter — segmented pill control */}
            <div className="flex flex-col gap-1.5">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground pl-0.5">Quarter</p>
              <div className="flex gap-1 rounded-xl bg-muted p-1">
                {QUARTERS.map((q) => (
                  <button
                    key={q.value}
                    onClick={() => setQuarter(quarter === q.value ? null : q.value)}
                    className={`flex flex-col items-center px-3.5 py-1.5 rounded-lg min-w-[58px] transition-all duration-150 ${
                      quarter === q.value
                        ? 'bg-background shadow-sm text-foreground'
                        : 'text-muted-foreground hover:text-foreground hover:bg-background/50'
                    }`}
                  >
                    <span className={`text-xs font-bold leading-none ${quarter === q.value ? 'text-primary' : ''}`}>{q.label}</span>
                    <span className="text-[9px] leading-none mt-0.5 opacity-60">{q.sub}</span>
                  </button>
                ))}
              </div>
            </div>

            {/* Divider */}
            <div className="hidden md:block self-stretch w-px bg-border/70 mb-1" />

            {/* Employee */}
            <div className="flex flex-col gap-1.5 min-w-[190px] flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 pl-0.5">
                <Users className="h-3 w-3" /> Employee
              </p>
              <SearchableSelect
                options={employeeOptions}
                value={employeeId}
                onValueChange={setEmployeeId}
                placeholder="All employees"
                searchPlaceholder="Search employee..."
              />
            </div>

            {/* Client */}
            <div className="flex flex-col gap-1.5 min-w-[170px] flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 pl-0.5">
                <Building2 className="h-3 w-3" /> Client
              </p>
              <SearchableSelect
                options={clientOptions}
                value={clientId}
                onValueChange={setClientId}
                placeholder="All clients"
                searchPlaceholder="Search client..."
              />
            </div>

            {/* Service PO */}
            <div className="flex flex-col gap-1.5 min-w-[190px] flex-1">
              <p className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground flex items-center gap-1.5 pl-0.5">
                <Briefcase className="h-3 w-3" /> Service PO
              </p>
              <SearchableSelect
                options={servicePOOptions}
                value={servicePOId}
                onValueChange={setServicePOId}
                placeholder="All service POs"
                searchPlaceholder="Search PO..."
              />
            </div>
          </div>

          {/* ── Active filter chips ── */}
          <AnimatePresence>
            {hasFilters && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                transition={{ duration: 0.18 }}
                className="overflow-hidden"
              >
                <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-dashed">
                  <span className="text-[11px] font-semibold uppercase tracking-wide text-muted-foreground mr-1">Applied:</span>

                  {quarter && (
                    <motion.span
                      initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-primary/10 text-primary border border-primary/25 px-3 py-1 text-xs font-semibold"
                    >
                      <CalendarDays className="h-3 w-3" />
                      {QUARTERS.find((q) => q.value === quarter)?.label} · {QUARTERS.find((q) => q.value === quarter)?.sub}
                      <button onClick={() => setQuarter(null)} className="ml-0.5 rounded-full hover:bg-primary/20 p-0.5 -mr-0.5 transition-colors">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </motion.span>
                  )}

                  {employeeId && (
                    <motion.span
                      initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-violet-50 text-violet-700 border border-violet-200 dark:bg-violet-900/30 dark:text-violet-300 dark:border-violet-700 px-3 py-1 text-xs font-semibold max-w-[220px]"
                    >
                      <Users className="h-3 w-3 shrink-0" />
                      <span className="truncate">{employeeOptions.find((e) => e.value === employeeId)?.label ?? 'Employee'}</span>
                      <button onClick={() => setEmployeeId('')} className="ml-0.5 shrink-0 rounded-full hover:bg-violet-100 dark:hover:bg-violet-800 p-0.5 -mr-0.5 transition-colors">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </motion.span>
                  )}

                  {clientId && (
                    <motion.span
                      initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-sky-50 text-sky-700 border border-sky-200 dark:bg-sky-900/30 dark:text-sky-300 dark:border-sky-700 px-3 py-1 text-xs font-semibold max-w-[220px]"
                    >
                      <Building2 className="h-3 w-3 shrink-0" />
                      <span className="truncate">{clientOptions.find((c) => c.value === clientId)?.label ?? 'Client'}</span>
                      <button onClick={() => setClientId('')} className="ml-0.5 shrink-0 rounded-full hover:bg-sky-100 dark:hover:bg-sky-800 p-0.5 -mr-0.5 transition-colors">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </motion.span>
                  )}

                  {servicePOId && (
                    <motion.span
                      initial={{ scale: 0.85, opacity: 0 }} animate={{ scale: 1, opacity: 1 }}
                      className="inline-flex items-center gap-1.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 dark:bg-amber-900/30 dark:text-amber-300 dark:border-amber-700 px-3 py-1 text-xs font-semibold max-w-[220px]"
                    >
                      <Briefcase className="h-3 w-3 shrink-0" />
                      <span className="truncate">{servicePOOptions.find((p) => p.value === servicePOId)?.label ?? 'Service PO'}</span>
                      <button onClick={() => setServicePOId('')} className="ml-0.5 shrink-0 rounded-full hover:bg-amber-100 dark:hover:bg-amber-800 p-0.5 -mr-0.5 transition-colors">
                        <X className="h-2.5 w-2.5" />
                      </button>
                    </motion.span>
                  )}

                  <button
                    onClick={clearFilters}
                    className="ml-auto inline-flex items-center gap-1.5 rounded-full border border-border px-3 py-1 text-xs font-medium text-muted-foreground hover:text-foreground hover:bg-muted transition-colors"
                  >
                    <X className="h-3 w-3" /> Clear all
                  </button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

        </div>
      </CollapsibleSection>

      {/* ── Key Metrics ── */}
      <CollapsibleSection title="Key Metrics" open={open.kpis} onToggle={() => toggle('kpis')}>
        <motion.div
          variants={containerVariants}
          initial="hidden"
          animate="show"
          className="grid grid-cols-2 gap-2 sm:grid-cols-4 md:grid-cols-7 pt-2"
        >
          <motion.div variants={itemVariants}>
            <StatCard title="Total Hours" value={isAnalyticsPending ? '—' : formatHours(tiles.total_hours ?? 0)} icon={Clock} gradient="orange" isLoading={isAnalyticsPending} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard title="Total Cost (₹)" value={isAnalyticsPending ? '—' : formatCurrency(tiles.total_cost ?? 0)} icon={DollarSign} gradient="green" isLoading={isAnalyticsPending} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard title="Utilization %" value={isAnalyticsPending ? '—' : `${Number(tiles.utilization_pct ?? 0).toFixed(1)}%`} icon={TrendingUp} gradient="blue" isLoading={isAnalyticsPending} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard title="Active Employees" value={isAnalyticsPending ? '—' : (tiles.active_employees ?? 0)} icon={Users} gradient="purple" isLoading={isAnalyticsPending} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard title="Active Clients" value={isAnalyticsPending ? '—' : (tiles.active_clients ?? 0)} icon={Building2} gradient="cyan" isLoading={isAnalyticsPending} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard title="Active Service POs" value={isAnalyticsPending ? '—' : (tiles.active_service_pos ?? 0)} icon={Briefcase} gradient="amber" isLoading={isAnalyticsPending} />
          </motion.div>
          <motion.div variants={itemVariants}>
            <StatCard title="Avg Hrs/Employee" value={isAnalyticsPending ? '—' : formatHours(tiles.avg_hours_per_employee ?? 0)} icon={BarChart2} gradient="blue" isLoading={isAnalyticsPending} />
          </motion.div>
        </motion.div>
      </CollapsibleSection>

      {/* ── Monthly Hours Trend ── */}
      <CollapsibleSection title="Monthly Hours Trend" open={open.trend} onToggle={() => toggle('trend')}>
        <div className="pt-2">
          <MonthlyHoursTrendChart
            data={trendData}
            isLoading={isAnalyticsPending}
            fiscalYear={fiscalYear}
            quarter={quarter}
          />
        </div>
      </CollapsibleSection>

      {/* ── Hours by Client + Hours by Employee ── */}
      <CollapsibleSection title="Hours by Client & Employee" open={open.hoursCharts} onToggle={() => toggle('hoursCharts')}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 pt-2">
          <HoursByClientChart data={charts.hours_by_client ?? []} isLoading={isAnalyticsPending} fiscalYear={fiscalYear} />
          <HoursByEmployeeChart data={charts.hours_by_employee ?? []} isLoading={isAnalyticsPending} fiscalYear={fiscalYear} />
        </div>
      </CollapsibleSection>

      {/* ── Client × Service PO + Employee Bench ── */}
      <CollapsibleSection title="Client × Service PO & Employee Bench" open={open.matrixCharts} onToggle={() => toggle('matrixCharts')}>
        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 pt-2">
          <ClientPOMatrixChart data={charts.client_x_service_po ?? []} isLoading={isAnalyticsPending} fiscalYear={fiscalYear} />
          <EmployeeBenchChart data={charts.employee_bench_pct ?? []} isLoading={isAnalyticsPending} fiscalYear={fiscalYear} />
        </div>
      </CollapsibleSection>

      {/* ── Monthly Detail (Billable Breakdown + Top Employees) ── */}
      <CollapsibleSection title="Monthly Detail" open={open.monthlyDetail} onToggle={() => toggle('monthlyDetail')}>
        <div className="space-y-4 pt-2">
          <div className="flex items-center gap-3">
            <span className="text-sm text-muted-foreground">Showing data for:</span>
            <MonthYearPicker
              value={bottomMonthYear}
              onChange={(v) => { if (v) { setBottomMonthYear(v); setBillablePage(1); } }}
              clearable={false}
              className="w-40"
            />
          </div>
          <BillableAnalyticsPanel
            data={billableBreakdownData?.data ?? []}
            meta={billableBreakdownData?.meta ?? {}}
            isLoading={isBillableBreakdownPending}
            month={Number(month)}
            year={Number(year)}
            page={billablePage}
            onPageChange={setBillablePage}
          />
          <TopEmployeesByPOPanel
            data={topEmployeesByPOData?.data ?? []}
            isLoading={isTopEmployeesByPOPending}
            month={Number(month)}
            year={Number(year)}
          />
        </div>
      </CollapsibleSection>
    </div>
  );
};

export default Dashboard;
