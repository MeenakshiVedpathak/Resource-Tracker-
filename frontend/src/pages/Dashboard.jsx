import { motion } from 'framer-motion';
import { Users, Briefcase, Clock, DollarSign, TrendingUp, RefreshCw } from 'lucide-react';
import { useDashboard } from '@/hooks/useDashboard';
import PageHeader from '@/components/common/PageHeader';
import StatCard from '@/components/common/StatCard';
import MonthlyHoursTrendChart from '@/components/charts/MonthlyHoursTrendChart';
import TopPOsChart from '@/components/charts/TopPOsChart';
import WorkforceDonutChart from '@/components/charts/WorkforceDonutChart';
import ActivityFeed from '@/components/dashboard/ActivityFeed';
import PortfolioCard from '@/components/dashboard/PortfolioCard';
import { Button } from '@/components/ui/button';
import { formatCurrency, formatHours, formatPercentage, formatDate } from '@/utils/formatters';

const containerVariants = {
  hidden: {},
  show: { transition: { staggerChildren: 0.06 } },
};

const itemVariants = {
  hidden: { opacity: 0, y: 10 },
  show: { opacity: 1, y: 0, transition: { duration: 0.25 } },
};

const Dashboard = () => {
  const { data: stats, isPending, refetch, isFetching, dataUpdatedAt } = useDashboard();

  const workforce = stats?.workforce ?? {};
  const portfolio = stats?.portfolio ?? {};
  const currentMonth = stats?.current_month ?? {};
  const financials = stats?.financials ?? {};
  const charts = stats?.charts ?? {};
  const activity = stats?.activity ?? {};

  const utilisationPct = currentMonth.overall_utilisation_pct;
  const lastUpdated = dataUpdatedAt ? formatDate(new Date(dataUpdatedAt), 'DD MMM YYYY, hh:mm A') : null;

  return (
    <div className="space-y-6">
      <PageHeader
        title="Dashboard"
        description={lastUpdated ? `Last refreshed ${lastUpdated}` : 'Overview of resources, costs, and activity'}
        actions={
          <Button
            variant="outline"
            size="sm"
            onClick={() => refetch()}
            disabled={isFetching}
          >
            <RefreshCw className={`mr-1.5 h-3.5 w-3.5 ${isFetching ? 'animate-spin' : ''}`} />
            Refresh
          </Button>
        }
      />

      {/* ── KPI Row ── */}
      <motion.div
        variants={containerVariants}
        initial="hidden"
        animate="show"
        className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4"
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
            title="Hours This Month"
            value={isPending ? '—' : formatHours(currentMonth.total_hours_logged ?? 0)}
            icon={Clock}
            gradient="orange"
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
            {' '}overall resource utilisation this month across all active Service POs.
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
