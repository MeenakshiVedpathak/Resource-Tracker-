import React, { useState, useMemo } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Box,
  Drawer,
  List,
  ListItem,
  ListItemButton,
  ListItemIcon,
  ListItemText,
  Collapse,
  Typography,
  Divider,
  Tooltip,
  useTheme,
  alpha,
} from '@mui/material';
import DashboardIcon from '@mui/icons-material/Dashboard';
import PeopleIcon from '@mui/icons-material/People';
import PersonIcon from '@mui/icons-material/Person';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import BusinessIcon from '@mui/icons-material/Business';
import DescriptionIcon from '@mui/icons-material/Description';
import AccountTreeIcon from '@mui/icons-material/AccountTree';
import AttachMoneyIcon from '@mui/icons-material/AttachMoney';
import AccessTimeIcon from '@mui/icons-material/AccessTime';
import BarChartIcon from '@mui/icons-material/BarChart';
import SettingsIcon from '@mui/icons-material/Settings';
import ExpandLessIcon from '@mui/icons-material/ExpandLess';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import TrendingUpIcon from '@mui/icons-material/TrendingUp';
import ReceiptLongIcon from '@mui/icons-material/ReceiptLong';
import SavingsIcon from '@mui/icons-material/Savings';
import AssessmentIcon from '@mui/icons-material/Assessment';
import CloudUploadIcon from '@mui/icons-material/CloudUpload';

import { ROLES } from '../routes/index';

const navItems = [
  {
    label: 'Dashboard',
    icon: <DashboardIcon />,
    path: '/',
    allowedRoles: null, // all roles
  },
  {
    label: 'Employees',
    icon: <PeopleIcon />,
    path: '/employees',
    allowedRoles: [ROLES.HR, ROLES.DIVISION_HEAD, ROLES.MANAGEMENT],
  },
  {
    label: 'Users',
    icon: <PersonIcon />,
    path: '/users',
    allowedRoles: [ROLES.HR, ROLES.MANAGEMENT],
  },
  {
    label: 'Roles',
    icon: <AdminPanelSettingsIcon />,
    path: '/roles',
    allowedRoles: [ROLES.MANAGEMENT],
  },
  {
    label: 'Clients',
    icon: <BusinessIcon />,
    path: '/clients',
    allowedRoles: [ROLES.DIVISION_HEAD, ROLES.MANAGEMENT, ROLES.PROJECT_MANAGER],
  },
  {
    label: 'Service POs',
    icon: <DescriptionIcon />,
    path: '/service-pos',
    allowedRoles: [ROLES.DIVISION_HEAD, ROLES.MANAGEMENT, ROLES.PROJECT_MANAGER, ROLES.FINANCE],
  },
  {
    label: 'Sub Projects',
    icon: <AccountTreeIcon />,
    path: '/sub-projects',
    allowedRoles: [ROLES.DIVISION_HEAD, ROLES.MANAGEMENT, ROLES.PROJECT_MANAGER],
  },
  {
    label: 'Monthly Costs',
    icon: <AttachMoneyIcon />,
    path: '/monthly-costs',
    allowedRoles: [ROLES.FINANCE, ROLES.MANAGEMENT],
  },
  {
    label: 'Timesheets',
    icon: <AccessTimeIcon />,
    path: '/timesheets',
    allowedRoles: null,
    children: [
      {
        label: 'View Timesheets',
        icon: <AccessTimeIcon fontSize="small" />,
        path: '/timesheets',
        allowedRoles: null,
      },
      {
        label: 'Upload Timesheets',
        icon: <CloudUploadIcon fontSize="small" />,
        path: '/timesheets/upload',
        allowedRoles: [ROLES.HR, ROLES.PROJECT_MANAGER, ROLES.DIVISION_HEAD],
      },
    ],
  },
  {
    label: 'Reports',
    icon: <BarChartIcon />,
    path: '/reports',
    allowedRoles: [ROLES.MANAGEMENT, ROLES.DIVISION_HEAD, ROLES.FINANCE],
    children: [
      {
        label: 'Overview',
        icon: <AssessmentIcon fontSize="small" />,
        path: '/reports',
        allowedRoles: [ROLES.MANAGEMENT, ROLES.DIVISION_HEAD, ROLES.FINANCE],
      },
      {
        label: 'Utilization',
        icon: <TrendingUpIcon fontSize="small" />,
        path: '/reports/utilization',
        allowedRoles: [ROLES.MANAGEMENT, ROLES.DIVISION_HEAD, ROLES.FINANCE],
      },
      {
        label: 'Billing',
        icon: <ReceiptLongIcon fontSize="small" />,
        path: '/reports/billing',
        allowedRoles: [ROLES.MANAGEMENT, ROLES.FINANCE],
      },
      {
        label: 'Cost',
        icon: <SavingsIcon fontSize="small" />,
        path: '/reports/cost',
        allowedRoles: [ROLES.MANAGEMENT, ROLES.FINANCE],
      },
    ],
  },
  {
    label: 'Settings',
    icon: <SettingsIcon />,
    path: '/settings',
    allowedRoles: null,
  },
];

