import { useState } from 'react';
import * as XLSX from 'xlsx';
import { createColumnHelper } from '@tanstack/react-table';
import { Download, Search } from 'lucide-react';
import { useOperationalCost } from '@/hooks/useReports';
import { useDebounce } from '@/hooks/useDebounce';
import { formatCurrency, formatMonthYear } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Progress } from '@/components/ui/progress';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';

const columnHelper = createColumnHelper();

const MONTH_OPTIONS = [
  { value: 'all', label: 'All months' },
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
  const header = ['Code', 'Employee', 'Designation', 'Month / Year', 'Salary Cost', 'Salary %', 'Ops Cost', 'Ops %', 'Billable Cost', 'Billable %', 'Total Cost'];
  const dataRows = rows.map((r) => [
    r.employee_code ?? '',
    r.full_name ?? '',
    r.designation ?? '',
    formatMonthYear(r.month, r.year),
    r.salary_cost != null ? Number(r.salary_cost) : '',
    r.salary_pct_of_total != null ? Number(r.salary_pct_of_total) : '',
    r.ops_cost != null ? Number(r.ops_cost) : '',
    r.ops_pct_of_total != null ? Number(r.ops_pct_of_total) : '',
    r.billable_cost != null ? Number(r.billable_cost) : '',
    r.billable_pct_of_total != null ? Number(r.billable_pct_of_total) : '',
    r.total_cost != null ? Number(r.total_cost) : '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Operational Cost');
  XLSX.writeFile(wb, 'Operational_Cost.xlsx');
};

const PctCell = ({ value }) => {
  const pct = value != null ? Number(value) : null;
  if (pct === null) return <span className="text-muted-foreground">—</span>;
  return (
    <div className="flex items-center gap-2 min-w-[100px]">
      <Progress value={Math.min(pct, 100)} className="h-1.5 flex-1" />
      <span className="tabular-nums text-xs w-10 text-right">{pct.toFixed(1)}%</span>
    </div>
  );
};

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
  columnHelper.accessor((row) => formatMonthYear(row.month, row.year), {
    id: 'month_year',
    header: 'Month / Year',
    size: 130,
    cell: (info) => <span className="tabular-nums text-xs">{info.getValue()}</span>,
  }),
  columnHelper.accessor('salary_cost', {
    header: 'Salary Cost',
    size: 140,
    cell: (info) => (
      <span className="tabular-nums">{formatCurrency(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor('salary_pct_of_total', {
    header: 'Salary %',
    size: 150,
    cell: (info) => <PctCell value={info.getValue()} />,
  }),
  columnHelper.accessor('ops_cost', {
    header: 'Ops Cost',
    size: 140,
    cell: (info) => (
      <span className="tabular-nums">{formatCurrency(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor('ops_pct_of_total', {
    header: 'Ops %',
    size: 150,
    cell: (info) => <PctCell value={info.getValue()} />,
  }),
  columnHelper.accessor('billable_cost', {
    header: 'Billable Cost',
    size: 140,
    cell: (info) => (
      <span className="tabular-nums text-emerald-700 dark:text-emerald-400">
        {formatCurrency(info.getValue())}
      </span>
    ),
  }),
  columnHelper.accessor('billable_pct_of_total', {
    header: 'Billable %',
    size: 150,
    cell: (info) => <PctCell value={info.getValue()} />,
  }),
  columnHelper.accessor('total_cost', {
    header: 'Total Cost',
    size: 140,
    cell: (info) => (
      <span className="tabular-nums font-semibold">{formatCurrency(info.getValue())}</span>
    ),
  }),
];

const now = new Date();

const OperationalCost = () => {
  const [year, setYear] = useState(String(now.getFullYear()));
  const [month, setMonth] = useState(String(now.getMonth() + 1));
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const debouncedSearch = useDebounce(search, 400);

  const params = {
    page,
    limit,
    ...(year && { year }),
    ...(month && month !== 'all' && { month }),
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { data, isPending } = useOperationalCost(params);

  // data.data = { records: [...], summary: {...} }
  const rows    = Array.isArray(data?.data?.records) ? data.data.records : [];
  const summary = data?.data?.summary ?? {};
  const meta    = data?.meta ?? {};

  return (
    <div>
      <PageHeader
        title="Operational Cost"
        description="Per-employee breakdown of salary and operational costs by month."
        actions={rows.length > 0 ? (
          <Button variant="outline" size="sm" onClick={() => exportToExcel(rows)}>
            <Download className="mr-1.5 h-4 w-4" />Export Excel
          </Button>
        ) : null}
      />

      {/* Filter bar */}
      <div className="mb-5 flex flex-wrap items-end gap-3">
        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Year</Label>
          <Select value={year} onValueChange={(v) => { setYear(v); setPage(1); }}>
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
          <Label className="text-xs">Month</Label>
          <Select value={month} onValueChange={(v) => { setMonth(v); setPage(1); }}>
            <SelectTrigger className="h-9 w-36 text-sm">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {MONTH_OPTIONS.map((m) => (
                <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label className="text-xs">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Name, code…"
              value={search}
              onChange={(e) => { setSearch(e.target.value); setPage(1); }}
              className="h-9 pl-9 w-52 text-sm"
            />
          </div>
        </div>
      </div>

      {/* Summary chips */}
      {!isPending && summary.total_cost != null && (
        <div className="mb-4 flex flex-wrap gap-3">
          {summary.total_salary_cost != null && (
            <div className="rounded-md border bg-muted/40 px-3 py-1.5 text-xs">
              <span className="text-muted-foreground">Total Salary </span>
              <span className="font-semibold tabular-nums">{formatCurrency(summary.total_salary_cost)}</span>
            </div>
          )}
          {summary.total_ops_cost != null && (
            <div className="rounded-md border bg-muted/40 px-3 py-1.5 text-xs">
              <span className="text-muted-foreground">Total Ops </span>
              <span className="font-semibold tabular-nums">{formatCurrency(summary.total_ops_cost)}</span>
            </div>
          )}
          {summary.total_billable_cost != null && (
            <div className="rounded-md border bg-emerald-500/10 px-3 py-1.5 text-xs text-emerald-700 dark:text-emerald-400">
              <span>Total Billable </span>
              <span className="font-semibold tabular-nums">{formatCurrency(summary.total_billable_cost)}</span>
            </div>
          )}
          {summary.total_cost != null && (
            <div className="rounded-md border bg-blue-500/10 px-3 py-1.5 text-xs text-blue-700 dark:text-blue-400">
              <span>Grand Total </span>
              <span className="font-semibold tabular-nums">{formatCurrency(summary.total_cost)}</span>
            </div>
          )}
        </div>
      )}

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

export default OperationalCost;
