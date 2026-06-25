import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import {
  Box,
  Alert,
  Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';

import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusChip from '../../components/StatusChip';
import ConfirmDialog from '../../components/ConfirmDialog';
import RoleForm from './RoleForm';

import {
  fetchRoles,
  deleteRole,
  selectRoles,
  selectRoleTotal,
  selectRoleLoading,
  selectRoleError,
} from '../../redux/slices/roleSlice';
import { selectUserRole } from '../../redux/slices/authSlice';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  try {
    return new Intl.DateTimeFormat('en-IN', {
      day: '2-digit',
      month: 'short',
      year: 'numeric',
    }).format(new Date(dateStr));
  } catch {
    return dateStr;
  }
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const RoleList = () => {
  const dispatch = useDispatch();

  const roles = useSelector(selectRoles);
  const total = useSelector(selectRoleTotal);
  const loading = useSelector(selectRoleLoading);
  const error = useSelector(selectRoleError);
  const userRole = useSelector(selectUserRole);

  const isManagement = userRole === 'Admin' || userRole === 'Management';

  // Local state
  const [page, setPage] = useState(0);
  const [rowsPerPage, setRowsPerPage] = useState(10);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('role_name');
  const [sortDir, setSortDir] = useState('asc');
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');

  // RoleForm modal state
  const [formOpen, setFormOpen] = useState(false);
  const [editTarget, setEditTarget] = useState(null);

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const loadRoles = useCallback(() => {
    dispatch(
      fetchRoles({
        page: page + 1,
        limit: rowsPerPage,
        search,
        sort_by: sortBy,
        sort_dir: sortDir,
      })
    );
  }, [dispatch, page, rowsPerPage, search, sortBy, sortDir]);

  useEffect(() => {
    loadRoles();
  }, [loadRoles]);

  // ---------------------------------------------------------------------------
  // Handlers
  // ---------------------------------------------------------------------------

  const handleSearchChange = (value) => {
    setSearch(value);
    setPage(0);
  };

  const handlePageChange = (_, newPage) => setPage(newPage);

  const handleRowsPerPageChange = (e) => {
    setRowsPerPage(parseInt(e.target.value, 10));
    setPage(0);
  };

  const handleSort = (columnId) => {
    const newDir = sortBy === columnId && sortDir === 'asc' ? 'desc' : 'asc';
    setSortBy(columnId);
    setSortDir(newDir);
  };

  const handleAdd = () => {
    setEditTarget(null);
    setFormOpen(true);
  };

  const handleEdit = (row) => {
    setEditTarget(row);
    setFormOpen(true);
  };

  const handleFormClose = () => {
    setFormOpen(false);
    setEditTarget(null);
  };

  const handleFormSuccess = (msg) => {
    setSuccessMsg(msg);
    loadRoles();
  };

  const handleDeleteClick = (row) => {
    setDeleteTarget(row);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await dispatch(deleteRole(deleteTarget.id)).unwrap();
      setSuccessMsg(`Role "${deleteTarget.role_name}" deleted successfully.`);
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
      id: 'role_name',
      label: 'Role Name',
      minWidth: 160,
      sortable: true,
      render: (val) => (
        <Box sx={{ fontWeight: 600, color: 'text.primary' }}>{val || '—'}</Box>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 100,
      sortable: true,
      render: (val) => <StatusChip status={val} />,
    },
    {
      id: 'created_at',
      label: 'Created',
      minWidth: 130,
      sortable: true,
      render: (val) => formatDate(val),
    },
  ];

  const tableActions = [
    {
      label: 'Edit',
      icon: <EditIcon fontSize="small" />,
      onClick: handleEdit,
      color: 'primary',
      tooltip: 'Edit role',
      visible: () => isManagement,
    },
    {
      label: 'Delete',
      icon: <DeleteIcon fontSize="small" />,
      onClick: handleDeleteClick,
      color: 'error',
      tooltip: 'Delete role',
      visible: () => isManagement,
    },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <PageHeader
        title="Roles"
        subtitle="Define and manage the access roles available in RUT Portal."
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Roles' },
        ]}
        action={
          isManagement
            ? {
                label: 'Add Role',
                icon: <AddIcon />,
                onClick: handleAdd,
              }
            : null
        }
      />

      {error && (
        <Alert severity="error" sx={{ mt: 2.5, mb: 2 }} onClose={() => dispatch({ type: 'roles/clearError' })}>
          {error}
        </Alert>
      )}

      <Box sx={{ mt: 3 }}>
        <DataTable
          columns={columns}
          rows={roles}
          total={total}
          page={page}
          rowsPerPage={rowsPerPage}
          onPageChange={handlePageChange}
          onRowsPerPageChange={handleRowsPerPageChange}
          loading={loading}
          sortBy={sortBy}
          sortDir={sortDir}
          onSort={handleSort}
          searchValue={search}
          onSearchChange={handleSearchChange}
          searchPlaceholder="Search roles…"
          actions={tableActions}
          rowKey="id"
        />
      </Box>

      {/* Add / Edit modal */}
      <RoleForm
        open={formOpen}
        onClose={handleFormClose}
        editData={editTarget}
        onSuccess={handleFormSuccess}
      />

      {/* Delete confirm */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
        title="Delete Role"
        message={
          deleteTarget
            ? `Delete the role "${deleteTarget.role_name}"? Users assigned this role will lose their associated permissions.`
            : ''
        }
        confirmLabel="Delete"
        confirmColor="error"
        severity="error"
      />

      {/* Success snackbar */}
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

export default RoleList;
