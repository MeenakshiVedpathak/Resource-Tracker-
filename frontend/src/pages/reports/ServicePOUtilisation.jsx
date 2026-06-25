import React, { useState, useMemo } from 'react';
import {
  Box, Typography, Paper, Table, TableBody, TableCell, TableContainer,
  TableHead, TableRow, TablePagination, TableSortLabel, TextField,
  Button, Chip, Stack, InputAdornment, LinearProgress, Tooltip,
} from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import FileDownloadOutlinedIcon from '@mui/icons-material/FileDownloadOutlined';

const MOCK_DATA = [
  { id: 1, po_code: 'PO-2025-001', po_name: 'Cloud Migration Phase 1', client: 'TechCorp Australia', expected_hours: 1200, actual_hours: 1105 },
  { id: 2, po_code: 'PO-2025-002', po_name: 'Data Analytics Platform', client: 'FinServe Ltd', expected_hours: 800, actual_hours: 640 },
  { id: 3, po_code: 'PO-2025-003', po_name: 'Security Audit', client: 'GovDept NSW', expected_hours: 400, actual_hours: 160 },
  { id: 4, po_code: 'PO-2025-004', po_name: 'DevOps Modernisation', client: 'RetailCo Pty', expected_hours: 600, actual_hours: 558 },
  { id: 5, po_code: 'PO-2025-005', po_name: 'Mobile App Development', client: 'StartupXYZ', expected_hours: 1000, actual_hours: 920 },
  { id: 6, po_code: 'PO-2025-006', po_name: 'ERP Integration', client: 'ManufactureCo', expected_hours: 500, actual_hours: 180 },
  { id: 7, po_code: 'PO-2025-007', po_name: 'AI/ML Pilot Project', client: 'ResearchInst', expected_hours: 350, actual_hours: 345 },
  { id: 8, po_code: 'PO-2025-008', po_name: 'Legacy System Upgrade', client: 'BankingGroup', expected_hours: 2000, actual_hours: 1650 },
  { id: 9, po_code: 'PO-2025-009', po_name: 'E-Commerce Platform', client: 'RetailOnline AU', expected_hours: 900, actual_hours: 387 },
  { id: 10, po_code: 'PO-2025-010', po_name: 'IT Service Desk', client: 'InsuranceCo', expected_hours: 1500, actual_hours: 1485 },
];

function getUtilColour(pct) {
  if (pct >= 80) return { bar: '#2e7d32', text: '#1b5e20', bg: '#e8f5e9', chip: 'success' };
  if (pct >= 50) return { bar: '#f57c00', text: '#e65100', bg: '#fff3e0', chip: 'warning' };
  return { bar: '#c62828', text: '#b71c1c', bg: '#ffebee', chip: 'error' };
}

function descendingComparator(a, b, orderBy) {
  const va = orderBy === 'utilisation' ? (a.actual_hours / a.expected_hours) : a[orderBy];
  const vb = orderBy === 'utilisation' ? (b.actual_hours / b.expected_hours) : b[orderBy];
  if (vb < va) return -1;
  if (vb > va) return 1;
  return 0;
}

function getComparator(order, orderBy) {
  return order === 'desc'
    ? (a, b) => descendingComparator(a, b, orderBy)
    : (a, b) => -descendingComparator(a, b, orderBy);
}

const HEAD_CELLS = [
  { id: 'po_code', label: 'PO Code', numeric: false },
  { id: 'po_name', label: 'PO Name', numeric: false },
  { id: 'client', label: 'Client', numeric: false },
  { id: 'expected_hours', label: 'Expected Hrs', numeric: true },
  { id: 'actual_hours', label: 'Actual Hrs', numeric: true },
  { id: 'utilisation', label: 'Utilisation', numeric: true },
];

