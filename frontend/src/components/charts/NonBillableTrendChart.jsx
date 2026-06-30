import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from 'recharts';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/common/EmptyState';
import { TrendingDown } from 'lucide-react';

const BILLABLE_COLOR = 'hsl(var(--primary))';
const NON_BILLABLE_COLOR = '#f97316';

const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  const billable = payload.find((p) => p.dataKey === 'billable_hours');
  const nonBillable = payload.find((p) => p.dataKey === 'non_billable_hours');
  const total = (Number(billable?.value) || 0) + (Number(nonBillable?.value) || 0);
  const nonBillablePct = total > 0
    ? ((Number(nonBillable?.value) || 0) / total * 100).toFixed(1)
    : '0.0';

  return (
    <div className="rounded-lg border bg-popover px-3 py-2.5 shadow-elevated text-xs space-y-1 min-w-[160px]">
      <p className="font-semibold text-foreground mb-1.5">{label}</p>
      {billable && (
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: BILLABLE_COLOR }} />
            <span className="text-muted-foreground">Billable</span>
          </span>
          <span className="font-medium">{Number(billable.value).toLocaleString('en-IN')} hrs</span>
        </div>
      )}
      {nonBillable && (
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-1.5">
            <span className="inline-block h-2 w-2 rounded-sm" style={{ background: NON_BILLABLE_COLOR }} />
            <span className="text-muted-foreground">Non-Billable</span>
          </span>
          <span className="font-medium">{Number(nonBillable.value).toLocaleString('en-IN')} hrs</span>
        </div>
      )}
      <div className="border-t pt-1 mt-1 flex items-center justify-between gap-4">
        <span className="text-muted-foreground">NB %</span>
        <span className="font-semibold text-orange-500">{nonBillablePct}%</span>
      </div>
    </div>
  );
};

const NonBillableTrendChart = ({ data = [], isLoading }) => {
  if (isLoading) {
    return (
      <Card>
        <CardHeader>
          <Skeleton className="h-5 w-56 mb-1" />
          <Skeleton className="h-4 w-72" />
        </CardHeader>
        <CardContent>
          <Skeleton className="h-52 w-full" />
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Billable vs Non-Billable Trend</CardTitle>
        <CardDescription>Monthly hours split — last 6 months</CardDescription>
      </CardHeader>
      <CardContent>
        {data.length === 0 ? (
          <EmptyState
            icon={TrendingDown}
            title="No data yet"
            description="Hours will appear here once timesheets are submitted."
            className="py-10"
          />
        ) : (
          <ResponsiveContainer width="100%" height={210}>
            <BarChart data={data} margin={{ top: 4, right: 8, left: -16, bottom: 0 }} barCategoryGap="30%">
              <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" vertical={false} />
              <XAxis
                dataKey="label"
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
              />
              <YAxis
                tick={{ fontSize: 11, fill: 'hsl(var(--muted-foreground))' }}
                tickLine={false}
                axisLine={false}
                tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
              />
              <Tooltip content={<CustomTooltip />} cursor={{ fill: 'hsl(var(--muted))', opacity: 0.4 }} />
              <Legend
                iconType="square"
                iconSize={8}
                wrapperStyle={{ fontSize: 11, paddingTop: 8 }}
                formatter={(value) => (
                  <span style={{ color: 'hsl(var(--muted-foreground))' }}>
                    {value === 'billable_hours' ? 'Billable' : 'Non-Billable'}
                  </span>
                )}
              />
              <Bar dataKey="billable_hours" stackId="hours" fill={BILLABLE_COLOR} radius={[0, 0, 0, 0]} />
              <Bar dataKey="non_billable_hours" stackId="hours" fill={NON_BILLABLE_COLOR} radius={[3, 3, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default NonBillableTrendChart;
