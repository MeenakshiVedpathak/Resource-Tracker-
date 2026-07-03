import { useState } from 'react';
import { motion } from 'framer-motion';
import { Users, Briefcase, Clock, DollarSign, TrendingUp, TrendingDown, RefreshCw } from 'lucide-react';
import { useDashboard, useEmployeeBillableBreakdown, useTopEmployeesByPO } from '@/hooks/useDashboard';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import MonthlyHoursTrendChart from '@/components/charts/MonthlyHoursTrendChart';
import TopPOsChart from '@/components/charts/TopPOsChart';
import WorkforceDonutChart from '@/components/charts/WorkforceDonutChart';
import NonBillableTrendChart from '@/components/charts/NonBillableTrendChart';
import NonBillableBreakdownChart from '@/components/charts/NonBillableBreakdownChart';
import BillableByClientChart from '@/components/charts/BillableByClientChart';
import CustomerNonBillableChart from '@/components/charts/CustomerNonBillableChart';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import PortfolioCard from '@/components/dashboard/PortfolioCard';
import BillableAnalyticsPanel from '@/components/charts/BillableAnalyticsPanel';
import TopEmployeesByPOPanel from '@/components/charts/TopEmployeesByPOPanel';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { formatCurrency, formatHours, formatPercentage, formatDate } from '@/utils/formatters';

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const MONTH_OPTIONS = [
  { value: '1',  label: 'January' },
  { value: '2',  label: 'February' },
  { value: '3',  label: 'March' },
  { value: '4',  label: 'April' },
  { value: '5',  label: 'May' },
  { value: '6',  label: 'June' },
  { value: '7',  label: 'July' },
  { value: '8',  label: 'August' },
  { value: '9',  label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => {
  const y = new Date().getFullYear() - 5 + i;
  return { label: String(y), value: String(y) };
});

const now = new Date();

const Dashboard = () => {
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));

  const { data: stats, isPending, refetch, isFetching, dataUpdatedAt } = useDashboard({ month, year });

  const { data: topEmployeesByPOData, isPending: isTopEmployeesByPOPending } = useTopEmployeesByPO({
    month: Number(month),
    year: Number(year),
    limit: 10,
  });

  const { data: billableBreakdownData, isPending: isBillableBreakdownPending } = useEmployeeBillableBreakdown({
    month: Number(month),
    year: Number(year),
    limit: 10,
  });


  const workforce = stats?.workforce ?? {};
  const portfolio = stats?.portfolio ?? {};
  const currentMonth = stats?.current_month ?? {};
  const financials = stats?.financials ?? {};
  const charts = stats?.charts ?? {};
  const activity = stats?.activity ?? {};

  const nonBillableBreakdown = charts.non_billable_breakdown ?? {};
  const currentMonthTotal = parseFloat(currentMonth.total_hours_logged) || 0;
  const currentMonthBillable = parseFloat(currentMonth.billable_hours_logged) || 0;
  const currentMonthNonBillable = parseFloat(currentMonth.non_billable_hours_logged) || 0;
  const nonBillablePct = currentMonthTotal > 0
    ? ((currentMonthNonBillable / currentMonthTotal) * 100).toFixed(1)
    : null;
  const billablePct = currentMonthTotal > 0
    ? ((currentMonthBillable / currentMonthTotal) * 100).toFixed(1)
    : null;
  const currentPeriod = stats?.period ?? {};

  const utilisationPct = currentMonth.overall_utilisation_pct;
  const lastUpdated = dataUpdatedAt ? formatDate(new Date(dataUpdatedAt), 'DD MMM YYYY, hh:mm A') : null;

  const selectedMonthLabel = MONTH_OPTIONS.find((m) => m.value === month)?.label ?? '';

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={lastUpdated ? `Last refreshed ${lastUpdated}` : 'Overview of resources, costs, and activity'}
        actions={
          <div className="flex items-end gap-3">
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Month</Label>
              <SearchableSelect
                showSearch={false}
                options={MONTH_OPTIONS}
                value={month}
                onValueChange={setMonth}
                placeholder="Month"
                className="h-8 w-32 text-sm"
              />
            </div>
            <div className="flex flex-col gap-1">
              <Label className="text-xs">Year</Label>
              <SearchableSelect
                showSearch={false}
                options={YEAR_OPTIONS}
                value={year}
                onValueChange={setYear}
                placeholder="Year"
                className="h-8 w-24 text-sm"
              />
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

      {/* ── KPI Row ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6"
      >
        <motion.div variants={itemVariants}>
          <StatCard
            title="Active Employees"
            value={isPending ? '—' : (workforce.active_employees ?? 0)}
            icon={Users}
            gradient="blue"
            description={isPending ? undefined : `${workforce.inactive_employees ?? 0} inactive`}
            isLoading={isPending}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title="Active Service POs"
            value={isPending ? '—' : (portfolio.active_pos ?? 0)}
            icon={Briefcase}
            gradient="purple"
            description={isPending ? undefined : `${portfolio.total_clients ?? 0} clients`}
            isLoading={isPending}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title={`Hours (${selectedMonthLabel} ${year})`}
            value={isPending ? '—' : formatHours(currentMonth.total_hours_logged ?? 0)}
            icon={Clock}
            gradient="orange"
            isLoading={isPending}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title={`Billable (${selectedMonthLabel} ${year})`}
            value={isPending ? '—' : formatHours(currentMonthBillable)}
            icon={TrendingUp}
            gradient="green"
            description={
              isPending
                ? undefined
                : billablePct != null
                  ? `${billablePct}% of total hours`
                  : 'No hours logged yet'
            }
            isLoading={isPending}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title={`Non-Billable (${selectedMonthLabel} ${year})`}
            value={isPending ? '—' : formatHours(currentMonthNonBillable)}
            icon={TrendingDown}
            gradient="red"
            description={
              isPending
                ? undefined
                : nonBillablePct != null
                  ? `${nonBillablePct}% of total hours`
                  : 'No hours logged yet'
            }
            isLoading={isPending}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <StatCard
            title="PO Value (This Year)"
            value={isPending ? '—' : formatCurrency(financials.total_po_value_current_year ?? 0)}
            icon={DollarSign}
            gradient="green"
            isLoading={isPending}
          />
        </motion.div>
      </motion.div>

      {/* ── Utilisation banner ── */}
      {!isPending && utilisationPct != null && (
        <motion.div
          initial={{ opacity: 0, y: 6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-xl border bg-primary/5 px-5 py-3.5 flex items-center gap-3"
        >
          <TrendingUp className="h-4 w-4 text-primary shrink-0" />
          <p className="text-sm">
            <span className="font-semibold text-primary">{formatPercentage(utilisationPct)}</span>
            {' '}overall resource utilisation for {selectedMonthLabel} {year} across all active Service POs.
          </p>
        </motion.div>
      )}

      {/* ── Charts row ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 lg:grid-cols-2"
      >
        <motion.div variants={itemVariants}>
          <MonthlyHoursTrendChart
            data={charts.monthly_hours_trend ?? []}
            isLoading={isPending}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <TopPOsChart
            data={charts.top_pos_by_hours ?? []}
            isLoading={isPending}
          />
        </motion.div>
      </motion.div>

     
     

   

      {/* ── Employee billable breakdown ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={itemVariants}>
          <BillableAnalyticsPanel
            data={billableBreakdownData?.data ?? []}
            meta={billableBreakdownData?.meta ?? {}}
            isLoading={isBillableBreakdownPending}
            month={Number(month)}
            year={Number(year)}
          />
        </motion.div>
      </motion.div>

      {/* ── Top employees by Service PO ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
      >
        <motion.div variants={itemVariants}>
          <TopEmployeesByPOPanel
            data={topEmployeesByPOData?.data ?? []}
            meta={topEmployeesByPOData?.meta ?? {}}
            isLoading={isTopEmployeesByPOPending}
            month={Number(month)}
            year={Number(year)}
          />
        </motion.div>
      </motion.div>

      {/* ── Bottom row: workforce donut + portfolio card + activity feed ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3"
      >
        <motion.div variants={itemVariants}>
          <WorkforceDonutChart
            workforce={workforce}
            isLoading={isPending}
          />
        </motion.div>
        <motion.div variants={itemVariants}>
          <PortfolioCard
            portfolio={portfolio}
            isLoading={isPending}
          />
        </motion.div>
        <motion.div variants={itemVariants} className="md:col-span-2 lg:col-span-1">
          <ActivityFeed
            entries={activity.recent_timesheet_entries ?? []}
            isLoading={isPending}
          />
        </motion.div>
      </motion.div>
    </div>
  );
};

export default Dashboard;
