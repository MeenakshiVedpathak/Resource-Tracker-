import React, { useEffect, useMemo } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate } from 'react-router-dom';
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  Chip,
  Grid,
  Paper,
  Skeleton,
  Stack,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Tooltip,
  Typography,
  alpha,
  useTheme,
} from '@mui/material';
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip as RechartsTooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend,
} from 'recharts';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import PersonOutlineIcon from '@mui/icons-material/PersonOutline';
import BusinessOutlinedIcon from '@mui/icons-material/BusinessOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import ShowChartIcon from '@mui/icons-material/ShowChart';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import UploadFileIcon from '@mui/icons-material/UploadFile';
import AssessmentIcon from '@mui/icons-material/Assessment';
import GroupsIcon from '@mui/icons-material/Groups';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import RefreshIcon from '@mui/icons-material/Refresh';

import StatCard from '../components/StatCard';
import {
  fetchDashboardStats,
  fetchRecentActivity,
  selectDashboardStats,
  selectRecentActivity,
  selectDashboardLoading,
  selectDashboardLastUpdated,
} from '../redux/slices/dashboardSlice';
import { selectCurrentUser } from '../redux/slices/authSlice';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const formatCurrency = (value) => {
  if (value == null) return '—';
  if (value >= 1_000_000) return `$${(value / 1_000_000).toFixed(1)}M`;
  if (value >= 1_000) return `$${(value / 1_000).toFixed(0)}K`;
  return `$${value.toLocaleString()}`;
};

const formatHours = (value) => {
  if (value == null) return '—';
  return value.toLocaleString();
};

const getGreeting = () => {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
};

// Generate last-6-months labels
const getLast6MonthLabels = () => {
  const months = [];
  const now = new Date();
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    months.push(d.toLocaleString('default', { month: 'short' }));
  }
  return months;
};

// Merge month labels with API data (falls back to 0)
const buildMonthlyChartData = (apiData, monthLabels) => {
  if (Array.isArray(apiData) && apiData.length > 0) return apiData;
  return monthLabels.map((month) => ({ month, hours: 0 }));
};

// ---------------------------------------------------------------------------
// Sub-components
// ---------------------------------------------------------------------------

const SectionHeading = ({ title, subtitle, action }) => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'flex-end',
      justifyContent: 'space-between',
      mb: 2,
    }}
  >
    <Box>
      <Typography variant="h6" fontWeight={700} color="text.primary">
        {title}
      </Typography>
      {subtitle && (
        <Typography variant="caption" color="text.secondary">
          {subtitle}
        </Typography>
      )}
    </Box>
    {action}
  </Box>
);

const ActivityStatusChip = ({ status }) => {
  const map = {
    approved: { label: 'Approved', color: 'success' },
    pending: { label: 'Pending', color: 'warning' },
    submitted: { label: 'Submitted', color: 'info' },
    rejected: { label: 'Rejected', color: 'error' },
    draft: { label: 'Draft', color: 'default' },
  };
  const { label, color } = map[status?.toLowerCase()] ?? { label: status ?? '—', color: 'default' };
  return (
    <Chip
      label={label}
      color={color}
      size="small"
      variant="outlined"
      sx={{ fontWeight: 600, fontSize: '0.7rem', height: 22 }}
    />
  );
};

