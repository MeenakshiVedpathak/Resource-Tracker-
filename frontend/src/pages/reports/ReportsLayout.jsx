import React from 'react';
import { Box, Typography, List, ListItemButton, ListItemIcon, ListItemText, Divider, Paper } from '@mui/material';
import { Outlet, useNavigate, useLocation } from 'react-router-dom';
import PeopleAltOutlinedIcon from '@mui/icons-material/PeopleAltOutlined';
import BarChartOutlinedIcon from '@mui/icons-material/BarChartOutlined';
import AccessTimeOutlinedIcon from '@mui/icons-material/AccessTimeOutlined';
import AssignmentOutlinedIcon from '@mui/icons-material/AssignmentOutlined';
import AccountTreeOutlinedIcon from '@mui/icons-material/AccountTreeOutlined';
import GroupsOutlinedIcon from '@mui/icons-material/GroupsOutlined';
import ReceiptLongOutlinedIcon from '@mui/icons-material/ReceiptLongOutlined';

const NAV_ITEMS = [
  {
    label: 'Employee Hourly Rate',
    path: '/reports/employee-hourly-rate',
    icon: <PeopleAltOutlinedIcon fontSize="small" />,
  },
  {
    label: 'Monthly Cost Summary',
    path: '/reports/monthly-cost-summary',
    icon: <BarChartOutlinedIcon fontSize="small" />,
  },
  {
    label: 'Timesheet Summary',
    path: '/reports/timesheet-summary',
    icon: <AccessTimeOutlinedIcon fontSize="small" />,
  },
  {
    label: 'Service PO Utilisation',
    path: '/reports/service-po-utilisation',
    icon: <AssignmentOutlinedIcon fontSize="small" />,
  },
  {
    label: 'Sub-Project Hours',
    path: '/reports/sub-project-hours',
    icon: <AccountTreeOutlinedIcon fontSize="small" />,
  },
  {
    label: 'Resource Allocation',
    path: '/reports/resource-allocation',
    icon: <GroupsOutlinedIcon fontSize="small" />,
  },
  {
    label: 'Operational Cost Breakdown',
    path: '/reports/operational-cost-breakdown',
    icon: <ReceiptLongOutlinedIcon fontSize="small" />,
  },
];

export default function ReportsLayout() {
  const navigate = useNavigate();
  const location = useLocation();

  return (
    <Box sx={{ display: 'flex', height: '100%', minHeight: 'calc(100vh - 64px)', bgcolor: '#F5F6FA' }}>
      {/* Left Sidebar */}
      <Paper
        elevation={0}
        sx={{
          width: 240,
          minWidth: 240,
          borderRight: '1px solid',
          borderColor: 'divider',
          borderRadius: 0,
          bgcolor: '#FFFFFF',
          display: 'flex',
          flexDirection: 'column',
          pt: 3,
          pb: 2,
        }}
      >
        <Typography
          variant="overline"
          sx={{
            px: 2.5,
            mb: 1,
            color: 'text.secondary',
            fontWeight: 600,
            letterSpacing: '0.08em',
            fontSize: '0.7rem',
          }}
        >
          Reports
        </Typography>
        <Divider sx={{ mb: 1 }} />
        <List disablePadding dense>
          {NAV_ITEMS.map((item) => {
            const isActive = location.pathname === item.path || location.pathname.startsWith(item.path + '/');
            return (
              <ListItemButton
                key={item.path}
                selected={isActive}
                onClick={() => navigate(item.path)}
                sx={{
                  px: 2.5,
                  py: 1,
                  mx: 1,
                  borderRadius: 1,
                  mb: 0.25,
                  '&.Mui-selected': {
                    bgcolor: 'primary.main',
                    color: 'primary.contrastText',
                    '& .MuiListItemIcon-root': { color: 'primary.contrastText' },
                    '&:hover': { bgcolor: 'primary.dark' },
                  },
                  '&:hover': { bgcolor: 'action.hover' },
                }}
              >
                <ListItemIcon sx={{ minWidth: 32, color: isActive ? 'inherit' : 'text.secondary' }}>
                  {item.icon}
                </ListItemIcon>
                <ListItemText
                  primary={item.label}
                  primaryTypographyProps={{
                    fontSize: '0.8125rem',
                    fontWeight: isActive ? 600 : 400,
                    lineHeight: 1.4,
                  }}
                />
              </ListItemButton>
            );
          })}
        </List>
      </Paper>

      {/* Main Content */}
      <Box sx={{ flex: 1, overflow: 'auto', p: 3 }}>
        <Outlet />
      </Box>
    </Box>
  );
}
