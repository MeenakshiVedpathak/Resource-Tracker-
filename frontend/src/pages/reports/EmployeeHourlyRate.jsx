import { useState } from 'react';
import * as XLSX from 'xlsx';
import { createColumnHelper } from '@tanstack/react-table';
import { Download, Search } from 'lucide-react';
import { useEmployeeHourlyRate } from '@/hooks/useReports';
import { useDebounce } from '@/hooks/useDebounce';
import { useActiveEmployees } from '@/hooks/useEmployees';
import { formatCurrency } from '@/utils/formatters';
import DataTable from '@/components/common/DataTable';
import PageHeader from '@/components/common/PageHeader';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MonthYearPicker } from '@/components/ui/month-year-picker';

const columnHelper = createColumnHelper();

const exportToExcel = (rows, month, year) => {
  const header = ['Employee Code', 'Employee Name', 'Designation', 'Month', 'Salary Cost', 'Ops Cost', 'Total Cost', 'Billable Cost', 'Per Hour Rate'];
  const dataRows = rows.map((r) => [
    r.employee_code ?? '',
    r.full_name ?? '',
    r.designation ?? '',
    r.month_year ?? '',
    r.salary_cost != null ? Number(r.salary_cost) : '',
    r.ops_cost != null ? Number(r.ops_cost) : '',
    r.total_cost != null ? Number(r.total_cost) : '',
    r.billable_cost != null ? Number(r.billable_cost) : '',
    r.per_hour_rate != null ? Number(r.per_hour_rate) : '',
  ]);
  const ws = XLSX.utils.aoa_to_sheet([header, ...dataRows]);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, 'Hourly Rate');
  XLSX.writeFile(wb, `Employee_Hourly_Rate_${month}_${year}.xlsx`);
};


const CostCell = ({ value }) =>
  value != null ? (
    <span className="tabular-nums">{formatCurrency(value)}</span>
  ) : (
    <span className="text-muted-foreground">—</span>
  );

const columns = [
  columnHelper.accessor('employee_code', {
    header: 'Employee Code',
    meta: { sticky: true, left: 0 },
    size: 120,
    cell: (info) => (
      <span className="font-mono text-xs font-semibold text-muted-foreground">
        {info.getValue() || '—'}
      </span>
    ),
  }),
  columnHelper.accessor('full_name', {
    header: 'Employee Name',
    meta: { sticky: true, left: 120 },
    size: 220,
    cell: (info) => <span className="font-medium">{info.getValue() || '—'}</span>,
  }),
  columnHelper.accessor('designation', {
    header: 'Designation',
    size: 180,
    cell: (info) => info.getValue() || <span className="text-muted-foreground">—</span>,
  }),
  columnHelper.accessor('month_year', {
    header: 'Month',
    size: 130,
    cell: (info) => (
      <span className="tabular-nums font-mono text-xs">{info.getValue() || '—'}</span>
    ),
  }),
  columnHelper.accessor('salary_cost', {
    header: 'Salary Cost',
    size: 140,
    cell: (info) => <CostCell value={info.getValue()} />,
  }),
  columnHelper.accessor('ops_cost', {
    header: 'Ops Cost',
    size: 140,
    cell: (info) => <CostCell value={info.getValue()} />,
  }),
  columnHelper.accessor('total_cost', {
    header: 'Total Cost',
    size: 140,
    cell: (info) => {
      const val = info.getValue();
      return val != null ? (
        <span className="tabular-nums font-medium">{formatCurrency(val)}</span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  }),
  columnHelper.accessor('billable_cost', {
    header: 'Billable Cost',
    size: 140,
    cell: (info) => <CostCell value={info.getValue()} />,
  }),
  columnHelper.accessor('per_hour_rate', {
    header: 'Per Hour Rate',
    size: 140,
    cell: (info) => {
      const val = info.getValue();
      const num = val != null ? Number(val) : NaN;
      return !isNaN(num) ? (
        <span className="tabular-nums font-semibold text-primary">
          {formatCurrency(num)}/hr
        </span>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  }),
];

const now = new Date();

const EmployeeHourlyRate = () => {
  const [monthYear, setMonthYear] = useState({
    month: now.getMonth() + 1,
    year: now.getFullYear(),
  });
  const [employeeId, setEmployeeId] = useState('all');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);

  const debouncedSearch = useDebounce(search, 400);
  const { data: activeEmployees = [] } = useActiveEmployees();

  const params = {
    month: monthYear.month,
    year: monthYear.year,
    ...(employeeId && employeeId !== 'all' && { employeeId }),
    page,
    limit,
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { data, isPending } = useEmployeeHourlyRate(params);

  const rows = Array.isArray(data?.data) ? data.data : [];
  const meta = data?.meta ?? {};

  return (
    <div>
      <PageHeader
        title="Employee Hourly Rate"
        description="View the effective hourly cost per employee based on salary and hours logged."
        actions={rows.length > 0 ? (
          <Button variant="outline" size="sm" onClick={() => exportToExcel(rows, monthYear?.month, monthYear?.year)}>
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

        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <Label className="text-xs">Employee</Label>
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
            className="h-9 text-sm"
          />
        </div>

        <div className="flex flex-col gap-1.5 flex-1 min-w-[200px]">
          <Label className="text-xs">Search</Label>
          <div className="relative">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Name, code…"
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

export default EmployeeHourlyRate;
