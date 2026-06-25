import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, TableSortLabel, TextField,
  MenuItem, Select, FormControl, InputLabel, Button, Chip, Stack,
  InputAdornment, ToggleButtonGroup, ToggleButton,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';

const MOCK_DATA = [
  { id: 1, employee_code: 'EMP001', full_name: 'Alice Johnson', role: 'Senior Developer', po_code: 'PO-2025-001', po_name: 'Cloud Migration Phase 1', allocation_pct: 80, start_date: '2025-01-15', end_date: '2025-06-30', is_active: true },
  { id: 2, employee_code: 'EMP001', full_name: 'Alice Johnson', role: 'Senior Developer', po_code: 'PO-2025-007', po_name: 'AI/ML Pilot Project', allocation_pct: 20, start_date: '2025-03-01', end_date: '2025-07-31', is_active: true },
  { id: 3, employee_code: 'EMP002', full_name: 'Bob Martinez', role: 'Frontend Developer', po_code: 'PO-2025-001', po_name: 'Cloud Migration Phase 1', allocation_pct: 100, start_date: '2025-02-01', end_date: '2025-06-30', is_active: true },
  { id: 4, employee_code: 'EMP003', full_name: 'Carol White', role: 'Data Engineer', po_code: 'PO-2025-002', po_name: 'Data Analytics Platform', allocation_pct: 100, start_date: '2025-01-10', end_date: '2025-07-31', is_active: true },
  { id: 5, employee_code: 'EMP004', full_name: 'David Chen', role: 'Security Analyst', po_code: 'PO-2025-003', po_name: 'Security Audit', allocation_pct: 100, start_date: '2025-04-01', end_date: '2025-05-31', is_active: false },
  { id: 6, employee_code: 'EMP005', full_name: 'Eva Patel', role: 'BI Developer', po_code: 'PO-2025-002', po_name: 'Data Analytics Platform', allocation_pct: 100, start_date: '2025-03-01', end_date: '2025-07-31', is_active: true },
  { id: 7, employee_code: 'EMP006', full_name: 'Frank Nguyen', role: 'DevOps Engineer', po_code: 'PO-2025-004', po_name: 'DevOps Modernisation', allocation_pct: 100, start_date: '2025-02-15', end_date: '2025-08-31', is_active: true },
  { id: 8, employee_code: 'EMP007', full_name: 'Grace Kim', role: 'Security Consultant', po_code: 'PO-2025-003', po_name: 'Security Audit', allocation_pct: 50, start_date: '2025-04-01', end_date: '2025-05-31', is_active: false },
  { id: 9, employee_code: 'EMP007', full_name: 'Grace Kim', role: 'Security Consultant', po_code: 'PO-2025-008', po_name: 'Legacy System Upgrade', allocation_pct: 50, start_date: '2025-06-01', end_date: '2025-12-31', is_active: true },
  { id: 10, employee_code: 'EMP008', full_name: 'Henry Brown', role: 'Infrastructure Engineer', po_code: 'PO-2025-004', po_name: 'DevOps Modernisation', allocation_pct: 100, start_date: '2025-02-15', end_date: '2025-08-31', is_active: true },
  { id: 11, employee_code: 'EMP009', full_name: 'Irene Davis', role: 'Mobile Developer', po_code: 'PO-2025-005', po_name: 'Mobile App Development', allocation_pct: 100, start_date: '2025-01-01', end_date: '2025-09-30', is_active: true },
  { id: 12, employee_code: 'EMP010', full_name: 'James Wilson', role: 'Mobile Developer', po_code: 'PO-2025-005', po_name: 'Mobile App Development', allocation_pct: 100, start_date: '2025-01-01', end_date: '2025-09-30', is_active: true },
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
  { id: 'role', label: 'Role', numeric: false },
  { id: 'po_code', label: 'PO Code', numeric: false },
  { id: 'po_name', label: 'PO Name', numeric: false },
  { id: 'allocation_pct', label: 'Allocation %', numeric: true },
  { id: 'start_date', label: 'Start Date', numeric: false },
  { id: 'end_date', label: 'End Date', numeric: false },
  { id: 'is_active', label: 'Status', numeric: false },
];

