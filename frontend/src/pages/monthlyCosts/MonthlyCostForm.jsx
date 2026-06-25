import React, { useEffect, useState, useMemo } from 'react';
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
  Typography,
  Paper,
  InputAdornment,
  Autocomplete,
  Chip,
  Tooltip,
  alpha,
  useTheme,
} from '@mui/material';
import SaveIcon from '@mui/icons-material/SaveOutlined';
import ArrowBackIcon from '@mui/icons-material/ArrowBackOutlined';
import CalculateIcon from '@mui/icons-material/Calculate';
import InfoOutlinedIcon from '@mui/icons-material/InfoOutlined';

import PageHeader from '../../components/PageHeader';

import {
  createMonthlyCost,
  updateMonthlyCost,
  fetchMonthlyCost,
  clearCurrentMonthlyCost,
  selectCurrentMonthlyCost,
  selectMonthlyCostLoading,
} from '../../redux/slices/monthlyCostSlice';

import {
  fetchActiveEmployees,
  selectActiveEmployees,
} from '../../redux/slices/employeeSlice';

const MONTH_OPTIONS = [
  { value: 1, label: 'January' },
  { value: 2, label: 'February' },
  { value: 3, label: 'March' },
  { value: 4, label: 'April' },
  { value: 5, label: 'May' },
  { value: 6, label: 'June' },
  { value: 7, label: 'July' },
  { value: 8, label: 'August' },
  { value: 9, label: 'September' },
  { value: 10, label: 'October' },
  { value: 11, label: 'November' },
  { value: 12, label: 'December' },
];

const currentYear = new Date().getFullYear();
const YEAR_OPTIONS = Array.from({ length: 10 }, (_, i) => currentYear - 4 + i);

const EMPTY_FORM = {
  employee_id: null,
  month: new Date().getMonth() + 1,
  year: currentYear,
  salary_cost: '',
  ops_cost: '',
  billable_cost: '',
};

const parseCurrency = (val) => {
  const n = parseFloat(String(val).replace(/[^\d.]/g, ''));
  return isNaN(n) ? 0 : n;
};

