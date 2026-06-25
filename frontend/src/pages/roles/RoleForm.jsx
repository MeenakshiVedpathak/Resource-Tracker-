import React, { useEffect } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Box,
  Typography,
  IconButton,
  Divider,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import CloseIcon from '@mui/icons-material/Close';
import ShieldOutlinedIcon from '@mui/icons-material/ShieldOutlined';

import {
  createRole,
  updateRole,
  selectRoleLoading,
  selectRoleError,
} from '../../redux/slices/roleSlice';

// ---------------------------------------------------------------------------
// Validation
// ---------------------------------------------------------------------------

const schema = yup.object({
  role_name: yup
    .string()
    .trim()
    .min(2, 'Role name must be at least 2 characters.')
    .max(80, 'Role name must not exceed 80 characters.')
    .required('Role name is required.'),
  status: yup
    .string()
    .oneOf(['active', 'inactive'], 'Status must be active or inactive.')
    .required('Status is required.'),
});

const defaultValues = {
  role_name: '',
  status: 'active',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * RoleForm — modal dialog for creating or editing a role.
 *
 * @param {bool}        open
 * @param {fn}          onClose
 * @param {object|null} editData   - existing role object when editing
 * @param {fn}          onSuccess  - callback(message: string) after save
 */
const RoleForm = ({ open, onClose, editData, onSuccess }) => {
  const dispatch = useDispatch();
  const loading = useSelector(selectRoleLoading);
  const error = useSelector(selectRoleError);
  const isEdit = Boolean(editData);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting, isDirty },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues,
  });

  // ---------------------------------------------------------------------------
  // Populate on edit
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (open) {
      if (isEdit && editData) {
        reset({
          role_name: editData.role_name || '',
          status: editData.status || 'active',
        });
      } else {
        reset(defaultValues);
      }
    }
  }, [open, isEdit, editData, reset]);

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const onSubmit = async (data) => {
    const payload = {
      role_name: data.role_name.trim(),
      status: data.status,
    };

    try {
      if (isEdit) {
        await dispatch(updateRole({ id: editData.id, data: payload })).unwrap();
        onSuccess?.(`Role "${payload.role_name}" updated successfully.`);
      } else {
        await dispatch(createRole(payload)).unwrap();
        onSuccess?.(`Role "${payload.role_name}" created successfully.`);
      }
      onClose();
    } catch {
      // error handled via redux state / Alert below
    }
  };

  const handleClose = () => {
    if (!isSubmitting && !loading) {
      onClose();
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Dialog
      open={open}
      onClose={handleClose}
      maxWidth="xs"
      fullWidth
      PaperProps={{ sx: { borderRadius: 2.5 } }}
      aria-labelledby="role-form-title"
    >
      {/* Header */}
      <DialogTitle id="role-form-title" sx={{ pb: 1 }}>
        <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.25 }}>
            <ShieldOutlinedIcon color="primary" sx={{ fontSize: 22 }} />
            <Typography variant="h6" fontWeight={700} sx={{ fontSize: '1.05rem' }}>
              {isEdit ? 'Edit Role' : 'New Role'}
            </Typography>
          </Box>
          <IconButton
            size="small"
            onClick={handleClose}
            disabled={isSubmitting || loading}
            aria-label="Close dialog"
            sx={{ borderRadius: 1 }}
          >
            <CloseIcon fontSize="small" />
          </IconButton>
        </Box>
      </DialogTitle>

      <Divider />

      {/* Content */}
      <DialogContent sx={{ pt: 2.5, pb: 1 }}>
        {error && (
          <Alert severity="error" sx={{ mb: 2 }}>
            {error}
          </Alert>
        )}

        <Box
          component="form"
          id="role-form"
          onSubmit={handleSubmit(onSubmit)}
          noValidate
          sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
        >
          <Controller
            name="role_name"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Role Name"
                fullWidth
                required
                autoFocus
                placeholder="e.g. HR, Finance, Management"
                error={Boolean(errors.role_name)}
                helperText={errors.role_name?.message}
                inputProps={{ maxLength: 80 }}
              />
            )}
          />

          <Controller
            name="status"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Status"
                select
                fullWidth
                required
                error={Boolean(errors.status)}
                helperText={errors.status?.message}
              >
                <MenuItem value="active">Active</MenuItem>
                <MenuItem value="inactive">Inactive</MenuItem>
              </TextField>
            )}
          />
        </Box>
      </DialogContent>

      <Divider />

      {/* Actions */}
      <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
        <Button
          variant="outlined"
          color="inherit"
          onClick={handleClose}
          disabled={isSubmitting || loading}
          sx={{ flex: 1 }}
        >
          Cancel
        </Button>
        <Button
          type="submit"
          form="role-form"
          variant="contained"
          color="primary"
          startIcon={
            isSubmitting || loading ? (
              <CircularProgress size={14} color="inherit" />
            ) : (
              <SaveIcon />
            )
          }
          disabled={isSubmitting || loading || (isEdit && !isDirty)}
          sx={{ flex: 1 }}
          onClick={handleSubmit(onSubmit)}
        >
          {isSubmitting || loading
            ? 'Saving…'
            : isEdit
            ? 'Save Changes'
            : 'Create Role'}
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default RoleForm;
