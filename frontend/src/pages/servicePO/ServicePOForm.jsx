import React, { useEffect, useState } from 'react';
import {
  Autocomplete,
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormControlLabel,
  FormHelperText,
  Grid,
  InputAdornment,
  InputLabel,
  MenuItem,
  Select,
  Switch,
  TextField,
  Typography,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';
import { parseISO, isAfter, isValid } from 'date-fns';

import {
  createServicePO,
  updateServicePO,
  selectServicePOsLoading,
} from '../../store/slices/servicePOSlice';
import { fetchClients, selectAllClients } from '../../store/slices/clientSlice';

const SERVICE_TYPE_OPTIONS = [
  'Software Development',
  'IT Consulting',
  'Infrastructure',
  'Support & Maintenance',
  'Testing & QA',
  'Data Analytics',
  'Cloud Services',
  'Managed Services',
  'Training',
  'Other',
];

const STATUS_OPTIONS = [
  { value: 'draft', label: 'Draft' },
  { value: 'active', label: 'Active' },
  { value: 'on_hold', label: 'On Hold' },
  { value: 'closed', label: 'Closed' },
  { value: 'expired', label: 'Expired' },
];

const defaultValues = {
  service_po_name: '',
  client: null,
  service_type: '',
  po_value: '',
  start_date: null,
  end_date: null,
  expected_man_hours: '',
  is_billable: true,
  status: 'active',
};

export default function ServicePOForm({ open, onClose, initialData }) {
  const dispatch = useDispatch();
  const loading = useSelector(selectServicePOsLoading);
  const clients = useSelector(selectAllClients);
  const isEdit = Boolean(initialData?.id);

  const [clientLoading, setClientLoading] = useState(false);

  const {
    control,
    handleSubmit,
    reset,
    watch,
    formState: { errors, isDirty },
  } = useForm({ defaultValues });

  const startDate = watch('start_date');

  useEffect(() => {
    if (open) {
      setClientLoading(true);
      dispatch(fetchClients({ per_page: 500, status: 'active' })).finally(() =>
        setClientLoading(false)
      );

      if (isEdit && initialData) {
        reset({
          service_po_name: initialData.service_po_name ?? '',
          client: initialData.client ?? null,
          service_type: initialData.service_type ?? '',
          po_value: initialData.po_value ?? '',
          start_date: initialData.start_date ? parseISO(initialData.start_date) : null,
          end_date: initialData.end_date ? parseISO(initialData.end_date) : null,
          expected_man_hours: initialData.expected_man_hours ?? '',
          is_billable: initialData.is_billable ?? true,
          status: initialData.status ?? 'active',
        });
      } else {
        reset(defaultValues);
      }
    }
  }, [open, initialData, isEdit, reset, dispatch]);

  const onSubmit = async (data) => {
    const payload = {
      ...data,
      client_id: data.client?.id ?? null,
      po_value: data.po_value !== '' ? parseFloat(data.po_value) : null,
      expected_man_hours: data.expected_man_hours !== '' ? parseFloat(data.expected_man_hours) : null,
      start_date: data.start_date ? data.start_date.toISOString().split('T')[0] : null,
      end_date: data.end_date ? data.end_date.toISOString().split('T')[0] : null,
    };
    delete payload.client;

    let result;
    if (isEdit) {
      result = await dispatch(updateServicePO({ id: initialData.id, ...payload }));
    } else {
      result = await dispatch(createServicePO(payload));
    }
    if (!result?.error) {
      onClose(true);
    }
  };

  return (
    <Dialog
      open={open}
      onClose={() => onClose(false)}
      fullWidth
      maxWidth="md"
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ pb: 0.5 }}>
        <Typography variant="h6" fontWeight={700}>
          {isEdit ? 'Edit Service PO' : 'New Service PO'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isEdit ? 'Update PO details.' : 'Define the purchase order scope, value and timeline.'}
        </Typography>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers>
          <Grid container spacing={2.5}>
            {/* PO Name */}
            <Grid item xs={12}>
              <Controller
                name="service_po_name"
                control={control}
                rules={{ required: 'PO name is required', minLength: { value: 2, message: 'Min 2 characters' } }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="PO Name"
                    fullWidth
                    required
                    autoFocus
                    error={Boolean(errors.service_po_name)}
                    helperText={errors.service_po_name?.message}
                  />
                )}
              />
            </Grid>

            {/* Client */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="client"
                control={control}
                rules={{ required: 'Client is required' }}
                render={({ field: { onChange, value } }) => (
                  <Autocomplete
                    options={clients}
                    loading={clientLoading}
                    getOptionLabel={(opt) => opt?.client_name ?? ''}
                    isOptionEqualToValue={(opt, val) => opt?.id === val?.id}
                    value={value}
                    onChange={(_, newVal) => onChange(newVal)}
                    renderInput={(params) => (
                      <TextField
                        {...params}
                        label="Client"
                        required
                        error={Boolean(errors.client)}
                        helperText={errors.client?.message}
                        InputProps={{
                          ...params.InputProps,
                          endAdornment: (
                            <>
                              {clientLoading && <CircularProgress size={16} />}
                              {params.InputProps.endAdornment}
                            </>
                          ),
                        }}
                      />
                    )}
                  />
                )}
              />
            </Grid>

            {/* Service Type */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="service_type"
                control={control}
                rules={{ required: 'Service type is required' }}
                render={({ field }) => (
                  <FormControl fullWidth required error={Boolean(errors.service_type)}>
                    <InputLabel>Service Type</InputLabel>
                    <Select {...field} label="Service Type">
                      {SERVICE_TYPE_OPTIONS.map((opt) => (
                        <MenuItem key={opt} value={opt}>{opt}</MenuItem>
                      ))}
                    </Select>
                    {errors.service_type && (
                      <FormHelperText>{errors.service_type.message}</FormHelperText>
                    )}
                  </FormControl>
                )}
              />
            </Grid>

            {/* PO Value */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="po_value"
                control={control}
                rules={{
                  required: 'PO value is required',
                  min: { value: 0, message: 'Must be positive' },
                  validate: (v) => !isNaN(Number(v)) || 'Must be a number',
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="PO Value"
                    fullWidth
                    required
                    type="number"
                    inputProps={{ min: 0, step: 0.01 }}
                    InputProps={{
                      startAdornment: <InputAdornment position="start">₹</InputAdornment>,
                    }}
                    error={Boolean(errors.po_value)}
                    helperText={errors.po_value?.message}
                  />
                )}
              />
            </Grid>

            {/* Expected Man Hours */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="expected_man_hours"
                control={control}
                rules={{
                  required: 'Expected hours is required',
                  min: { value: 1, message: 'Must be at least 1' },
                  validate: (v) => !isNaN(Number(v)) || 'Must be a number',
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Expected Man Hours"
                    fullWidth
                    required
                    type="number"
                    inputProps={{ min: 1, step: 1 }}
                    InputProps={{
                      endAdornment: <InputAdornment position="end">hrs</InputAdornment>,
                    }}
                    error={Boolean(errors.expected_man_hours)}
                    helperText={errors.expected_man_hours?.message}
                  />
                )}
              />
            </Grid>

            {/* Start Date */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="start_date"
                control={control}
                rules={{ required: 'Start date is required' }}
                render={({ field }) => (
                  <DatePicker
                    label="Start Date"
                    value={field.value}
                    onChange={field.onChange}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        error: Boolean(errors.start_date),
                        helperText: errors.start_date?.message,
                      },
                    }}
                  />
                )}
              />
            </Grid>

            {/* End Date */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="end_date"
                control={control}
                rules={{
                  required: 'End date is required',
                  validate: (val) => {
                    if (!val || !startDate) return true;
                    if (!isValid(val)) return 'Invalid date';
                    return (
                      isAfter(val, startDate) || 'End date must be after start date'
                    );
                  },
                }}
                render={({ field }) => (
                  <DatePicker
                    label="End Date"
                    value={field.value}
                    onChange={field.onChange}
                    minDate={startDate ?? undefined}
                    slotProps={{
                      textField: {
                        fullWidth: true,
                        required: true,
                        error: Boolean(errors.end_date),
                        helperText: errors.end_date?.message,
                      },
                    }}
                  />
                )}
              />
            </Grid>

            {/* Status */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="status"
                control={control}
                rules={{ required: 'Status is required' }}
                render={({ field }) => (
                  <FormControl fullWidth required error={Boolean(errors.status)}>
                    <InputLabel>Status</InputLabel>
                    <Select {...field} label="Status">
                      {STATUS_OPTIONS.map((opt) => (
                        <MenuItem key={opt.value} value={opt.value}>{opt.label}</MenuItem>
                      ))}
                    </Select>
                    {errors.status && <FormHelperText>{errors.status.message}</FormHelperText>}
                  </FormControl>
                )}
              />
            </Grid>

            {/* Is Billable toggle */}
            <Grid item xs={12} sm={6} sx={{ display: 'flex', alignItems: 'center' }}>
              <Controller
                name="is_billable"
                control={control}
                render={({ field }) => (
                  <FormControlLabel
                    control={
                      <Switch
                        checked={field.value}
                        onChange={(e) => field.onChange(e.target.checked)}
                        color="primary"
                      />
                    }
                    label={
                      <Box>
                        <Typography variant="body2" fontWeight={500}>Billable PO</Typography>
                        <Typography variant="caption" color="text.secondary">
                          Hours logged are billed to client
                        </Typography>
                      </Box>
                    }
                  />
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button
            onClick={() => onClose(false)}
            variant="outlined"
            color="inherit"
            sx={{ textTransform: 'none' }}
            disabled={loading}
          >
            Cancel
          </Button>
          <Button
            type="submit"
            variant="contained"
            disabled={loading || (!isDirty && isEdit)}
            startIcon={loading ? <CircularProgress size={16} color="inherit" /> : null}
            sx={{ textTransform: 'none', fontWeight: 600, minWidth: 110 }}
          >
            {loading ? 'Saving…' : isEdit ? 'Update PO' : 'Create PO'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
