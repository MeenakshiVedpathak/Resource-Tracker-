import { useMemo, useState } from 'react';
import dayjs from 'dayjs';
import {
  ChevronLeft, ChevronRight, CalendarRange, AlertTriangle,
  ChevronUp, ChevronDown, ChevronsUpDown,
} from 'lucide-react';
import { Card, CardHeader, CardTitle, CardDescription, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/common/EmptyState';
import { Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell } from '@/components/ui/table';
import { useServicePoMonthlyBudgetYearList } from '@/hooks/useServicePoMonthlyBudget';
import { formatCurrency } from '@/utils/formatters';

const MONTHS = Array.from({ length: 12 }, (_, i) => ({ num: i + 1, label: dayjs().month(i).format('MMM') }));

// Pivots the flat records list (one row per PO+month saved) into one row per Service PO with a
// slot for each of the 12 months — a PO/month with nothing saved just stays a blank cell.
const groupByServicePO = (records) => {
  const byPo = new Map();
  for (const r of records) {
    if (!byPo.has(r.service_po_id)) {
      byPo.set(r.service_po_id, {
        service_po_id: r.service_po_id,
        service_po_name: r.service_po_name,
        service_po_code: r.service_po_code,
        client_id: r.client?.id,
        client_name: r.client?.client_name,
        months: {},
      });
    }
    byPo.get(r.service_po_id).months[r.month] = r;
  }
  return Array.from(byPo.values());
};

const rowTotal = (row) => MONTHS.reduce(
  (acc, m) => {
    const rec = row.months[m.num];
    if (!rec) return acc;
    return { invoice: acc.invoice + Number(rec.invoice_amount ?? 0), billed: acc.billed + Number(rec.billed_amount ?? 0) };
  },
  { invoice: 0, billed: 0 }
);

const MonthCell = ({ record }) => {
  if (!record) return <TableCell className="text-right text-muted-foreground">—</TableCell>;
  return (
    <TableCell className="whitespace-nowrap text-right">
      <div className="text-xs font-medium">{formatCurrency(record.invoice_amount, 'INR', 0)}</div>
      <div className="text-[11px] text-muted-foreground">{formatCurrency(record.billed_amount, 'INR', 0)}</div>
    </TableCell>
  );
};

const SortableHead = ({ label, active, dir, onClick, className }) => (
  <TableHead className={className}>
    <button
      type="button"
      onClick={onClick}
      className="inline-flex items-center gap-0.5 hover:text-foreground transition-colors"
    >
      {label}
      {active ? (
        dir === 'asc' ? <ChevronUp className="ml-1 h-3 w-3" /> : <ChevronDown className="ml-1 h-3 w-3" />
      ) : (
        <ChevronsUpDown className="ml-1 h-3 w-3 opacity-40" />
      )}
    </button>
  </TableHead>
);

const ServicePoYearlyBudgetView = ({ year, onYearChange, search = '', clientFilter = 'all', poFilterIds = null }) => {
  const { data: records = [], isPending, isError } = useServicePoMonthlyBudgetYearList(year, true);

  const [sortBy, setSortBy] = useState('name');
  const [sortDir, setSortDir] = useState('asc');

  const allRows = useMemo(() => groupByServicePO(records), [records]);

  const filteredRows = useMemo(() => {
    const term = search.trim().toLowerCase();
    return allRows.filter((row) => {
      if (clientFilter !== 'all' && String(row.client_id) !== clientFilter) return false;
      if (poFilterIds && !poFilterIds.has(row.service_po_id)) return false;
      if (!term) return true;
      return [row.service_po_name, row.service_po_code, row.client_name]
        .filter(Boolean)
        .some((v) => v.toLowerCase().includes(term));
    });
  }, [allRows, search, clientFilter, poFilterIds]);

  const rows = useMemo(() => {
    const dir = sortDir === 'asc' ? 1 : -1;
    return [...filteredRows].sort((a, b) => {
      if (sortBy === 'total') return dir * (rowTotal(a).invoice - rowTotal(b).invoice);
      return dir * a.service_po_name.localeCompare(b.service_po_name);
    });
  }, [filteredRows, sortBy, sortDir]);

  const toggleSort = (col) => {
    if (sortBy === col) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortBy(col);
      setSortDir('asc');
    }
  };

  const monthTotals = useMemo(() => {
    const totals = {};
    for (const m of MONTHS) totals[m.num] = { invoice: 0, billed: 0 };
    for (const row of rows) {
      for (const m of MONTHS) {
        const rec = row.months[m.num];
        if (!rec) continue;
        totals[m.num].invoice += Number(rec.invoice_amount ?? 0);
        totals[m.num].billed += Number(rec.billed_amount ?? 0);
      }
    }
    return totals;
  }, [rows]);

  const grandTotal = useMemo(
    () => Object.values(monthTotals).reduce(
      (acc, t) => ({ invoice: acc.invoice + t.invoice, billed: acc.billed + t.billed }),
      { invoice: 0, billed: 0 }
    ),
    [monthTotals]
  );

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-4 space-y-0">
        <div className="flex gap-3">
          <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <CalendarRange className="h-4.5 w-4.5" />
          </div>
          <div>
            <CardTitle>Yearly Overview</CardTitle>
            <CardDescription>Invoice / Billable amount by Service PO, across all 12 months.</CardDescription>
          </div>
        </div>

        <div className="flex items-center gap-1">
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onYearChange(year - 1)}>
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <span className="w-14 text-center text-sm font-semibold">{year}</span>
          <Button variant="outline" size="icon" className="h-8 w-8" onClick={() => onYearChange(year + 1)}>
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent>
        {isError ? (
          <EmptyState
            icon={AlertTriangle}
            title="Yearly view isn't available yet"
            description="This needs the backend to support a year-only filter on the budgets endpoint. Ask your backend developer to confirm it before this tab can load data."
          />
        ) : isPending ? (
          <div className="space-y-2">
            {Array.from({ length: 4 }).map((_, i) => (
              <Skeleton key={i} className="h-11 w-full" />
            ))}
          </div>
        ) : allRows.length === 0 ? (
          <EmptyState
            icon={CalendarRange}
            title="No budgets saved yet"
            description={`Nothing has been entered for any month in ${year}.`}
          />
        ) : rows.length === 0 ? (
          <EmptyState title="No records found" description="Try adjusting your search or filters." />
        ) : (
          <div className="rounded-md border">
            <Table containerClassName="overflow-x-auto">
              <TableHeader>
                <TableRow>
                  <SortableHead
                    label="Service PO"
                    active={sortBy === 'name'}
                    dir={sortDir}
                    onClick={() => toggleSort('name')}
                    className="sticky left-0 z-10 min-w-[180px] bg-background"
                  />
                  {MONTHS.map((m) => (
                    <TableHead key={m.num} className="min-w-[90px] text-right">{m.label}</TableHead>
                  ))}
                  <SortableHead
                    label="Total"
                    active={sortBy === 'total'}
                    dir={sortDir}
                    onClick={() => toggleSort('total')}
                    className="min-w-[110px] text-right"
                  />
                </TableRow>
              </TableHeader>
              <TableBody>
                {rows.map((row) => {
                  const total = rowTotal(row);
                  return (
                    <TableRow key={row.service_po_id}>
                      <TableCell className="sticky left-0 z-10 bg-background align-top">
                        <div className="font-medium">{row.service_po_name}</div>
                        <div className="text-[11px] text-muted-foreground">
                          {row.client_name || row.service_po_code || '—'}
                        </div>
                      </TableCell>
                      {MONTHS.map((m) => <MonthCell key={m.num} record={row.months[m.num]} />)}
                      <TableCell className="whitespace-nowrap text-right">
                        <div className="text-xs font-semibold">{formatCurrency(total.invoice, 'INR', 0)}</div>
                        <div className="text-[11px] text-muted-foreground">{formatCurrency(total.billed, 'INR', 0)}</div>
                      </TableCell>
                    </TableRow>
                  );
                })}
              </TableBody>
              <TableFooter>
                <TableRow>
                  <TableCell className="sticky left-0 z-10 bg-muted text-xs font-semibold uppercase text-muted-foreground">
                    Total
                  </TableCell>
                  {MONTHS.map((m) => (
                    <TableCell key={m.num} className="whitespace-nowrap text-right">
                      <div className="text-xs font-semibold">{formatCurrency(monthTotals[m.num].invoice, 'INR', 0)}</div>
                      <div className="text-[11px] text-muted-foreground">{formatCurrency(monthTotals[m.num].billed, 'INR', 0)}</div>
                    </TableCell>
                  ))}
                  <TableCell className="whitespace-nowrap text-right">
                    <div className="text-xs font-semibold">{formatCurrency(grandTotal.invoice, 'INR', 0)}</div>
                    <div className="text-[11px] text-muted-foreground">{formatCurrency(grandTotal.billed, 'INR', 0)}</div>
                  </TableCell>
                </TableRow>
              </TableFooter>
            </Table>
          </div>
        )}

        {!isError && (
          <p className="mt-3 flex flex-wrap items-center gap-x-1.5 text-[11px] text-muted-foreground">
            <span className="font-medium">Reading cells:</span> top value is Invoice Amount, bottom (muted) is Billable Amount.
            <Badge variant="muted" className="font-normal">Switch to the Monthly tab to add or edit an entry.</Badge>
          </p>
        )}
      </CardContent>
    </Card>
  );
};

export default ServicePoYearlyBudgetView;
