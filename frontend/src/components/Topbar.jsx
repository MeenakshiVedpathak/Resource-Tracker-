import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import {
  AppBar,
  Toolbar,
  IconButton,
  Typography,
  Box,
  Avatar,
  Menu,
  MenuItem,
  ListItemIcon,
  ListItemText,
  Divider,
  Tooltip,
  useTheme,
} from '@mui/material';
import MenuIcon from '@mui/icons-material/Menu';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import SettingsIcon from '@mui/icons-material/Settings';
import { logout } from '../store/slices/authSlice';
import NotificationBell from './NotificationBell';
import { usePageTitle } from '../hooks/usePageTitle';

const getInitials = (name = '') => {
  return name
    .split(' ')
    .map((n) => n[0])
    .slice(0, 2)
    .join('')
    .toUpperCase();
};

const avatarColors = [
  '#2563EB', '#7C3AED', '#0891B2', '#059669',
  '#D97706', '#DC2626', '#9333EA', '#0D9488',
];

const getAvatarColor = (name = '') => {
  const index = name.charCodeAt(0) % avatarColors.length;
  return avatarColors[index];
};

const Topbar = ({ drawerWidth, onMenuToggle, isMobile }) => {
  const theme = useTheme();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const { user } = useSelector((state) => state.auth);

  const [anchorEl, setAnchorEl] = useState(null);
  const pageTitle = usePageTitle?.() || 'Dashboard';

  const userName = user?.employee?.full_name || user?.email || 'User';
  const userRole = user?.role?.role_name || user?.roleName || '';

  const handleMenuOpen = (e) => setAnchorEl(e.currentTarget);
  const handleMenuClose = () => setAnchorEl(null);

  const handleProfile = () => {
    handleMenuClose();
    navigate('/settings');
  };

  const handleSettings = () => {
    handleMenuClose();
    navigate('/settings');
  };

  const handleLogout = () => {
    handleMenuClose();
    dispatch(logout());
    navigate('/login');
  };

  return (
    <AppBar
      position="fixed"
      elevation={0}
      sx={{
        width: { md: `calc(100% - ${drawerWidth}px)` },
        ml: { md: `${drawerWidth}px` },
        bgcolor: theme.palette.mode === 'dark' ? 'background.paper' : '#ffffff',
        borderBottom: `1px solid ${theme.palette.divider}`,
        color: 'text.primary',
        zIndex: theme.zIndex.drawer + 1,
      }}
    >
      <Toolbar sx={{ gap: 1, minHeight: { xs: 56, sm: 64 } }}>
        {/* Hamburger — mobile only */}
        {isMobile && (
          <IconButton
            edge="start"
            aria-label="open navigation"
            onClick={onMenuToggle}
            sx={{ color: 'text.primary' }}
          >
            <MenuIcon />
          </IconButton>
        )}

        {/* Page Title */}
        <Typography
          variant="h6"
          component="h1"
          noWrap
          sx={{
            fontWeight: 600,
            fontSize: { xs: '1rem', sm: '1.125rem' },
            color: 'text.primary',
            letterSpacing: '-0.2px',
          }}
        >
          {pageTitle}
        </Typography>

        <Box sx={{ flexGrow: 1 }} />

        {/* Notifications */}
        <NotificationBell />

        {/* User avatar + menu */}
        <Tooltip title="Account">
          <IconButton
            onClick={handleMenuOpen}
            size="small"
            aria-label="open user menu"
            aria-controls="user-menu"
            aria-haspopup="true"
            aria-expanded={Boolean(anchorEl)}
            sx={{ ml: 0.5 }}
          >
            <Avatar
              sx={{
                width: 34,
                height: 34,
                bgcolor: getAvatarColor(userName),
                fontSize: '0.8125rem',
                fontWeight: 700,
              }}
            >
              {getInitials(userName)}
            </Avatar>
          </IconButton>
        </Tooltip>

        <Menu
          id="user-menu"
          anchorEl={anchorEl}
          open={Boolean(anchorEl)}
          onClose={handleMenuClose}
          onClick={handleMenuClose}
          transformOrigin={{ horizontal: 'right', vertical: 'top' }}
          anchorOrigin={{ horizontal: 'right', vertical: 'bottom' }}
          PaperProps={{
            elevation: 4,
            sx: {
              mt: 0.5,
              minWidth: 220,
              borderRadius: 2,
              overflow: 'visible',
              '&::before': {
                content: '""',
                display: 'block',
                position: 'absolute',
                top: 0,
                right: 14,
                width: 10,
                height: 10,
                bgcolor: 'background.paper',
                transform: 'translateY(-50%) rotate(45deg)',
                zIndex: 0,
              },
            },
          }}
        >
          {/* User info header */}
          <Box sx={{ px: 2, py: 1.5 }}>
            <Typography variant="subtitle2" fontWeight={600} noWrap>
              {userName}
            </Typography>
            <Typography variant="caption" color="text.secondary" noWrap display="block">
              {userRole}
            </Typography>
            <Typography variant="caption" color="text.disabled" noWrap display="block">
              {user?.email}
            </Typography>
          </Box>

          <Divider />

          <MenuItem onClick={handleProfile} sx={{ py: 1.25 }}>
            <ListItemIcon>
              <PersonIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.875rem' }}>
              My Profile
            </ListItemText>
          </MenuItem>

          <MenuItem onClick={handleSettings} sx={{ py: 1.25 }}>
            <ListItemIcon>
              <SettingsIcon fontSize="small" />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.875rem' }}>
              Settings
            </ListItemText>
          </MenuItem>

          <Divider />

          <MenuItem
            onClick={handleLogout}
            sx={{ py: 1.25, color: 'error.main' }}
          >
            <ListItemIcon>
              <LogoutIcon fontSize="small" sx={{ color: 'error.main' }} />
            </ListItemIcon>
            <ListItemText primaryTypographyProps={{ fontSize: '0.875rem', color: 'error.main' }}>
              Sign Out
            </ListItemText>
          </MenuItem>
        </Menu>
      </Toolbar>
    </AppBar>
  );
};

export default Topbar;
