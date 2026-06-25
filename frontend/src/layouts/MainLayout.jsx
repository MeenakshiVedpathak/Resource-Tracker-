import React, { useState, useCallback } from 'react';
import { Outlet, useLocation } from 'react-router-dom';
import { Box, useTheme, useMediaQuery, Toolbar } from '@mui/material';
import Sidebar from '../components/Sidebar';
import Topbar from '../components/Topbar';
import BreadcrumbNav from '../components/BreadcrumbNav';

const DRAWER_WIDTH = 260;

const MainLayout = () => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const [mobileOpen, setMobileOpen] = useState(false);
  const location = useLocation();

  const handleDrawerToggle = useCallback(() => {
    setMobileOpen((prev) => !prev);
  }, []);

  const handleDrawerClose = useCallback(() => {
    setMobileOpen(false);
  }, []);

  return (
    <Box sx={{ display: 'flex', minHeight: '100vh', bgcolor: 'background.default' }}>
      {/* Topbar */}
      <Topbar
        drawerWidth={DRAWER_WIDTH}
        onMenuToggle={handleDrawerToggle}
        isMobile={isMobile}
      />

      {/* Sidebar */}
      <Sidebar
        drawerWidth={DRAWER_WIDTH}
        mobileOpen={mobileOpen}
        onClose={handleDrawerClose}
        isMobile={isMobile}
      />

      {/* Main Content */}
      <Box
        component="main"
        sx={{
          flexGrow: 1,
          width: { md: `calc(100% - ${DRAWER_WIDTH}px)` },
          ml: { md: `${DRAWER_WIDTH}px` },
          display: 'flex',
          flexDirection: 'column',
          minHeight: '100vh',
        }}
      >
        {/* Spacer for AppBar height */}
        <Toolbar />

        {/* Breadcrumb */}
        <Box
          sx={{
            px: { xs: 2, sm: 3 },
            pt: 2,
            pb: 0.5,
          }}
        >
          <BreadcrumbNav />
        </Box>

        {/* Page Content */}
        <Box
          sx={{
            flexGrow: 1,
            px: { xs: 2, sm: 3 },
            py: 2,
            overflow: 'hidden',
          }}
        >
          <Outlet />
        </Box>

        {/* Footer */}
        <Box
          component="footer"
          sx={{
            py: 1.5,
            px: 3,
            textAlign: 'center',
            borderTop: `1px solid ${theme.palette.divider}`,
            color: 'text.secondary',
            fontSize: '0.75rem',
            mt: 'auto',
          }}
        >
          RUT Portal &copy; {new Date().getFullYear()} — Resource Utilization Tracking System
        </Box>
      </Box>
    </Box>
  );
};

export default MainLayout;
