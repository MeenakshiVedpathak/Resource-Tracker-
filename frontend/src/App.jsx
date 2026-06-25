import React, { Suspense } from 'react';
import { ThemeProvider, CssBaseline, Box, CircularProgress } from '@mui/material';
import { theme } from './theme';
import AppRoutes from './routes/index';

const PageLoader = () => (
  <Box
    sx={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      minHeight: '100vh',
      backgroundColor: 'background.default',
    }}
  >
    <CircularProgress size={48} thickness={4} />
  </Box>
);

function App() {
  return (
    <ThemeProvider theme={theme}>
      <CssBaseline />
      <Suspense fallback={<PageLoader />}>
        <AppRoutes />
      </Suspense>
    </ThemeProvider>
  );
}

export default App;
