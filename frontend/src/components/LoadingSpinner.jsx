import React from 'react';
import { Box, CircularProgress, Typography, Fade } from '@mui/material';

/**
 * LoadingSpinner
 *
 * @param {bool}   fullPage  - center on the whole viewport (position: fixed)
 * @param {bool}   overlay   - center over nearest relative parent (position: absolute)
 * @param {string} message   - optional text below spinner
 * @param {number} size      - CircularProgress size (default 40)
 * @param {string} color     - CircularProgress color (default 'primary')
 */
const LoadingSpinner = ({
  fullPage = false,
  overlay = false,
  message,
  size = 40,
  color = 'primary',
  minHeight,
}) => {
  if (fullPage) {
    return (
      <Fade in timeout={200}>
        <Box
          role="status"
          aria-label={message || 'Loading'}
          sx={{
            position: 'fixed',
            inset: 0,
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            bgcolor: 'background.default',
            zIndex: (theme) => theme.zIndex.modal + 1,
            gap: 2,
          }}
        >
          <CircularProgress size={size} color={color} thickness={4} />
          {message && (
            <Typography variant="body2" color="text.secondary">
              {message}
            </Typography>
          )}
        </Box>
      </Fade>
    );
  }

  if (overlay) {
    return (
      <Box
        role="status"
        aria-label={message || 'Loading'}
        sx={{
          position: 'absolute',
          inset: 0,
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          bgcolor: 'rgba(255,255,255,0.75)',
          backdropFilter: 'blur(2px)',
          zIndex: 10,
          gap: 1.5,
          borderRadius: 'inherit',
        }}
      >
        <CircularProgress size={size} color={color} thickness={4} />
        {message && (
          <Typography variant="caption" color="text.secondary">
            {message}
          </Typography>
        )}
      </Box>
    );
  }

  // Inline / section spinner
  return (
    <Box
      role="status"
      aria-label={message || 'Loading'}
      sx={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        gap: 1.5,
        py: 4,
        minHeight: minHeight,
        width: '100%',
      }}
    >
      <CircularProgress size={size} color={color} thickness={4} />
      {message && (
        <Typography variant="body2" color="text.secondary">
          {message}
        </Typography>
      )}
    </Box>
  );
};

export default LoadingSpinner;
