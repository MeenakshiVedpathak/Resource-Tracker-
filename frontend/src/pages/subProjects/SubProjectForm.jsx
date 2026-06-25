import React, { useEffect, useState } from 'react';
import { useDispatch, useSelector } from 'react-redux';
import { useNavigate, useParams } from 'react-router-dom';
import {
  Box,
  Grid,
  Card,
  CardContent,
  CardHeader,
  Button,
  TextField,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  FormHelperText,
  Divider,
  Alert,
  Stack,
  CircularProgress,
  InputAdornment,
  Tooltip,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBackOutlined';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import PageHeader from '../../components/PageHeader';

import {
  createSubProject,
  updateSubProject,
  fetchSubProject,
  clearCurrentSubProject,
  selectCurrentSubProject,
  selectSubProjectLoading,
  selectSubProjectError,
} from '../../redux/slices/subProjectSlice';

import {
  fetchServicePOs,
  selectServicePOs,
} from '../../redux/slices/servicePOSlice';

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'completed', label: 'Completed' },
  { value: 'cancelled', label: 'Cancelled' },
];

const EMPTY_FORM = {
  service_po_id: '',
  sub_project_name: '',
  description: '',
  start_date: '',
  end_date: '',
  status: 'active',
};

const validate = (values) => {
  const errors = {};
  if (!values.service_po_id) errors.service_po_id = 'Service PO is required';
  if (!values.sub_project_name?.trim()) errors.sub_project_name = 'Name is required';
  if (values.sub_project_name?.trim().length > 150)
    errors.sub_project_name = 'Name must be 150 characters or fewer';
  if (!values.start_date) errors.start_date = 'Start date is required';
  if (!values.end_date) errors.end_date = 'End date is required';
  if (values.start_date && values.end_date && values.end_date < values.start_date)
    errors.end_date = 'End date must be on or after the start date';
  if (!values.status) errors.status = 'Status is required';
  return errors;
};

const SubProjectForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);

  const currentSubProject = useSelector(selectCurrentSubProject);
  const loading = useSelector(selectSubProjectLoading);
  const apiError = useSelector(selectSubProjectError);
  const servicePOs = useSelector(selectServicePOs);

  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  // Load PO list
  useEffect(() => {
    dispatch(fetchServicePOs({ limit: 200 }));
  }, [dispatch]);

  // Load sub-project for edit mode
  useEffect(() => {
    if (isEdit) {
      dispatch(fetchSubProject(id));
    }
    return () => {
      dispatch(clearCurrentSubProject());
    };
  }, [dispatch, id, isEdit]);

  // Populate form when record loads
  useEffect(() => {
    if (isEdit && currentSubProject) {
      setValues({
        service_po_id: currentSubProject.service_po_id ?? '',
        sub_project_name: currentSubProject.sub_project_name ?? '',
        description: currentSubProject.description ?? '',
        start_date: currentSubProject.start_date
          ? currentSubProject.start_date.substring(0, 10)
          : '',
        end_date: currentSubProject.end_date
          ? currentSubProject.end_date.substring(0, 10)
          : '',
        status: currentSubProject.status ?? 'active',
      });
    }
  }, [currentSubProject, isEdit]);

  const handleChange = (field) => (e) => {
    const val = e.target.value;
    setValues((prev) => ({ ...prev, [field]: val }));
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    const validationErrors = validate(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    setSubmitting(true);
    try {
      if (isEdit) {
        await dispatch(updateSubProject({ id, data: values })).unwrap();
      } else {
        await dispatch(createSubProject(values)).unwrap();
      }
      navigate('/sub-projects');
    } catch (err) {
      setSubmitError(
        typeof err === 'string' ? err : err?.message || 'Failed to save sub-project'
      );
    } finally {
      setSubmitting(false);
    }
  };

  const handleCancel = () => navigate('/sub-projects');

  if (isEdit && loading && !currentSubProject) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', pt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeader
        title={isEdit ? 'Edit Sub-Project' : 'New Sub-Project'}
        subtitle={
          isEdit
            ? 'Update the details of an existing sub-project'
            : 'Create a new sub-project under a service PO'
        }
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Sub-Projects', to: '/sub-projects' },
          { label: isEdit ? 'Edit' : 'New' },
        ]}
      />

      <Box
        component="form"
        onSubmit={handleSubmit}
        noValidate
        sx={{ mt: 3 }}
      >
        {submitError && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setSubmitError('')}>
            {submitError}
          </Alert>
        )}

        <Card>
          <CardHeader
            title="Sub-Project Details"
            subheader="Fields marked * are required"
          />
          <Divider />
          <CardContent>
            <Grid container spacing={3}>
              {/* Service PO */}
              <Grid item xs={12} md={6}>
                <FormControl
                  fullWidth
                  size="small"
                  error={Boolean(errors.service_po_id)}
                  required
                >
                  <InputLabel id="service-po-label">Service PO</InputLabel>
                  <Select
                    labelId="service-po-label"
                    value={values.service_po_id}
                    label="Service PO"
                    onChange={handleChange('service_po_id')}
                  >
                    <MenuItem value="" disabled>
                      <em>Select a service PO</em>
                    </MenuItem>
                    {(servicePOs || []).map((po) => (
                      <MenuItem key={po.id} value={po.id}>
                        {po.po_number}
                        {po.po_name ? ` — ${po.po_name}` : ''}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.service_po_id && (
                    <FormHelperText>{errors.service_po_id}</FormHelperText>
                  )}
                </FormControl>
              </Grid>

              {/* Sub-Project Name */}
              <Grid item xs={12} md={6}>
                <TextField
                  label="Sub-Project Name"
                  value={values.sub_project_name}
                  onChange={handleChange('sub_project_name')}
                  error={Boolean(errors.sub_project_name)}
                  helperText={errors.sub_project_name || `${values.sub_project_name.length}/150`}
                  fullWidth
                  required
                  inputProps={{ maxLength: 150 }}
                />
              </Grid>

              {/* Description */}
              <Grid item xs={12}>
                <TextField
                  label="Description"
                  value={values.description}
                  onChange={handleChange('description')}
                  fullWidth
                  multiline
                  rows={3}
                  placeholder="Optional: describe the scope or purpose of this sub-project"
                  inputProps={{ maxLength: 500 }}
                  helperText={`${values.description.length}/500`}
                />
              </Grid>

              {/* Start Date */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  label="Start Date"
                  type="date"
                  value={values.start_date}
                  onChange={handleChange('start_date')}
                  error={Boolean(errors.start_date)}
                  helperText={errors.start_date}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                />
              </Grid>

              {/* End Date */}
              <Grid item xs={12} sm={6} md={4}>
                <TextField
                  label="End Date"
                  type="date"
                  value={values.end_date}
                  onChange={handleChange('end_date')}
                  error={Boolean(errors.end_date)}
                  helperText={errors.end_date}
                  fullWidth
                  required
                  InputLabelProps={{ shrink: true }}
                  inputProps={{ min: values.start_date || undefined }}
                />
              </Grid>

              {/* Status */}
              <Grid item xs={12} sm={6} md={4}>
                <FormControl
                  fullWidth
                  size="small"
                  error={Boolean(errors.status)}
                  required
                >
                  <InputLabel id="status-label">Status</InputLabel>
                  <Select
                    labelId="status-label"
                    value={values.status}
                    label="Status"
                    onChange={handleChange('status')}
                  >
                    {STATUS_OPTIONS.map((opt) => (
                      <MenuItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </MenuItem>
                    ))}
                  </Select>
                  {errors.status && (
                    <FormHelperText>{errors.status}</FormHelperText>
                  )}
                </FormControl>
              </Grid>
            </Grid>
          </CardContent>
        </Card>

        {/* Actions */}
        <Stack
          direction="row"
          spacing={2}
          justifyContent="flex-end"
          sx={{ mt: 3 }}
        >
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<ArrowBackIcon />}
            onClick={handleCancel}
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            startIcon={
              submitting ? (
                <CircularProgress size={16} color="inherit" />
              ) : (
                <SaveIcon />
              )
            }
            disabled={submitting}
          >
            {isEdit ? 'Save Changes' : 'Create Sub-Project'}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default SubProjectForm;
