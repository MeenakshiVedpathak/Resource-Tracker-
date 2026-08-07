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
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import AccountTypeDialog from '@/components/auth/AccountTypeDialog';

const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, 'Password is required'),
});

const Login = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { setCredentials, setAccessibleForms, setIsOriginalDataVisible } = useAuth();
  const { error: showError } = useNotification();
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  // Set when /login responds with requiresUserTypeSelection — holds what's needed to
  // resubmit once the user picks an account type in the dialog below.
  const [accountTypePrompt, setAccountTypePrompt] = useState(null);

  const from = location.state?.from?.pathname ?? ROUTES.DASHBOARD;

  const form = useForm({
    resolver: zodResolver(loginSchema),
    defaultValues: { email: '', password: '' },
  });

  const completeLogin = (data) => {
    const { user, employee, accessToken, refreshToken, roles, forms, loginType } = data;

    // Dynamic login: an Employee response nests identity under `employee` (id, employee_code,
    // full_name, email_id, company_id, status) instead of `user`, and omits roles/forms
    // entirely (RBAC doesn't apply to employees) — normalize both into the same `user` slot
    // so authSlice/useAuth stay generic.
    const principal = user ?? employee;

    // Multi-tenancy retrofit: `user.company` (full object, incl. `id`) and `user.is_platform_admin`
    // are both confirmed fields on the login response's user object — `null`/`false` respectively
    // for a Platform Admin, who belongs to no company. Neither exists on an employee.
    // Dynamic login: `loginType` ('employee' | 'user') is a top-level field on the response,
    // discriminating the Employee self-service area from the existing RBAC-driven app. Only
    // the Employee path currently sends it — a missing/non-'employee' value means User.
    setCredentials({
      user: principal, accessToken, refreshToken, roles, loginType,
      company: principal?.company ?? null,
    });

    // Paint immediately from whatever the login response embedded, if anything — avoids a
    // blank sidebar flash while the call below is in flight.
    if (forms) setAccessibleForms(forms);

    // POST /roles/forms is the authoritative source of truth for what each user can see —
    // always call it after login (not just when the login response happens to omit `forms`),
    // and let its result win. Fired in the background so it doesn't delay navigation.
    const roleIds = (roles ?? []).map((r) => r.id);
    if (roleIds.length) {
      rolesApi.getAccessibleForms(roleIds)
        .then(setAccessibleForms)
        .catch(() => {
          // Non-fatal: MainLayout's useSyncAccessibleForms fallback will retry
          // if the store ends up with no accessible-forms cached at all.
        });
    }

    setIsOriginalDataVisible((roles ?? []).some((r) => r.is_original_data_visible === true));

    // Dynamic login: an Employee account always lands on the Employee dashboard, regardless
    // of `from` — mirrors the Platform Admin redirect below (MainLayout/AuthLayout also
    // enforce this on every navigation, but this avoids an unnecessary bounce right after login).
    // Multi-tenancy retrofit: a Platform Admin's only screen is now Entity Admin creation
    // (Company Management moved to the Entity Admin tier), so send them straight there rather
    // than `from`/Dashboard.
    const destination = loginType === 'employee'
      ? ROUTES.EMPLOYEE_DASHBOARD
      : (user?.is_platform_admin ? ROUTES.ENTITY_ADMIN_NEW : from);
    navigate(destination, { replace: true });
  };

  // Shared by the initial submit and the account-type dialog's resubmission — an email can
  // now resolve to a User, an Employee, both (requiresUserTypeSelection), or neither (404).
  const attemptLogin = async (email, password, loginType) => {
    const res = await authApi.login(email, password, loginType);
    if (res.requiresUserTypeSelection) {
      setAccountTypePrompt({ message: res.message, accountTypes: res.accountTypes, email, password });
      return;
    }
    completeLogin(res.data);
  };

  const onSubmit = async (values) => {
    setIsLoading(true);
    try {
      await attemptLogin(values.email, values.password);
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

  // Closes the account-type dialog and clears the in-memory password (never persisted) so a
  // cancelled/defensively-aborted second attempt always lands back on a clean login form.
  const closeAccountTypePrompt = () => {
    setAccountTypePrompt(null);
    form.setValue('password', '');
  };

  const handleAccountTypeSelect = async (type) => {
    if (!accountTypePrompt) return;
    try {
      await attemptLogin(accountTypePrompt.email, accountTypePrompt.password, type);
      setAccountTypePrompt(null);
    } catch (err) {
      showError(extractApiError(err));
      // 401 here shouldn't normally happen — the password already matched both accounts
      // server-side — but defensively bail back to the plain login form rather than leaving
      // a now-stale dialog open. Any other error (403 inactive, network, 5xx) leaves the
      // dialog open so the user can retry or pick the other account type.
      if (err?.response?.status === 401) closeAccountTypePrompt();
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

      <AccountTypeDialog
        open={!!accountTypePrompt}
        onOpenChange={(open) => !open && closeAccountTypePrompt()}
        message={accountTypePrompt?.message}
        accountTypes={accountTypePrompt?.accountTypes}
        onSelect={handleAccountTypeSelect}
      />
    </motion.div>
  );
};

export default Login;
