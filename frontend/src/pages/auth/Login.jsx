import { useState } from 'react';
import { useNavigate, useLocation, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Eye, EyeOff, LogIn } from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { rolesApi } from '@/api/roles.api';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { applyFieldErrors } from '@/utils/authErrors';
import { emailSchema } from '@/utils/validators';
import { ROUTES } from '@/constants/routes';
import { computeHomeRoute, FORM_NAMES } from '@/constants/rbacForms';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCredentials, setAccessibleForms } = useAuth();
  const { error: showError } = useNotification();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // null (not ROUTES.DASHBOARD) when there's no explicit deep-link target — Dashboard is no
  // longer guaranteed to be reachable by everyone, so falling back to it unconditionally here
  // would bounce an account without it mapped straight into Not Authorized right after login.
  const from = location.state?.from?.pathname ?? null;

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const completeLogin = (data) => {
    const { employee, accessToken, refreshToken, roles, businessUnits, forms } = data;
    // Employee-only means Employee is the account's SOLE role — a multi-role account (e.g.
    // Employee + Manager) must land wherever `forms` sends it below, not always the Employee
    // dashboard, so this checks the full `roles[]` array rather than a singular role.
    const isEmployeeOnly = (roles ?? []).length > 0 && (roles ?? []).every((r) => r.name === 'Employee');

    setCredentials({ employee, accessToken, refreshToken, roles, businessUnits });

    // Paint immediately from whatever the login response embedded, if anything — avoids a
    // blank sidebar flash while the call below is in flight.
    if (forms) setAccessibleForms(forms);

    // POST /roles/forms is the authoritative source of truth for what each user can see —
    // always call it after login (not just when the login response happens to omit `forms`),
    // and let its result win. Fired in the background so it doesn't delay navigation when we
    // already have enough to decide (`forms` embedded, or an explicit deep-link `from`) — only
    // awaited below when neither of those tells us where to land.
    const roleIds = (roles ?? []).map((r) => r.id);
    const formsPromise = roleIds.length
      ? rolesApi.getAccessibleForms(roleIds)
        .then((fetched) => { setAccessibleForms(fetched); return fetched; })
        .catch(() => forms ?? {})
        // Non-fatal on failure: MainLayout's useSyncAccessibleForms fallback will retry
        // if the store ends up with no accessible-forms cached at all.
      : Promise.resolve(forms ?? {});

    // A Platform Admin always lands on its own fixed home (MainLayout also enforces this on
    // every navigation, but this avoids an unnecessary bounce right after login). An Employee
    // lands on Employee Dashboard only when that form is actually mapped to it — an account
    // mapped to other Employee forms (e.g. "My Work Log") but not "Employee Dashboard" itself
    // would otherwise get bounced straight to Not Authorized right after login, even though its
    // sidebar shows its real mapped forms fine (see ProtectedRoute's formName gate on
    // ROUTES.EMPLOYEE_DASHBOARD). Everyone else: honor an explicit deep-link target if there is
    // one; otherwise pick a real landing page from whichever forms answer is available —
    // Dashboard is no longer guaranteed to be one of them (see ProtectedRoute's
    // `allowIfNoFormsMapped`).
    const employeeHomeOpts = { homeFormName: FORM_NAMES.EMPLOYEE_DASHBOARD, homeRoute: ROUTES.EMPLOYEE_DASHBOARD };
    if (isEmployeeOnly) {
      if (forms) {
        navigate(computeHomeRoute(forms, employeeHomeOpts), { replace: true });
      } else {
        formsPromise.then((resolvedForms) => navigate(computeHomeRoute(resolvedForms, employeeHomeOpts), { replace: true }));
      }
    } else if ((roles ?? []).some((r) => r.name === 'Platform Admin')) {
      navigate(ROUTES.ADMINS, { replace: true });
    } else if (from) {
      navigate(from, { replace: true });
    } else if (forms) {
      navigate(computeHomeRoute(forms), { replace: true });
    } else {
      formsPromise.then((resolvedForms) => navigate(computeHomeRoute(resolvedForms), { replace: true }));
    }
  };

  const onSubmit = async (values) => {
    setIsLoading(true);
    try {
      const res = await authApi.login(values.email, values.password);
      completeLogin(res.data);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        // "Email ID is not registered." — a real, expected case now, not a generic
        // "invalid credentials" — shown inline under the field it's actually about.
        form.setError('email', { message: extractApiError(err) });
      } else if (status === 422) {
        const { hasFieldErrors, leftover } = applyFieldErrors(err, form, ['email', 'password']);
        if (leftover.length) showError(leftover.join(' '));
        else if (!hasFieldErrors) showError(extractApiError(err));
      } else {
        // 401 (wrong password) / 403 (inactive) / network / 5xx — server's literal message.
        showError(extractApiError(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.3 }}
    >
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Welcome back</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Sign in to your Finance Portal account
        </p>
      </div>

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="email"
            render={({ field }) => (
              <FormItem>
                <FormLabel>Email</FormLabel>
                <FormControl>
                  <Input
                    type="email"
                    placeholder="Enter your email"
                    autoComplete="email"
                    autoFocus
                    {...field}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <FormField
            control={form.control}
            name="password"
            render={({ field }) => (
              <FormItem>
                <div className="flex items-center justify-between">
                  <FormLabel>Password</FormLabel>
                  <Link to={ROUTES.FORGOT_PASSWORD} className="text-xs font-medium text-primary hover:underline">
                    Forgot password?
                  </Link>
                </div>
                <FormControl>
                  <div className="relative">
                    <Input
                      type={showPassword ? 'text' : 'password'}
                      placeholder="Enter your password"
                      autoComplete="current-password"
                      className="pr-10"
                      {...field}
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword((v) => !v)}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                      tabIndex={-1}
                    >
                      {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                    </button>
                  </div>
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full mt-2" disabled={isLoading} size="lg">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Signing in…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <LogIn className="h-4 w-4" />
                Sign in
              </span>
            )}
          </Button>
        </form>
      </Form>

      <p className="mt-6 text-center text-xs text-muted-foreground">
        Contact your administrator if you don't have access.
      </p>
    </motion.div>
  );
};

export default Login;
