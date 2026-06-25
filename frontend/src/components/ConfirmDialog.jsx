import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  Typography,
  Button,
  CircularProgress,
  Box,
  useTheme,
  alpha,
} from '@mui/material';
import WarningAmberIcon from '@mui/icons-material/WarningAmber';
import ErrorOutlineIcon from '@mui/icons-material/ErrorOutline';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';

const severityConfig = {
  warning: {
    icon: WarningAmberIcon,
    color: 'warning',
  },
  error: {
    icon: ErrorOutlineIcon,
    color: 'error',
  },
  info: {
    icon: InfoOutlinedIcon,
    color: 'info',
  },
  success: {
    icon: CheckCircleOutlineIcon,
    color: 'success',
  },
};

/**
 * ConfirmDialog — lightweight confirmation dialog.
 *
 * @param {bool}   open
 * @param {fn}     onClose
 * @param {fn}     onConfirm
 * @param {string} title
 * @param {string|node} message
 * @param {string} confirmLabel     default: 'Confirm'
 * @param {string} confirmColor     MUI color: 'error'|'warning'|'primary' etc.
 * @param {string} cancelLabel      default: 'Cancel'
 * @param {bool}   loading
 * @param {string} severity         'warning'|'error'|'info'|'success'
 */
const ConfirmDialog = ({
  open,
  onClose,
  onConfirm,
  title = 'Confirm Action',
  message,
  confirmLabel = 'Confirm',
  confirmColor = 'error',
  cancelLabel = 'Cancel',
  loading = false,
  severity = 'warning',
}) => {
  const theme = useTheme();
  const config = severityConfig[severity] || severityConfig.warning;
  const Icon = config.icon;
  const paletteColor = theme.palette[config.color] || theme.palette.warning;

  return (
    <Dialog
      open={open}
      onClose={loading ? undefined : onClose}
      maxWidth="xs"
      fullWidth
      aria-labelledby="confirm-dialog-title"
      aria-describedby="confirm-dialog-description"
      PaperProps={{
        elevation: 8,
        sx: { borderRadius: 2.5 },
      }}
    >
      <DialogTitle id="confirm-dialog-title" sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
          <Box
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              width: 38,
              height: 38,
              borderRadius: '50%',
              bgcolor: alpha(paletteColor.main, 0.12),
              flexShrink: 0,
            }}
          >
            <Icon sx={{ color: paletteColor.main, fontSize: 22 }} />
          </Box>
          <Typography variant="h6" fontWeight={600} sx={{ fontSize: '1rem' }}>
            {title}
          </Typography>
        </Box>
      </DialogTitle>

      <DialogContent sx={{ pt: 0.5, pb: 1 }}>
        {typeof message === 'string' ? (
          <Typography
            id="confirm-dialog-description"
            variant="body2"
            color="text.secondary"
            sx={{ pl: '54px' }}
          >
            {message}
          </Typography>
        ) : (
          message
        )}
      </DialogContent>

      <DialogActions sx={{ px: 3, pb: 2.5, pt: 1.5, gap: 1 }}>
        <Button
          variant="outlined"
          color="inherit"
          onClick={onClose}
          disabled={loading}
          sx={{ flex: 1 }}
        >
          {cancelLabel}
        </Button>
        <Button
          variant="contained"
          color={confirmColor}
          onClick={onConfirm}
          disabled={loading}
          startIcon={loading ? <CircularProgress size={14} color="inherit" /> : null}
          sx={{ flex: 1 }}
          autoFocus
        >
          {loading ? 'Please wait…' : confirmLabel}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default ConfirmDialog;
