import React, { useEffect } from 'react';
import {
  Button,
  CircularProgress,
  Dialog,
  DialogActions,
  DialogContent,
  DialogTitle,
  FormControl,
  FormHelperText,
  Grid,
  InputLabel,
  MenuItem,
  Select,
  TextField,
  Typography,
} from '@mui/material';
import { useForm, Controller } from 'react-hook-form';
import { useDispatch, useSelector } from 'react-redux';
import { createClient, updateClient, selectClientsLoading } from '../../store/slices/clientSlice';

const INDUSTRY_OPTIONS = [
  'Technology',
  'Finance',
  'Healthcare',
  'Manufacturing',
  'Retail',
  'Energy',
  'Telecommunications',
  'Education',
  'Government',
  'Consulting',
  'Media & Entertainment',
  'Real Estate',
  'Transportation',
  'Other',
];

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active' },
  { value: 'inactive', label: 'Inactive' },
  { value: 'suspended', label: 'Suspended' },
];

const defaultValues = {
  client_name: '',
  industry: '',
  status: 'active',
};

export default function ClientForm({ open, onClose, initialData }) {
  const dispatch = useDispatch();
  const loading = useSelector(selectClientsLoading);
  const isEdit = Boolean(initialData?.id);

  const {
    control,
    handleSubmit,
    reset,
    formState: { errors, isDirty },
  } = useForm({ defaultValues });

  useEffect(() => {
    if (open) {
      if (isEdit && initialData) {
        reset({
          client_name: initialData.client_name ?? '',
          industry: initialData.industry ?? '',
          status: initialData.status ?? 'active',
        });
      } else {
        reset(defaultValues);
      }
    }
  }, [open, initialData, isEdit, reset]);

  const onSubmit = async (data) => {
    let result;
    if (isEdit) {
      result = await dispatch(updateClient({ id: initialData.id, ...data }));
    } else {
      result = await dispatch(createClient(data));
    }

    if (!result?.error) {
      onClose(true);
    }
  };

  const handleCancel = () => {
    onClose(false);
  };

  return (
    <Dialog
      open={open}
      onClose={handleCancel}
      fullWidth
      maxWidth="sm"
      PaperProps={{ sx: { borderRadius: 2 } }}
    >
      <DialogTitle sx={{ pb: 1 }}>
        <Typography variant="h6" fontWeight={700}>
          {isEdit ? 'Edit Client' : 'Add New Client'}
        </Typography>
        <Typography variant="body2" color="text.secondary">
          {isEdit ? 'Update the client details below.' : 'Fill in the details to create a new client.'}
        </Typography>
      </DialogTitle>

      <form onSubmit={handleSubmit(onSubmit)} noValidate>
        <DialogContent dividers sx={{ pt: 2 }}>
          <Grid container spacing={2.5}>
            {/* Client Name */}
            <Grid item xs={12}>
              <Controller
                name="client_name"
                control={control}
                rules={{
                  required: 'Client name is required',
                  minLength: { value: 2, message: 'Minimum 2 characters' },
                  maxLength: { value: 150, message: 'Maximum 150 characters' },
                }}
                render={({ field }) => (
                  <TextField
                    {...field}
                    label="Client Name"
                    fullWidth
                    required
                    error={Boolean(errors.client_name)}
                    helperText={errors.client_name?.message}
                    autoFocus
                    inputProps={{ maxLength: 150 }}
                  />
                )}
              />
            </Grid>

            {/* Industry */}
            <Grid item xs={12} sm={6}>
              <Controller
                name="industry"
                control={control}
                rules={{ required: 'Industry is required' }}
                render={({ field }) => (
                  <FormControl fullWidth required error={Boolean(errors.industry)}>
                    <InputLabel>Industry</InputLabel>
                    <Select {...field} label="Industry">
                      {INDUSTRY_OPTIONS.map((opt) => (
                        <MenuItem key={opt} value={opt}>
                          {opt}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.industry && (
                      <FormHelperText>{errors.industry.message}</FormHelperText>
                    )}
                  </FormControl>
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
                        <MenuItem key={opt.value} value={opt.value}>
                          {opt.label}
                        </MenuItem>
                      ))}
                    </Select>
                    {errors.status && (
                      <FormHelperText>{errors.status.message}</FormHelperText>
                    )}
                  </FormControl>
                )}
              />
            </Grid>
          </Grid>
        </DialogContent>

        <DialogActions sx={{ px: 3, py: 2, gap: 1 }}>
          <Button
            onClick={handleCancel}
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
            sx={{ textTransform: 'none', fontWeight: 600, minWidth: 100 }}
          >
            {loading ? 'Saving…' : isEdit ? 'Update' : 'Create'}
          </Button>
        </DialogActions>
      </form>
    </Dialog>
  );
}
