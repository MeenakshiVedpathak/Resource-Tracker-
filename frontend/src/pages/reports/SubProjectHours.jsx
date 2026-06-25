import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, TableSortLabel, TextField,
  MenuItem, Select, FormControl, InputLabel, Button, Chip, Stack,
  InputAdornment,
} from '@mui/material';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { LocalizationProvider } from '@mui/x-date-pickers/LocalizationProvider';
import { AdapterDateFns } from '@mui/x-date-pickers/AdapterDateFns';

const MOCK_DATA = [
  { id: 1, sub_project: 'Backend API', po_code: 'PO-2025-001', po_name: 'Cloud Migration Phase 1', total_hours: 320, employee_count: 3, start_date: '2025-01-15', end_date: '2025-06-30' },
  { id: 2, sub_project: 'Frontend UI', po_code: 'PO-2025-001', po_name: 'Cloud Migration Phase 1', total_hours: 280, employee_count: 2, start_date: '2025-02-01', end_date: '2025-06-30' },
  { id: 3, sub_project: 'ETL Pipeline', po_code: 'PO-2025-002', po_name: 'Data Analytics Platform', total_hours: 210, employee_count: 2, start_date: '2025-01-10', end_date: '2025-05-31' },
  { id: 4, sub_project: 'Dashboard', po_code: 'PO-2025-002', po_name: 'Data Analytics Platform', total_hours: 175, employee_count: 2, start_date: '2025-03-01', end_date: '2025-07-31' },
  { id: 5, sub_project: 'Penetration Testing', po_code: 'PO-2025-003', po_name: 'Security Audit', total_hours: 90, employee_count: 1, start_date: '2025-04-01', end_date: '2025-05-15' },
  { id: 6, sub_project: 'Compliance Review', po_code: 'PO-2025-003', po_name: 'Security Audit', total_hours: 70, employee_count: 1, start_date: '2025-04-01', end_date: '2025-05-31' },
  { id: 7, sub_project: 'CI/CD Pipeline', po_code: 'PO-2025-004', po_name: 'DevOps Modernisation', total_hours: 240, employee_count: 2, start_date: '2025-02-15', end_date: '2025-08-31' },
  { id: 8, sub_project: 'Infrastructure', po_code: 'PO-2025-004', po_name: 'DevOps Modernisation', total_hours: 180, employee_count: 1, start_date: '2025-02-15', end_date: '2025-08-31' },
  { id: 9, sub_project: 'iOS App', po_code: 'PO-2025-005', po_name: 'Mobile App Development', total_hours: 420, employee_count: 2, start_date: '2025-01-01', end_date: '2025-09-30' },
  { id: 10, sub_project: 'Android App', po_code: 'PO-2025-005', po_name: 'Mobile App Development', total_hours: 400, employee_count: 2, start_date: '2025-01-01', end_date: '2025-09-30' },
  { id: 11, sub_project: 'ERP Connector', po_code: 'PO-2025-006', po_name: 'ERP Integration', total_hours: 130, employee_count: 1, start_date: '2025-03-15', end_date: '2025-06-15' },
  { id: 12, sub_project: 'ML Model Training', po_code: 'PO-2025-007', po_name: 'AI/ML Pilot Project', total_hours: 200, employee_count: 2, start_date: '2025-02-01', end_date: '2025-07-31' },
];

const PO_OPTIONS = [...new Set(MOCK_DATA.map((r) => r.po_code))];

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
  { id: 'sub_project', label: 'Sub-Project', numeric: false },
  { id: 'po_code', label: 'PO Code', numeric: false },
  { id: 'po_name', label: 'PO Name', numeric: false },
  { id: 'total_hours', label: 'Total Hours', numeric: true },
  { id: 'employee_count', label: 'Employees', numeric: true },
  { id: 'start_date', label: 'Start Date', numeric: false },
  { id: 'end_date', label: 'End Date', numeric: false },
];

