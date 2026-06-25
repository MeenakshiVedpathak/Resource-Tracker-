import React, { useEffect, useState, useCallback } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  Tooltip,
  IconButton,
  Stack,
  Chip,
  alpha,
  useTheme,
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/EditOutlined';
import DeleteIcon from '@mui/icons-material/DeleteOutlineOutlined';
import FilterListIcon from '@mui/icons-material/FilterList';
import ClearIcon from '@mui/icons-material/Clear';

import PageHeader from '../../components/PageHeader';
import DataTable from '../../components/DataTable';
import StatusChip from '../../components/StatusChip';
import ConfirmDialog from '../../components/ConfirmDialog';

import {
  fetchSubProjects,
  deleteSubProject,
  setFilters,
  resetFilters,
  selectSubProjects,
  selectSubProjectTotal,
  selectSubProjectLoading,
  selectSubProjectFilters,
} from '../../redux/slices/subProjectSlice';

import {
  fetchServicePOs,
  selectServicePOs,
} from '../../redux/slices/servicePOSlice';

const MONTH_NAMES = [
  'Jan','Feb','Mar','Apr','May','Jun',
  'Jul','Aug','Sep','Oct','Nov','Dec',
];

const formatDate = (dateStr) => {
  if (!dateStr) return '—';
  const d = new Date(dateStr);
  if (isNaN(d)) return dateStr;
  return `${d.getDate()} ${MONTH_NAMES[d.getMonth()]} ${d.getFullYear()}`;
};