// Custom bar chart tooltip
const BarTooltipContent = ({ active, payload, label }) => {
  const theme = useTheme();
  if (!active || !payload?.length) return null;
  return (
    <Paper
      elevation={4}
      sx={{
        px: 1.75,
        py: 1.25,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
      }}
    >
      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
        {label}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={700}
        color="primary.main"
        sx={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {(payload[0].value ?? 0).toLocaleString()} hrs
      </Typography>
    </Paper>
  );
};

// Custom pie tooltip
const PieTooltipContent = ({ active, payload }) => {
  const theme = useTheme();
  if (!active || !payload?.length) return null;
  const entry = payload[0];
  return (
    <Paper
      elevation={4}
      sx={{
        px: 1.75,
        py: 1.25,
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 2,
      }}
    >
      <Typography variant="caption" color="text.secondary" fontWeight={600} display="block">
        {entry.name}
      </Typography>
      <Typography
        variant="body2"
        fontWeight={700}
        sx={{ color: entry.payload?.fill, fontVariantNumeric: 'tabular-nums' }}
      >
        {entry.value} POs ({entry.payload?.percent != null ? `${entry.payload.percent}%` : ''})
      </Typography>
    </Paper>
  );
};

// Skeleton for stat cards
const StatCardSkeleton = () => (
  <Card elevation={0} variant="outlined" sx={{ borderRadius: 2.5, overflow: 'hidden', position: 'relative' }}>
    <Box sx={{ position: 'absolute', top: 0, left: 0, right: 0, height: 3, bgcolor: 'grey.200', borderRadius: '2.5px 2.5px 0 0' }} />
    <CardContent sx={{ pt: 2.5, pb: 2, px: 2.5, '&:last-child': { pb: 2 } }}>
      <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 1.5 }}>
        <Skeleton width={90} height={16} />
        <Skeleton variant="rounded" width={38} height={38} sx={{ borderRadius: 1.5 }} />
      </Box>
      <Skeleton width={110} height={42} sx={{ mb: 0.75 }} />
      <Skeleton width={70} height={14} />
    </CardContent>
  </Card>
);

// Quick link card
const QuickLinkCard = ({ icon, label, description, to, color }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  return (
    <Paper
      elevation={0}
      variant="outlined"
      onClick={() => navigate(to)}
      role="button"
      tabIndex={0}
      aria-label={`Navigate to ${label}`}
      onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') navigate(to); }}
      sx={{
        display: 'flex',
        alignItems: 'center',
        gap: 2,
        px: 2.5,
        py: 2,
        borderRadius: 2,
        cursor: 'pointer',
        border: `1px solid ${theme.palette.divider}`,
        transition: 'box-shadow 0.18s, border-color 0.18s, transform 0.15s',
        '&:hover': {
          boxShadow: theme.shadows[3],
          borderColor: theme.palette[color]?.main ?? theme.palette.primary.main,
          transform: 'translateY(-1px)',
        },
        '&:focus-visible': {
          outline: `2px solid ${theme.palette.primary.main}`,
          outlineOffset: 2,
        },
      }}
    >
      <Box
        aria-hidden="true"
        sx={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          width: 42,
          height: 42,
          borderRadius: 2,
          bgcolor: alpha(theme.palette[color]?.main ?? theme.palette.primary.main, 0.1),
          color: theme.palette[color]?.main ?? theme.palette.primary.main,
          flexShrink: 0,
          '& .MuiSvgIcon-root': { fontSize: 22 },
        }}
      >
        {icon}
      </Box>
      <Box sx={{ flexGrow: 1, minWidth: 0 }}>
        <Typography variant="subtitle2" fontWeight={600} color="text.primary" noWrap>
          {label}
        </Typography>
        {description && (
          <Typography variant="caption" color="text.secondary" noWrap>
            {description}
          </Typography>
        )}
      </Box>
      <OpenInNewIcon sx={{ fontSize: 16, color: 'text.disabled', flexShrink: 0 }} />
    </Paper>
  );
};

// ---------------------------------------------------------------------------
// Main Dashboard component
// ---------------------------------------------------------------------------

