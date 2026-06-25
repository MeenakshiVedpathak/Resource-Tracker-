import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Stack,
  TextField,
  Tooltip,
  Chip,
  Typography,
  Paper,
  Divider,
  alpha,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';

import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import ConfirmDialog from '../../components/ConfirmDialog';

import {
  fetchMonthlyCosts,
  deleteMonthlyCost,
  setFilters,
  resetFilters,
  selectMonthlyCosts,
  selectMonthlyCostTotal,
  selectMonthlyCostLoading,
  selectMonthlyCostFilters,
} from '../../redux/slices/monthlyCostSlice';

const MONTH_NAMES = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const formatCurrency = (val) => {
  if (val === null || val === undefined || val === '') return '—';
  return new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 0,
  }).format(Number(val));
};

const CurrencyCell = ({ value }) => (
  <Box
    component="span"
    sx={{ fontVariantNumeric: 'tabular-nums', fontWeight: 500 }}
  >
    {formatCurrency(value)}
  </Box>
);

const MonthlyCostList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();

  const monthlyCosts = useSelector(selectMonthlyCosts);
  const total = useSelector(selectMonthlyCostTotal);
  const loading = useSelector(selectMonthlyCostLoading);
  const filters = useSelector(selectMonthlyCostFilters);

  const currentYear = new Date().getFullYear();
  const currentMonth = new Date().getMonth() + 1;

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState('');
  const [monthFilter, setMonthFilter] = useState(filters.month || '');
  const [yearFilter, setYearFilter] = useState(filters.year || '');
  const [sortBy, setSortBy] = useState('year');
  const [sortDir, setSortDir] = useState('desc');

  const page = (filters.page || 1) - 1;
  const rowsPerPage = filters.limit || 10;

  const loadData = useCallback(() => {
    dispatch(
      fetchMonthlyCosts({
        page: filters.page,
        limit: filters.limit,
        month: filters.month || undefined,
        year: filters.year || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
      })
    );
  }, [dispatch, filters, sortBy, sortDir]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleMonthChange = (e) => {
    const val = e.target.value;
    setMonthFilter(val);
    dispatch(setFilters({ month: val, page: 1 }));
  };

  const handleYearChange = (e) => {
    const val = e.target.value;
    setYearFilter(val);
    dispatch(setFilters({ year: val, page: 1 }));
  };

  const handlePageChange = (_, newPage) => {
    dispatch(setFilters({ page: newPage + 1 }));
  };

  const handleRowsPerPageChange = (e) => {
    dispatch(setFilters({ limit: parseInt(e.target.value, 10), page: 1 }));
  };

  const handleSort = (col) => {
    const newDir = sortBy === col && sortDir === 'asc' ? 'desc' : 'asc';
    setSortBy(col);
    setSortDir(newDir);
  };

  const handleClearFilters = () => {
    setMonthFilter('');
    setYearFilter('');
    setSearch('');
    dispatch(resetFilters());
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await dispatch(deleteMonthlyCost(deleteTarget.id)).unwrap();
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const hasActiveFilters = monthFilter || yearFilter || search;

  const columns = [
    {
      id: 'employee_name',
      label: 'Employee',
      minWidth: 180,
      sortable: true,
      render: (val, row) => (
        <Box>
          <Typography variant="body2" fontWeight={600} sx={{ lineHeight: 1.3 }}>
            {val || row?.employee?.full_name || '—'}
          </Typography>
          {(row?.employee?.employee_code || row?.employee_code) && (
            <Typography variant="caption" color="text.secondary">
              {row?.employee?.employee_code || row?.employee_code}
            </Typography>
          )}
        </Box>
      ),
    },
    {
      id: 'month',
      label: 'Period',
      minWidth: 130,
      sortable: true,
      render: (val, row) => (
        <Box
          component="span"
          sx={{
            fontWeight: 600,
            fontVariantNumeric: 'tabular-nums',
            color: theme.palette.text.primary,
          }}
        >
          {val ? MONTH_NAMES[(Number(val) - 1)] : '—'} {row?.year || ''}
        </Box>
      ),
    },
    {
      id: 'salary_cost',
      label: 'Salary Cost',
      minWidth: 130,
      align: 'right',
      sortable: true,
      render: (val) => <CurrencyCell value={val} />,
    },
    {
      id: 'ops_cost',
      label: 'Ops Cost',
      minWidth: 120,
      align: 'right',
      sortable: true,
      render: (val) => <CurrencyCell value={val} />,
    },
    {
      id: 'ops_cost_per_employee',
      label: 'Ops / Employee',
      minWidth: 130,
      align: 'right',
      sortable: false,
      render: (val) => (
        <Box
          component="span"
          sx={{
            fontVariantNumeric: 'tabular-nums',
            color: theme.palette.text.secondary,
            fontSize: '0.85rem',
          }}
        >
          {formatCurrency(val)}
        </Box>
      ),
    },
    {
      id: 'total_cost',
      label: 'Total Cost',
      minWidth: 130,
      align: 'right',
      sortable: true,
      render: (val) => (
        <Box
          component="span"
          sx={{
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 700,
            color: theme.palette.primary.main,
          }}
        >
          {formatCurrency(val)}
        </Box>
      ),
    },
    {
      id: 'billable_cost',
      label: 'Billable',
      minWidth: 120,
      align: 'right',
      sortable: true,
      render: (val) => (
        <Box
          component="span"
          sx={{
            fontVariantNumeric: 'tabular-nums',
            fontWeight: 600,
            color: theme.palette.success.dark,
          }}
        >
          {formatCurrency(val)}
        </Box>
      ),
    },
  ];

  const actions = [
    {
      label: 'Edit',
      icon: <EditIcon fontSize="small" />,
      tooltip: 'Edit monthly cost',
      color: 'primary',
      onClick: (row) => navigate(`/monthly-costs/${row.id}/edit`),
    },
    {
      label: 'Delete',
      icon: <DeleteIcon fontSize="small" />,
      tooltip: 'Delete record',
      color: 'error',
      onClick: (row) => setDeleteTarget(row),
    },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeader
        title="Monthly Costs"
        subtitle="Track employee salary, ops, and billable costs per month"
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Monthly Costs' },
        ]}
        action={{
          label: 'Add Monthly Cost',
          icon: <AddIcon />,
          onClick: () => navigate('/monthly-costs/new'),
        }}
      />

      {/* Filter bar */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ sm: 'center' }}
        sx={{ mt: 3, mb: 2 }}
        flexWrap="wrap"
      >
        <TextField
          select
          label="Month"
          value={monthFilter}
          onChange={handleMonthChange}
          size="small"
          sx={{ minWidth: 140 }}
          SelectProps={{ native: false }}
        >
          <option value="" style={{ padding: '6px 16px', display: 'block' }}>All Months</option>
          {MONTH_NAMES.map((name, idx) => (
            <option
              key={idx + 1}
              value={idx + 1}
              style={{ padding: '6px 16px', display: 'block' }}
            >
              {name}
            </option>
          ))}
        </TextField>

        <TextField
          label="Year"
          type="number"
          value={yearFilter}
          onChange={handleYearChange}
          size="small"
          sx={{ width: 110 }}
          inputProps={{ min: 2000, max: currentYear + 5 }}
          placeholder={String(currentYear)}
        />

        {hasActiveFilters && (
          <>
            <Chip
              icon={<FilterListIcon sx={{ fontSize: '0.9rem !important' }} />}
              label="Filters active"
              size="small"
              color="primary"
              variant="outlined"
            />
            <Tooltip title="Clear all filters">
              <Button
                size="small"
                variant="text"
                startIcon={<ClearIcon />}
                onClick={handleClearFilters}
                color="inherit"
                sx={{ color: 'text.secondary' }}
              >
                Clear
              </Button>
            </Tooltip>
          </>
        )}
      </Stack>

      <DataTable
        title="Cost Records"
        columns={columns}
        rows={monthlyCosts || []}
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
        onSearchChange={setSearch}
        searchPlaceholder="Search by employee name…"
        actions={actions}
        exportable
        onExport={() => {}}
        rowKey="id"
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Cost Record"
        message={
          deleteTarget
            ? `Delete the cost record for "${
                deleteTarget.employee_name || 'this employee'
              }" (${
                deleteTarget.month ? MONTH_NAMES[deleteTarget.month - 1] : ''
              } ${deleteTarget.year || ''})? This cannot be undone.`
            : ''
        }
        confirmLabel="Delete"
        confirmColor="error"
        loading={deleteLoading}
        onConfirm={handleDelete}
        onCancel={() => setDeleteTarget(null)}
      />
    </Box>
  );
};

export default MonthlyCostList;