export default function ResourceAllocation() {
  const [search, setSearch] = useState('');
  const [selectedEmployee, setSelectedEmployee] = useState('');
  const [selectedPO, setSelectedPO] = useState('');
  const [activeFilter, setActiveFilter] = useState('all');
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
      const matchSearch = !search || row.full_name.toLowerCase().includes(search.toLowerCase()) || row.role.toLowerCase().includes(search.toLowerCase());
      const matchEmployee = !selectedEmployee || row.full_name === selectedEmployee;
      const matchPO = !selectedPO || row.po_code === selectedPO;
      const matchActive = activeFilter === 'all' || (activeFilter === 'active' && row.is_active) || (activeFilter === 'inactive' && !row.is_active);
      return matchSearch && matchEmployee && matchPO && matchActive;
    });
  }, [search, selectedEmployee, selectedPO, activeFilter]);

  const sorted = useMemo(() => [...filtered].sort(getComparator(order, orderBy)), [filtered, order, orderBy]);
  const paginated = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const activeCount = MOCK_DATA.filter((r) => r.is_active).length;

  const handleExport = () => {
    const headers = 'Employee,Code,Role,PO Code,PO Name,Allocation %,Start Date,End Date,Status\n';
    const rows = sorted.map((r) =>
      `${r.full_name},${r.employee_code},${r.role},${r.po_code},${r.po_name},${r.allocation_pct}%,${r.start_date},${r.end_date},${r.is_active ? 'Active' : 'Inactive'}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'resource_allocation.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>Resource Allocation</Typography>
          <Typography variant="body2" color="text.secondary">Employee-to-PO allocation periods and percentage splits</Typography>
        </Box>
        <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={handleExport} size="small">
          Export CSV
        </Button>
      </Box>

      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <Chip label={`${filtered.length} allocations`} size="small" variant="outlined" />
        <Chip label={`${activeCount} active`} size="small" color="success" variant="outlined" />
        <Chip label={`${MOCK_DATA.length - activeCount} inactive`} size="small" color="default" variant="outlined" />
      </Stack>

      <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
        <FilterListIcon sx={{ color: 'text.secondary' }} fontSize="small" />
        <TextField
          size="small"
          placeholder="Search employee or role..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ minWidth: 200 }}
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
        <ToggleButtonGroup
          value={activeFilter}
          exclusive
          onChange={(_, v) => { if (v !== null) { setActiveFilter(v); setPage(0); } }}
          size="small"
        >
          <ToggleButton value="all">All</ToggleButton>
          <ToggleButton value="active">Active</ToggleButton>
          <ToggleButton value="inactive">Inactive</ToggleButton>
        </ToggleButtonGroup>
        {(search || selectedEmployee || selectedPO || activeFilter !== 'all') && (
          <Button size="small" onClick={() => { setSearch(''); setSelectedEmployee(''); setSelectedPO(''); setActiveFilter('all'); setPage(0); }}>
            Clear
          </Button>
        )}
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
                    No allocations found.
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((row) => (
                  <TableRow key={row.id} hover sx={{ opacity: row.is_active ? 1 : 0.65 }}>
                    <TableCell>{row.full_name}</TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.employee_code}</TableCell>
                    <TableCell>
                      <Typography variant="caption" color="text.secondary">{row.role}</Typography>
                    </TableCell>
                    <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.po_code}</TableCell>
                    <TableCell>{row.po_name}</TableCell>
                    <TableCell align="right">
                      <Chip
                        label={`${row.allocation_pct}%`}
                        size="small"
                        color={row.allocation_pct === 100 ? 'primary' : 'default'}
                        variant={row.allocation_pct === 100 ? 'filled' : 'outlined'}
                        sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{row.start_date}</TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{row.end_date}</TableCell>
                    <TableCell>
                      <Chip
                        label={row.is_active ? 'Active' : 'Inactive'}
                        size="small"
                        color={row.is_active ? 'success' : 'default'}
                        variant="outlined"
                      />
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
          rowsPerPageOptions={[5, 10, 25]}
        />
      </Paper>
    </Box>
  );
}