const Dashboard = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const stats = useSelector(selectDashboardStats);
  const recentActivity = useSelector(selectRecentActivity);
  const loading = useSelector(selectDashboardLoading);
  const lastUpdated = useSelector(selectDashboardLastUpdated);
  const currentUser = useSelector(selectCurrentUser);

  const monthLabels = useMemo(() => getLast6MonthLabels(), []);

  useEffect(() => {
    dispatch(fetchDashboardStats());
    dispatch(fetchRecentActivity({ limit: 5 }));
  }, [dispatch]);

  const handleRefresh = () => {
    dispatch(fetchDashboardStats());
    dispatch(fetchRecentActivity({ limit: 5 }));
  };

  // ---- Chart data ----
  const monthlyHoursData = useMemo(
    () => buildMonthlyChartData(stats.monthlyHours, monthLabels),
    [stats.monthlyHours, monthLabels]
  );

  const poDistributionData = useMemo(() => {
    const active = stats.activePOs ?? 0;
    const closed = stats.closedPOs ?? 0;
    const total = active + closed;
    if (total === 0) return [];
    return [
      {
        name: 'Active',
        value: active,
        percent: Math.round((active / total) * 100),
        fill: theme.palette.success.main,
      },
      {
        name: 'Closed',
        value: closed,
        percent: Math.round((closed / total) * 100),
        fill: theme.palette.grey[400],
      },
    ];
  }, [stats.activePOs, stats.closedPOs, theme]);

  // ---- Stat card definitions ----
  const statCards = [
    {
      title: 'Total Employees',
      value: stats.totalEmployees,
      subtitle: 'All registered staff',
      icon: <PeopleAltOutlinedIcon />,
      color: 'primary',
    },
    {
      title: 'Active Employees',
      value: stats.activeEmployees,
      subtitle: 'Currently active',
      icon: <PersonOutlineIcon />,
      color: 'success',
    },
    {
      title: 'Total Clients',
      value: stats.totalClients,
      subtitle: 'Client accounts',
      icon: <BusinessOutlinedIcon />,
      color: 'info',
    },
    {
      title: 'Active POs',
      value: stats.activePOs,
      subtitle: 'Open service orders',
      icon: <AssignmentOutlinedIcon />,
      color: 'warning',
    },
    {
      title: 'Closed POs',
      value: stats.closedPOs,
      subtitle: 'Completed orders',
      icon: <CheckCircleOutlineIcon />,
      color: 'success',
    },
    {
      title: 'Current Month Hours',
      value: stats.currentMonthHours,
      valueSuffix: ' hrs',
      subtitle: new Date().toLocaleString('default', { month: 'long', year: 'numeric' }),
      icon: <AccessTimeIcon />,
      color: 'primary',
    },
    {
      title: 'Utilisation',
      value:
        stats.utilisationPercent != null
          ? Number(stats.utilisationPercent).toFixed(1)
          : null,
      valueSuffix: '%',
      subtitle: 'This month',
      icon: <ShowChartIcon />,
      color:
        stats.utilisationPercent >= 80
          ? 'success'
          : stats.utilisationPercent >= 60
          ? 'warning'
          : 'error',
    },
    {
      title: 'Revenue',
      value:
        stats.totalRevenue != null ? formatCurrency(stats.totalRevenue) : null,
      subtitle: 'Total billed',
      icon: <AttachMoneyIcon />,
      color: 'success',
    },
  ];

  // ---- Quick links ----
  const quickLinks = [
    {
      icon: <UploadFileIcon />,
      label: 'Upload Timesheets',
      description: 'Import hours from CSV',
      to: '/timesheets/upload',
      color: 'primary',
    },
    {
      icon: <GroupsIcon />,
      label: 'Manage Employees',
      description: 'View and edit staff records',
      to: '/employees',
      color: 'info',
    },
    {
      icon: <AssignmentOutlinedIcon />,
      label: 'Service POs',
      description: 'Browse purchase orders',
      to: '/service-pos',
      color: 'warning',
    },
    {
      icon: <AssessmentIcon />,
      label: 'Reports',
      description: 'Utilization & billing reports',
      to: '/reports',
      color: 'success',
    },
  ];

  return (
    <Box sx={{ pb: 4 }}>
      {/* ---- Page header ---- */}
      <Box
        sx={{
          display: 'flex',
          alignItems: { xs: 'flex-start', sm: 'center' },
          flexDirection: { xs: 'column', sm: 'row' },
          justifyContent: 'space-between',
          gap: 1.5,
          mb: 3,
        }}
      >
        <Box>
          <Typography variant="h4" fontWeight={700} color="text.primary" sx={{ letterSpacing: '-0.5px', lineHeight: 1.2 }}>
            {getGreeting()}{currentUser?.first_name ? `, ${currentUser.first_name}` : ''}
          </Typography>
          <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
            {lastUpdated
              ? `Last refreshed ${new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}`
              : "Here's your workspace overview"}
          </Typography>
        </Box>
        <Tooltip title="Refresh data">
          <Button
            variant="outlined"
            size="small"
            startIcon={<RefreshIcon />}
            onClick={handleRefresh}
            disabled={loading}
            sx={{ flexShrink: 0, borderRadius: 2 }}
          >
            Refresh
          </Button>
        </Tooltip>
      </Box>

      {/* ---- Stat cards (8) ---- */}
      <Grid container spacing={2} sx={{ mb: 3.5 }}>
        {statCards.map((card, idx) =>
          loading ? (
            <Grid item xs={12} sm={6} md={4} lg={3} key={idx}>
              <StatCardSkeleton />
            </Grid>
          ) : (
            <Grid item xs={12} sm={6} md={4} lg={3} key={card.title}>
              <StatCard
                title={card.title}
                value={card.value}
                subtitle={card.subtitle}
                icon={card.icon}
                color={card.color}
                valuePrefix={card.valuePrefix}
                valueSuffix={card.valueSuffix}
                loading={loading}
              />
            </Grid>
          )
        )}
      </Grid>

      {/* ---- Charts row ---- */}
      <Grid container spacing={2.5} sx={{ mb: 3.5 }}>
        {/* Bar chart — monthly hours */}
        <Grid item xs={12} md={8}>
          <Card elevation={0} variant="outlined" sx={{ borderRadius: 2.5, height: '100%' }}>
            <CardHeader
              title="Monthly Hours"
              subheader="Logged hours over the last 6 months"
              sx={{ pb: 0 }}
            />
            <CardContent sx={{ pt: 2, pr: 1 }}>
              {loading ? (
                <Skeleton variant="rectangular" width="100%" height={240} sx={{ borderRadius: 1.5 }} />
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <BarChart
                    data={monthlyHoursData}
                    margin={{ top: 4, right: 16, left: 0, bottom: 0 }}
                    barCategoryGap="36%"
                  >
                    <CartesianGrid
                      strokeDasharray="0"
                      vertical={false}
                      stroke={theme.palette.divider}
                    />
                    <XAxis
                      dataKey="month"
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: theme.palette.text.secondary,
                        fontSize: 12,
                        fontWeight: 500,
                      }}
                    />
                    <YAxis
                      axisLine={false}
                      tickLine={false}
                      tick={{
                        fill: theme.palette.text.secondary,
                        fontSize: 11,
                      }}
                      tickFormatter={(v) => (v >= 1000 ? `${(v / 1000).toFixed(0)}k` : v)}
                      width={40}
                    />
                    <RechartsTooltip
                      content={<BarTooltipContent />}
                      cursor={{ fill: alpha(theme.palette.primary.main, 0.06) }}
                    />
                    <Bar
                      dataKey="hours"
                      fill={theme.palette.primary.main}
                      radius={[4, 4, 0, 0]}
                      maxBarSize={44}
                    />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Pie chart — PO distribution */}
        <Grid item xs={12} md={4}>
          <Card elevation={0} variant="outlined" sx={{ borderRadius: 2.5, height: '100%' }}>
            <CardHeader
              title="PO Status"
              subheader="Active vs closed orders"
              sx={{ pb: 0 }}
            />
            <CardContent
              sx={{
                pt: 2,
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                justifyContent: 'center',
                minHeight: 240,
              }}
            >
              {loading ? (
                <Skeleton variant="circular" width={180} height={180} />
              ) : poDistributionData.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 4 }}>
                  <Typography variant="body2" color="text.secondary">
                    No PO data available
                  </Typography>
                </Box>
              ) : (
                <ResponsiveContainer width="100%" height={240}>
                  <PieChart>
                    <Pie
                      data={poDistributionData}
                      cx="50%"
                      cy="44%"
                      innerRadius={58}
                      outerRadius={88}
                      paddingAngle={3}
                      dataKey="value"
                    >
                      {poDistributionData.map((entry, idx) => (
                        <Cell key={idx} fill={entry.fill} stroke="none" />
                      ))}
                    </Pie>
                    <RechartsTooltip content={<PieTooltipContent />} />
                    <Legend
                      iconType="circle"
                      iconSize={8}
                      formatter={(value) => (
                        <Typography
                          component="span"
                          variant="caption"
                          color="text.secondary"
                          fontWeight={500}
                        >
                          {value}
                        </Typography>
                      )}
                    />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      {/* ---- Recent activity + Quick links ---- */}
      <Grid container spacing={2.5}>
        {/* Recent timesheets */}
        <Grid item xs={12} md={8}>
          <Card elevation={0} variant="outlined" sx={{ borderRadius: 2.5 }}>
            <CardHeader
              title="Recent Timesheets"
              subheader="Latest 5 timesheet entries"
              action={
                <Button
                  size="small"
                  endIcon={<ArrowForwardIcon />}
                  onClick={() => navigate('/timesheets')}
                  sx={{ borderRadius: 2, textTransform: 'none', fontWeight: 600 }}
                >
                  View all
                </Button>
              }
            />
            <CardContent sx={{ pt: 0, px: 0, '&:last-child': { pb: 0 } }}>
              {loading ? (
                <Box sx={{ px: 3, pb: 2 }}>
                  {Array.from({ length: 5 }).map((_, i) => (
                    <Box
                      key={i}
                      sx={{
                        display: 'flex',
                        alignItems: 'center',
                        gap: 2,
                        py: 1.25,
                        borderBottom: i < 4 ? `1px solid ${theme.palette.divider}` : 'none',
                      }}
                    >
                      <Skeleton width={120} />
                      <Skeleton width={80} sx={{ ml: 'auto' }} />
                      <Skeleton width={60} />
                      <Skeleton variant="rounded" width={70} height={22} sx={{ borderRadius: 1 }} />
                    </Box>
                  ))}
                </Box>
              ) : recentActivity.length === 0 ? (
                <Box sx={{ textAlign: 'center', py: 5 }}>
                  <Typography variant="body2" color="text.secondary">
                    No recent timesheet activity
                  </Typography>
                </Box>
              ) : (
                <Box sx={{ overflowX: 'auto' }}>
                  <Table size="small" aria-label="Recent timesheet activity">
                    <TableHead>
                      <TableRow>
                        <TableCell>Employee</TableCell>
                        <TableCell>Project / PO</TableCell>
                        <TableCell align="right" sx={{ fontVariantNumeric: 'tabular-nums' }}>
                          Hours
                        </TableCell>
                        <TableCell>Period</TableCell>
                        <TableCell>Status</TableCell>
                      </TableRow>
                    </TableHead>
                    <TableBody>
                      {recentActivity.map((row, idx) => (
                        <TableRow key={row.id ?? idx} hover>
                          <TableCell>
                            <Typography
                              variant="body2"
                              fontWeight={500}
                              color="text.primary"
                              noWrap
                              sx={{ maxWidth: 160 }}
                            >
                              {row.employee_name ?? row.employee ?? '—'}
                            </Typography>
                            {row.employee_code && (
                              <Typography variant="caption" color="text.secondary">
                                {row.employee_code}
                              </Typography>
                            )}
                          </TableCell>
                          <TableCell>
                            <Typography
                              variant="body2"
                              noWrap
                              sx={{ maxWidth: 180, color: 'text.primary' }}
                            >
                              {row.project_name ?? row.service_po ?? '—'}
                            </Typography>
                          </TableCell>
                          <TableCell align="right">
                            <Typography
                              variant="body2"
                              fontWeight={600}
                              sx={{ fontVariantNumeric: 'tabular-nums', color: 'text.primary' }}
                            >
                              {row.total_hours != null
                                ? Number(row.total_hours).toLocaleString(undefined, {
                                    minimumFractionDigits: 0,
                                    maximumFractionDigits: 1,
                                  })
                                : '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <Typography variant="body2" color="text.secondary" noWrap>
                              {row.period ?? row.month ?? row.billing_month ?? '—'}
                            </Typography>
                          </TableCell>
                          <TableCell>
                            <ActivityStatusChip status={row.status} />
                          </TableCell>
                        </TableRow>
                      ))}
                    </TableBody>
                  </Table>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Quick links */}
        <Grid item xs={12} md={4}>
          <Card elevation={0} variant="outlined" sx={{ borderRadius: 2.5, height: '100%' }}>
            <CardHeader title="Quick Links" subheader="Jump to common tasks" />
            <CardContent sx={{ pt: 0.5 }}>
              <Stack spacing={1.5}>
                {quickLinks.map((link) => (
                  <QuickLinkCard key={link.to} {...link} />
                ))}
              </Stack>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
};

export default Dashboard;
