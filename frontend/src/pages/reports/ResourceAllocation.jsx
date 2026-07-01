import { useState } from 'react';
import * as XLSX from 'xlsx';
import { createColumnHelper } from '@tanstack/react-table';
import { Download, Search } from 'lucide-react';
import { useResourceAllocationReport } from '@/hooks/useReports';
import { useDebounce } from '@/hooks/useDebounce';
import { useActiveEmployees } from '@/hooks/useEmployees';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { formatHours } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { cn } from '@/utils/cn';

const columnHelper = createColumnHelper();

const MONTH_OPTIONS = [
  { value: '1', label: 'January' },
  { value: '2', label: 'February' },
  { value: '3', label: 'March' },
  { value: '4', label: 'April' },
  { value: '5', label: 'May' },
  { value: '6', label: 'June' },
  { value: '7', label: 'July' },
  { value: '8', label: 'August' },
  { value: '9', label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const exportToExcel = (rows) => {
  const header = ['Code', 'Employee', 'Designation', 'Client', 'Service PO', 'PO Code', 'Service Type', 'PO Status', 'Billable', 'Hours Logged'];
  const dataRows = rows.map((r) => [
    r.employee_code ?? '',
    r.full_name ?? '',
    r.designation ?? '',
    r.client_name ?? '',
    r.service_po_name ?? '',
    r.service_po_code ?? '',
    r.service_type_name ?? '',
    r.po_status ?? '',
    r.is_billable ? 'Yes' : 'No',
    r.total_hours_logged != null ? Number(r.total_hours_logged) : '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Resource Allocation');
  XLSX.writeFile(wb, 'Resource_Allocation.xlsx');
};

const SERVICE_TYPE_COLORS = {
  staffaugmentation:    'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  'staff augmentation': 'bg-blue-500/10 text-blue-700 dark:text-blue-400',
  project:              'bg-violet-500/10 text-violet-700 dark:text-violet-400',
  support:              'bg-amber-500/10 text-amber-700 dark:text-amber-400',
  servicepack:          'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  'service pack':       'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400',
  'managed services':   'bg-cyan-500/10 text-cyan-700 dark:text-cyan-400',
};

const serviceTypeBadgeClass = (type) =>
  SERVICE_TYPE_COLORS[type?.toLowerCase()] ?? 'bg-muted text-muted-foreground';

const columns = [
  columnHelper.accessor('employee_code', {
    header: 'Code',
    meta: { sticky: true, left: 0 },
    size: 120,
    cell: (info) => (
      <span className="font-mono text-xs font-semibold text-muted-foreground">
        {info.getValue() || '—'}
      </span>
    ),
  }),
  columnHelper.accessor('full_name', {
    header: 'Employee',
    meta: { sticky: true, left: 120 },
    size: 220,
    cell: (info) => (
      <div>
        <p className="font-medium text-xs">{info.getValue() || '—'}</p>
        {info.row.original.designation && (
          <p className="text-[10px] text-muted-foreground">{info.row.original.designation}</p>
        )}
      </div>
    ),
  }),
  columnHelper.accessor('client_name', {
    header: 'Client',
    size: 200,
    cell: (info) => info.getValue() || <span className="text-muted-foreground">—</span>,
  }),
  columnHelper.accessor('service_po_name', {
    header: 'Service PO',
    size: 220,
    cell: (info) => (
      <div>
        <p className="text-xs">{info.getValue() || '—'}</p>
        {info.row.original.service_po_code && (
          <p className="text-[10px] font-mono text-muted-foreground">
            {info.row.original.service_po_code}
          </p>
        )}
      </div>
    ),
  }),
  columnHelper.accessor('service_type_name', {
    header: 'Service Type',
    size: 160,
    cell: (info) => {
      const val = info.getValue();
      return val ? (
        <span className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
          serviceTypeBadgeClass(val)
        )}>
          {val}
        </span>
      ) : (
        <span className="text-muted-foreground text-xs">—</span>
      );
    },
  }),
  columnHelper.accessor('po_status', {
    header: 'PO Status',
    size: 150,
    cell: (info) => {
      const v = info.getValue();
      return v ? (
        <span className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium capitalize',
          v === 'active'
            ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
            : 'bg-muted text-muted-foreground'
        )}>
          {v}
        </span>
      ) : <span className="text-muted-foreground text-xs">—</span>;
    },
  }),
  columnHelper.accessor('is_billable', {
    header: 'Billable',
    size: 110,
    cell: (info) => {
      const v = info.getValue();
      return (
        <span className={cn(
          'inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium',
          v ? 'bg-emerald-500/10 text-emerald-700 dark:text-emerald-400'
            : 'bg-muted text-muted-foreground'
        )}>
          {v ? 'Yes' : 'No'}
        </span>
      );
    },
  }),
  columnHelper.accessor('total_hours_logged', {
    header: 'Hours Logged',
    size: 140,
    cell: (info) => (
      <span className="tabular-nums font-medium">{formatHours(info.getValue())}</span>
    ),
  }),
];

const now = new Date();

const ResourceAllocation = () => {
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [employeeId, setEmployeeId] = useState('all');
  const [poId, setPoId] = useState('all');
  const [status, setStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const debouncedSearch = useDebounce(search, 400);
  const { data: activeEmployees = [] } = useActiveEmployees();
  const { data: activePOs = [] } = useActiveServicePOs();

  const params = {
    page,
    limit,
    ...(month && month !== 'all' && { month: Number(month) }),
    ...(year && year !== 'all' && { year: Number(year) }),
    ...(employeeId !== 'all' && { employeeId }),
    ...(poId !== 'all' && { poId }),
    ...(status !== 'all' && { status }),
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { data, isPending } = useResourceAllocationReport(params);

  const rows = Array.isArray(data?.data) ? data.data : [];
  const meta = data?.meta ?? {};

  return (
    <div>
      <PageHeader
        title="Resource Allocation"
        description="View employee-to-PO assignments and hours logged."
        actions={rows.length > 0 ? (
          <Button variant="outline" size="sm" onClick={() => exportToExcel(rows)}>
            <Download className="mr-1.5 h-4 w-4" />Export Excel
          </Button>
        ) : null}
      />

      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-end gap-4 w-full">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Month</Label>
          <Select value={month} onValueChange={(v) => { setMonth(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm w-36">
              <SelectValue placeholder="All months" />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Year</Label>
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
          <Label className="text-xs">Employee</Label>
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
          <Label className="text-xs">Service PO</Label>
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

        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <Label className="text-xs">Status</Label>
          <Select value={status} onValueChange={(v) => { setStatus(v); setPage(1); }}>
            <SelectTrigger className="h-9 text-sm w-full">
              <SelectValue placeholder="All Status" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Status</SelectItem>
              <SelectItem value="active">Active</SelectItem>
              <SelectItem value="closed">Closed</SelectItem>
              <SelectItem value="cancelled">Cancelled</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <Label className="text-xs">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Employee, PO…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-9 pl-9 w-full  text-sm"
            />
          </div>
        </div>
      </div>

      <DataTable
        tableContainerClassName="max-h-[50vh]"
        columns={columns}
        data={rows}
        isLoading={isPending}
        pagination={meta.total != null ? {
          page: meta.page ?? page,
          limit: meta.limit ?? limit,
          total: meta.total,
        } : undefined}
        onPageChange={setPage}
        onPageSizeChange={(s) => { setLimit(s); setPage(1); }}
      />
    </div>
  );
};

export default ResourceAllocation;
