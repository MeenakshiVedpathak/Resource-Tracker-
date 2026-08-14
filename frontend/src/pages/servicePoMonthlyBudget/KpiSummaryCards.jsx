import { FileText, IndianRupee, Receipt, Percent } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatCompactCurrency } from '@/utils/formatters';

const KPI_DEFS = [
  { key: 'totalPOs', label: 'Total Service POs', Icon: FileText, format: (v) => String(v) },
  { key: 'totalBilled', label: 'Total Billable', Icon: IndianRupee, format: (v) => formatCompactCurrency(v) },
  { key: 'totalInvoiced', label: 'Total Invoiced', Icon: Receipt, format: (v) => formatCompactCurrency(v) },
  { key: 'completionPct', label: 'Completion', Icon: Percent, format: (v) => `${v}%` },
];

const KpiSummaryCards = ({ totalPOs, totalBilled, totalInvoiced, completionPct, isLoading }) => {
  const values = { totalPOs, totalBilled, totalInvoiced, completionPct };

  return (
    <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
      {KPI_DEFS.map(({ key, label, Icon, format }) => (
        <Card key={key} className="flex items-center justify-between gap-3 rounded-lg p-4 shadow-none">
          <div className="min-w-0">
            <p className="truncate text-xs font-medium uppercase tracking-wide text-muted-foreground">{label}</p>
            {isLoading ? (
              <Skeleton className="mt-1.5 h-7 w-16" />
            ) : (
              <p className="mt-0.5 text-2xl font-semibold text-foreground">{format(values[key] ?? 0)}</p>
            )}
          </div>
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-primary/10">
            <Icon className="h-4 w-4 text-primary" />
          </div>
        </Card>
      ))}
    </div>
  );
};

export default KpiSummaryCards;
