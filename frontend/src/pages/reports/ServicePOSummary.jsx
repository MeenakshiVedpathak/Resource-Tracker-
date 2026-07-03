import { useState } from 'react';
import * as XLSX from 'xlsx';
import { createColumnHelper } from '@tanstack/react-table';
import { Download, Search } from 'lucide-react';
import { useServicePOSummary } from '@/hooks/useReports';
import { useActiveClients } from '@/hooks/useClients';
import { useActiveServiceTypes } from '@/hooks/useServiceTypes';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency, formatDate, formatHours } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import StatusBadge from '@/components/common/StatusBadge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { DateRangePicker } from '@/components/ui/date-range-picker';


const columnHelper = createColumnHelper();

const exportToExcel = (rows) => {
  const header = [
    'PO Code', 'PO Name', 'Client Name', 'Service Type', 'Start Date', 'End Date', 
    'Status', 'Billable', 'Invoice Freq.', 'Account Manager', 'PO Value', 
    'Expected Hours', 'Hours Delivered Before Month', 'Available Hours', 
    'Billable Amount', 'Invoiced Amount', 'Unbilled Amount'
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
    header: 'Billable Amount',
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

const SummaryItem = ({ label, value, highlight = false, negative = false }) => (
  <div className="flex flex-col gap-0.5">
    <span className="text-[11px] text-muted-foreground">{label}</span>
    <span className={`text-sm font-semibold tabular-nums ${negative ? 'text-destructive' : highlight ? 'text-foreground' : 'text-foreground'}`}>
      {value}
    </span>
  </div>
);

const ServicePOSummary = () => {
  const [monthYear, setMonthYear] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });
  const [clientId, setClientId] = useState('all');
  const [serviceTypeId, setServiceTypeId] = useState('all');

  const [billable, setBillable] = useState('all');
  const [status, setStatus] = useState('all');
  const [dateRange, setDateRange] = useState(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const debouncedSearch = useDebounce(search, 400);
  const { data: activeClients = [] } = useActiveClients();
  const { data: activeServiceTypes = [] } = useActiveServiceTypes();

  const params = {
    ...(monthYear && { month: monthYear.month, year: monthYear.year }),
    ...(clientId && clientId !== 'all' && { clientId }),
    ...(serviceTypeId && serviceTypeId !== 'all' && { serviceTypeId }),

    ...(billable && billable !== 'all' && { isBillable: billable === 'yes' }),
    ...(status && status !== 'all' && { status }),
    ...(dateRange?.startDate && { startDate: dateRange.startDate }),
    ...(dateRange?.endDate && { endDate: dateRange.endDate }),
    page,
    limit,
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { data, isPending } = useServicePOSummary(params);

  const records = Array.isArray(data?.data?.records) ? data.data.records : Array.isArray(data?.data) ? data.data : [];
  const summary = data?.data?.summary ?? null;
  const meta = data?.meta ?? {};

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
      <div className="mb-5 flex flex-wrap items-end gap-4 w-full">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Month &amp; Year <span className="text-destructive">*</span></Label>
          <MonthYearPicker
            value={monthYear}
            onChange={(val) => { setMonthYear(val); setPage(1); }}
            placeholder="Select month"
            className="w-44"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">PO Start &amp; End Date</Label>
          <DateRangePicker
            value={dateRange}
            onChange={(val) => { setDateRange(val); setPage(1); }}
            placeholder="PO start → end date"
            className="w-52"
          />
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <Label className="text-xs">Client</Label>
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
            className="h-9 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5 min-w-[180px]">
          <Label className="text-xs">Service Type</Label>
          <SearchableSelect
            options={[
              { label: 'All Service Types', value: 'all' },
              ...activeServiceTypes.map((st) => ({
                label: st.service_type_name,
                value: String(st.id),
              })),
            ]}
            value={serviceTypeId}
            onValueChange={(v) => { setServiceTypeId(v); setPage(1); }}
            placeholder="All Service Types"
            searchPlaceholder="Search service type..."
            className="h-9 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Billable</Label>
          <SearchableSelect showSearch={false}
            options={[
              { label: "All", value: "all" },
              { label: "Yes", value: "yes" },
              { label: "No", value: "no" }
            ]}
            value={billable}
            onValueChange={(v) => { setBillable(v); setPage(1); }}
            placeholder="All"
            className="h-9 w-24 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Status</Label>
          <SearchableSelect showSearch={false}
            options={[
              { label: "All", value: "all" },
              { label: "Active", value: "active" },
              { label: "Expired", value: "expired" },
              { label: "On Hold", value: "on_hold" },
              { label: "Cancelled", value: "cancelled" },
            ]}
            value={status}
            onValueChange={(v) => { setStatus(v); setPage(1); }}
            placeholder="All"
            className="h-9 w-32 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <Label className="text-xs">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="PO Name, Client…"
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

      {summary && (
        <div className="mt-4 rounded-lg border bg-muted/40 px-4 py-3">
          <p className="mb-2.5 text-xs font-semibold text-muted-foreground uppercase tracking-wide">Totals (all pages)</p>
          <div className="flex flex-wrap gap-x-6 gap-y-2">
            <SummaryItem label="PO Value" value={formatCurrency(summary.total_po_value)} />
            <SummaryItem label="Exp. Hours" value={formatHours(summary.total_expected_man_hours)} />
            <SummaryItem label="Delivered Before Month" value={formatHours(summary.total_hours_delivered_before_month)} />
            <SummaryItem label="Available Hours" value={formatHours(summary.total_available_hours)} />
            <SummaryItem label="Billable Amount" value={formatCurrency(summary.total_monthly_billable_amount)} highlight />
            <SummaryItem label="Invoiced Amount" value={formatCurrency(summary.total_invoiced_amount)} highlight />
            <SummaryItem
              label="Unbilled Amount"
              value={formatCurrency(summary.total_unbilled_amount)}
              highlight
              negative={summary.total_unbilled_amount < 0}
            />
          </div>
        </div>
      )}
    </div>
  );
};

export default ServicePOSummary;
