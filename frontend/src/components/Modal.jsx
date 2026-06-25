import React from 'react';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  IconButton,
  Typography,
  Button,
  Divider,
  CircularProgress,
  Box,
  useTheme,
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';

/**
 * Modal — reusable MUI Dialog wrapper.
 *
 * @param {bool}   open
 * @param {fn}     onClose
 * @param {string} title
 * @param {node}   children
 * @param {string} maxWidth     - 'xs'|'sm'|'md'|'lg'|'xl'
 * @param {bool}   fullWidth
 * @param {bool}   disableClose - hide the X button and block backdrop click
 * @param {Array}  actions      - [{ label, onClick, color, variant, loading, disabled, startIcon }]
 * @param {node}   titleAdornment - optional element rendered beside the title
 */
const Modal = ({
  open,
  onClose,
  title,
  children,
  maxWidth = 'sm',
  fullWidth = true,
  disableClose = false,
  actions = [],
  titleAdornment,
  contentSx,
  PaperProps,
}) => {
  const theme = useTheme();

  const handleClose = (_, reason) => {
    if (disableClose && (reason === 'backdropClick' || reason === 'escapeKeyDown')) return;
    if (onClose) onClose();
  };

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth={maxWidth}
      fullWidth={fullWidth}
      scroll="paper"
      aria-labelledby="modal-title"
      PaperProps={{
        elevation: 8,
        sx: {
          borderRadius: 2.5,
          ...(PaperProps?.sx || {}),
        },
        ...PaperProps,
      }}
    >
      {/* Title bar */}
      {title !== undefined && (
        <>
          <DialogTitle
            id="modal-title"
            sx={{
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'space-between',
              gap: 1,
              py: 2,
              px: 3,
            }}
          >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5, minWidth: 0 }}>
              <Typography
                variant="h6"
                component="span"
                fontWeight={600}
                noWrap
                sx={{ fontSize: '1.0625rem' }}
              >
                {title}
              </Typography>
              {titleAdornment}
            </Box>

            {!disableClose && (
              <IconButton
                size="small"
                onClick={onClose}
                aria-label="close dialog"
                sx={{
                  flexShrink: 0,
                  color: 'text.secondary',
                  '&:hover': { color: 'text.primary' },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            )}
          </DialogTitle>
          <Divider />
        </>
      )}

      {/* Content */}
      <DialogContent
        sx={{
          px: 3,
          py: 2.5,
          ...contentSx,
        }}
      >
        {children}
      </DialogContent>

      {/* Actions */}
      {actions.length > 0 && (
        <>
          <Divider />
          <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
            {actions.map((action) => (
              <Button
                key={action.label}
                onClick={action.onClick}
                color={action.color || 'primary'}
                variant={action.variant || 'text'}
                disabled={action.disabled || action.loading}
                startIcon={
                  action.loading ? (
                    <CircularProgress size={14} color="inherit" />
                  ) : (
                    action.startIcon
                  )
                }
                sx={{ minWidth: 88 }}
              >
                {action.label}
              </Button>
            ))}
          </DialogActions>
        </>
      )}
    </Dialog>
  );
};

export default Modal;
