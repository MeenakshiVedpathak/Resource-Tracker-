import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Chip,
  Stack,
  Tooltip,
  Alert,
  Snackbar,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import PersonIcon from '@mui/icons-material/Person';

import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusChip from '../../components/StatusChip';
import ConfirmDialog from '../../components/ConfirmDialog';

import {
  fetchEmployees,
  deleteEmployee,
  setFilters,
  resetFilters,
  selectEmployees,
  selectEmployeeTotal,
  selectEmployeeLoading,
  selectEmployeeError,
  selectEmployeeFilters,
} from '../../redux/slices/employeeSlice';
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

const formatExperience = (years) => {
  if (years === null || years === undefined || years === '') return '—';
  const num = Number(years);
  if (Number.isNaN(num)) return '—';
  return `${num} yr${num !== 1 ? 's' : ''}`;
};

const STATUS_FILTER_OPTIONS = [
  { label: 'All', value: '' },
  { label: 'Active', value: 'active' },
  { label: 'Inactive', value: 'inactive' },
];

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const EmployeeList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const employees = useSelector(selectEmployees);
  const total = useSelector(selectEmployeeTotal);
  const loading = useSelector(selectEmployeeLoading);
  const error = useSelector(selectEmployeeError);
  const filters = useSelector(selectEmployeeFilters);
  const userRole = useSelector(selectUserRole);

  const isHR = userRole === 'HR' || userRole === 'Admin';

  // Local state
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [sortBy, setSortBy] = useState('full_name');
  const [sortDir, setSortDir] = useState('asc');

  // ---------------------------------------------------------------------------
  // Data fetching
  // ---------------------------------------------------------------------------

  const loadEmployees = useCallback(() => {
    dispatch(
      fetchEmployees({
        page: filters.page,
        limit: filters.limit,
        search: filters.search,
        status: filters.status,
        sort_by: sortBy,
        sort_dir: sortDir,
      })
    );
  }, [dispatch, filters, sortBy, sortDir]);

  useEffect(() => {
    loadEmployees();
  }, [loadEmployees]);

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
    navigate(`/employees/${row.id}/edit`);
  };

  const handleDeleteClick = (row) => {
    setDeleteTarget(row);
  };

  const handleDeleteConfirm = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await dispatch(deleteEmployee(deleteTarget.id)).unwrap();
      setSuccessMsg(`Employee "${deleteTarget.full_name}" deleted successfully.`);
      setDeleteTarget(null);
    } catch {
      // error shown via redux state
    } finally {
      setDeleteLoading(false);
    }
  };

  // ---------------------------------------------------------------------------
  // Table columns
  // ---------------------------------------------------------------------------

  const columns = [
    {
      id: 'employee_code',
      label: 'Emp Code',
      minWidth: 110,
      sortable: true,
      render: (val) => (
        <Box
          component="span"
          sx={{
            fontFamily: 'monospace',
            fontSize: '0.8rem',
            fontWeight: 600,
            color: 'text.secondary',
            bgcolor: 'action.hover',
            px: 0.75,
            py: 0.25,
            borderRadius: 0.5,
          }}
        >
          {val || '—'}
        </Box>
      ),
    },
    {
      id: 'full_name',
      label: 'Full Name',
      minWidth: 160,
      sortable: true,
      render: (val) => (
        <Box sx={{ fontWeight: 500, color: 'text.primary' }}>{val || '—'}</Box>
      ),
    },
    {
      id: 'designation',
      label: 'Designation',
      minWidth: 150,
      sortable: true,
    },
    {
      id: 'total_experience',
      label: 'Total Exp',
      minWidth: 100,
      sortable: true,
      align: 'center',
      render: (val) => formatExperience(val),
    },
    {
      id: 'company_experience',
      label: 'Co. Exp',
      minWidth: 100,
      sortable: true,
      align: 'center',
      render: (val) => formatExperience(val),
    },
    {
      id: 'date_of_joining',
      label: 'Date of Joining',
      minWidth: 130,
      sortable: true,
      render: (val) => formatDate(val),
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 90,
      sortable: true,
      render: (val) => <StatusChip status={val} />,
    },
  ];

  const tableActions = [
    {
      label: 'Edit',
      icon: <EditIcon fontSize="small" />,
      onClick: handleEdit,
      color: 'primary',
      tooltip: 'Edit employee',
      visible: () => isHR,
    },
    {
      label: 'Delete',
      icon: <DeleteIcon fontSize="small" />,
      onClick: handleDeleteClick,
      color: 'error',
      tooltip: 'Delete employee',
      visible: () => isHR,
    },
  ];

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box sx={{ p: { xs: 2, sm: 3 } }}>
      <PageHeader
        title="Employees"
        subtitle="Manage your organisation's employee roster."
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Employees' },
        ]}
        action={
          isHR
            ? {
                label: 'Add Employee',
                icon: <AddIcon />,
                component: 'RouterLink',
                to: '/employees/new',
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
            sx={{
              fontWeight: 500,
              cursor: 'pointer',
              transition: 'all 0.15s',
            }}
          />
        ))}
      </Stack>

      {/* Error banner */}
      {error && (
        <Alert severity="error" sx={{ mb: 2 }} onClose={() => dispatch({ type: 'employees/clearError' })}>
          {error}
        </Alert>
      )}

      <DataTable
        columns={columns}
        rows={employees}
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
        searchPlaceholder="Search by name, code, designation…"
        actions={tableActions}
        rowKey="id"
      />

      {/* Delete confirm dialog */}
      <ConfirmDialog
        open={Boolean(deleteTarget)}
        onClose={() => setDeleteTarget(null)}
        onConfirm={handleDeleteConfirm}
        loading={deleteLoading}
        title="Delete Employee"
        message={
          deleteTarget
            ? `Are you sure you want to delete "${deleteTarget.full_name}"? This action cannot be undone.`
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

export default EmployeeList;