const SubProjectList = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const theme = useTheme();

  const subProjects = useSelector(selectSubProjects);
  const total = useSelector(selectSubProjectTotal);
  const loading = useSelector(selectSubProjectLoading);
  const filters = useSelector(selectSubProjectFilters);

  const servicePOs = useSelector(selectServicePOs);

  const [deleteTarget, setDeleteTarget] = useState(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [search, setSearch] = useState(filters.search || '');
  const [poFilter, setPoFilter] = useState(filters.service_po_id || '');
  const [sortBy, setSortBy] = useState('sub_project_code');
  const [sortDir, setSortDir] = useState('asc');

  // Page state (0-indexed for DataTable, 1-indexed for API)
  const page = (filters.page || 1) - 1;
  const rowsPerPage = filters.limit || 10;

  // Load POs for filter dropdown on mount
  useEffect(() => {
    dispatch(fetchServicePOs({ limit: 200, status: 'active' }));
  }, [dispatch]);

  const loadData = useCallback(() => {
    dispatch(
      fetchSubProjects({
        page: filters.page,
        limit: filters.limit,
        search: filters.search,
        service_po_id: filters.service_po_id || undefined,
        sort_by: sortBy,
        sort_dir: sortDir,
      })
    );
  }, [dispatch, filters, sortBy, sortDir]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  // Debounced search
  useEffect(() => {
    const t = setTimeout(() => {
      dispatch(setFilters({ search, page: 1 }));
    }, 350);
    return () => clearTimeout(t);
  }, [search, dispatch]);

  const handlePoFilterChange = (val) => {
    setPoFilter(val);
    dispatch(setFilters({ service_po_id: val, page: 1 }));
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
    setSearch('');
    setPoFilter('');
    dispatch(resetFilters());
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setDeleteLoading(true);
    try {
      await dispatch(deleteSubProject(deleteTarget.id)).unwrap();
    } finally {
      setDeleteLoading(false);
      setDeleteTarget(null);
    }
  };

  const hasActiveFilters = search || poFilter;

  const columns = [
    {
      id: 'sub_project_code',
      label: 'Code',
      minWidth: 120,
      sortable: true,
      render: (val) => (
        <Box
          component="span"
          sx={{
            fontFamily: 'monospace',
            fontWeight: 600,
            fontSize: '0.8rem',
            bgcolor: alpha(theme.palette.primary.main, 0.08),
            color: theme.palette.primary.dark,
            px: 1,
            py: 0.25,
            borderRadius: 1,
            letterSpacing: '0.04em',
          }}
        >
          {val || '—'}
        </Box>
      ),
    },
    {
      id: 'sub_project_name',
      label: 'Sub-Project Name',
      minWidth: 200,
      sortable: true,
      render: (val) => (
        <Box component="span" sx={{ fontWeight: 500 }}>
          {val || '—'}
        </Box>
      ),
    },
    {
      id: 'service_po_name',
      label: 'Service PO',
      minWidth: 160,
      sortable: false,
      render: (val, row) => (
        <Chip
          label={val || row?.service_po?.po_number || '—'}
          size="small"
          variant="outlined"
          sx={{ fontSize: '0.75rem', fontWeight: 500, borderRadius: 1 }}
        />
      ),
    },
    {
      id: 'start_date',
      label: 'Start Date',
      minWidth: 120,
      sortable: true,
      render: (val) => (
        <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatDate(val)}
        </Box>
      ),
    },
    {
      id: 'end_date',
      label: 'End Date',
      minWidth: 120,
      sortable: true,
      render: (val) => (
        <Box component="span" sx={{ fontVariantNumeric: 'tabular-nums' }}>
          {formatDate(val)}
        </Box>
      ),
    },
    {
      id: 'status',
      label: 'Status',
      minWidth: 100,
      sortable: true,
      render: (val) => <StatusChip status={val} />,
    },
  ];

  const actions = [
    {
      label: 'Edit',
      icon: <EditIcon fontSize="small" />,
      tooltip: 'Edit sub-project',
      color: 'primary',
      onClick: (row) => navigate(`/sub-projects/${row.id}/edit`),
    },
    {
      label: 'Delete',
      icon: <DeleteIcon fontSize="small" />,
      tooltip: 'Delete sub-project',
      color: 'error',
      onClick: (row) => setDeleteTarget(row),
    },
  ];

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeader
        title="Sub-Projects"
        subtitle="Manage sub-projects linked to service purchase orders"
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Sub-Projects' },
        ]}
        action={{
          label: 'New Sub-Project',
          icon: <AddIcon />,
          onClick: () => navigate('/sub-projects/new'),
        }}
      />

      {/* Filter bar */}
      <Stack
        direction={{ xs: 'column', sm: 'row' }}
        spacing={1.5}
        alignItems={{ sm: 'center' }}
        sx={{ mt: 3, mb: 2 }}
      >
        <FormControl size="small" sx={{ minWidth: 220 }}>
          <InputLabel id="po-filter-label">Filter by Service PO</InputLabel>
          <Select
            labelId="po-filter-label"
            value={poFilter}
            label="Filter by Service PO"
            onChange={(e) => handlePoFilterChange(e.target.value)}
          >
            <MenuItem value="">
              <em>All POs</em>
            </MenuItem>
            {(servicePOs || []).map((po) => (
              <MenuItem key={po.id} value={po.id}>
                {po.po_number} {po.po_name ? `— ${po.po_name}` : ''}
              </MenuItem>
            ))}
          </Select>
        </FormControl>

        {hasActiveFilters && (
          <Tooltip title="Clear all filters">
            <Button
              size="small"
              variant="text"
              startIcon={<ClearIcon />}
              onClick={handleClearFilters}
              color="inherit"
              sx={{ color: 'text.secondary' }}
            >
              Clear filters
            </Button>
          </Tooltip>
        )}

        {hasActiveFilters && (
          <Chip
            icon={<FilterListIcon sx={{ fontSize: '0.9rem !important' }} />}
            label="Filters active"
            size="small"
            color="primary"
            variant="outlined"
          />
        )}
      </Stack>

      <DataTable
        title="Sub-Projects"
        columns={columns}
        rows={subProjects || []}
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
        searchPlaceholder="Search by code or name…"
        actions={actions}
        exportable
        onExport={() => {}}
        rowKey="id"
      />

      <ConfirmDialog
        open={Boolean(deleteTarget)}
        title="Delete Sub-Project"
        message={
          deleteTarget
            ? `Delete "${deleteTarget.sub_project_name}"? This action cannot be undone and may affect associated timesheets.`
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

export default SubProjectList;
