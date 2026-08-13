import { useMemo } from 'react';
import { ClipboardList, Pencil, Plus, CalendarClock } from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/common/EmptyState';
import { formatCurrency, formatDate, formatMonthYear } from '@/utils/formatters';

const REMARK_SEPARATOR = ' · ';

// One tight card per saved record — kept to a fixed, short row count (no boxed stat block, no
// multi-line description) so a whole month's worth of entries reads at a glance without scrolling.
const BudgetCard = ({ record, onEdit }) => {
  const remark = [record.invoice_description, record.billed_remark].filter(Boolean).join(REMARK_SEPARATOR);

  return (
    <Card className="space-y-1.5 p-2.5">
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-semibold leading-tight text-foreground">{record.service_po_name}</p>
          <p className="truncate text-[11px] leading-tight text-muted-foreground">
            {record.client?.client_name || record.service_po_code || '—'}
          </p>
        </div>
        <Button
          size="icon"
          variant="outline"
          className="h-6 w-6 shrink-0"
          onClick={() => onEdit(record.service_po_id)}
          aria-label="Edit"
        >
          <Pencil className="h-3 w-3" />
        </Button>
      </div>

      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Invoice</span>
        <span className="font-semibold">{formatCurrency(record.invoice_amount)}</span>
      </div>
      <div className="flex items-center justify-between text-xs">
        <span className="text-muted-foreground">Billed</span>
        <span className="font-semibold">{formatCurrency(record.billed_amount)}</span>
      </div>

      <div className="flex items-center justify-between gap-2 pt-0.5 text-[11px] text-muted-foreground">
        <span className="truncate">{remark || '—'}</span>
        <span className="flex shrink-0 items-center gap-1">
          <CalendarClock className="h-3 w-3" /> {formatDate(record.updated_at)}
        </span>
      </div>
    </Card>
  );
};

const ServicePoMonthlyBudgetList = ({ month, year, records, isLoading, onEdit, onAddEntry }) => {
  const totals = useMemo(
    () => records.reduce(
      (acc, r) => ({
        invoice: acc.invoice + Number(r.invoice_amount ?? 0),
        billed: acc.billed + Number(r.billed_amount ?? 0),
      }),
      { invoice: 0, billed: 0 }
    ),
    [records]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ClipboardList className="h-4.5 w-4.5" />
          </div>
          <div>
            <CardTitle>Saved Budgets</CardTitle>
            <CardDescription>{formatMonthYear(month, year)}</CardDescription>
          </div>
        </div>
        {!isLoading && records.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{records.length} {records.length === 1 ? 'entry' : 'entries'}</Badge>
            <Badge variant="muted" className="font-normal">Invoice {formatCurrency(totals.invoice)}</Badge>
            <Badge variant="muted" className="font-normal">Billed {formatCurrency(totals.billed)}</Badge>
          </div>
        )}
      </CardHeader>

      <CardContent>
        {isLoading ? (
          <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {Array.from({ length: 5 }).map((_, i) => (
              <Skeleton key={i} className="h-[104px] w-full rounded-xl" />
            ))}
          </div>
        ) : records.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No budgets saved yet"
            description={`Nothing has been entered for ${formatMonthYear(month, year)} yet.`}
            action={onAddEntry ? { label: 'Add Entry', icon: Plus, onClick: onAddEntry } : undefined}
          />
        ) : (
          <div className="grid gap-2.5 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5">
            {records.map((r) => (
              <BudgetCard key={r.id} record={r} onEdit={onEdit} />
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default ServicePoMonthlyBudgetList;
