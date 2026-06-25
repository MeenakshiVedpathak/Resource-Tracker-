import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, TableSortLabel, TextField,
  MenuItem, Select, FormControl, InputLabel, Button, Chip, Stack,
  InputAdornment,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';
import { format, isWithinInterval, parseISO } from 'date-fns';

const MOCK_DATA = [
  { id: 1, employee_code: 'EMP001', full_name: 'Alice Johnson', po_code: 'PO-2025-001', po_name: 'Cloud Migration Phase 1', sub_project: 'Backend API', date: '2025-06-01', hours: 8 },
  { id: 2, employee_code: 'EMP002', full_name: 'Bob Martinez', po_code: 'PO-2025-001', po_name: 'Cloud Migration Phase 1', sub_project: 'Frontend UI', date: '2025-06-01', hours: 7.5 },
  { id: 3, employee_code: 'EMP003', full_name: 'Carol White', po_code: 'PO-2025-002', po_name: 'Data Analytics Platform', sub_project: 'ETL Pipeline', date: '2025-06-02', hours: 8 },
  { id: 4, employee_code: 'EMP001', full_name: 'Alice Johnson', po_code: 'PO-2025-001', po_name: 'Cloud Migration Phase 1', sub_project: 'Backend API', date: '2025-06-02', hours: 8 },
  { id: 5, employee_code: 'EMP004', full_name: 'David Chen', po_code: 'PO-2025-003', po_name: 'Security Audit', sub_project: 'Penetration Testing', date: '2025-06-03', hours: 6 },
  { id: 6, employee_code: 'EMP005', full_name: 'Eva Patel', po_code: 'PO-2025-002', po_name: 'Data Analytics Platform', sub_project: 'Dashboard', date: '2025-06-03', hours: 8 },
  { id: 7, employee_code: 'EMP006', full_name: 'Frank Nguyen', po_code: 'PO-2025-004', po_name: 'DevOps Modernisation', sub_project: 'CI/CD Pipeline', date: '2025-06-04', hours: 7 },
  { id: 8, employee_code: 'EMP002', full_name: 'Bob Martinez', po_code: 'PO-2025-001', po_name: 'Cloud Migration Phase 1', sub_project: 'Frontend UI', date: '2025-06-04', hours: 8 },
  { id: 9, employee_code: 'EMP007', full_name: 'Grace Kim', po_code: 'PO-2025-003', po_name: 'Security Audit', sub_project: 'Compliance Review', date: '2025-06-05', hours: 7.5 },
  { id: 10, employee_code: 'EMP003', full_name: 'Carol White', po_code: 'PO-2025-002', po_name: 'Data Analytics Platform', sub_project: 'ETL Pipeline', date: '2025-06-05', hours: 8 },
  { id: 11, employee_code: 'EMP008', full_name: 'Henry Brown', po_code: 'PO-2025-004', po_name: 'DevOps Modernisation', sub_project: 'Infrastructure', date: '2025-06-06', hours: 8 },
  { id: 12, employee_code: 'EMP009', full_name: 'Irene Davis', po_code: 'PO-2025-005', po_name: 'Mobile App Development', sub_project: 'iOS App', date: '2025-06-06', hours: 7 },
  { id: 13, employee_code: 'EMP010', full_name: 'James Wilson', po_code: 'PO-2025-005', po_name: 'Mobile App Development', sub_project: 'Android App', date: '2025-06-07', hours: 8 },
  { id: 14, employee_code: 'EMP001', full_name: 'Alice Johnson', po_code: 'PO-2025-001', po_name: 'Cloud Migration Phase 1', sub_project: 'Backend API', date: '2025-06-07', hours: 7 },
  { id: 15, employee_code: 'EMP005', full_name: 'Eva Patel', po_code: 'PO-2025-002', po_name: 'Data Analytics Platform', sub_project: 'Dashboard', date: '2025-06-08', hours: 8 },
];

const PO_OPTIONS = [...new Set(MOCK_DATA.map((r) => r.po_code))];
const EMPLOYEE_OPTIONS = [...new Set(MOCK_DATA.map((r) => r.full_name))];

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
  { id: 'full_name', label: 'Employee', numeric: false },
  { id: 'employee_code', label: 'Code', numeric: false },
  { id: 'po_code', label: 'PO Code', numeric: false },
  { id: 'po_name', label: 'PO Name', numeric: false },
  { id: 'sub_project', label: 'Sub-Project', numeric: false },
  { id: 'date', label: 'Date', numeric: false },
  { id: 'hours', label: 'Hours', numeric: true },
];

