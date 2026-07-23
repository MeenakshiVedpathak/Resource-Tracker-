import { useState } from 'react';
import * as XLSX from 'xlsx';
import { createColumnHelper } from '@tanstack/react-table';
import { Download, Filter, Search } from 'lucide-react';
import { useEmployeeHourlyRate } from '@/hooks/useReports';
import { reportsApi } from '@/api/reports.api';
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
  const [hoursSource, setHoursSource] = useState('M');
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [limit, setLimit] = useState(10);
  const [filtersOpen, setFiltersOpen] = useState(false);
  const [exporting, setExporting] = useState(false);

  const debouncedSearch = useDebounce(search, 400);
  const { data: activeEmployees = [] } = useActiveEmployees();

  const params = {
    month: monthYear.month,
    year: monthYear.year,
    hoursSource,
    ...(employeeId && employeeId !== 'all' && { employeeId }),
    page,
    limit,
    ...(debouncedSearch && { search: debouncedSearch }),
  };

  const { data, isPending } = useEmployeeHourlyRate(params);

  const rows = Array.isArray(data?.data) ? data.data : [];
  const meta = data?.meta ?? {};

  const activeFilterCount = [
    employeeId !== 'all' ? 1 : 0,
  ].reduce((a, b) => a + b, 0);

  // Export pulls every matching record (not just the current page) with one extra request.
  const handleExport = async () => {
    setExporting(true);
    try {
      const total = meta.total > 0 ? meta.total : 1000;
      const res = await reportsApi.getEmployeeHourlyRate({ ...params, page: 1, limit: total });
      const all = Array.isArray(res?.data) ? res.data : [];
      exportToExcel(all, monthYear?.month, monthYear?.year);
    } finally {
      setExporting(false);
    }
  };

  return (
    <div>
      <PageHeader
        title="Employee Hourly Rate"
        description="View the effective hourly cost per employee based on salary and hours logged."
      />

      {/* Toolbar */}
      <div className="mb-3 flex items-center gap-2">
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Name, code…"
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(1); }}
            className="h-9 pl-9 w-56 text-sm"
          />
        </div>
        <SearchableSelect
          showSearch={false}
          options={[
            { label: 'Modified', value: 'M' },
            { label: 'Original', value: 'O' },
          ]}
          value={hoursSource}
          onValueChange={(v) => { setHoursSource(v); setPage(1); }}
          placeholder="Hours Source"
          className="h-9 w-36 text-sm shrink-0"
        />
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
          <Button variant="outline" size="sm" className="h-9" onClick={handleExport} disabled={exporting}>
            <Download className="mr-1.5 h-4 w-4" />{exporting ? 'Exporting…' : 'Export Excel'}
          </Button>
        )}
      </div>

      {/* Collapsible filter panel */}
      <div className={`overflow-hidden transition-all duration-500 ease-in-out ${filtersOpen ? 'max-h-[220px] opacity-100 mb-5' : 'max-h-0 opacity-0 mb-0'}`}>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 w-full rounded-lg border bg-muted/30 p-4">
          <div className="flex flex-col gap-1.5">
            <Label className="text-xs">Month &amp; Year <span className="text-destructive">*</span></Label>
            <MonthYearPicker
              value={monthYear}
              onChange={(val) => { setMonthYear(val); setPage(1); }}
              placeholder="Select month"
              className="w-full"
            />
          </div>

          <div className="flex flex-col gap-1.5">
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
              className="h-9 text-sm w-full"
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
