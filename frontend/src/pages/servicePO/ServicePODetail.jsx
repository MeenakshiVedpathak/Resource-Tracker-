import React, { useEffect, useState, useCallback } from 'react';
import {
  Alert,
  Avatar,
  Box,
  Button,
  Card,
  CardContent,
  Chip,
  CircularProgress,
  Divider,
  Grid,
  IconButton,
  LinearProgress,
  List,
  ListItem,
  ListItemAvatar,
  ListItemText,
  Paper,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
} from '@mui/material';
import {
  ArrowBack as ArrowBackIcon,
  Edit as EditIcon,
  DoNotDisturbOn as ClosePoIcon,
  Person as PersonIcon,
  PersonAdd as PersonAddIcon,
  PersonRemove as PersonRemoveIcon,
  Assignment as AssignmentIcon,
  AccessTime as AccessTimeIcon,
  AccountBalance as AccountBalanceIcon,
  CalendarMonth as CalendarIcon,
  CheckCircleOutline as CheckIcon,
} from '@mui/icons-material';
import { useParams, useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { format } from 'date-fns';

import ServicePOForm from './ServicePOForm';
import AllocateResources from './AllocateResources';
import ConfirmDialog from '../../components/common/ConfirmDialog';
import {
  fetchServicePOById,
  closeServicePO,
  selectCurrentServicePO,
  selectServicePOsLoading,
  selectServicePOsError,
} from '../../store/slices/servicePOSlice';

const statusConfig = {
  active: { color: 'success', label: 'Active' },
  closed: { color: 'default', label: 'Closed' },
  draft: { color: 'warning', label: 'Draft' },
  expired: { color: 'error', label: 'Expired' },
  on_hold: { color: 'info', label: 'On Hold' },
};

const formatCurrency = (val) =>
  val != null
    ? new Intl.NumberFormat('en-IN', {
        style: 'currency',
        currency: 'INR',
        maximumFractionDigits: 0,
      }).format(val)
    : '—';

const formatDate = (d) => (d ? format(new Date(d), 'dd MMM yyyy') : '—');

function InfoItem({ icon, label, value }) {
  return (
    <Box sx={{ display: 'flex', alignItems: 'flex-start', gap: 1.5 }}>
      <Box sx={{ color: 'primary.main', mt: 0.2, flexShrink: 0 }}>{icon}</Box>
      <Box>
        <Typography variant="caption" color="text.secondary" display="block">
          {label}
        </Typography>
        <Typography variant="body2" fontWeight={500}>
          {value}
        </Typography>
      </Box>
    </Box>
  );
}

export default function ServicePODetail() {
  const { id } = useParams();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const po = useSelector(selectCurrentServicePO);
  const loading = useSelector(selectServicePOsLoading);
  const error = useSelector(selectServicePOsError);

  const [editOpen, setEditOpen] = useState(false);
  const [allocateOpen, setAllocateOpen] = useState(false);
  const [confirmClose, setConfirmClose] = useState(false);

  const loadPO = useCallback(() => {
    if (id) dispatch(fetchServicePOById(id));
  }, [dispatch, id]);

  useEffect(() => {
    loadPO();
  }, [loadPO]);

  const handleCloseConfirm = async () => {
    await dispatch(closeServicePO(id));
    setConfirmClose(false);
    loadPO();
  };

  const handleEditClose = (refreshed) => {
    setEditOpen(false);
    if (refreshed) loadPO();
  };

  const handleAllocateClose = (refreshed) => {
    setAllocateOpen(false);
    if (refreshed) loadPO();
  };

  if (loading && !po) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', minHeight: 300 }}>
        <CircularProgress />
      </Box>
    );
  }

  if (error) {
    return (
      <Box sx={{ p: 3 }}>
        <Alert severity="error">{error}</Alert>
      </Box>
    );
  }

  if (!po) return null;

  const expectedHours = po.expected_man_hours || 0;
  const actualHours = po.actual_hours || 0;
  const utilisationPct = expectedHours ? Math.min(Math.round((actualHours / expectedHours) * 100), 100) : 0;
  const utilisationColor = utilisationPct >= 90 ? 'error' : utilisationPct >= 70 ? 'warning' : 'success';
  const sc = statusConfig[po.status?.toLowerCase()] || { color: 'default', label: po.status };
  const isClosed = po.status === 'closed';

  const resources = po.allocated_resources || [];
  const subProjects = po.sub_projects || [];
  const recentTimesheets = po.recent_timesheets || [];

  return (
    <Box sx={{ p: { xs: 2, md: 3 }, maxWidth: 1200, mx: 'auto' }}>
      {/* Back + actions bar */}
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
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
          <IconButton onClick={() => navigate(-1)} size="small">
            <ArrowBackIcon />
          </IconButton>
          <Box>
            <Typography variant="h5" fontWeight={700}>
              {po.service_po_name}
            </Typography>
            <Typography variant="caption" color="text.secondary" sx={{ fontFamily: 'monospace' }}>
              {po.service_po_code}
            </Typography>
          </Box>
          <Chip
            label={sc.label}
            color={sc.color}
            size="small"
            sx={{ ml: 1, fontWeight: 600 }}
          />
        </Box>

        <Box sx={{ display: 'flex', gap: 1, flexWrap: 'wrap' }}>
          <Button
            variant="outlined"
            startIcon={<EditIcon />}
            onClick={() => setEditOpen(true)}
            disabled={isClosed}
            sx={{ textTransform: 'none' }}
          >
            Edit
          </Button>
          <Button
            variant="outlined"
            color="warning"
            startIcon={<ClosePoIcon />}
            onClick={() => setConfirmClose(true)}
            disabled={isClosed}
            sx={{ textTransform: 'none' }}
          >
            Close PO
          </Button>
        </Box>
      </Box>

      <Grid container spacing={3}>
        {/* Left: PO Info Card */}
        <Grid item xs={12} md={8}>
          <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>
                PO Overview
              </Typography>
              <Grid container spacing={2.5}>
                <Grid item xs={12} sm={6}>
                  <InfoItem
                    icon={<PersonIcon fontSize="small" />}
                    label="Client"
                    value={po.client?.client_name || po.client_name || '—'}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InfoItem
                    icon={<AssignmentIcon fontSize="small" />}
                    label="Service Type"
                    value={po.service_type || '—'}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InfoItem
                    icon={<AccountBalanceIcon fontSize="small" />}
                    label="PO Value"
                    value={formatCurrency(po.po_value)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InfoItem
                    icon={<AccessTimeIcon fontSize="small" />}
                    label="Expected Man Hours"
                    value={expectedHours ? `${expectedHours} hrs` : '—'}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InfoItem
                    icon={<CalendarIcon fontSize="small" />}
                    label="Start Date"
                    value={formatDate(po.start_date)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InfoItem
                    icon={<CalendarIcon fontSize="small" />}
                    label="End Date"
                    value={formatDate(po.end_date)}
                  />
                </Grid>
                <Grid item xs={12} sm={6}>
                  <InfoItem
                    icon={<CheckIcon fontSize="small" />}
                    label="Billable"
                    value={po.is_billable ? 'Yes' : 'No'}
                  />
                </Grid>
              </Grid>
            </CardContent>
          </Card>

          {/* Utilisation */}
          <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Utilisation
                </Typography>
                <Typography variant="h6" fontWeight={700} color={`${utilisationColor}.main`}>
                  {utilisationPct}%
                </Typography>
              </Box>
              <LinearProgress
                variant="determinate"
                value={utilisationPct}
                color={utilisationColor}
                sx={{ height: 10, borderRadius: 5, mb: 1.5 }}
              />
              <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                <Typography variant="caption" color="text.secondary">
                  Actual: <strong>{actualHours} hrs</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Expected: <strong>{expectedHours} hrs</strong>
                </Typography>
                <Typography variant="caption" color="text.secondary">
                  Remaining: <strong>{Math.max(expectedHours - actualHours, 0)} hrs</strong>
                </Typography>
              </Box>
            </CardContent>
          </Card>

          {/* Allocated Resources */}
          <Card variant="outlined" sx={{ borderRadius: 2, mb: 3 }}>
            <CardContent>
              <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
                <Typography variant="subtitle1" fontWeight={700}>
                  Allocated Resources ({resources.length})
                </Typography>
                <Button
                  size="small"
                  variant="outlined"
                  startIcon={<PersonAddIcon />}
                  onClick={() => setAllocateOpen(true)}
                  disabled={isClosed}
                  sx={{ textTransform: 'none' }}
                >
                  Manage
                </Button>
              </Box>
              {resources.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  No resources allocated yet.
                </Typography>
              ) : (
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Role</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Allocated From</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Allocated To</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: 'center' }}>Hours</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {resources.map((res) => (
                        <TableRow key={res.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                          <TableCell>
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                              <Avatar sx={{ width: 28, height: 28, fontSize: 12, bgcolor: 'primary.light' }}>
                                {res.employee_name?.charAt(0)?.toUpperCase()}
                              </Avatar>
                              <Typography variant="body2" fontWeight={500}>
                                {res.employee_name}
                              </Typography>
                            </Box>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{res.role || '—'}</Typography>
                          </TableCell>
                          <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>
                            {formatDate(res.allocated_from)}
                          </TableCell>
                          <TableCell sx={{ fontSize: 13, color: 'text.secondary' }}>
                            {formatDate(res.allocated_to)}
                          </TableCell>
                          <TableCell align="center" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                            {res.hours_logged ?? 0}
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>

          {/* Recent Timesheets */}
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>
                Recent Timesheets
              </Typography>
              {recentTimesheets.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  No timesheets logged yet.
                </Typography>
              ) : (
                <TableContainer sx={{ overflowX: 'auto' }}>
                  <Table size="small">
                    <TableHead>
                      <TableRow>
                        <TableCell sx={{ fontWeight: 700 }}>Date</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Employee</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Task</TableCell>
                        <TableCell sx={{ fontWeight: 700, textAlign: 'right' }}>Hours</TableCell>
                        <TableCell sx={{ fontWeight: 700 }}>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentTimesheets.map((ts) => (
                        <TableRow key={ts.id} hover sx={{ '&:last-child td': { borderBottom: 0 } }}>
                          <TableCell sx={{ fontSize: 13, color: 'text.secondary', whiteSpace: 'nowrap' }}>
                            {formatDate(ts.date)}
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2">{ts.employee_name}</Typography>
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              sx={{ maxWidth: 200, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}
                              title={ts.task_description}
                            >
                              {ts.task_description || '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                            {ts.hours}
                          </TableCell>
                          <TableCell>
                            <Chip
                              label={ts.status}
                              size="small"
                              color={ts.status === 'approved' ? 'success' : ts.status === 'rejected' ? 'error' : 'default'}
                              sx={{ textTransform: 'capitalize', fontSize: 11 }}
                            />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </TableContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Right: Sub-projects */}
        <Grid item xs={12} md={4}>
          <Card variant="outlined" sx={{ borderRadius: 2 }}>
            <CardContent>
              <Typography variant="subtitle1" fontWeight={700} mb={2}>
                Sub-Projects ({subProjects.length})
              </Typography>
              {subProjects.length === 0 ? (
                <Typography color="text.secondary" variant="body2">
                  No sub-projects defined.
                </Typography>
              ) : (
                <List disablePadding>
                  {subProjects.map((sp, idx) => (
                    <React.Fragment key={sp.id}>
                      <ListItem
                        disableGutters
                        sx={{ py: 1.5, alignItems: 'flex-start' }}
                      >
                        <ListItemAvatar sx={{ minWidth: 36 }}>
                          <Avatar
                            sx={{
                              width: 28,
                              height: 28,
                              fontSize: 12,
                              bgcolor: 'secondary.light',
                              color: 'secondary.contrastText',
                            }}
                          >
                            {idx + 1}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="body2" fontWeight={600}>
                              {sp.project_name}
                            </Typography>
                          }
                          secondary={
                            <Box mt={0.5}>
                              <Typography variant="caption" color="text.secondary" display="block">
                                {formatDate(sp.start_date)} — {formatDate(sp.end_date)}
                              </Typography>
                              <Chip
                                label={sp.status}
                                size="small"
                                color={
                                  sp.status === 'active'
                                    ? 'success'
                                    : sp.status === 'completed'
                                    ? 'default'
                                    : 'warning'
                                }
                                sx={{ mt: 0.5, textTransform: 'capitalize', fontSize: 11 }}
                              />
                            </Box>
                          }
                        />
                      </ListItem>
                      {idx < subProjects.length - 1 && <Divider component="li" />}
                    </React.Fragment>
                  ))}
                </List>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* Edit PO modal */}
      <ServicePOForm open={editOpen} onClose={handleEditClose} initialData={po} />

      {/* Allocate Resources modal */}
      <AllocateResources
        open={allocateOpen}
        onClose={handleAllocateClose}
        poId={id}
        allocatedResources={resources}
      />

      {/* Close PO confirm */}
      <ConfirmDialog
        open={confirmClose}
        title="Close Service PO"
        content={`Close "${po.service_po_name}"? No further timesheets can be logged against it once closed.`}
        confirmLabel="Close PO"
        confirmColor="warning"
        onConfirm={handleCloseConfirm}
        onCancel={() => setConfirmClose(false)}
      />
    </Box>
  );
}