export default function ServicePOUtilisation() {
  const [search, setSearch] = useState('');
  const [order, setOrder] = useState('desc');
  const [orderBy, setOrderBy] = useState('utilisation');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);

  const handleRequestSort = (property) => {
    const isAsc = orderBy === property && order === 'asc';
    setOrder(isAsc ? 'desc' : 'asc');
    setOrderBy(property);
    setPage(0);
  };

  const filtered = useMemo(() => {
    if (!search) return MOCK_DATA;
    const s = search.toLowerCase();
    return MOCK_DATA.filter((r) =>
      r.po_code.toLowerCase().includes(s) ||
      r.po_name.toLowerCase().includes(s) ||
      r.client.toLowerCase().includes(s)
    );
  }, [search]);

  const sorted = useMemo(() => [...filtered].sort(getComparator(order, orderBy)), [filtered, order, orderBy]);
  const paginated = sorted.slice(page * rowsPerPage, page * rowsPerPage + rowsPerPage);

  const totalExpected = filtered.reduce((a, r) => a + r.expected_hours, 0);
  const totalActual = filtered.reduce((a, r) => a + r.actual_hours, 0);
  const overallUtil = totalExpected ? ((totalActual / totalExpected) * 100) : 0;

  const handleExport = () => {
    const headers = 'PO Code,PO Name,Client,Expected Hours,Actual Hours,Utilisation %\n';
    const rows = sorted.map((r) => {
      const pct = ((r.actual_hours / r.expected_hours) * 100).toFixed(1);
      return `${r.po_code},${r.po_name},${r.client},${r.expected_hours},${r.actual_hours},${pct}%`;
    }).join('\n');
    const blob = new Blob([headers + rows], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'service_po_utilisation.csv';
    a.click();
    URL.revokeObjectURL(url);
  };

  return (
    <Box>
      <Box sx={{ mb: 3, display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 2 }}>
        <Box>
          <Typography variant="h5" fontWeight={700} gutterBottom>Service PO Utilisation</Typography>
          <Typography variant="body2" color="text.secondary">Actual vs expected hours per purchase order</Typography>
        </Box>
        <Button variant="outlined" startIcon={<FileDownloadOutlinedIcon />} onClick={handleExport} size="small">
          Export CSV
        </Button>
      </Box>

      {/* Summary */}
      <Stack direction="row" spacing={2} sx={{ mb: 2 }} flexWrap="wrap">
        <Chip label={`${filtered.length} POs`} size="small" variant="outlined" />
        <Chip
          label={`Overall utilisation: ${overallUtil.toFixed(1)}%`}
          size="small"
          color={overallUtil >= 80 ? 'success' : overallUtil >= 50 ? 'warning' : 'error'}
          variant="outlined"
        />
        <Chip label={`Total expected: ${totalExpected.toLocaleString()} hrs`} size="small" variant="outlined" />
        <Chip label={`Total actual: ${totalActual.toLocaleString()} hrs`} size="small" variant="outlined" />
      </Stack>

      {/* Legend */}
      <Paper elevation={0} variant="outlined" sx={{ p: 1.5, mb: 2, display: 'flex', gap: 3, flexWrap: 'wrap', alignItems: 'center' }}>
        <Typography variant="caption" color="text.secondary" fontWeight={500}>Utilisation key:</Typography>
        {[
          { label: 'High (>= 80%)', color: '#2e7d32', bg: '#e8f5e9' },
          { label: 'Medium (50–79%)', color: '#f57c00', bg: '#fff3e0' },
          { label: 'Low (< 50%)', color: '#c62828', bg: '#ffebee' },
        ].map((item) => (
          <Box key={item.label} sx={{ display: 'flex', alignItems: 'center', gap: 0.75 }}>
            <Box sx={{ width: 12, height: 12, borderRadius: '50%', bgcolor: item.color }} />
            <Typography variant="caption">{item.label}</Typography>
          </Box>
        ))}
      </Paper>

      {/* Search */}
      <Paper elevation={0} variant="outlined" sx={{ p: 2, mb: 2 }}>
        <TextField
          size="small"
          placeholder="Search by PO code, name, or client..."
          value={search}
          onChange={(e) => { setSearch(e.target.value); setPage(0); }}
          sx={{ minWidth: 300 }}
          InputProps={{ startAdornment: <InputAdornment position="start"><SearchIcon fontSize="small" /></InputAdornment> }}
        />
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
                    No purchase orders found.
                  </TableCell>
                </TableRow>
              ) : (
                paginated.map((row) => {
                  const pct = (row.actual_hours / row.expected_hours) * 100;
                  const colours = getUtilColour(pct);
                  return (
                    <TableRow key={row.id} hover>
                      <TableCell sx={{ fontFamily: 'monospace', fontSize: '0.8rem', fontWeight: 500 }}>{row.po_code}</TableCell>
                      <TableCell>{row.po_name}</TableCell>
                      <TableCell>
                        <Typography variant="body2" sx={{ whiteSpace: 'nowrap' }}>{row.client}</Typography>
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                        {row.expected_hours.toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 600 }}>
                        {row.actual_hours.toLocaleString()}
                      </TableCell>
                      <TableCell align="right" sx={{ minWidth: 200 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, justifyContent: 'flex-end' }}>
                          <Box sx={{ flex: 1, maxWidth: 120 }}>
                            <Tooltip title={`${pct.toFixed(1)}% utilised`}>
                              <LinearProgress
                                variant="determinate"
                                value={Math.min(pct, 100)}
                                sx={{
                                  height: 8,
                                  borderRadius: 4,
                                  bgcolor: colours.bg,
                                  '& .MuiLinearProgress-bar': { bgcolor: colours.bar, borderRadius: 4 },
                                }}
                              />
                            </Tooltip>
                          </Box>
                          <Typography
                            variant="caption"
                            sx={{
                              fontWeight: 700,
                              color: colours.text,
                              minWidth: 48,
                              textAlign: 'right',
                              fontVariantNumeric: 'tabular-nums',
                            }}
                          >
                            {pct.toFixed(1)}%
                          </Typography>
                        </Box>
                      </TableCell>
                    </TableRow>
                  );
                })
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
