import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Download } from 'lucide-react';
import { useServicePOResourceReport } from '@/hooks/useReports';
import { useActiveEmployees } from '@/hooks/useEmployees';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { formatMonthYear } from '@/utils/formatters';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';

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

const SERVICE_TYPE_COLORS = {
  staffaugmentation:    'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  'staff augmentation': 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  project:              'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  support:              'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  servicepack:          'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  'service pack':       'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
};

const serviceTypeBadgeClass = (type) =>
  SERVICE_TYPE_COLORS[type?.toLowerCase()] ?? 'bg-muted text-muted-foreground';

// Normalise field names — the API may use different keys depending on backend version
const getField = (row, ...keys) => {
  for (const k of keys) {
    if (row[k] != null && row[k] !== '') return row[k];
  }
  return null;
};

// Group flat rows by customer → po_name
const groupRows = (rows) => {
  const map = new Map(); // key: `${customer}|||${po_name}`

  rows.forEach((row) => {
    const customer = getField(row, 'customer_name', 'client_name', 'client') ?? '(No Customer)';
    const po       = getField(row, 'po_name', 'service_po_name', 'po_summary', 'po_title') ?? '(No PO)';
    const key      = `${customer}|||${po}`;

    if (!map.has(key)) {
      map.set(key, {
        customer,
        po,
        service_type: getField(row, 'service_type_name', 'service_type', 'po_type', 'type'),
        rows: [],
      });
    }
    map.get(key).rows.push(row);
  });

  return Array.from(map.values());
};

const exportToExcel = (rows, month, year) => {
  const monthLabel = MONTH_OPTIONS.find((m) => m.value === String(month))?.label ?? month;

  const header = ['Sr. No.', 'Customer Name', 'Service PO Summary', 'Service Type', 'Resource', 'Time in Hrs', 'Remarks'];
  let srNo = 1;
  const dataRows = [];

  const groups = groupRows(rows);
  groups.forEach((group) => {
    group.rows.forEach((row, i) => {
      const employee = getField(row, 'full_name', 'employee_name', 'resource_name');
      const hours    = getField(row, 'total_hours_logged', 'hours_logged', 'hours', 'time_in_hrs');
      const remarks  = getField(row, 'remarks') ?? '';

      dataRows.push([
        i === 0 ? srNo++ : '',
        i === 0 ? group.customer : '',
        i === 0 ? group.po : '',
        i === 0 ? (group.service_type ?? '') : '',
        employee ?? '',
        hours != null ? Number(hours) : '',
        remarks,
      ]);
    });
  });

  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Service PO vs Resource');
  XLSX.writeFile(wb, `ServicePO_Resource_${monthLabel}_${year}.xlsx`);
};

