import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, TableSortLabel, TextField,
  MenuItem, Select, FormControl, InputLabel, Button, Chip, Stack,
  InputAdornment, Tooltip, IconButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' }, { value: 4, label: 'April' },
  { value: 5, label: 'May' }, { value: 6, label: 'June' },
  { value: 7, label: 'July' }, { value: 8, label: 'August' },
  { value: 9, label: 'September' }, { value: 10, label: 'October' },
  { value: 11, label: 'November' }, { value: 12, label: 'December' },
];

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);

// Mock data
const MOCK_DATA = [
  { id: 1, employee_code: 'EMP001', full_name: 'Alice Johnson', month: 6, year: 2025, salary_cost: 85000, ops_cost_per_employee: 12000, total_cost: 97000, per_hour_rate: 504.17 },
  { id: 2, employee_code: 'EMP002', full_name: 'Bob Martinez', month: 6, year: 2025, salary_cost: 72000, ops_cost_per_employee: 11500, total_cost: 83500, per_hour_rate: 434.90 },
  { id: 3, employee_code: 'EMP003', full_name: 'Carol White', month: 6, year: 2025, salary_cost: 95000, ops_cost_per_employee: 13000, total_cost: 108000, per_hour_rate: 562.50 },
  { id: 4, employee_code: 'EMP004', full_name: 'David Chen', month: 6, year: 2025, salary_cost: 68000, ops_cost_per_employee: 10500, total_cost: 78500, per_hour_rate: 408.85 },
  { id: 5, employee_code: 'EMP005', full_name: 'Eva Patel', month: 6, year: 2025, salary_cost: 110000, ops_cost_per_employee: 15000, total_cost: 125000, per_hour_rate: 651.04 },
  { id: 6, employee_code: 'EMP006', full_name: 'Frank Nguyen', month: 6, year: 2025, salary_cost: 77000, ops_cost_per_employee: 11800, total_cost: 88800, per_hour_rate: 462.50 },
  { id: 7, employee_code: 'EMP007', full_name: 'Grace Kim', month: 6, year: 2025, salary_cost: 89000, ops_cost_per_employee: 12500, total_cost: 101500, per_hour_rate: 528.65 },
  { id: 8, employee_code: 'EMP008', full_name: 'Henry Brown', month: 6, year: 2025, salary_cost: 63000, ops_cost_per_employee: 10000, total_cost: 73000, per_hour_rate: 380.21 },
  { id: 9, employee_code: 'EMP009', full_name: 'Irene Davis', month: 6, year: 2025, salary_cost: 98000, ops_cost_per_employee: 13500, total_cost: 111500, per_hour_rate: 580.73 },
  { id: 10, employee_code: 'EMP010', full_name: 'James Wilson', month: 6, year: 2025, salary_cost: 82000, ops_cost_per_employee: 12200, total_cost: 94200, per_hour_rate: 490.63 },
  { id: 11, employee_code: 'EMP011', full_name: 'Karen Lee', month: 5, year: 2025, salary_cost: 91000, ops_cost_per_employee: 13000, total_cost: 104000, per_hour_rate: 541.67 },
  { id: 12, employee_code: 'EMP012', full_name: 'Liam Scott', month: 5, year: 2025, salary_cost: 74000, ops_cost_per_employee: 11200, total_cost: 85200, per_hour_rate: 443.75 },
];