export default function SubProjectHours() {
  const [selectedPO, setSelectedPO] = useState('');
  const [dateFrom, setDateFrom] = useState(null);
  const [dateTo, setDateTo] = useState(null);
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('total_hours');
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
      const matchPO = !selectedPO || row.po_code === selectedPO;
      let matchDate = true;
      if (dateFrom) matchDate = matchDate && new Date(row.end_date) >= dateFrom;
      if (dateTo) matchDate = matchDate && new Date(row.start_date) <= dateTo;
      return matchPO && matchDate;
    });
  }, [selectedPO, dateFrom, dateTo]);

  const sorted = useMemo(() => [...filtered].sort(getComparator(order, orderBy)), [filtered, order, orderBy]);
  const paginated = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const totalHours = filtered.reduce((a, r) => a + r.total_hours, 0);

  const handleExport = () => {
    const headers = 'Sub-Project,PO Code,PO Name,Total Hours,Employees,Start Date,End Date\n';
    const rows = sorted.map((r) =>
      `${r.sub_project},${r.po_code},${r.po_name},${r.total_hours},${r.employee_count},${r.start_date},${r.end_date}`
    ).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'sub_project_hours.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <LocalizationProvider dateAdapter={AdapterDateFns}>
      <Box>
        <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
          <Box>
            <Typography variant="h5" fontWeight={700} gutterBottom>Sub-Project Hours</Typography>
            <Typography variant="body2" color="text.secondary">Hour totals and staffing by sub-project across all purchase orders</Typography>
          </Box>
          <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={handleExport} size="small">
            Export CSV
          </Button>
        </Box>

        <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
          <Chip label={`${filtered.length} sub-projects`} size="small" variant="outlined" />
          <Chip label={`Total hours: ${totalHours.toLocaleString()}`} size="small" color="primary" variant="outlined" />
        </Stack>

        <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 2, display: 'flex', gap: 2, flexWrap: 'wrap', alignItems: 'center' }}>
          <FilterListIcon sx={{ color: 'text.secondary' }} fontSize="small" />
          <FormControl size="small" sx={{ minWidth: 180 }}>
            <InputLabel>Purchase Order</InputLabel>
            <Select value={selectedPO} label="Purchase Order" onChange={(e) => { setSelectedPO(e.target.value); setPage(0); }}>
              <MenuItem value="">All POs</MenuItem>
              {PO_OPTIONS.map((p) => <MenuItem key={p} value={p}>{p}</MenuItem>)}
            </Select>
          </FormControl>
          <DatePicker
            label="Active From"
            value={dateFrom}
            onChange={(v) => { setDateFrom(v); setPage(0); }}
            slotProps={{ textField: { size: 'small', sx: { minWidth: 150 } } }}
          />
          <DatePicker
            label="Active To"
            value={dateTo}
            onChange={(v) => { setDateTo(v); setPage(0); }}
            slotProps={{ textField: { size: 'small', sx: { minWidth: 150 } } }}
          />
          {(selectedPO || dateFrom || dateTo) && (
            <Button size="small" onClick={() => { setSelectedPO(''); setDateFrom(null); setDateTo(null); setPage(0); }}>
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
                      No sub-projects found.
                    </TableCell>
                  </TableRow>
                ) : (
                  paginated.map((row) => (
                    <TableRow key={row.id} hover>
                      <TableCell fontWeight={600}>
                        <Typography variant="body2" fontWeight={500}>{row.sub_project}</Typography>
                      </TableCell>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem' }}>{row.po_code}</TableCell>
                      <TableCell>{row.po_name}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 700, color: 'primary.main' }}>
                        {row.total_hours.toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        <Chip label={row.employee_count} size="small" variant="outlined" sx={{ minWidth: 36 }} />
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{row.start_date}</TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontVariantNumeric: 'tabular-nums' }}>{row.end_date}</TableCell>
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
    </LocalizationProvider>
  );
}
