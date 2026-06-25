import React, { useEffect } from 'react';
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
} from '@mui/material';
import SaveIcon from '@mui/icons-material/Save';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';

import PageHeader from '../../components/PageHeader';
import {
  createEmployee,
  updateEmployee,
  fetchEmployee,
  clearCurrentEmployee,
  selectCurrentEmployee,
  selectEmployeeLoading,
  selectEmployeeError,
} from '../../redux/slices/employeeSlice';

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const schema = yup.object({
  full_name: yup
    .string()
    .trim()
    .min(2, 'Full name must be at least 2 characters.')
    .max(120, 'Full name must not exceed 120 characters.')
    .required('Full name is required.'),
  designation: yup
    .string()
    .trim()
    .min(2, 'Designation must be at least 2 characters.')
    .max(100, 'Designation must not exceed 100 characters.')
    .required('Designation is required.'),
  total_experience: yup
    .number()
    .typeError('Total experience must be a number.')
    .min(0, 'Total experience cannot be negative.')
    .max(60, 'Total experience seems too high.')
    .required('Total experience is required.'),
  company_experience: yup
    .number()
    .typeError('Company experience must be a number.')
    .min(0, 'Company experience cannot be negative.')
    .max(60, 'Company experience seems too high.')
    .required('Company experience is required.')
    .test(
      'lte-total',
      'Company experience cannot exceed total experience.',
      function (value) {
        const total = this.parent.total_experience;
        if (value === undefined || total === undefined) return true;
        return value <= total;
      }
    ),
  resource_description: yup
    .string()
    .trim()
    .max(1000, 'Description must not exceed 1000 characters.')
    .nullable(),
  date_of_joining: yup
    .string()
    .required('Date of joining is required.')
    .nullable(),
  date_of_leaving: yup
    .string()
    .nullable()
    .test(
      'after-joining',
      'Date of leaving must be after the date of joining.',
      function (value) {
        if (!value) return true;
        const joining = this.parent.date_of_joining;
        if (!joining) return true;
        return new Date(value) > new Date(joining);
      }
    ),
  status: yup
    .string()
    .oneOf(['active', 'inactive'], 'Status must be active or inactive.')
    .required('Status is required.'),
});

// ---------------------------------------------------------------------------
// Default values
// ---------------------------------------------------------------------------