function formatCurrency(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function formatRate(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(value);
}

function descendingComparator(a, b, orderBy) {
  if (b[orderBy] < a[orderBy]) return -1;
  if (b[orderBy] > a[orderBy]) return 1;
  return 0;
}

function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

const HEAD_CELLS = [
  { id: 'employee_code', label: 'Employee Code', numeric: false },
  { id: 'full_name', label: 'Full Name', numeric: false },
  { id: 'month', label: 'Month', numeric: false },
  { id: 'year', label: 'Year', numeric: true },
  { id: 'salary_cost', label: 'Salary Cost', numeric: true },
  { id: 'ops_cost_per_employee', label: 'Ops Cost', numeric: true },
  { id: 'total_cost', label: 'Total Cost', numeric: true },
  { id: 'per_hour_rate', label: 'Per Hour Rate', numeric: true },
];

export default function EmployeeHourlyRate() {
  const [search, setSearch] = useState('');
  const [selectedMonth, setSelectedMonth] = useState('');
  const [selectedYear, setSelectedYear] = useState(CURRENT_YEAR);
  const [order, setOrder] = useState('asc');
  const [orderBy, setOrderBy] = useState('full_name');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
  };

  const filtered = useMemo(() => {
    return MOCK_DATA.filter((row) => {
      const matchSearch =
        !search ||
        row.full_name.toLowerCase().includes(search.toLowerCase()) ||
        row.employee_code.toLowerCase().includes(search.toLowerCase());
      const matchMonth = !selectedMonth || row.month === selectedMonth;
      const matchYear = !selectedYear || row.year === selectedYear;
      return matchSearch && matchMonth && matchYear;
    });
  }, [search, selectedMonth, selectedYear]);

  const sorted = useMemo(() => [...filtered].sort(getComparator(order, orderBy)), [filtered, order, orderBy]);

  const paginated = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const handleExport = () => {
    const headers = HEAD_CELLS.map((h) => h.label).join(',');
    const rows = sorted.map((r) =>
      [r.employee_code, r.full_name, MONTHS.find((m) => m.value === r.month)?.label, r.year, r.salary_cost, r.ops_cost_per_employee, r.total_cost, r.per_hour_rate].join(',')
    );
    const csv = [headers, ...rows].join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'employee_hourly_rate.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const totalCost = filtered.reduce((acc, r) => acc + r.total_cost, 0);
  const avgRate = filtered.length ? filtered.reduce((acc, r) => acc + r.per_hour_rate, 0) / filtered.length : 0;

  return (
    <Box>
      {/* Header */}
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>
            Employee Hourly Rate
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Per-employee cost breakdown and computed hourly billing rate
          </Typography>
        </Box>
        <Button
          variant="outlined"
          startIcon={<FileDownloadOutlinedIcon />}
          onClick={handleExport}
          size="small"
        >
          Export CSV
        </Button>
      </Box>

      {/* Summary chips */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <Chip label={`${filtered.length} employees`} size="small" variant="outlined" />
        <Chip label={`Total cost: ${formatCurrency(totalCost)}`} size="small" color="primary" variant="outlined" />
        <Chip label={`Avg rate: ${formatRate(avgRate)}/hr`} size="small" variant="outlined" />
      </Stack>

      {/* Filters */}
      <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FilterListIcon sx={{ color: 'text.secondary' }} fontSize="small" />
        <TextField
          size="small"
          placeholder="Search employee..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ minWidth: 200 }}
          InputProps={{
            startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment>,
          }}
        />
        <FormControl size="small" sx={{ minWidth: 140 }}>
          <InputLabel>Month</InputLabel>
          <Select value={selectedMonth} label="Month" onChange={(e) => { setSelectedMonth(e.target.value); setPage(0); }}>
            <MenuItem value="">All Months</MenuItem>
            {MONTHS.map((m) => <MenuItem key={m.value} value={m.value}>{m.label}</MenuItem>)}
          </Select>
        </FormControl>
        <FormControl size="small" sx={{ minWidth: 100 }}>
          <InputLabel>Year</InputLabel>
          <Select value={selectedYear} label="Year" onChange={(e) => { setSelectedYear(e.target.value); setPage(0); }}>
            <MenuItem value="">All Years</MenuItem>
            {YEARS.map((y) => <MenuItem key={y} value={y}>{y}</MenuItem>)}
          </Select>
        </FormControl>
        {(search || selectedMonth || selectedYear !== CURRENT_YEAR) && (
          <Button size="small" onClick={() => { setSearch(''); setSelectedMonth(''); setSelectedYear(CURRENT_YEAR); setPage(0); }}>
            Clear filters
          </Button>
        )}
      </Paper>

      {/* Table */}
      <Paper elevation={0} variant="outlined" sx={{ overflow: 'hidden' }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {HEAD_CELLS.map((cell) => (
                  <TableCell
                    key={cell.id}
                    align={cell.numeric ? 'right' : 'left'}
                    sortDirection={orderBy === cell.id ? order : false}
                    sx={{ fontWeight: 600, bgcolor: '#F5F6FA', whiteSpace: 'nowrap' }}
                  >
                    <TableSortLabel
                      active={orderBy === cell.id}
                      direction={orderBy === cell.id ? order : 'asc'}
                      onClick={() => handleRequestSort(cell.id)}
                    >
                      {cell.label}
                    </TableSortLabel>
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>
            <TableBody>
              {paginated.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={HEAD_CELLS.length} align="center" sx={{ py: 6, color: 'text.secondary' }}>
                    No records found matching your filters.
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((row) => (
                  <TableRow key={row.id} hover>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.employee_code}</TableCell>
                    <TableCell>{row.full_name}</TableCell>
                    <TableCell>{MONTHS.find((m) => m.value === row.month)?.label}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{row.year}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.salary_cost)}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>{formatCurrency(row.ops_cost_per_employee)}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>{formatCurrency(row.total_cost)}</TableCell>
                    <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', color: 'primary.main', fontWeight: 600 }}>
                      <Tooltip title="Per billable hour">
                        <span>{formatRate(row.per_hour_rate)}</span>
                      </Tooltip>
                    </TableCell>
                  </TableRow>
                ))
              )}
            </TableBody>
          </Table>
        </TableContainer>
        <TablePagination
          component="div"
          count={filtered.length}
          page={page}
          onPageChange={(_, p) => setPage(p)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => { setRowsPerPage(parseInt(e.target.value, 10)); setPage(0); }}
          rowsPerPageOptions={[5, 10, 25, 50]}
        />
      </Paper>
    </Box>
  );
}