const formatCurrency = (val) => {
  if (val === '' || val === null || val === undefined) return '';
  const n = Number(val);
  if (isNaN(n)) return '';
  return n.toLocaleString('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  });
};

const validate = (values) => {
  const errors = {};
  if (!values.employee_id) errors.employee_id = 'Employee is required';
  if (!values.month) errors.month = 'Month is required';
  if (!values.year) errors.year = 'Year is required';
  if (values.year && (values.year < 2000 || values.year > 2099))
    errors.year = 'Enter a valid year between 2000 and 2099';
  if (values.salary_cost === '' || values.salary_cost === null)
    errors.salary_cost = 'Salary cost is required';
  if (parseCurrency(values.salary_cost) < 0)
    errors.salary_cost = 'Must be 0 or greater';
  if (values.ops_cost !== '' && parseCurrency(values.ops_cost) < 0)
    errors.ops_cost = 'Must be 0 or greater';
  if (values.billable_cost !== '' && parseCurrency(values.billable_cost) < 0)
    errors.billable_cost = 'Must be 0 or greater';
  return errors;
};

// ----- Calculated fields ---------------------------------------------------
// ops_cost_per_employee = ops_cost / number_of_active_employees
// total_cost = salary_cost + ops_cost_per_employee
// These are shown read-only. The per-employee split requires knowing headcount;
// we approximate with the active employee list length here and let the API
// recalculate authoritatively on save.

const ReadonlyField = ({ label, value, tooltip }) => {
  const theme = useTheme();
  return (
    <Box
      sx={{
        border: `1px solid ${theme.palette.divider}`,
        borderRadius: 1,
        px: 1.5,
        py: 1,
        bgcolor: alpha(theme.palette.background.default, 0.6),
        position: 'relative',
      }}
    >
      <Typography
        variant="caption"
        color="text.secondary"
        sx={{ display: 'block', mb: 0.25, letterSpacing: '0.04em' }}
      >
        {label}
        {tooltip && (
          <Tooltip title={tooltip} placement="top">
            <InfoOutlinedIcon
              sx={{ fontSize: 13, ml: 0.5, verticalAlign: 'middle', color: 'text.disabled' }}
            />
          </Tooltip>
        )}
      </Typography>
      <Typography
        variant="body1"
        fontWeight={600}
        sx={{ fontVariantNumeric: 'tabular-nums' }}
      >
        {value}
      </Typography>
    </Box>
  );
};

const MonthlyCostForm = () => {
  const dispatch = useDispatch();
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = Boolean(id);
  const theme = useTheme();

  const currentMonthlyCost = useSelector(selectCurrentMonthlyCost);
  const loading = useSelector(selectMonthlyCostLoading);
  const activeEmployees = useSelector(selectActiveEmployees);

  const [values, setValues] = useState(EMPTY_FORM);
  const [errors, setErrors] = useState({});
  const [submitError, setSubmitError] = useState('');
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    dispatch(fetchActiveEmployees());
  }, [dispatch]);

  useEffect(() => {
    if (isEdit) {
      dispatch(fetchMonthlyCost(id));
    }
    return () => {
      dispatch(clearCurrentMonthlyCost());
    };
  }, [dispatch, id, isEdit]);

  useEffect(() => {
    if (isEdit && currentMonthlyCost) {
      setValues({
        employee_id: currentMonthlyCost.employee_id ?? null,
        month: currentMonthlyCost.month ?? '',
        year: currentMonthlyCost.year ?? currentYear,
        salary_cost: currentMonthlyCost.salary_cost ?? '',
        ops_cost: currentMonthlyCost.ops_cost ?? '',
        billable_cost: currentMonthlyCost.billable_cost ?? '',
      });
    }
  }, [currentMonthlyCost, isEdit]);

  // Derived calculated fields (client-side approximation)
  const headcount = activeEmployees?.length || 1;
  const opsCostNum = parseCurrency(values.ops_cost);
  const salaryCostNum = parseCurrency(values.salary_cost);
  const opsCostPerEmployee = headcount > 0 ? opsCostNum / headcount : 0;
  const totalCost = salaryCostNum + opsCostPerEmployee;

  const selectedEmployee = useMemo(
    () => (activeEmployees || []).find((e) => e.id === values.employee_id) || null,
    [activeEmployees, values.employee_id]
  );

  const handleChange = (field) => (e) => {
    const val = e.target.value;
    setValues((prev) => ({ ...prev, [field]: val }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleNumericChange = (field) => (e) => {
    // Allow only numbers and decimal point
    const raw = e.target.value.replace(/[^0-9.]/g, '');
    setValues((prev) => ({ ...prev, [field]: raw }));
    if (errors[field]) setErrors((prev) => ({ ...prev, [field]: '' }));
  };

  const handleEmployeeChange = (_, newVal) => {
    setValues((prev) => ({ ...prev, employee_id: newVal?.id ?? null }));
    if (errors.employee_id) setErrors((prev) => ({ ...prev, employee_id: '' }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitError('');

    const validationErrors = validate(values);
    if (Object.keys(validationErrors).length > 0) {
      setErrors(validationErrors);
      return;
    }

    const payload = {
      employee_id: values.employee_id,
      month: Number(values.month),
      year: Number(values.year),
      salary_cost: parseCurrency(values.salary_cost),
      ops_cost: parseCurrency(values.ops_cost),
      billable_cost: parseCurrency(values.billable_cost),
    };

    setSubmitting(true);
    try {
      if (isEdit) {
        await dispatch(updateMonthlyCost({ id, data: payload })).unwrap();
      } else {
        await dispatch(createMonthlyCost(payload)).unwrap();
      }
      navigate('/monthly-costs');
    } catch (err) {
      setSubmitError(
        typeof err === 'string' ? err : err?.message || 'Failed to save monthly cost'
      );
    } finally {
      setSubmitting(false);
    }
  };

  if (isEdit && loading && !currentMonthlyCost) {
    return (
      <Box sx={{ p: 3, display: 'flex', justifyContent: 'center', pt: 10 }}>
        <CircularProgress />
      </Box>
    );
  }

  return (
    <Box sx={{ p: { xs: 2, md: 3 } }}>
      <PageHeader
        title={isEdit ? 'Edit Monthly Cost' : 'Add Monthly Cost'}
        subtitle="Record salary, operational, and billable cost for an employee-month"
        breadcrumbs={[
          { label: 'Dashboard', to: '/' },
          { label: 'Monthly Costs', to: '/monthly-costs' },
          { label: isEdit ? 'Edit' : 'New' },
        ]}
      />

      <Box component="form" onSubmit={handleSubmit} noValidate sx={{ mt: 3 }}>
        {submitError && (
          <Alert severity="error" sx={{ mb: 3 }} onClose={() => setSubmitError('')}>
            {submitError}
          </Alert>
        )}

        <Grid container spacing={3}>
          {/* ---- Input fields ---- */}
          <Grid item xs={12} lg={8}>
            <Card>
              <CardHeader
                title="Cost Details"
                subheader="Fields marked * are required"
              />
              <Divider />
              <CardContent>
                <Grid container spacing={3}>
                  {/* Employee autocomplete */}
                  <Grid item xs={12} md={8}>
                    <Autocomplete
                      options={activeEmployees || []}
                      getOptionLabel={(opt) =>
                        opt.full_name
                          ? `${opt.full_name}${opt.employee_code ? ` (${opt.employee_code})` : ''}`
                          : ''
                      }
                      value={selectedEmployee}
                      onChange={handleEmployeeChange}
                      isOptionEqualToValue={(opt, val) => opt.id === val?.id}
                      renderInput={(params) => (
                        <TextField
                          {...params}
                          label="Employee *"
                          error={Boolean(errors.employee_id)}
                          helperText={errors.employee_id}
                          placeholder="Search by name or code…"
                        />
                      )}
                      renderOption={(props, option) => (
                        <Box component="li" {...props} key={option.id}>
                          <Box>
                            <Typography variant="body2" fontWeight={600}>
                              {option.full_name}
                            </Typography>
                            <Typography variant="caption" color="text.secondary">
                              {option.employee_code}
                              {option.designation ? ` · ${option.designation}` : ''}
                            </Typography>
                          </Box>
                        </Box>
                      )}
                    />
                  </Grid>

                  {/* Month */}
                  <Grid item xs={12} sm={6} md={4}>
                    <FormControl fullWidth size="small" error={Boolean(errors.month)} required>
                      <InputLabel id="month-label">Month</InputLabel>
                      <Select
                        labelId="month-label"
                        value={values.month}
                        label="Month"
                        onChange={handleChange('month')}
                      >
                        {MONTH_OPTIONS.map((m) => (
                          <MenuItem key={m.value} value={m.value}>
                            {m.label}
                          </MenuItem>
                        ))}
                      </Select>
                      {errors.month && <FormHelperText>{errors.month}</FormHelperText>}
                    </FormControl>
                  </Grid>

                  {/* Year */}
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      label="Year"
                      type="number"
                      value={values.year}
                      onChange={handleChange('year')}
                      error={Boolean(errors.year)}
                      helperText={errors.year}
                      fullWidth
                      required
                      inputProps={{ min: 2000, max: 2099 }}
                    />
                  </Grid>

                  {/* Salary Cost */}
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      label="Salary Cost"
                      value={values.salary_cost}
                      onChange={handleNumericChange('salary_cost')}
                      error={Boolean(errors.salary_cost)}
                      helperText={errors.salary_cost || 'Gross salary for the month'}
                      fullWidth
                      required
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">₹</InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  {/* Ops Cost */}
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      label="Total Ops Cost"
                      value={values.ops_cost}
                      onChange={handleNumericChange('ops_cost')}
                      error={Boolean(errors.ops_cost)}
                      helperText={
                        errors.ops_cost ||
                        'Company-wide operational cost for this month'
                      }
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">₹</InputAdornment>
                        ),
                      }}
                    />
                  </Grid>

                  {/* Billable Cost */}
                  <Grid item xs={12} sm={6} md={4}>
                    <TextField
                      label="Billable Cost"
                      value={values.billable_cost}
                      onChange={handleNumericChange('billable_cost')}
                      error={Boolean(errors.billable_cost)}
                      helperText={errors.billable_cost || 'Amount billable to the client'}
                      fullWidth
                      InputProps={{
                        startAdornment: (
                          <InputAdornment position="start">₹</InputAdornment>
                        ),
                      }}
                    />
                  </Grid>
                </Grid>
              </CardContent>
            </Card>
          </Grid>

          {/* ---- Calculated fields panel ---- */}
          <Grid item xs={12} lg={4}>
            <Card
              sx={{
                border: `1px solid ${alpha(theme.palette.primary.main, 0.2)}`,
                bgcolor: alpha(theme.palette.primary.main, 0.02),
              }}
            >
              <CardHeader
                avatar={<CalculateIcon color="primary" />}
                title="Calculated Values"
                subheader="Auto-computed — read only"
                titleTypographyProps={{ variant: 'subtitle1', fontWeight: 600 }}
              />
              <Divider />
              <CardContent>
                <Stack spacing={2}>
                  <ReadonlyField
                    label="Active Employee Count"
                    value={headcount}
                    tooltip="Number of active employees used to split ops cost"
                  />
                  <ReadonlyField
                    label="Ops Cost / Employee"
                    value={formatCurrency(opsCostPerEmployee)}
                    tooltip="Total ops cost ÷ active employee headcount"
                  />
                  <Divider />
                  <ReadonlyField
                    label="Total Cost"
                    value={formatCurrency(totalCost)}
                    tooltip="Salary cost + ops cost per employee"
                  />
                  <Alert severity="info" icon={<InfoOutlinedIcon />} sx={{ fontSize: '0.8rem' }}>
                    Final values are recalculated server-side on save using the
                    authoritative headcount.
                  </Alert>
                </Stack>
              </CardContent>
            </Card>
          </Grid>
        </Grid>

        {/* Actions */}
        <Stack direction="row" spacing={2} justifyContent="flex-end" sx={{ mt: 3 }}>
          <Button
            variant="outlined"
            color="inherit"
            startIcon={<ArrowBackIcon />}
            onClick={() => navigate('/monthly-costs')}
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
            {isEdit ? 'Save Changes' : 'Create Record'}
          </Button>
        </Stack>
      </Box>
    </Box>
  );
};

export default MonthlyCostForm;
