import { useState } from 'react';
import * as XLSX from 'xlsx';
import { createColumnHelper } from '@tanstack/react-table';
import { Download, Search } from 'lucide-react';
import { useServicePOSummary } from '@/hooks/useReports';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency, formatDate, formatHours } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

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

const columnHelper = createColumnHelper();

const exportToExcel = (rows) => {
  const header = [
    'PO Code', 'PO Name', 'Client Name', 'Service Type', 'Start Date', 'End Date', 
    'Status', 'Billable', 'Invoice Freq.', 'Account Manager', 'PO Value', 
    'Expected Hours', 'Hours Delivered Before Month', 'Available Hours', 
    'Monthly Billable Amount', 'Invoiced Amount', 'Unbilled Amount'
  ];
  const dataRows = rows.map((r) => [
    r.service_po_code ?? '',
    r.service_po_name ?? '',
    r.client_name ?? '',
    r.service_type ?? '',
    r.start_date ? formatDate(r.start_date) : '',
    r.end_date ? formatDate(r.end_date) : '',
    r.status ?? '',
    r.is_billable ? 'Yes' : 'No',
    r.invoice_frequency ?? '',
    r.account_manager ?? '',
    r.po_value != null ? Number(r.po_value) : '',
    r.expected_man_hours != null ? Number(r.expected_man_hours) : '',
    r.hours_delivered_before_month != null ? Number(r.hours_delivered_before_month) : '',
    r.available_hours != null ? Number(r.available_hours) : '',
    r.monthly_billable_amount != null ? Number(r.monthly_billable_amount) : '',
    r.invoiced_amount != null ? Number(r.invoiced_amount) : '',
    r.unbilled_amount != null ? Number(r.unbilled_amount) : '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Service PO Summary');
  XLSX.writeFile(wb, `Service_PO_Summary.xlsx`);
};

const now = new Date();

const ValueCell = ({ value, format = 'currency' }) => {
  if (value == null || value === '') return <span className="text-muted-foreground">—</span>;
  
  if (format === 'hours') {
      return <span className="tabular-nums">{formatHours(value)}</span>;
  }
  return <span className="tabular-nums">{formatCurrency(value)}</span>;
};


const columns = [
  columnHelper.accessor('service_po_code', {
    header: 'PO Code',
    size: 160,
    meta: { sticky: true, left: 0 },
    cell: (info) => (
      <span className="font-mono text-xs font-semibold text-muted-foreground whitespace-nowrap">
        {info.getValue() || '—'}
      </span>
    ),
  }),
  columnHelper.accessor('service_po_name', {
    header: 'PO Name',
    size: 240,
    meta: { sticky: true, left: 160 },
    cell: (info) => <div className="truncate font-medium max-w-[220px]" title={info.getValue()}>{info.getValue() || '—'}</div>,
  }),
  columnHelper.accessor('client_name', {
    header: 'Client',
    size: 220,
    cell: (info) => <div className="truncate max-w-[200px]" title={info.getValue()}>{info.getValue() || '—'}</div>,
  }),
  columnHelper.accessor('service_type', {
    header: 'Service Type',
    size: 150,
    cell: (info) => info.getValue() || '—',
  }),
  columnHelper.accessor('status', {
    header: 'Status',
    size: 160,
    cell: (info) => <StatusBadge status={info.getValue()} />,
  }),
  columnHelper.accessor('start_date', {
    header: 'Start Date',
    size: 120,
    cell: (info) => formatDate(info.getValue()),
  }),
  columnHelper.accessor('end_date', {
    header: 'End Date',
    size: 120,
    cell: (info) => formatDate(info.getValue()),
  }),
  columnHelper.accessor('po_value', {
    header: 'PO Value',
    size: 160,
    cell: (info) => <ValueCell value={info.getValue()} />,
  }),
  columnHelper.accessor('expected_man_hours', {
    header: 'Exp. Hours',
    size: 140,
    cell: (info) => <ValueCell value={info.getValue()} format="hours" />,
  }),
  columnHelper.accessor('hours_delivered_before_month', {
    header: 'Delivered Before Month',
    size: 180,
    cell: (info) => <ValueCell value={info.getValue()} format="hours" />,
  }),
  columnHelper.accessor('available_hours', {
    header: 'Available Hours',
    size: 150,
    cell: (info) => <ValueCell value={info.getValue()} format="hours" />,
  }),
  columnHelper.accessor('monthly_billable_amount', {
    header: 'Monthly Billable',
    size: 160,
    cell: (info) => <ValueCell value={info.getValue()} />,
  }),
  columnHelper.accessor('invoiced_amount', {
    header: 'Invoiced Amount',
    size: 160,
    cell: (info) => <ValueCell value={info.getValue()} />,
  }),
  columnHelper.accessor('unbilled_amount', {
    header: 'Unbilled Amount',
    size: 160,
    cell: (info) => <ValueCell value={info.getValue()} />,
  }),
];

const ServicePOSummary = () => {
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [year, setYear] = useState(String(now.getFullYear()));
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(20);
  const [committed, setCommitted] = useState({ month: String(now.getMonth() + 1), year: String(now.getFullYear()) });

  const debouncedSearch = useDebounce(search, 400);

  const params = {
    month: committed.month,
    year: committed.year,
    page,
    limit,
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { data, isPending } = useServicePOSummary(params);

  const records = Array.isArray(data?.data?.records) ? data.data.records : Array.isArray(data?.data) ? data.data : [];
  const meta = data?.meta ?? {};

  const handleRunReport = () => {
    if (!month || !year) return;
    setPage(1);
    setCommitted({ month, year });
  };

  const canRun = !!month && !!year;

  return (
    <div>
      <PageHeader
        title="Service PO Summary"
        description="Comprehensive summary of Service POs including hours and billing data."
        actions={records.length > 0 ? (
          <Button variant="outline" size="sm" onClick={() => exportToExcel(records)}>
            <Download className="mr-1.5 h-4 w-4" />Export Excel
          </Button>
        ) : null}
      />

      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Month <span className="text-destructive">*</span></Label>
          <Select value={month} onValueChange={setMonth}>
            <SelectTrigger className="h-9 w-36 text-sm">
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
          <Label className="text-xs">Year <span className="text-destructive">*</span></Label>
          <Select value={year} onValueChange={(v) => setYear(v)}>
            <SelectTrigger className="h-9 w-24 text-sm">
              <SelectValue placeholder="Year" />
            </SelectTrigger>
            <SelectContent>
              {Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i).map(y => (
                <SelectItem key={y} value={String(y)}>{y}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="PO Name, Client…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-9 pl-9 w-64 text-sm"
            />
          </div>
        </div>

        <Button
          size="sm"
          onClick={handleRunReport}
          disabled={!canRun}
          className="self-end"
        >
          Apply
        </Button>
      </div>

      <DataTable
        columns={columns}
        data={records}
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

export default ServicePOSummary;
