import { useState, useMemo } from 'react';
import * as XLSX from 'xlsx';
import { Download, Filter } from 'lucide-react';
import { useServicePOResourceReport } from '@/hooks/useReports';
import { useActiveEmployees } from '@/hooks/useEmployees';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useActiveClients } from '@/hooks/useClients';
import { formatMonthYear } from '@/utils/formatters';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { Label } from '@/components/ui/label';
import { Input } from '@/components/ui/input';
import { Skeleton } from '@/components/ui/skeleton';
import { Badge } from '@/components/ui/badge';
import { cn } from '@/utils/cn';


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

const MONTH_NAMES = ['January','February','March','April','May','June','July','August','September','October','November','December'];

const exportToExcel = (rows, month, year) => {
  const monthLabel = MONTH_NAMES[(month - 1)] ?? month;

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
  const [monthYear, setMonthYear] = useState({
    month: new Date().getMonth() + 1,
    year: new Date().getFullYear(),
  });
  const [employeeId, setEmployeeId] = useState('all');
  const [poId, setPoId] = useState('all');
  const [clientId, setClientId] = useState('all');

  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const { data: activeEmployees = [] } = useActiveEmployees();
  const { data: activePOs = [] } = useActiveServicePOs();
  const { data: activeClients = [] } = useActiveClients();

  const params = {
    ...(monthYear && { month: monthYear.month }),
    ...(monthYear && { year: monthYear.year }),
    ...(employeeId !== 'all' && { employeeId }),
    ...(poId !== 'all' && { poId }),
    ...(clientId !== 'all' && { clientId }),
    page,
    limit,
  };

  const { data, isPending } = useServicePOResourceReport(params);

  const rows   = data?.data ?? [];
  const meta   = data?.meta ?? {};
  const groups = useMemo(() => groupRows(rows), [rows]);

  const monthLabel  = monthYear ? formatMonthYear(monthYear.month, monthYear.year) : '';
  const totalHours  = rows.reduce((sum, r) => {
    const h = getField(r, 'total_hours_logged', 'hours_logged', 'hours', 'time_in_hrs');
    return sum + (h ? Number(h) : 0);
  }, 0);

  const activeFilterCount = [
    employeeId !== 'all' ? 1 : 0,
    poId !== 'all' ? 1 : 0,
    clientId !== 'all' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  return (
    <div>
      <PageHeader
        title="Service PO vs Resource"
        description="Resources allocated per Service PO for a selected month"
        actions={
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              className="h-9 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
              onClick={() => setFiltersOpen((o) => !o)}
            >
              <Filter className="h-4 w-4" />
              Filters
              {activeFilterCount > 0 && (
                <span className="flex h-4 w-4 items-center justify-center rounded-full bg-primary text-[10px] font-semibold text-primary-foreground">
                  {activeFilterCount}
                </span>
              )}
            </Button>
            {rows.length > 0 && (
              <Button variant="outline" size="sm" className="h-9" onClick={() => exportToExcel(rows, monthYear?.month, monthYear?.year)}>
                <Download className="mr-1.5 h-4 w-4" />Export Excel
              </Button>
            )}
          </div>
        }
      />

      {/* ── Collapsible Filter Panel ── */}
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${filtersOpen ? 'max-h-[220px] opacity-100 mb-5' : 'max-h-0 opacity-0 mb-0'}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full rounded-lg border bg-muted/30 p-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Month &amp; Year</Label>
            <MonthYearPicker
              value={monthYear}
              onChange={(val) => { setMonthYear(val); setPage(1); }}
              placeholder="All months"
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Client</Label>
            <SearchableSelect
              options={[
                { label: "All Clients", value: "all" },
                ...activeClients.map((c) => ({
                  label: c.client_name,
                  value: String(c.id)
                }))
              ]}
              value={clientId}
              onValueChange={(v) => { setClientId(v); setPage(1); }}
              placeholder="All Clients"
              searchPlaceholder="Search client..."
              className="h-9 text-sm w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Employee</Label>
            <SearchableSelect
              options={[
                { label: "All Employees", value: "all" },
                ...activeEmployees.map((e) => ({
                  label: e.full_name,
                  value: String(e.id)
                }))
              ]}
              value={employeeId}
              onValueChange={(v) => { setEmployeeId(v); setPage(1); }}
              placeholder="All Employees"
              searchPlaceholder="Search employee..."
              className="h-9 text-sm w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-medium">Service PO</Label>
            <SearchableSelect
              options={[
                { label: "All POs", value: "all" },
                ...activePOs.map((po) => ({
                  label: po.service_po_name || po.service_po_code || String(po.id),
                  value: String(po.id)
                }))
              ]}
              value={poId}
              onValueChange={(v) => { setPoId(v); setPage(1); }}
              placeholder="All POs"
              searchPlaceholder="Search PO..."
              className="h-9 text-sm w-full"
            />
          </div>
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
