import React from 'react';
import { Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import {
  Box,
  Card,
  CardContent,
  Typography,
  useTheme,
} from '@mui/material';
import AssessmentIcon from '@mui/icons-material/Assessment';

const AuthLayout = ({ children }) => {
  const theme = useTheme();
  const { isAuthenticated } = useSelector((state) => state.auth);

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return (
    <Box
      sx={{
        minHeight: '100vh',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        bgcolor: 'background.default',
        background: `linear-gradient(135deg, ${theme.palette.primary.dark} 0%, ${theme.palette.primary.main} 50%, ${theme.palette.secondary.dark} 100%)`,
        p: 2,
      }}
    >
      {/* Decorative background circles */}
      <Box
        aria-hidden="true"
        sx={{
          position: 'fixed',
          top: '-10%',
          right: '-5%',
          width: 400,
          height: 400,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.05)',
          pointerEvents: 'none',
        }}
      />
      <Box
        aria-hidden="true"
        sx={{
          position: 'fixed',
          bottom: '-15%',
          left: '-8%',
          width: 500,
          height: 500,
          borderRadius: '50%',
          background: 'rgba(255,255,255,0.04)',
          pointerEvents: 'none',
        }}
      />

      <Box
        sx={{
          width: '100%',
          maxWidth: 440,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: 3,
        }}
      >
        {/* Brand header */}
        <Box sx={{ textAlign: 'center', color: 'white' }}>
          <Box
            sx={{
              display: 'inline-flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 64,
              height: 64,
              borderRadius: 2,
              bgcolor: 'rgba(255,255,255,0.15)',
              backdropFilter: 'blur(8px)',
              mb: 2,
              border: '1px solid rgba(255,255,255,0.2)',
            }}
          >
            <AssessmentIcon sx={{ fontSize: 36, color: 'white' }} />
          </Box>
          <Typography
            variant="h4"
            fontWeight={700}
            letterSpacing="-0.5px"
            sx={{ color: 'white', lineHeight: 1 }}
          >
            RUT Portal
          </Typography>
          <Typography
            variant="body2"
            sx={{ color: 'rgba(255,255,255,0.75)', mt: 0.75, letterSpacing: '0.04em' }}
          >
            Resource Utilization Tracking
          </Typography>
        </Box>

        {/* Auth card */}
        <Card
          elevation={0}
          sx={{
            width: '100%',
            borderRadius: 3,
            backdropFilter: 'blur(20px)',
            background: 'rgba(255,255,255,0.97)',
            border: '1px solid rgba(255,255,255,0.3)',
            overflow: 'visible',
          }}
        >
          <CardContent sx={{ p: { xs: 3, sm: 4 } }}>
            {children}
          </CardContent>
        </Card>

        <Typography variant="caption" sx={{ color: 'rgba(255,255,255,0.55)' }}>
          &copy; {new Date().getFullYear()} RUT Portal. All rights reserved.
        </Typography>
      </Box>
    </Box>
  );
};

export default AuthLayout;
