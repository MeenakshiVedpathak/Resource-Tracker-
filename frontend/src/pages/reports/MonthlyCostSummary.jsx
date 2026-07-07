import { useState } from 'react';
import * as XLSX from 'xlsx';
import { createColumnHelper } from '@tanstack/react-table';
import { Download, Filter } from 'lucide-react';
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts';
import { useMonthlyCostSummary } from '@/hooks/useReports';
import { formatCurrency, formatMonthYear } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem,  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MonthYearPicker } from '@/components/ui/month-year-picker';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

const columnHelper = createColumnHelper();

const exportToExcel = (rows) => {
  const header = ['Month / Year', 'Employees', 'Salary Cost', 'Ops Cost', 'Billable Cost', 'Total Cost'];
  const dataRows = rows.map((r) => [
    formatMonthYear(r.month, r.year),
    r.employee_count != null ? Number(r.employee_count) : '',
    r.total_salary_cost != null ? Number(r.total_salary_cost) : '',
    r.total_ops_cost != null ? Number(r.total_ops_cost) : '',
    r.total_billable_cost != null ? Number(r.total_billable_cost) : '',
    r.total_cost != null ? Number(r.total_cost) : '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Monthly Cost Summary');
  XLSX.writeFile(wb, 'Monthly_Cost_Summary.xlsx');
};


const columns = [
  columnHelper.accessor((row) => formatMonthYear(row.month, row.year), {
    id: 'month_year',
    header: 'Month / Year',
    cell: (info) => <span className="font-medium">{info.getValue()}</span>,
  }),
  columnHelper.accessor('employee_count', {
    header: 'Employees',
    size: 150,
    cell: (info) => (
      <span className="tabular-nums">{info.getValue() ?? '—'}</span>
    ),
  }),
  columnHelper.accessor('total_salary_cost', {
    header: 'Salary Cost',
    size: 150,
    cell: (info) => (
      <span className="tabular-nums">{formatCurrency(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor('total_ops_cost', {
    header: 'Ops Cost',
    size: 150,
    cell: (info) => (
      <span className="tabular-nums">{formatCurrency(info.getValue())}</span>
    ),
  }),
  columnHelper.accessor('total_billable_cost', {
    header: 'Billable Cost',
    size: 150,
    cell: (info) => (
      <span className="tabular-nums">{formatCurrency(info.getValue())}</span>
    ),
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

const MonthlyCostSummary = () => {
  const [monthYear, setMonthYear] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const params = {
    page,
    limit,
    ...(monthYear && { month: monthYear.month, year: monthYear.year }),
  };

  const { data, isPending } = useMonthlyCostSummary(params);

  // data.data = { records: [...], summary: {...} }
  const rows    = Array.isArray(data?.data?.records) ? data.data.records : [];
  const summary = data?.data?.summary ?? {};
  const meta    = data?.meta ?? {};

  const chartData = rows.map((row) => ({
    label: formatMonthYear(row.month, row.year),
    total_cost: Number(row.total_cost ?? 0),
  }));

  const activeFilterCount = 0;

  return (
    <div>
      <PageHeader
        title="Monthly Cost Summary"
        description="Aggregate salary and operational costs grouped by month."
      />

      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-2">
        <Button
          size="sm"
          className="h-9 gap-2 bg-blue-600 hover:bg-blue-700 text-white"
          onClick={() => setFiltersOpen((prev) => !prev)}
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
          <Button variant="outline" size="sm" className="h-9" onClick={() => exportToExcel(rows)}>
            <Download className="mr-1.5 h-4 w-4" />Export Excel
          </Button>
        )}
      </div>

      {/* Collapsible filter panel */}
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${filtersOpen ? 'max-h-[220px] opacity-100 mb-5' : 'max-h-0 opacity-0 mb-0'}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full rounded-lg border bg-muted/30 p-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Month &amp; Year</Label>
            <MonthYearPicker
              value={monthYear}
              onChange={(val) => { setMonthYear(val); setPage(1); }}
              placeholder="All months"
              className="w-full"
            />
          </div>
        </div>
      </div>

      {/* Summary chips */}
      {!isPending && (summary.total_cost != null) && (
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

      {/* Bar chart */}
      {!isPending && chartData.length > 0 && (
        <Card className="mt-6">
          <CardHeader className="pb-2">
            <CardTitle className="text-sm font-medium">Total Cost by Month</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={chartData} margin={{ top: 4, right: 16, left: 16, bottom: 4 }}>
                <CartesianGrid strokeDasharray="3 3" className="stroke-border" />
                <XAxis
                  dataKey="label"
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                />
                <YAxis
                  tick={{ fontSize: 11 }}
                  tickLine={false}
                  axisLine={false}
                  tickFormatter={(v) =>
                    new Intl.NumberFormat('en-IN', {
                      notation: 'compact',
                      maximumFractionDigits: 1,
                    }).format(v)
                  }
                />
                <Tooltip
                  formatter={(value) => [formatCurrency(value), 'Total Cost']}
                  contentStyle={{ fontSize: 12 }}
                />
                <Bar dataKey="total_cost" radius={[4, 4, 0, 0]} className="fill-primary" />
              </BarChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default MonthlyCostSummary;
