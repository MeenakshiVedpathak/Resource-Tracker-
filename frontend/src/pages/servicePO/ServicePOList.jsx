import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Box,
  Button,
  Chip,
  CircularProgress,
  IconButton,
  InputAdornment,
  LinearProgress,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TablePagination,
  TableRow,
  TableSortLabel,
  TextField,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  Visibility as VisibilityIcon,
  DoNotDisturbOn as CloseIcon,
  ClearAll as ClearAllIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import { format } from 'date-fns';

import ServicePOForm from './ServicePOForm';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  fetchServicePOs,
  deleteServicePO,
  closeServicePO,
  selectAllServicePOs,
  selectServicePOsLoading,
  selectServicePOsError,
  selectServicePOsMeta,
} from '../../store/slices/servicePOSlice';

const COLUMNS = [
  { id: 'service_po_code', label: 'PO Code', sortable: true, width: 130 },
  { id: 'service_po_name', label: 'PO Name', sortable: true, minWidth: 180 },
  { id: 'client_name', label: 'Client', sortable: true, minWidth: 160 },
  { id: 'service_type', label: 'Service Type', sortable: true, minWidth: 140 },
  { id: 'po_value', label: 'PO Value', sortable: true, width: 120, align: 'right' },
  { id: 'start_date', label: 'Start', sortable: true, width: 110 },
  { id: 'end_date', label: 'End', sortable: true, width: 110 },
  { id: 'utilisation', label: 'Utilisation', sortable: false, width: 150 },
  { id: 'status', label: 'Status', sortable: true, width: 120 },
  { id: 'actions', label: 'Actions', sortable: false, width: 130, align: 'center' },
];

const statusConfig = {
  active: { color: 'success', label: 'Active' },
  closed: { color: 'default', label: 'Closed' },
  draft: { color: 'warning', label: 'Draft' },
  expired: { color: 'error', label: 'Expired' },
  on_hold: { color: 'info', label: 'On Hold' },
};

const utilisationColor = (pct) => {
  if (pct >= 90) return 'error';
  if (pct >= 70) return 'warning';
  return 'success';
};

const formatCurrency = (val) =>
  val != null
    ? new Intl.NumberFormat('en-IN', { style: 'currency', currency: 'INR', maximumFractionDigits: 0 }).format(val)
    : '—';

