import React from 'react';
import { Controller, useFormContext } from 'react-hook-form';
import {
  TextField,
  FormControl,
  FormHelperText,
  InputLabel,
  Select,
  MenuItem,
  FormControlLabel,
  Switch,
  Autocomplete,
  CircularProgress,
  Box,
} from '@mui/material';
import { DatePicker } from '@mui/x-date-pickers/DatePicker';

// ---------------------------------------------------------------------------
// Shared helper — pull error message out of react-hook-form fieldState
// ---------------------------------------------------------------------------
const getErrorMessage = (error) => {
  if (!error) return '';
  if (typeof error.message === 'string') return error.message;
  return 'This field is invalid';
};

// ---------------------------------------------------------------------------
// RHFTextField
// ---------------------------------------------------------------------------
/**
 * Controlled MUI TextField bound to react-hook-form.
 *
 * @param {string} name       - RHF field name
 * @param {string} label
 * @param {object} rules      - RHF validation rules
 * @param {object} textFieldProps - additional MUI TextField props
 */
export const RHFTextField = ({ name, label, rules, textFieldProps = {} }) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState: { error } }) => (
        <TextField
          {...field}
          label={label}
          error={Boolean(error)}
          helperText={getErrorMessage(error)}
          fullWidth
          size="small"
          value={field.value ?? ''}
          {...textFieldProps}
        />
      )}
    />
  );
};

// ---------------------------------------------------------------------------
// RHFSelect
// ---------------------------------------------------------------------------
/**
 * Controlled MUI Select bound to react-hook-form.
 *
 * @param {string} name
 * @param {string} label
 * @param {Array}  options  - [{ value, label }]
 * @param {object} rules
 * @param {bool}   nullable - adds an "— None —" option
 */
export const RHFSelect = ({ name, label, options = [], rules, nullable = false, selectProps = {} }) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState: { error } }) => (
        <FormControl fullWidth size="small" error={Boolean(error)}>
          <InputLabel id={`${name}-label`}>{label}</InputLabel>
          <Select
            {...field}
            labelId={`${name}-label`}
            label={label}
            value={field.value ?? ''}
            {...selectProps}
          >
            {nullable && (
              <MenuItem value="">
                <em>None</em>
              </MenuItem>
            )}
            {options.map((opt) => (
              <MenuItem key={opt.value} value={opt.value}>
                {opt.label}
              </MenuItem>
            ))}
          </Select>
          {error && <FormHelperText>{getErrorMessage(error)}</FormHelperText>}
        </FormControl>
      )}
    />
  );
};

// ---------------------------------------------------------------------------
// RHFDatePicker
// ---------------------------------------------------------------------------
/**
 * Controlled MUI DatePicker (from @mui/x-date-pickers) bound to react-hook-form.
 *
 * @param {string} name
 * @param {string} label
 * @param {object} rules
 * @param {object} datePickerProps
 */
export const RHFDatePicker = ({ name, label, rules, datePickerProps = {} }) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState: { error } }) => (
        <DatePicker
          label={label}
          value={field.value ?? null}
          onChange={(date) => field.onChange(date)}
          slotProps={{
            textField: {
              fullWidth: true,
              size: 'small',
              error: Boolean(error),
              helperText: getErrorMessage(error),
              inputRef: field.ref,
            },
          }}
          {...datePickerProps}
        />
      )}
    />
  );
};

// ---------------------------------------------------------------------------
// RHFSwitch
// ---------------------------------------------------------------------------
/**
 * Controlled MUI Switch bound to react-hook-form.
 *
 * @param {string} name
 * @param {string} label
 * @param {object} rules
 */
export const RHFSwitch = ({ name, label, rules, switchProps = {} }) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field }) => (
        <FormControlLabel
          control={
            <Switch
              checked={Boolean(field.value)}
              onChange={(e) => field.onChange(e.target.checked)}
              inputRef={field.ref}
              {...switchProps}
            />
          }
          label={label}
        />
      )}
    />
  );
};

// ---------------------------------------------------------------------------
// RHFAutocomplete
// ---------------------------------------------------------------------------
/**
 * Controlled async MUI Autocomplete bound to react-hook-form.
 *
 * @param {string}   name
 * @param {string}   label
 * @param {Array}    options       - options array (can be updated dynamically)
 * @param {bool}     loading       - shows spinner while fetching
 * @param {fn}       onInputChange - called when user types (for async fetching)
 * @param {fn}       getOptionLabel- (option) => string
 * @param {fn}       isOptionEqualToValue
 * @param {object}   rules
 * @param {bool}     multiple
 * @param {object}   autocompleteProps
 */
export const RHFAutocomplete = ({
  name,
  label,
  options = [],
  loading = false,
  onInputChange,
  getOptionLabel = (opt) => (typeof opt === 'string' ? opt : opt?.label ?? ''),
  isOptionEqualToValue = (opt, val) => opt?.value === val?.value,
  rules,
  multiple = false,
  freeSolo = false,
  autocompleteProps = {},
}) => {
  const { control } = useFormContext();

  return (
    <Controller
      name={name}
      control={control}
      rules={rules}
      render={({ field, fieldState: { error } }) => (
        <Autocomplete
          {...field}
          options={options}
          multiple={multiple}
          freeSolo={freeSolo}
          loading={loading}
          getOptionLabel={getOptionLabel}
          isOptionEqualToValue={isOptionEqualToValue}
          value={field.value ?? (multiple ? [] : null)}
          onChange={(_, newValue) => field.onChange(newValue)}
          onInputChange={onInputChange}
          {...autocompleteProps}
          renderInput={(params) => (
            <TextField
              {...params}
              label={label}
              size="small"
              fullWidth
              error={Boolean(error)}
              helperText={getErrorMessage(error)}
              inputRef={field.ref}
              InputProps={{
                ...params.InputProps,
                endAdornment: (
                  <>
                    {loading && <CircularProgress color="inherit" size={16} />}
                    {params.InputProps.endAdornment}
                  </>
                ),
              }}
            />
          )}
        />
      )}
    />
  );
};

// ---------------------------------------------------------------------------
// RHFTextArea  (convenience alias for multiline TextField)
// ---------------------------------------------------------------------------
export const RHFTextArea = ({ name, label, rules, rows = 4, textFieldProps = {} }) => (
  <RHFTextField
    name={name}
    label={label}
    rules={rules}
    textFieldProps={{ multiline: true, rows, ...textFieldProps }}
  />
);
