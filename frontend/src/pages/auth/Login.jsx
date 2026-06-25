import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useDispatch, useSelector } from 'react-redux';
import { useForm, Controller } from 'react-hook-form';
import { yupResolver } from '@hookform/resolvers/yup';
import * as yup from 'yup';
import { toast } from 'react-toastify';
import {
  Box,
  Button,
  Checkbox,
  CircularProgress,
  FormControl,
  FormControlLabel,
  FormHelperText,
  IconButton,
  InputAdornment,
  InputLabel,
  OutlinedInput,
  TextField,
  Typography,
  Divider,
  Alert,
  useTheme,
  alpha,
} from '@mui/material';
import VisibilityIcon from '@mui/icons-material/Visibility';
import VisibilityOffIcon from '@mui/icons-material/VisibilityOff';
import LockOutlinedIcon from '@mui/icons-material/LockOutlined';

import AuthLayout from '../../layouts/AuthLayout';
import { loginThunk, selectAuthLoading, selectAuthError, clearError } from '../../redux/slices/authSlice';

// ---------------------------------------------------------------------------
// Validation schema
// ---------------------------------------------------------------------------

const schema = yup.object({
  email: yup
    .string()
    .required('Email is required')
    .email('Enter a valid email address'),
  password: yup
    .string()
    .required('Password is required')
    .min(6, 'Password must be at least 6 characters'),
});

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

