import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import {
  Box,
  Grid,
  TextField,
  MenuItem,
  Button,
  Alert,
  CircularProgress,
  Divider,
  Typography,
  Paper,
  Autocomplete,
  InputAdornment,
  IconButton,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';

import PageHeader from '../../components/PageHeader';
import {
  createUser,
  updateUser,
  fetchUser,
  clearCurrentUser,
  selectCurrentUser,
  selectUserLoading,
  selectUserError,
} from '../../redux/slices/userSlice';
import {
  fetchActiveEmployees,
  selectActiveEmployees,
} from '../../redux/slices/employeeSlice';
import {
  fetchRoles,
  selectRoles,
} from '../../redux/slices/roleSlice';

// ---------------------------------------------------------------------------
// Validation schemas
// ---------------------------------------------------------------------------

const createSchema = yup.object({
  email: yup
    .string()
    .trim()
    .email('Enter a valid email address.')
    .required('Email is required.'),
  password: yup
    .string()
    .min(8, 'Password must be at least 8 characters.')
    .matches(/[A-Z]/, 'Password must contain at least one uppercase letter.')
    .matches(/[0-9]/, 'Password must contain at least one number.')
    .required('Password is required.'),
  employee_id: yup
    .mixed()
    .nullable()
    .required('Please select an employee.'),
  role_id: yup
    .string()
    .required('Please select a role.'),
  status: yup
    .string()
    .oneOf(['active', 'inactive'])
    .required('Status is required.'),
});

const editSchema = yup.object({
  email: yup
    .string()
    .trim()
    .email('Enter a valid email address.')
    .required('Email is required.'),
  employee_id: yup
    .mixed()
    .nullable()
    .required('Please select an employee.'),
  role_id: yup
    .string()
    .required('Please select a role.'),
  status: yup
    .string()
    .oneOf(['active', 'inactive'])
    .required('Status is required.'),
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const UserForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const currentUser = useSelector(selectCurrentUser);
  const loading = useSelector(selectUserLoading);
  const error = useSelector(selectUserError);
  const activeEmployees = useSelector(selectActiveEmployees);
  const roles = useSelector(selectRoles);

  const [showPassword, setShowPassword] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(isEdit ? editSchema : createSchema),
    defaultValues: {
      email: '',
      password: '',
      employee_id: null,
      role_id: '',
      status: 'active',
    },
  });

  // ---------------------------------------------------------------------------
  // Load reference data and existing user
  // ---------------------------------------------------------------------------

  useEffect(() => {
    dispatch(fetchActiveEmployees());
    dispatch(fetchRoles({ limit: 100 }));
    if (isEdit) {
      dispatch(fetchUser(id));
    }
    return () => {
      dispatch(clearCurrentUser());
    };
  }, [dispatch, id, isEdit]);

  // Populate form when editing
  useEffect(() => {
    if (isEdit && currentUser) {
      const employeeOption = currentUser.employee
        ? {
            id: currentUser.employee.id,
            full_name: currentUser.employee.full_name,
            employee_code: currentUser.employee.employee_code,
          }
        : null;

      reset({
        email: currentUser.email || '',
        password: '',
        employee_id: employeeOption,
        role_id: currentUser.role?.id?.toString() || currentUser.role_id?.toString() || '',
        status: currentUser.status || 'active',
      });
    }
  }, [currentUser, isEdit, reset]);

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const onSubmit = async (data) => {
    const payload = {
      email: data.email.trim(),
      employee_id:
        typeof data.employee_id === 'object' && data.employee_id !== null
          ? data.employee_id.id
          : data.employee_id,
      role_id: data.role_id,
      status: data.status,
    };

    if (!isEdit && data.password) {
      payload.password = data.password;
    }

    try {
      if (isEdit) {
        await dispatch(updateUser({ id, data: payload })).unwrap();
      } else {
        await dispatch(createUser(payload)).unwrap();
      }
      navigate('/users');
    } catch {
      // error handled via redux state
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 760, mx: 'auto' }}>
      <PageHeader
        title={isEdit ? 'Edit User' : 'Add User'}
        subtitle={
          isEdit
            ? 'Modify the portal account settings.'
            : 'Create a new portal account for an employee.'
        }
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Users', to: '/users' },
          { label: isEdit ? 'Edit' : 'Add' },
        ]}
      />

      {error && (
        <Alert severity="error" sx={{ mt: 2.5, mb: 1 }}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
        {/* Section: Account */}
        <Box sx={{ px: 3, pt: 3, pb: 1 }}>
          <Typography
            variant="subtitle2"
            fontWeight={700}
            color="text.secondary"
            sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.72rem' }}
          >
            Account Details
          </Typography>
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={isEdit ? 12 : 6}>
              <Controller
                name="email"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Email Address"
                    type="email"
                    fullWidth
                    required
                    autoFocus={!isEdit}
                    autoComplete="off"
                    error={Boolean(errors.email)}
                    helperText={errors.email?.message}
                  />
                )}
              />
            </Grid>

            {!isEdit && (
              <Grid item xs={12} sm={6}>
                <Controller
                  name="password"
                  control={control}
                  render={({ field }) => (
                    <TextField
                      {...field}
                      label="Password"
                      type={showPassword ? 'text' : 'password'}
                      fullWidth
                      required
                      autoComplete="new-password"
                      error={Boolean(errors.password)}
                      helperText={
                        errors.password?.message ||
                        'Min 8 chars, one uppercase, one number.'
                      }
                      InputProps={{
                        endAdornment: (
                          <InputAdornment position="end">
                            <IconButton
                              onClick={() => setShowPassword((v) => !v)}
                              edge="end"
                              size="small"
                              aria-label={showPassword ? 'Hide password' : 'Show password'}
                            >
                              {showPassword ? (
                                <VisibilityOffIcon fontSize="small" />
                              ) : (
                                <VisibilityIcon fontSize="small" />
                              )}
                            </IconButton>
                          </InputAdornment>
                        ),
                      }}
                    />
                  )}
                />
              </Grid>
            )}
          </Grid>
        </Box>

        <Divider sx={{ mx: 3, my: 2 }} />

        {/* Section: Association & Role */}
        <Box sx={{ px: 3, pb: 3 }}>
          <Typography
            variant="subtitle2"
            fontWeight={700}
            color="text.secondary"
            sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.72rem' }}
          >
            Association & Permissions
          </Typography>
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="employee_id"
                control={control}
                render={({ field: { onChange, value, ...rest } }) => (
                  <Autocomplete
                    {...rest}
                    options={activeEmployees}
                    value={value}
                    onChange={(_, newValue) => onChange(newValue)}
                    getOptionLabel={(opt) =>
                      typeof opt === 'object' && opt !== null
                        ? `${opt.full_name}${opt.employee_code ? ` (${opt.employee_code})` : ''}`
                        : ''
                    }
                    isOptionEqualToValue={(opt, val) =>
                      opt?.id === (typeof val === 'object' ? val?.id : val)
                    }
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Employee"
                        required
                        placeholder="Search and select…"
                        error={Boolean(errors.employee_id)}
                        helperText={errors.employee_id?.message}
                      />
                    )}
                    noOptionsText="No active employees found."
                    loading={loading}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="role_id"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Role"
                    select
                    fullWidth
                    required
                    error={Boolean(errors.role_id)}
                    helperText={errors.role_id?.message}
                  >
                    {roles.length === 0 && (
                      <MenuItem disabled value="">
                        No roles available
                      </MenuItem>
                    )}
                    {roles.map((role) => (
                      <MenuItem key={role.id} value={role.id.toString()}>
                        {role.role_name}
                      </MenuItem>
                    ))}
                  </TextField>
                )}
              />
            </Grid>

            <Grid item xs={12} sm={4}>
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
            </Grid>
          </Grid>
        </Box>

        {/* Action buttons */}
        <Box
          sx={{
            px: 3,
            py: 2,
            bgcolor: 'action.hover',
            borderTop: '1px solid',
            borderColor: 'divider',
            display: 'flex',
            gap: 1.5,
            justifyContent: 'flex-end',
          }}
        >
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/users')}
            disabled={isSubmitting || loading}
          >
            Cancel
          </Button>
          <Button
            variant="contained"
            color="primary"
            startIcon={
              isSubmitting || loading ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
            onClick={handleSubmit(onSubmit)}
            disabled={isSubmitting || loading}
          >
            {isSubmitting || loading
              ? 'Saving…'
              : isEdit
              ? 'Save Changes'
              : 'Create User'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default UserForm;