const defaultValues = {
  full_name: '',
  designation: '',
  total_experience: '',
  company_experience: '',
  resource_description: '',
  date_of_joining: '',
  date_of_leaving: '',
  status: 'active',
};

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const EmployeeForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const currentEmployee = useSelector(selectCurrentEmployee);
  const loading = useSelector(selectEmployeeLoading);
  const error = useSelector(selectEmployeeError);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues,
  });

  // ---------------------------------------------------------------------------
  // Load existing employee for edit mode
  // ---------------------------------------------------------------------------

  useEffect(() => {
    if (isEdit) {
      dispatch(fetchEmployee(id));
    }
    return () => {
      dispatch(clearCurrentEmployee());
    };
  }, [dispatch, id, isEdit]);

  useEffect(() => {
    if (isEdit && currentEmployee) {
      reset({
        full_name: currentEmployee.full_name || '',
        designation: currentEmployee.designation || '',
        total_experience: currentEmployee.total_experience ?? '',
        company_experience: currentEmployee.company_experience ?? '',
        resource_description: currentEmployee.resource_description || '',
        date_of_joining: currentEmployee.date_of_joining
          ? currentEmployee.date_of_joining.split('T')[0]
          : '',
        date_of_leaving: currentEmployee.date_of_leaving
          ? currentEmployee.date_of_leaving.split('T')[0]
          : '',
        status: currentEmployee.status || 'active',
      });
    }
  }, [currentEmployee, isEdit, reset]);

  // ---------------------------------------------------------------------------
  // Submit
  // ---------------------------------------------------------------------------

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      total_experience: Number(data.total_experience),
      company_experience: Number(data.company_experience),
      date_of_leaving: data.date_of_leaving || null,
      resource_description: data.resource_description || null,
    };

    try {
      if (isEdit) {
        await dispatch(updateEmployee({ id, data: payload })).unwrap();
      } else {
        await dispatch(createEmployee(payload)).unwrap();
      }
      navigate('/employees');
    } catch {
      // error handled via redux state
    }
  };

  // ---------------------------------------------------------------------------
  // Render
  // ---------------------------------------------------------------------------

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, maxWidth: 860, mx: 'auto' }}>
      <PageHeader
        title={isEdit ? 'Edit Employee' : 'Add Employee'}
        subtitle={
          isEdit
            ? 'Update the employee record below.'
            : 'Fill in the details to register a new employee.'
        }
        breadcrumbs={[
          { label: 'Home', to: '/' },
          { label: 'Employees', to: '/employees' },
          { label: isEdit ? 'Edit' : 'Add' },
        ]}
      />

      {error && (
        <Alert severity="error" sx={{ mt: 2.5, mb: 1 }}>
          {error}
        </Alert>
      )}

      <Paper variant="outlined" sx={{ mt: 3, borderRadius: 2, overflow: 'hidden' }}>
        {/* Section: Basic Info */}
        <Box sx={{ px: 3, pt: 3, pb: 1 }}>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.72rem' }}>
            Basic Information
          </Typography>
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="full_name"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Full Name"
                    fullWidth
                    required
                    error={Boolean(errors.full_name)}
                    helperText={errors.full_name?.message}
                    autoFocus={!isEdit}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="designation"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Designation"
                    fullWidth
                    required
                    error={Boolean(errors.designation)}
                    helperText={errors.designation?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="total_experience"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Total Experience (years)"
                    fullWidth
                    required
                    type="number"
                    inputProps={{ min: 0, max: 60, step: 0.5 }}
                    error={Boolean(errors.total_experience)}
                    helperText={errors.total_experience?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="company_experience"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Company Experience (years)"
                    fullWidth
                    required
                    type="number"
                    inputProps={{ min: 0, max: 60, step: 0.5 }}
                    error={Boolean(errors.company_experience)}
                    helperText={errors.company_experience?.message}
                  />
                )}
              />
            </Grid>
          </Grid>
        </Box>

        <Divider sx={{ mx: 3, my: 2 }} />

        {/* Section: Dates & Status */}
        <Box sx={{ px: 3, pb: 1 }}>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.72rem' }}>
            Employment Details
          </Typography>
          <Grid container spacing={2.5}>
            <Grid item xs={12} sm={6}>
              <Controller
                name="date_of_joining"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Date of Joining"
                    type="date"
                    fullWidth
                    required
                    InputLabelProps={{ shrink: true }}
                    error={Boolean(errors.date_of_joining)}
                    helperText={errors.date_of_joining?.message}
                  />
                )}
              />
            </Grid>

            <Grid item xs={12} sm={6}>
              <Controller
                name="date_of_leaving"
                control={control}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Date of Leaving"
                    type="date"
                    fullWidth
                    InputLabelProps={{ shrink: true }}
                    error={Boolean(errors.date_of_leaving)}
                    helperText={errors.date_of_leaving?.message || 'Leave blank if still employed.'}
                  />
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

        <Divider sx={{ mx: 3, my: 2 }} />

        {/* Section: Description */}
        <Box sx={{ px: 3, pb: 3 }}>
          <Typography variant="subtitle2" fontWeight={700} color="text.secondary" sx={{ mb: 2, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.72rem' }}>
            Resource Description
          </Typography>
          <Controller
            name="resource_description"
            control={control}
            render={({ field }) => (
              <TextField
                {...field}
                label="Resource Description"
                fullWidth
                multiline
                minRows={4}
                maxRows={10}
                placeholder="Describe the employee's key skills, responsibilities, and areas of expertise…"
                error={Boolean(errors.resource_description)}
                helperText={
                  errors.resource_description?.message ||
                  `${(field.value || '').length} / 1000 characters`
                }
                inputProps={{ maxLength: 1000 }}
              />
            )}
          />
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
            onClick={() => navigate('/employees')}
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
              : 'Create Employee'}
          </Button>
        </Box>
      </Paper>
    </Box>
  );
};

export default EmployeeForm;
