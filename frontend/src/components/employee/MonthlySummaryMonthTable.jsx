import {
  Table, TableHeader, TableBody, TableFooter, TableRow, TableHead, TableCell,
} from '@/components/ui/table';
import { Skeleton } from '@/components/ui/skeleton';
import EmptyState from '@/components/common/EmptyState';

// Month View — flat Service PO totals for the whole month, no per-day breakdown and no
// hierarchy children (see MonthlySummaryMonthView shape in employeeWorkLog.api.js). Renders
// `data.service_pos` / `data.total_hours` exactly as returned by the server; never
// recomputed or re-aggregated client-side.
const MonthlySummaryMonthTable = ({ data, isLoading }) => {
  const servicePos = data?.service_pos ?? [];

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
        ) : servicePos.length === 0 ? (
          <TableRow className="hover:bg-transparent">
            <TableCell colSpan={2} className="p-0">
              <EmptyState title="No work log found for this month." />
            </TableCell>
          </TableRow>
        ) : (
          servicePos.map((po) => (
            <TableRow key={po.service_po_id} className="hover:bg-transparent">
              <TableCell>{po.service_po_name}</TableCell>
              <TableCell className="text-right">{po.hours}</TableCell>
            </TableRow>
          ))
        )}
      </TableBody>

      {!isLoading && servicePos.length > 0 && (
        <TableFooter>
          <TableRow className="hover:bg-transparent">
            <TableCell className="font-semibold">Total</TableCell>
            <TableCell className="text-right font-semibold">{data?.total_hours ?? 0}</TableCell>
          </TableRow>
        </TableFooter>
      )}
    </Table>
  );
};

export default MonthlySummaryMonthTable;