export default function ServicePOList() {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const servicePOs = useSelector(selectAllServicePOs);
  const loading = useSelector(selectServicePOsLoading);
  const error = useSelector(selectServicePOsError);
  const meta = useSelector(selectServicePOsMeta);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('service_po_name');
  const [order, setOrder] = useState('asc');

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [closeTarget, setCloseTarget] = useState(null);
  const [confirmDeleteOpen, setConfirmDeleteOpen] = useState(false);
  const [confirmCloseOpen, setConfirmCloseOpen] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadPOs = useCallback(() => {
    dispatch(
      fetchServicePOs({
        search: debouncedSearch,
        page: page + 1,
        per_page: rowsPerPage,
        sort_by: orderBy,
        sort_order: order,
      })
    );
  }, [dispatch, debouncedSearch, page, rowsPerPage, orderBy, order]);

  useEffect(() => {
    loadPOs();
  }, [loadPOs]);

  const handleSort = (colId) => {
    if (orderBy === colId) {
      setOrder((prev) => (prev === 'asc' ? 'desc' : 'asc'));
    } else {
      setOrderBy(colId);
      setOrder('asc');
    }
    setPage(0);
  };

  const handleAdd = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const handleEdit = (po) => {
    setEditTarget(po);
    setFormOpen(true);
  };

  const handleView = (po) => {
    navigate(`/service-po/${po.id}`);
  };

  const handleDeleteRequest = (po) => {
    setDeleteTarget(po);
    setConfirmDeleteOpen(true);
  };

  const handleCloseRequest = (po) => {
    setCloseTarget(po);
    setConfirmCloseOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await dispatch(deleteServicePO(deleteTarget.id));
    setConfirmDeleteOpen(false);
    setDeleteTarget(null);
    loadPOs();
  };

  const handleCloseConfirm = async () => {
    if (!closeTarget) return;
    await dispatch(closeServicePO(closeTarget.id));
    setConfirmCloseOpen(false);
    setCloseTarget(null);
    loadPOs();
  };

  const handleFormClose = (refreshed) => {
    setFormOpen(false);
    setEditTarget(null);
    if (refreshed) loadPOs();
  };

  const getUtilisationPct = (po) => {
    const expected = po.expected_man_hours || 0;
    const actual = po.actual_hours || 0;
    if (!expected) return 0;
    return Math.min(Math.round((actual / expected) * 100), 100);
  };

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      {/* Header */}
      <Box
        sx={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          mb: 3,
          flexWrap: 'wrap',
          gap: 2,
        }}
      >
        <Box>
          <Typography variant="h5" fontWeight={700}>
            Service Purchase Orders
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Track POs, resource allocation, and utilisation
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          New Service PO
        </Button>
      </Box>

      {/* Search */}
      <Box sx={{ mb: 2, maxWidth: 420 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search by name, code, client…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          InputProps={{
            startAdornment: (
              <InputAdornment position="start">
                <SearchIcon fontSize="small" color="action" />
              </InputAdornment>
            ),
            endAdornment: search ? (
              <InputAdornment position="end">
                <IconButton size="small" onClick={() => setSearch('')}>
                  <ClearAllIcon fontSize="small" />
                </IconButton>
              </InputAdornment>
            ) : null,
          }}
        />
      </Box>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }}>
          {error}
        </Alert>
      )}

      {/* Table */}
      <Paper variant="outlined" sx={{ borderRadius: 2, overflow: 'hidden' }}>
        <TableContainer sx={{ overflowX: 'auto' }}>
          <Table size="small" stickyHeader>
            <TableHead>
              <TableRow>
                {COLUMNS.map((col) => (
                  <TableCell
                    key={col.id}
                    align={col.align || 'left'}
                    sx={{
                      width: col.width,
                      minWidth: col.minWidth,
                      fontWeight: 700,
                      backgroundColor: 'grey.50',
                      whiteSpace: 'nowrap',
                    }}
                  >
                    {col.sortable ? (
                      <TableSortLabel
                        active={orderBy === col.id}
                        direction={orderBy === col.id ? order : 'asc'}
                        onClick={() => handleSort(col.id)}
                      >
                        {col.label}
                      </TableSortLabel>
                    ) : (
                      col.label
                    )}
                  </TableCell>
                ))}
              </TableRow>
            </TableHead>

            <TableBody>
              {loading ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} align="center" sx={{ py: 6 }}>
                    <CircularProgress size={32} />
                  </TableCell>
                </TableRow>
              ) : servicePOs.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No Service POs found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                servicePOs.map((po) => {
                  const utilisationPct = getUtilisationPct(po);
                  const sc = statusConfig[po.status?.toLowerCase()] || { color: 'default', label: po.status };
                  return (
                    <TableRow
                      key={po.id}
                      hover
                      sx={{ '&:last-child td': { borderBottom: 0 } }}
                    >
                      <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>
                        {po.service_po_code}
                      </TableCell>
                      <TableCell sx={{ fontWeight: 500, maxWidth: 200 }}>
                        <Typography
                          variant="body2"
                          fontWeight={500}
                          sx={{
                            overflow: 'hidden',
                            textOverflow: 'ellipsis',
                            whiteSpace: 'nowrap',
                            maxWidth: 180,
                            cursor: 'pointer',
                            '&:hover': { color: 'primary.main', textDecoration: 'underline' },
                          }}
                          onClick={() => handleView(po)}
                          title={po.service_po_name}
                        >
                          {po.service_po_name}
                        </Typography>
                      </TableCell>
                      <TableCell>{po.client_name || po.client?.client_name || '—'}</TableCell>
                      <TableCell>{po.service_type || '—'}</TableCell>
                      <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums', whiteSpace: 'nowrap' }}>
                        {formatCurrency(po.po_value)}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 13, color: 'text.secondary' }}>
                        {po.start_date ? format(new Date(po.start_date), 'dd MMM yy') : '—'}
                      </TableCell>
                      <TableCell sx={{ whiteSpace: 'nowrap', fontSize: 13, color: 'text.secondary' }}>
                        {po.end_date ? format(new Date(po.end_date), 'dd MMM yy') : '—'}
                      </TableCell>
                      <TableCell sx={{ minWidth: 130 }}>
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Box sx={{ flex: 1 }}>
                            <LinearProgress
                              variant="determinate"
                              value={utilisationPct}
                              color={utilisationColor(utilisationPct)}
                              sx={{ height: 6, borderRadius: 3 }}
                            />
                          </Box>
                          <Typography
                            variant="caption"
                            sx={{ fontVariantNumeric: 'tabular-nums', minWidth: 32, textAlign: 'right' }}
                          >
                            {utilisationPct}%
                          </Typography>
                        </Box>
                      </TableCell>
                      <TableCell>
                        <Chip
                          label={sc.label}
                          size="small"
                          color={sc.color}
                          sx={{ fontWeight: 600, textTransform: 'capitalize' }}
                        />
                      </TableCell>
                      <TableCell align="center" sx={{ whiteSpace: 'nowrap' }}>
                        <Tooltip title="View Details">
                          <IconButton size="small" onClick={() => handleView(po)}>
                            <VisibilityIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
                        <Tooltip title="Edit">
                          <span>
                            <IconButton
                              size="small"
                              onClick={() => handleEdit(po)}
                              disabled={po.status === 'closed'}
                            >
                              <EditIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Close PO">
                          <span>
                            <IconButton
                              size="small"
                              color="warning"
                              onClick={() => handleCloseRequest(po)}
                              disabled={po.status === 'closed'}
                            >
                              <CloseIcon fontSize="small" />
                            </IconButton>
                          </span>
                        </Tooltip>
                        <Tooltip title="Delete">
                          <IconButton
                            size="small"
                            color="error"
                            onClick={() => handleDeleteRequest(po)}
                          >
                            <DeleteIcon fontSize="small" />
                          </IconButton>
                        </Tooltip>
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
          count={meta?.total ?? 0}
          page={page}
          onPageChange={(_, newPage) => setPage(newPage)}
          rowsPerPage={rowsPerPage}
          onRowsPerPageChange={(e) => {
            setRowsPerPage(parseInt(e.target.value, 10));
            setPage(0);
          }}
          rowsPerPageOptions={[5, 10, 25, 50]}
          labelRowsPerPage="Rows:"
        />
      </Paper>

      {/* Add/Edit Modal */}
      <ServicePOForm open={formOpen} onClose={handleFormClose} initialData={editTarget} />

      {/* Delete Confirm */}
      <ConfirmDialog
        open={confirmDeleteOpen}
        title="Delete Service PO"
        content={`Are you sure you want to delete "${deleteTarget?.service_po_name}"? This cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="error"
        onConfirm={handleDeleteConfirm}
        onCancel={() => { setConfirmDeleteOpen(false); setDeleteTarget(null); }}
      />

      {/* Close PO Confirm */}
      <ConfirmDialog
        open={confirmCloseOpen}
        title="Close Service PO"
        content={`Close "${closeTarget?.service_po_name}"? No further timesheets can be logged against it.`}
        confirmLabel="Close PO"
        confirmColor="warning"
        onConfirm={handleCloseConfirm}
        onCancel={() => { setConfirmCloseOpen(false); setCloseTarget(null); }}
      />
    </Box>
  );
}
