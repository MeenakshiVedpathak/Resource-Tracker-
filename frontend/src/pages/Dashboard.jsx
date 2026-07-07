import { useState } from 'react';
import { motion } from 'framer-motion';
import {
  Clock, DollarSign, TrendingUp, Users, Building2, Briefcase, BarChart2, RefreshCw, X,
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
    <div className="space-y-6">
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

      {/* ── Filter Bar ── */}
      <div className="flex flex-wrap items-end gap-3 rounded-xl border bg-muted/30 px-4 py-3">
        {/* Quarter toggle */}
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium">Quarter <span className="font-normal text-muted-foreground">(click to toggle)</span></Label>
          <div className="flex gap-1">
            {QUARTERS.map((q) => (
              <button
                key={q.value}
                onClick={() => setQuarter(quarter === q.value ? null : q.value)}
                className={`flex flex-col items-center rounded px-2.5 py-1 transition-colors ${
                  quarter === q.value
                    ? 'bg-primary text-primary-foreground'
                    : 'border bg-background hover:bg-muted/60 text-muted-foreground'
                }`}
              >
                <span className="text-xs font-semibold leading-none">{q.label}</span>
                <span className={`text-[9px] leading-none mt-0.5 ${quarter === q.value ? 'text-primary-foreground/70' : 'text-muted-foreground/70'}`}>{q.sub}</span>
              </button>
            ))}
          </div>
        </div>

        {/* Employee filter */}
        <div className="flex flex-col gap-1.5 min-w-[180px]">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Employee</Label>
            {employeeId && (
              <button onClick={() => setEmployeeId('')} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                <X className="h-2.5 w-2.5" /> clear
              </button>
            )}
          </div>
          <SearchableSelect
            options={employeeOptions}
            value={employeeId}
            onValueChange={setEmployeeId}
            placeholder="All employees"
            searchPlaceholder="Search employee..."
            className="h-8 text-xs"
          />
        </div>

        {/* Client filter */}
        <div className="flex flex-col gap-1.5 min-w-[160px]">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Client</Label>
            {clientId && (
              <button onClick={() => setClientId('')} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                <X className="h-2.5 w-2.5" /> clear
              </button>
            )}
          </div>
          <SearchableSelect
            options={clientOptions}
            value={clientId}
            onValueChange={setClientId}
            placeholder="All clients"
            searchPlaceholder="Search client..."
            className="h-8 text-xs"
          />
        </div>

        {/* Service PO filter */}
        <div className="flex flex-col gap-1.5 min-w-[180px]">
          <div className="flex items-center justify-between">
            <Label className="text-xs font-medium">Service PO</Label>
            {servicePOId && (
              <button onClick={() => setServicePOId('')} className="text-[10px] text-muted-foreground hover:text-foreground flex items-center gap-0.5">
                <X className="h-2.5 w-2.5" /> clear
              </button>
            )}
          </div>
          <SearchableSelect
            options={servicePOOptions}
            value={servicePOId}
            onValueChange={setServicePOId}
            placeholder="All service POs"
            searchPlaceholder="Search PO..."
            className="h-8 text-xs"
          />
        </div>

        {hasFilters && (
          <div className="flex flex-col justify-end">
            <Button variant="ghost" size="sm" onClick={clearFilters} className="h-8 gap-1.5 text-xs text-muted-foreground hover:text-foreground">
              <X className="h-3.5 w-3.5" /> Clear filters
            </Button>
          </div>
        )}
      </div>

      {/* ── 7 KPI Tiles ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-7"
      >
        <motion.div variants={itemVariants}>
          <StatCard
            title="Total Hours"
            value={isAnalyticsPending ? '—' : formatHours(tiles.total_hours ?? 0)}
            icon={Clock}
            gradient="orange"
            isLoading={isAnalyticsPending}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title="Total Cost (₹)"
            value={isAnalyticsPending ? '—' : formatCurrency(tiles.total_cost ?? 0)}
            icon={DollarSign}
            gradient="green"
            isLoading={isAnalyticsPending}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title="Utilization %"
            value={isAnalyticsPending ? '—' : `${Number(tiles.utilization_pct ?? 0).toFixed(1)}%`}
            icon={TrendingUp}
            gradient="blue"
            isLoading={isAnalyticsPending}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title="Active Employees"
            value={isAnalyticsPending ? '—' : (tiles.active_employees ?? 0)}
            icon={Users}
            gradient="purple"
            isLoading={isAnalyticsPending}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title="Active Clients"
            value={isAnalyticsPending ? '—' : (tiles.active_clients ?? 0)}
            icon={Building2}
            gradient="cyan"
            isLoading={isAnalyticsPending}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title="Active Service POs"
            value={isAnalyticsPending ? '—' : (tiles.active_service_pos ?? 0)}
            icon={Briefcase}
            gradient="amber"
            isLoading={isAnalyticsPending}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title="Avg Hrs/Employee"
            value={isAnalyticsPending ? '—' : formatHours(tiles.avg_hours_per_employee ?? 0)}
            icon={BarChart2}
            gradient="blue"
            isLoading={isAnalyticsPending}
          />
        </motion.div>
      </motion.div>

      {/* ── Monthly Hours Trend (full width) ── */}
      <motion.div variants={itemVariants} initial="hidden" animate="show">
        <MonthlyHoursTrendChart
          data={trendData}
          isLoading={isAnalyticsPending}
          fiscalYear={fiscalYear}
          quarter={quarter}
        />
      </motion.div>

      {/* ── Hours by Client + Hours by Employee ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        <motion.div variants={itemVariants}>
          <HoursByClientChart
            data={charts.hours_by_client ?? []}
            isLoading={isAnalyticsPending}
            fiscalYear={fiscalYear}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <HoursByEmployeeChart
            data={charts.hours_by_employee ?? []}
            isLoading={isAnalyticsPending}
            fiscalYear={fiscalYear}
          />
        </motion.div>
      </motion.div>

      {/* ── Client × Service PO + Employee Bench ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        <motion.div variants={itemVariants}>
          <ClientPOMatrixChart
            data={charts.client_x_service_po ?? []}
            isLoading={isAnalyticsPending}
            fiscalYear={fiscalYear}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <EmployeeBenchChart
            data={charts.employee_bench_pct ?? []}
            isLoading={isAnalyticsPending}
            fiscalYear={fiscalYear}
          />
        </motion.div>
      </motion.div>

      {/* ── Bottom panels: month picker + Billable Breakdown + Top Employees ── */}
      <div className="flex items-center gap-3 pt-2 border-t">
        <span className="text-sm font-medium text-muted-foreground">Monthly detail for:</span>
        <MonthYearPicker
          value={bottomMonthYear}
          onChange={(v) => { if (v) { setBottomMonthYear(v); setBillablePage(1); } }}
          clearable={false}
          className="w-40"
        />
      </div>

      {/* ── Employee Billable Breakdown ── */}
      <motion.div variants={itemVariants} initial="hidden" animate="show">
        <BillableAnalyticsPanel
          data={billableBreakdownData?.data ?? []}
          meta={billableBreakdownData?.meta ?? {}}
          isLoading={isBillableBreakdownPending}
          month={Number(month)}
          year={Number(year)}
          page={billablePage}
          onPageChange={setBillablePage}
        />
      </motion.div>

      {/* ── Top Employees by Service PO ── */}
      <motion.div variants={itemVariants} initial="hidden" animate="show">
        <TopEmployeesByPOPanel
          data={topEmployeesByPOData?.data ?? []}
          isLoading={isTopEmployeesByPOPending}
          month={Number(month)}
          year={Number(year)}
        />
      </motion.div>
    </div>
  );
};

export default Dashboard;