export default function TimesheetSummary() {
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedPO, setSelectedPO] = useState('');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('date');
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
      const matchSearch = !search || row.full_name.toLowerCase().includes(search.toLowerCase()) || row.po_name.toLowerCase().includes(search.toLowerCase());
      const matchEmployee = !selectedEmployee || row.full_name === selectedEmployee;
      const matchPO = !selectedPO || row.po_code === selectedPO;
      let matchDate = true;
      if (dateFrom && dateTo) {
        const d = parseISO(row.date);
        matchDate = isWithinInterval(d, { start: dateFrom, end: dateTo });
      } else if (dateFrom) {
        matchDate = parseISO(row.date) >= dateFrom;
      } else if (dateTo) {
        matchDate = parseISO(row.date) <= dateTo;
      }
      return matchSearch && matchEmployee && matchPO && matchDate;
    });
  }, [search, selectedEmployee, selectedPO, dateFrom, dateTo]);

  const sorted = useMemo(() => [...filtered].sort(getComparator(order, orderBy)), [filtered, order, orderBy]);
  const paginated = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const totalHours = filtered.reduce((a, r) => a + r.hours, 0);

  const handleExport = () => {
    const headers = 'Employee,Code,PO Code,PO Name,Sub-Project,Date,Hours\n';
    const rows = sorted.map((r) =>
      `${r.full_name},${r.employee_code},${r.po_code},${r.po_name},${r.sub_project},${r.date},${r.hours}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'timesheet_summary.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleClearFilters = () => {
    setSearch(''); setSelectedEmployee(''); setSelectedPO('');
    setDateFrom(null); setDateTo(null); setPage(0);
  };

  const hasFilters = search || selectedEmployee || selectedPO || dateFrom || dateTo;

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>Timesheet Summary</Typography>
            <Typography variant="body2" color="text.secondary">Employee time entries across projects and sub-projects</Typography>
          </Box>
          <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={handleExport} size="small">
            Export CSV
          </Button>
        </Box>

        <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
          <Chip label={`${filtered.length} entries`} size="small" variant="outlined" />
          <Chip label={`Total: ${totalHours.toFixed(1)} hrs`} size="small" color="primary" variant="outlined" />
        </Stack>

        <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FilterListIcon sx={{ color: 'text.secondary' }} fontSize="small" />
          <TextField
            size="small"
            placeholder="Search..."
            value={search}
            onChange={(e) => { setSearch(e.target.value); setPage(0); }}
            sx={{ minWidth: 180 }}
            InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
          />
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Employee</InputLabel>
            <Select value={selectedEmployee} label="Employee" onChange={(e) => { setSelectedEmployee(e.target.value); setPage(0); }}>
              <MenuItem value="">All Employees</MenuItem>
              {EMPLOYEE_OPTIONS.map((e) => <MenuItem key={e} value={e}>{e}</MenuItem>)}
            </Select>
          </FormControl>
          <FormControl size="small" sx={{ minWidth: 160 }}>
            <InputLabel>Purchase Order</InputLabel>
            <Select value={selectedPO} label="Purchase Order" onChange={(e) => { setSelectedPO(e.target.value); setPage(0); }}>
              <MenuItem value="">All POs</MenuItem>
              {PO_OPTIONS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>
          <DatePicker
            label="From Date"
            value={dateFrom}
            onChange={(v) => { setDateFrom(v); setPage(0); }}
            slotProps={{ textField: { size: 'small', sx: { minWidth: 150 } } }}
          />
          <DatePicker
            label="To Date"
            value={dateTo}
            onChange={(v) => { setDateTo(v); setPage(0); }}
            slotProps={{ textField: { size: 'small', sx: { minWidth: 150 } } }}
          />
          {hasFilters && <Button size="small" onClick={handleClearFilters}>Clear</Button>}
        </Paper>

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
                      No timesheet entries found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell>{row.full_name}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.employee_code}</TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.po_code}</TableCell>
                      <TableCell>{row.po_name}</TableCell>
                      <TableCell>
                        <Chip label={row.sub_project} size="small" variant="outlined" sx={{ fontSize: '0.72rem' }} />
                      </TableCell>
                      <TableCell sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {format(parseISO(row.date), 'dd MMM yyyy')}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600, color: 'primary.main' }}>
                        {row.hours.toFixed(1)}
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
    </LocalizationProvider>
  );
}