const Login = () => {
  const theme = useTheme();
  const dispatch = useDispatch();
  const navigate = useNavigate();

  const loading = useSelector(selectAuthLoading);
  const authError = useSelector(selectAuthError);

  const [showPassword, setShowPassword] = useState(false);
  const [rememberMe, setRememberMe] = useState(() => {
    try {
      return localStorage.getItem('rut_remember_me') === 'true';
    } catch {
      return false;
    }
  });

  // Populate saved email when "remember me" was previously checked
  const savedEmail = (() => {
    try {
      return rememberMe ? localStorage.getItem('rut_saved_email') || '' : '';
    } catch {
      return '';
    }
  })();

  const {
    control,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting },
  } = useForm({
    resolver: yupResolver(schema),
    defaultValues: {
      email: savedEmail,
      password: '',
    },
  });

  // Clear redux auth error when component unmounts
  useEffect(() => {
    return () => {
      dispatch(clearError());
    };
  }, [dispatch]);

  // Show toast when redux error changes
  useEffect(() => {
    if (authError) {
      toast.error(authError, { toastId: 'login-error' });
    }
  }, [authError]);

  const handleTogglePassword = () => setShowPassword((prev) => !prev);
  const handleMouseDownPassword = (e) => e.preventDefault();

  const onSubmit = async (values) => {
    // Persist remember-me preference
    try {
      if (rememberMe) {
        localStorage.setItem('rut_remember_me', 'true');
        localStorage.setItem('rut_saved_email', values.email);
      } else {
        localStorage.removeItem('rut_remember_me');
        localStorage.removeItem('rut_saved_email');
      }
    } catch {
      // localStorage unavailable — continue anyway
    }

    const result = await dispatch(loginThunk({ email: values.email, password: values.password }));

    if (loginThunk.fulfilled.match(result)) {
      toast.success('Welcome back!', { toastId: 'login-success' });
      navigate('/', { replace: true });
    } else {
      // authError useEffect will handle toast; set field-level hint for UX
      setError('password', { type: 'server', message: '' });
    }
  };

  const isBusy = loading || isSubmitting;

  return (
    <AuthLayout>
      {/* Form header */}
      <Box sx={{ mb: 3 }}>
        <Box
          aria-hidden="true"
          sx={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 44,
            height: 44,
            borderRadius: '50%',
            bgcolor: alpha(theme.palette.primary.main, 0.1),
            color: 'primary.main',
            mb: 1.5,
          }}
        >
          <LockOutlinedIcon fontSize="small" />
        </Box>
        <Typography
          variant="h5"
          fontWeight={700}
          color="text.primary"
          sx={{ letterSpacing: '-0.3px', lineHeight: 1.2, textWrap: 'balance' }}
        >
          Sign in to your account
        </Typography>
        <Typography variant="body2" color="text.secondary" sx={{ mt: 0.5 }}>
          Enter your credentials to continue
        </Typography>
      </Box>

      {/* Server-level error banner (non-field errors) */}
      {authError && (
        <Alert
          severity="error"
          sx={{ mb: 2.5, fontSize: '0.8125rem' }}
          onClose={() => dispatch(clearError())}
        >
          {authError}
        </Alert>
      )}

      <Box
        component="form"
        noValidate
        onSubmit={handleSubmit(onSubmit)}
        sx={{ display: 'flex', flexDirection: 'column', gap: 2.5 }}
      >
        {/* Email field */}
        <Controller
          name="email"
          control={control}
          render={({ field }) => (
            <TextField
              {...field}
              label="Email address"
              type="email"
              autoComplete="email"
              autoFocus
              fullWidth
              size="medium"
              error={Boolean(errors.email)}
              helperText={errors.email?.message}
              disabled={isBusy}
              inputProps={{ 'aria-describedby': errors.email ? 'email-error' : undefined }}
              FormHelperTextProps={{ id: 'email-error' }}
              sx={{
                '& .MuiOutlinedInput-root': {
                  borderRadius: 2,
                  fontSize: '0.9375rem',
                },
              }}
            />
          )}
        />

        {/* Password field */}
        <Controller
          name="password"
          control={control}
          render={({ field }) => (
            <FormControl
              variant="outlined"
              fullWidth
              size="medium"
              error={Boolean(errors.password && errors.password.message)}
              disabled={isBusy}
            >
              <InputLabel htmlFor="password-input">Password</InputLabel>
              <OutlinedInput
                {...field}
                id="password-input"
                type={showPassword ? 'text' : 'password'}
                autoComplete="current-password"
                label="Password"
                aria-describedby={errors.password?.message ? 'password-error' : undefined}
                sx={{
                  borderRadius: 2,
                  fontSize: '0.9375rem',
                }}
                endAdornment={
                  <InputAdornment position="end">
                    <IconButton
                      aria-label={showPassword ? 'Hide password' : 'Show password'}
                      onClick={handleTogglePassword}
                      onMouseDown={handleMouseDownPassword}
                      edge="end"
                      size="small"
                      tabIndex={-1}
                    >
                      {showPassword ? (
                        <VisibilityOffIcon fontSize="small" />
                      ) : (
                        <VisibilityIcon fontSize="small" />
                      )}
                    </IconButton>
                  </InputAdornment>
                }
              />
              {errors.password?.message && (
                <FormHelperText id="password-error">
                  {errors.password.message}
                </FormHelperText>
              )}
            </FormControl>
          )}
        />

        {/* Remember me */}
        <FormControlLabel
          control={
            <Checkbox
              checked={rememberMe}
              onChange={(e) => setRememberMe(e.target.checked)}
              size="small"
              disabled={isBusy}
              color="primary"
            />
          }
          label={
            <Typography variant="body2" color="text.secondary">
              Remember my email
            </Typography>
          }
          sx={{ mt: -0.5, mb: -0.5, userSelect: 'none' }}
        />

        {/* Submit */}
        <Button
          type="submit"
          variant="contained"
          color="primary"
          size="large"
          fullWidth
          disabled={isBusy}
          aria-busy={isBusy}
          sx={{
            mt: 0.5,
            py: 1.25,
            borderRadius: 2,
            fontSize: '0.9375rem',
            fontWeight: 600,
            letterSpacing: '0.01em',
            position: 'relative',
            boxShadow: 'none',
            '&:not(:disabled):hover': {
              boxShadow: `0 4px 14px ${alpha(theme.palette.primary.main, 0.35)}`,
            },
          }}
        >
          {isBusy ? (
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
              <CircularProgress size={18} color="inherit" thickness={5} />
              Signing in…
            </Box>
          ) : (
            'Sign in'
          )}
        </Button>
      </Box>

      <Divider sx={{ my: 3, borderColor: 'divider' }} />

      <Typography
        variant="caption"
        color="text.disabled"
        align="center"
        display="block"
        sx={{ letterSpacing: '0.02em' }}
      >
        Contact your system administrator if you need access.
      </Typography>
    </AuthLayout>
  );
};

export default Login;
