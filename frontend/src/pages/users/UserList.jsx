import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Chip,
  Stack,
  Alert,
  Snackbar,
  Typography,
  Tooltip,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusChip from '../../components/StatusChip';
import ConfirmDialog from '../../components/ConfirmDialog';

import {
  fetchUsers,
  deleteUser,
  setFilters,
  selectUsers,
  selectUserTotal,
  selectUserLoading,
  selectUserError,
  selectUserFilters,
} from '../../redux/slices/userSlice';
import { selectUserRole } from '../../redux/slices/authSlice';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatLastLogin = (dateStr) => {
  if (!dateStr) return 'Never';
  try {
    const date = new Date(dateStr);
    const now = new Date();
    const diffMs = now - date;
    const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));

    if (diffDays === 0) {
      return new Intl.DateTimeFormat('en-IN', {
        hour: '2-digit',
        minute: '2-digit',
        hour12: true,
      }).format(date);
    }
    if (diffDays === 1) return 'Yesterday';
    if (diffDays < 7) return `${diffDays}d ago`;
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(date);
  } catch {
    return dateStr;
  }
};

const STATUS_FILTER_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const UserList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const users = useSelector(selectUsers);
  const total = useSelector(selectUserTotal);
  const loading = useSelector(selectUserLoading);
  const error = useSelector(selectUserError);
  const filters = useSelector(selectUserFilters);
  const userRole = useSelector(selectUserRole);

  const isHR = userRole === 'HR' || userRole === 'Admin';

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [sortBy, setSortBy] = useState('email');
  const [sortDir, setSortDir] = useState('asc');

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const loadUsers = useCallback(() => {
    dispatch(
      fetchUsers({
        page: filters.page,
        limit: filters.limit,
        search: filters.search,
        status: filters.status,
        role_id: filters.role_id,
        sort_by: sortBy,
        sort_dir: sortDir,
      })
    );
  }, [dispatch, filters, sortBy, sortDir]);

  useEffect(() => {
    loadUsers();
  }, [loadUsers]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSearchChange = (value) => {
    dispatch(setFilters({ search: value, page: 1 }));
  };

  const handlePageChange = (_, newPage) => {
    dispatch(setFilters({ page: newPage + 1 }));
  };

  const handleRowsPerPageChange = (e) => {
    dispatch(setFilters({ limit: parseInt(e.target.value, 10), page: 1 }));
  };

  const handleSort = (columnId) => {
    const newDir = sortBy === columnId && sortDir === 'asc' ? 'desc' : 'asc';
    setSortBy(columnId);
    setSortDir(newDir);
  };

  const handleStatusFilter = (value) => {
    dispatch(setFilters({ status: value, page: 1 }));
  };

  const handleEdit = (row) => {
    navigate(`/users/${row.id}/edit`);
  };

  const handleDeleteClick = (row) => {
    setDeleteTarget(row);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await dispatch(deleteUser(deleteTarget.id)).unwrap();
      setSuccessMsg(`User "${deleteTarget.email}" deleted successfully.`);
      setDeleteTarget(null);
    } catch {
      // error handled via redux state
    } finally {
      setDeleteLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Table columns
  // ---------------------------------------------------------------------------

  const columns = [
    {
      id: 'email',
      label: 'Email',
      minWidth: 200,
      sortable: true,
      render: (val) => (
        <Typography
          variant="body2"
          sx={{ fontWeight: 500, color: 'primary.main', fontFamily: 'monospace', fontSize: '0.85rem' }}
        >
          {val || '—'}
        </Typography>
      ),
    },
    {
      id: 'full_name',
      label: 'Full Name',
      minWidth: 150,
      sortable: true,
      render: (val, row) => {
        const name = val || row.employee?.full_name || '—';
        return <Box sx={{ fontWeight: 500 }}>{name}</Box>;
      },
    },
    {
      id: 'role_name',
      label: 'Role',
      minWidth: 120,
      sortable: true,
      render: (val, row) => {
        const roleName = val || row.role?.role_name || '—';
        return (
          <Chip
            label={roleName}
            size="small"
            variant="outlined"
            sx={{ fontWeight: 500, fontSize: '0.72rem' }}
          />
        );
      },
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 90,
      sortable: true,
      render: (val) => <StatusChip status={val} />,
    },
    {
      id: 'last_login',
      label: 'Last Login',
      minWidth: 120,
      sortable: true,
      render: (val) => (
        <Tooltip title={val ? new Date(val).toLocaleString('en-IN') : 'Never logged in'}>
          <Typography variant="body2" color="text.secondary" sx={{ fontSize: '0.8rem' }}>
            {formatLastLogin(val)}
          </Typography>
        </Tooltip>
      ),
    },
  ];

  const tableActions = [
    {
      label: 'Edit',
      icon: <EditIcon fontSize="small" />,
      onClick: handleEdit,
      color: 'primary',
      tooltip: 'Edit user',
      visible: () => isHR,
    },
    {
      label: 'Delete',
      icon: <DeleteIcon fontSize="small" />,
      onClick: handleDeleteClick,
      color: 'error',
      tooltip: 'Delete user',
      visible: () => isHR,
    },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <PageHeader
        title="Users"
        subtitle="Portal accounts and access management."
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Users' },
        ]}
        action={
          isHR
            ? {
                label: 'Add User',
                icon: <AddIcon />,
                component: 'RouterLink',
                to: '/users/new',
              }
            : null
        }
      />

      {/* Status filter chips */}
      <Stack direction="row" spacing={1} sx={{ mt: 2.5, mb: 2, flexWrap: 'wrap', gap: 1 }}>
        {STATUS_FILTER_OPTIONS.map((opt) => (
          <Chip
            key={opt.value}
            label={opt.label}
            variant={filters.status === opt.value ? 'filled' : 'outlined'}
            color={filters.status === opt.value ? 'primary' : 'default'}
            size="small"
            onClick={() => handleStatusFilter(opt.value)}
            sx={{ fontWeight: 500, cursor: 'pointer', transition: 'all 0.15s' }}
          />
        ))}
      </Stack>

      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch({ type: 'users/clearError' })}>
          {error}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={users}
        total={total}
        page={Math.max(0, (filters.page || 1) - 1)}
        rowsPerPage={filters.limit || 10}
        onPageChange={handlePageChange}
        onRowsPerPageChange={handleRowsPerPageChange}
        loading={loading}
        sortBy={sortBy}
        sortDir={sortDir}
        onSort={handleSort}
        searchValue={filters.search || ''}
        onSearchChange={handleSearchChange}
        searchPlaceholder="Search by email or name…"
        actions={tableActions}
        rowKey="id"
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
        title="Delete User"
        message={
          deleteTarget
            ? `Delete the account for "${deleteTarget.email}"? This will revoke their portal access immediately.`
            : ''
        }
        confirmLabel="Delete"
        confirmColor="error"
        severity="error"
      />

      <Snackbar
        open={Boolean(successMsg)}
        autoHideDuration={4000}
        onClose={() => setSuccessMsg('')}
        anchorOrigin={{ vertical: 'bottom', horizontal: 'center' }}
      >
        <Alert severity="success" onClose={() => setSuccessMsg('')} sx={{ width: '100%' }}>
          {successMsg}
        </Alert>
      </Snackbar>
    </Box>
  );
};

export default UserList;
