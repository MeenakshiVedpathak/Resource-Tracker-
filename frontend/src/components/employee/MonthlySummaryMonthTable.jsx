import { useMemo, useState } from 'react';
import { ChevronRight, ChevronDown } from 'lucide-react';
import {
  Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/common/EmptyState';
import { formatHoursCell } from '@/utils/formatters';
import { cn } from '@/utils/cn';
import { buildMonthlySummaryMonthRows } from '@/utils/employeeMonthlySummary';

// Month View — the same Service PO -> Parent -> Child hierarchy Day View shows (see
// MonthlySummaryMonthView shape in employeeWorkLog.api.js), aggregated for the whole month
// instead of per-day. Renders `data.service_pos` / `data.total_hours` straight from the
// response — every node's `hours` already comes pre-rolled-up server-side, so nothing here
// recomputes or re-aggregates a total.
const MonthlySummaryMonthTable = ({ data, isLoading }) => {
  const rows = useMemo(() => buildMonthlySummaryMonthRows(data), [data]);

  // Collapsed by default, same as Day View — a Service PO's hierarchy breakdown only shows
  // once its row (or an ancestor Parent) is expanded.
  const [expandedKeys, setExpandedKeys] = useState(() => new Set());
  const toggleExpanded = (rowKey) => setExpandedKeys((prev) => {
    const next = new Set(prev);
    next.has(rowKey) ? next.delete(rowKey) : next.add(rowKey);
    return next;
  });

  const visibleRows = useMemo(
    () => rows.filter((row) => row.ancestorKeys.every((key) => expandedKeys.has(key))),
    [rows, expandedKeys]
  );

  return (
    <Table containerClassName="rounded-xl border bg-card">
      <TableHeader>
        <TableRow className="hover:bg-transparent">
          <TableHead>Service PO</TableHead>
          <TableHead className="text-right">Total Hours</TableHead>
        </TableRow>
      </TableHeader>

      <TableBody>
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => (
            <TableRow key={i} className="hover:bg-transparent">
              <TableCell><Skeleton className="h-4 w-40" /></TableCell>
              <TableCell className="text-right"><Skeleton className="ml-auto h-4 w-12" /></TableCell>
            </TableRow>
          ))
        ) : rows.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={2} className="p-0">
              <EmptyState title="No work log found for this month." />
            </TableCell>
          </TableRow>
        ) : (
          visibleRows.map((row) => (
            <TableRow key={row.rowKey} className={cn('hover:bg-muted/30', row.depth > 0 && 'bg-muted/10')}>
              <TableCell
                className={cn('truncate', row.depth === 0 ? 'font-medium' : 'font-normal text-muted-foreground')}
                style={{ paddingLeft: 16 + row.depth * 14 }}
                title={row.label}
              >
                {row.depth > 0 && <span className="mr-1 text-muted-foreground">{'└'}</span>}
                {row.hasChildren ? (
                  <button
                    type="button"
                    onClick={() => toggleExpanded(row.rowKey)}
                    className="mr-1 inline-flex align-middle text-muted-foreground transition-colors hover:text-foreground"
                  >
                    {expandedKeys.has(row.rowKey) ? <ChevronDown className="h-3.5 w-3.5" /> : <ChevronRight className="h-3.5 w-3.5" />}
                  </button>
                ) : null}
                {row.label}
              </TableCell>
              <TableCell className="text-right tabular-nums">{formatHoursCell(row.hours)}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>

      {!isLoading && rows.length > 0 && (
        <TableFooter>
          <TableRow className="hover:bg-transparent">
            <TableCell className="font-semibold">Total</TableCell>
            <TableCell className="text-right font-semibold">{formatHoursCell(data?.total_hours ?? 0)}</TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
};

export default MonthlySummaryMonthTable;