const SidebarItem = ({ item, userRole, depth = 0 }) => {
  const navigate = useNavigate();
  const location = useLocation();
  const theme = useTheme();
  const [open, setOpen] = useState(() => {
    if (item.children) {
      return item.children.some((child) => location.pathname.startsWith(child.path));
    }
    return false;
  });

  const hasAccess = useMemo(() => {
    if (!item.allowedRoles) return true;
    return item.allowedRoles.includes(userRole);
  }, [item.allowedRoles, userRole]);

  if (!hasAccess) return null;

  const isActive =
    item.path === '/'
      ? location.pathname === '/'
      : location.pathname === item.path || (depth === 0 && !item.children && location.pathname.startsWith(item.path));

  const isParentActive =
    item.children && item.children.some((child) => location.pathname.startsWith(child.path));

  const handleClick = () => {
    if (item.children) {
      setOpen((prev) => !prev);
    } else {
      navigate(item.path);
    }
  };

  const buttonSx = {
    borderRadius: 1.5,
    mb: 0.25,
    pl: depth === 0 ? 1.5 : 3,
    pr: 1.5,
    py: 0.875,
    color: isActive
      ? theme.palette.primary.main
      : isParentActive
      ? theme.palette.text.primary
      : theme.palette.text.secondary,
    bgcolor: isActive
      ? alpha(theme.palette.primary.main, 0.1)
      : 'transparent',
    fontWeight: isActive || isParentActive ? 600 : 400,
    '&:hover': {
      bgcolor: isActive
        ? alpha(theme.palette.primary.main, 0.15)
        : alpha(theme.palette.text.primary, 0.06),
      color: theme.palette.text.primary,
    },
    transition: 'background-color 0.15s, color 0.15s',
    ...(isActive && {
      borderLeft: `3px solid ${theme.palette.primary.main}`,
      pl: depth === 0 ? 1.25 : 2.75,
    }),
  };

  const iconSx = {
    minWidth: 36,
    color: 'inherit',
    '& .MuiSvgIcon-root': {
      fontSize: depth === 0 ? 20 : 18,
    },
  };

  return (
    <>
      <ListItem disablePadding>
        <ListItemButton onClick={handleClick} sx={buttonSx}>
          <ListItemIcon sx={iconSx}>{item.icon}</ListItemIcon>
          <ListItemText
            primary={item.label}
            primaryTypographyProps={{
              fontSize: depth === 0 ? '0.875rem' : '0.8125rem',
              fontWeight: 'inherit',
              lineHeight: 1.3,
            }}
          />
          {item.children &&
            (open ? (
              <ExpandLessIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            ) : (
              <ExpandMoreIcon sx={{ fontSize: 16, color: 'text.secondary' }} />
            ))}
        </ListItemButton>
      </ListItem>

      {item.children && (
        <Collapse in={open} timeout="auto" unmountOnExit>
          <List disablePadding sx={{ pl: 1 }}>
            {item.children.map((child) => (
              <SidebarItem
                key={child.path}
                item={child}
                userRole={userRole}
                depth={depth + 1}
              />
            ))}
          </List>
        </Collapse>
      )}
    </>
  );
};

const DrawerContent = ({ userRole }) => {
  const theme = useTheme();

  return (
    <Box
      sx={{
        height: '100%',
        display: 'flex',
        flexDirection: 'column',
        bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#fafbfc',
      }}
    >
      {/* Logo / brand */}
      <Box
        sx={{
          display: 'flex',
          alignItems: 'center',
          gap: 1.5,
          px: 2.5,
          py: 2,
          borderBottom: `1px solid ${theme.palette.divider}`,
          minHeight: 64,
        }}
      >
        <Box
          sx={{
            width: 34,
            height: 34,
            borderRadius: 1.5,
            bgcolor: 'primary.main',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            flexShrink: 0,
          }}
        >
          <AssessmentIcon sx={{ color: 'white', fontSize: 20 }} />
        </Box>
        <Box>
          <Typography
            variant="subtitle1"
            fontWeight={700}
            lineHeight={1.1}
            color="text.primary"
            letterSpacing="-0.2px"
          >
            RUT Portal
          </Typography>
          <Typography variant="caption" color="text.secondary" letterSpacing="0.03em">
            Resource Utilization
          </Typography>
        </Box>
      </Box>

      {/* Navigation */}
      <Box sx={{ flexGrow: 1, overflowY: 'auto', overflowX: 'hidden', px: 1.5, py: 1.5 }}>
        <List disablePadding>
          {navItems.map((item) => (
            <SidebarItem key={item.path + item.label} item={item} userRole={userRole} />
          ))}
        </List>
      </Box>

      {/* Bottom info */}
      <Box
        sx={{
          px: 2.5,
          py: 1.5,
          borderTop: `1px solid ${theme.palette.divider}`,
        }}
      >
        <Typography variant="caption" color="text.disabled" display="block">
          v1.0.0
        </Typography>
      </Box>
    </Box>
  );
};

const Sidebar = ({ drawerWidth, mobileOpen, onClose, isMobile }) => {
  const { user } = useSelector((state) => state.auth);
  const userRole = user?.role?.role_name || user?.roleName || '';

  return (
    <Box
      component="nav"
      sx={{ width: { md: drawerWidth }, flexShrink: { md: 0 } }}
      aria-label="main navigation"
    >
      {/* Mobile drawer */}
      <Drawer
        variant="temporary"
        open={mobileOpen}
        onClose={onClose}
        ModalProps={{ keepMounted: true }}
        sx={{
          display: { xs: 'block', md: 'none' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            border: 'none',
          },
        }}
      >
        <DrawerContent userRole={userRole} />
      </Drawer>

      {/* Desktop permanent drawer */}
      <Drawer
        variant="permanent"
        sx={{
          display: { xs: 'none', md: 'block' },
          '& .MuiDrawer-paper': {
            boxSizing: 'border-box',
            width: drawerWidth,
            border: 'none',
            borderRight: (theme) => `1px solid ${theme.palette.divider}`,
            boxShadow: 'none',
          },
        }}
        open
      >
        <DrawerContent userRole={userRole} />
      </Drawer>
    </Box>
  );
};

export default Sidebar;