// ─── main component ──────────────────────────────────────────────────────────
const ServicePOResource = () => {
  const [month, setMonth] = useState(String(new Date().getMonth() + 1));
  const [year,  setYear]  = useState(String(new Date().getFullYear()));
  const [employeeId, setEmployeeId] = useState('all');
  const [poId, setPoId] = useState('all');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const { data: activeEmployees = [] } = useActiveEmployees();
  const { data: activePOs = [] } = useActiveServicePOs();

  const params = {
    ...(month && month !== 'all' && { month: Number(month) }),
    ...(year && year !== 'all' && Number(year) >= 2000 && { year: Number(year) }),
    ...(employeeId !== 'all' && { employeeId }),
    ...(poId !== 'all' && { poId }),

    page,
    limit,
  };

  const { data, isPending } = useServicePOResourceReport(params);

  const rows   = data?.data ?? [];
  const meta   = data?.meta ?? {};
  const groups = useMemo(() => groupRows(rows), [rows]);

  const monthLabel  = month ? formatMonthYear(Number(month), Number(year)) : '';
  const totalHours  = rows.reduce((sum, r) => {
    const h = getField(r, 'total_hours_logged', 'hours_logged', 'hours', 'time_in_hrs');
    return sum + (h ? Number(h) : 0);
  }, 0);

  return (
    <div>
      <PageHeader
        title="Service PO vs Resource"
        description="Resources allocated per Service PO for a selected month"
        actions={
          rows.length > 0 ? (
            <Button variant="outline" size="sm" onClick={() => exportToExcel(rows, month, year)}>
              <Download className="mr-1.5 h-4 w-4" />
              Export Excel
            </Button>
          ) : null
        }
      />

      {/* ── Filters ── */}
      <div className="mb-5 flex flex-wrap items-end gap-4 w-full">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium">Month</Label>
          <Select value={month} onValueChange={(v) => { setMonth(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm w-36">
              <SelectValue placeholder="Select month" />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs font-medium">Year</Label>
          <Select value={year} onValueChange={(v) => { setYear(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm w-24">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All</SelectItem>
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <Label className="text-xs font-medium">Employee</Label>
          <Select value={employeeId} onValueChange={(v) => { setEmployeeId(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm w-full">
              <SelectValue placeholder="All Employees" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Employees</SelectItem>
              {activeEmployees.map((e) => (
                <SelectItem key={e.id} value={String(e.id)}>{e.full_name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <Label className="text-xs font-medium">Service PO</Label>
          <Select value={poId} onValueChange={(v) => { setPoId(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm w-full">
              <SelectValue placeholder="All POs" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All POs</SelectItem>
              {activePOs.map((po) => (
                <SelectItem key={po.id} value={String(po.id)}>
                  {po.service_po_name || po.service_po_code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>


      </div>

      {/* ── States ── */}
      {isPending ? (
        <div className="space-y-2">
          {Array.from({ length: 8 }).map((_, i) => (
            <Skeleton key={i} className="h-10 w-full" />
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="rounded-lg border py-20 text-center">
          <p className="text-sm text-muted-foreground">No allocation data found.</p>
        </div>
      ) : (
        <>

          {/* ── Table ── */}
          <div className="rounded-lg border overflow-hidden">
            <div className="overflow-auto max-h-[50vh]">
              <table className="w-full border-collapse text-sm">
                <thead className="sticky top-0 z-20 bg-background shadow-sm">
                  <tr className="border-b bg-muted/60">
                  <th className="w-[48px] px-3 py-2.5 text-left text-xs font-semibold border-r border-border">#</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold border-r border-border min-w-[160px]">Customer Name</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold border-r border-border min-w-[200px]">Service PO Summary</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold border-r border-border w-[150px]">Service Type</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold border-r border-border min-w-[180px]">Resource</th>
                  <th className="px-3 py-2.5 text-right text-xs font-semibold border-r border-border w-[110px]">Time (hrs)</th>
                  <th className="px-3 py-2.5 text-left text-xs font-semibold w-[160px]">Remarks</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {groups.map((group, gi) =>
                  group.rows.map((row, ri) => {
                    const isFirst    = ri === 0;
                    const rowCount   = group.rows.length;
                    const employee   = getField(row, 'employee_name', 'full_name', 'resource_name');
                    const hours      = getField(row, 'total_hours_logged', 'hours_logged', 'hours', 'time_in_hrs');
                    const remarks    = getField(row, 'remarks');
                    const employeeCode = getField(row, 'employee_code');

                    return (
                      <tr
                        key={`${gi}-${ri}`}
                        className={cn(
                          'hover:bg-muted/30 transition-colors',
                          isFirst && gi > 0 && 'border-t-2 border-border/60'
                        )}
                      >
                        {/* Sr No — only on first row of group, rowSpan */}
                        {isFirst && (
                          <td
                            rowSpan={rowCount}
                            className="px-3 py-2 text-xs text-muted-foreground text-center border-r border-border align-top pt-3"
                          >
                            {gi + 1}
                          </td>
                        )}
                        {/* Customer — only on first row */}
                        {isFirst && (
                          <td
                            rowSpan={rowCount}
                            className="px-3 py-2 text-xs font-medium border-r border-border align-top pt-3"
                          >
                            {group.customer}
                          </td>
                        )}
                        {/* PO — only on first row */}
                        {isFirst && (
                          <td
                            rowSpan={rowCount}
                            className="px-3 py-2 text-xs border-r border-border align-top pt-3"
                          >
                            {group.po}
                          </td>
                        )}
                        {/* Service Type — only on first row */}
                        {isFirst && (
                          <td
                            rowSpan={rowCount}
                            className="px-3 py-2 border-r border-border align-top pt-3"
                          >
                            {group.service_type ? (
                              <span className={cn(
                                'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
                                serviceTypeBadgeClass(group.service_type)
                              )}>
                                {group.service_type}
                              </span>
                            ) : (
                              <span className="text-muted-foreground text-xs">—</span>
                            )}
                          </td>
                        )}
                        {/* Resource */}
                        <td className="px-3 py-2 border-r border-border">
                          {employee ? (
                            <div>
                              <p className="text-xs font-medium">{employee}</p>
                              {employeeCode && (
                                <p className="text-[10px] text-muted-foreground font-mono">{employeeCode}</p>
                              )}
                            </div>
                          ) : (
                            <span className="text-xs text-muted-foreground italic">Unassigned</span>
                          )}
                        </td>
                        {/* Hours */}
                        <td className="px-3 py-2 text-right border-r border-border">
                          {hours != null ? (
                            <span className="tabular-nums text-xs font-medium">{Number(hours).toFixed(1)}</span>
                          ) : (
                            <span className="text-xs text-muted-foreground">—</span>
                          )}
                        </td>
                        {/* Remarks */}
                        <td className="px-3 py-2 text-xs text-muted-foreground">
                          {remarks || '—'}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
            </div>
          </div>

          <div className="mt-3 flex items-center justify-between gap-2">
            <p className="text-xs text-muted-foreground">
              {meta.total != null
                ? `${meta.total} record${meta.total !== 1 ? 's' : ''} · page ${meta.page ?? page} of ${meta.totalPages ?? 1}`
                : `${groups.length} service PO${groups.length !== 1 ? 's' : ''} · ${rows.length} resource row${rows.length !== 1 ? 's' : ''}`}
              {monthLabel ? ` · ${monthLabel}` : ''}
            </p>
                        <div className="flex items-center gap-3">
              <div className="flex items-center gap-2">
                <span className="text-xs text-muted-foreground whitespace-nowrap">Rows per page</span>
                <Select value={String(limit)} onValueChange={(v) => { setLimit(Number(v)); setPage(1); }}>
                  <SelectTrigger className="h-7 text-xs bg-white w-full">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {[10, 20, 50, 100].map(s => <SelectItem key={s} value={String(s)}>{s}</SelectItem>)}
                  </SelectContent>
                </Select>
              </div>
              {(meta.totalPages ?? 1) > 1 && (
              <div className="flex items-center gap-1">
                <Button
                  variant="outline" size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={!(meta.hasPrev || meta.hasPrevPage)}
                  onClick={() => setPage((p) => Math.max(1, p - 1))}
                >
                  Previous
                </Button>
                <span className="text-xs text-muted-foreground px-1">
                  {meta.page ?? page} / {meta.totalPages}
                </span>
                <Button
                  variant="outline" size="sm"
                  className="h-7 px-2 text-xs"
                  disabled={!(meta.hasNext || meta.hasNextPage)}
                  onClick={() => setPage((p) => p + 1)}
                >
                  Next
                </Button>
              </div>
            )}
            </div>
          </div>
        </>
      )}
    </div>
  );
};

export default ServicePOResource;
