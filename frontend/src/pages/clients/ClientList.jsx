import React, { useEffect, useState, useCallback } from 'react';
import {
  Box,
  Button,
  Chip,
  IconButton,
  InputAdornment,
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
  CircularProgress,
  Alert,
} from '@mui/material';
import {
  Add as AddIcon,
  Delete as DeleteIcon,
  Edit as EditIcon,
  Search as SearchIcon,
  ClearAll as ClearAllIcon,
} from '@mui/icons-material';
import { useDispatch, useSelector } from 'react-redux';
import { format } from 'date-fns';

import ClientForm from './ClientForm';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  fetchClients,
  deleteClient,
  selectAllClients,
  selectClientsLoading,
  selectClientsError,
  selectClientsMeta,
} from '../../store/slices/clientSlice';

const COLUMNS = [
  { id: 'client_code', label: 'Code', sortable: true, width: 120 },
  { id: 'client_name', label: 'Client Name', sortable: true, minWidth: 180 },
  { id: 'industry', label: 'Industry', sortable: true, minWidth: 140 },
  { id: 'status', label: 'Status', sortable: true, width: 110 },
  { id: 'created_at', label: 'Created', sortable: true, width: 130 },
  { id: 'actions', label: 'Actions', sortable: false, width: 100, align: 'center' },
];

const statusColor = (status) => {
  switch (status?.toLowerCase()) {
    case 'active':
      return 'success';
    case 'inactive':
      return 'default';
    case 'suspended':
      return 'error';
    default:
      return 'default';
  }
};

export default function ClientList() {
  const dispatch = useDispatch();
  const clients = useSelector(selectAllClients);
  const loading = useSelector(selectClientsLoading);
  const error = useSelector(selectClientsError);
  const meta = useSelector(selectClientsMeta);

  const [search, setSearch] = useState('');
  const [debouncedSearch, setDebouncedSearch] = useState('');
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [orderBy, setOrderBy] = useState('client_name');
  const [order, setOrder] = useState('asc');

  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [confirmOpen, setConfirmOpen] = useState(false);

  // Debounce search input
  useEffect(() => {
    const timer = setTimeout(() => {
      setDebouncedSearch(search);
      setPage(0);
    }, 350);
    return () => clearTimeout(timer);
  }, [search]);

  const loadClients = useCallback(() => {
    dispatch(
      fetchClients({
        search: debouncedSearch,
        page: page + 1,
        per_page: rowsPerPage,
        sort_by: orderBy,
        sort_order: order,
      })
    );
  }, [dispatch, debouncedSearch, page, rowsPerPage, orderBy, order]);

  useEffect(() => {
    loadClients();
  }, [loadClients]);

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

  const handleEdit = (client) => {
    setEditTarget(client);
    setFormOpen(true);
  };

  const handleDeleteRequest = (client) => {
    setDeleteTarget(client);
    setConfirmOpen(true);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    await dispatch(deleteClient(deleteTarget.id));
    setConfirmOpen(false);
    setDeleteTarget(null);
    loadClients();
  };

  const handleFormClose = (refreshed) => {
    setFormOpen(false);
    setEditTarget(null);
    if (refreshed) loadClients();
  };

  const handleClearSearch = () => {
    setSearch('');
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
          <Typography variant="h5" fontWeight={700} gutterBottom={false}>
            Clients
          </Typography>
          <Typography variant="body2" color="text.secondary">
            Manage client accounts and their details
          </Typography>
        </Box>
        <Button
          variant="contained"
          startIcon={<AddIcon />}
          onClick={handleAdd}
          sx={{ textTransform: 'none', fontWeight: 600 }}
        >
          Add Client
        </Button>
      </Box>

      {/* Search bar */}
      <Box sx={{ mb: 2, maxWidth: 400 }}>
        <TextField
          size="small"
          fullWidth
          placeholder="Search by name, code, industry…"
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
                <IconButton size="small" onClick={handleClearSearch}>
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
              ) : clients.length === 0 ? (
                <TableRow>
                  <TableCell colSpan={COLUMNS.length} align="center" sx={{ py: 6 }}>
                    <Typography color="text.secondary">No clients found</Typography>
                  </TableCell>
                </TableRow>
              ) : (
                clients.map((client) => (
                  <TableRow
                    key={client.id}
                    hover
                    sx={{ '&:last-child td': { borderBottom: 0 } }}
                  >
                    <TableCell sx={{ fontFamily: 'monospace', fontWeight: 600, fontSize: 13 }}>
                      {client.client_code}
                    </TableCell>
                    <TableCell sx={{ fontWeight: 500 }}>{client.client_name}</TableCell>
                    <TableCell>{client.industry || '—'}</TableCell>
                    <TableCell>
                      <Chip
                        label={client.status}
                        size="small"
                        color={statusColor(client.status)}
                        sx={{ textTransform: 'capitalize', fontWeight: 600 }}
                      />
                    </TableCell>
                    <TableCell sx={{ whiteSpace: 'nowrap', color: 'text.secondary', fontSize: 13 }}>
                      {client.created_at
                        ? format(new Date(client.created_at), 'dd MMM yyyy')
                        : '—'}
                    </TableCell>
                    <TableCell align="center">
                      <Tooltip title="Edit">
                        <IconButton size="small" onClick={() => handleEdit(client)}>
                          <EditIcon fontSize="small" />
                        </IconButton>
                      </Tooltip>
                      <Tooltip title="Delete">
                        <IconButton
                          size="small"
                          color="error"
                          onClick={() => handleDeleteRequest(client)}
                        >
                          <DeleteIcon fontSize="small" />
                        </IconButton>
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

      {/* Add/Edit form modal */}
      <ClientForm
        open={formOpen}
        onClose={handleFormClose}
        initialData={editTarget}
      />

      {/* Delete confirmation */}
      <ConfirmDialog
        open={confirmOpen}
        title="Delete Client"
        content={`Are you sure you want to delete "${deleteTarget?.client_name}"? This action cannot be undone.`}
        confirmLabel="Delete"
        confirmColor="error"
        onConfirm={handleDeleteConfirm}
        onCancel={() => {
          setConfirmOpen(false);
          setDeleteTarget(null);
        }}
      />
    </Box>
  );
}
