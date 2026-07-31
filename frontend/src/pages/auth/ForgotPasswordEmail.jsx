import { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowLeft, Mail } from 'lucide-react';
import { authApi } from '@/api/auth.api';
import { useForgotPassword } from '@/contexts/ForgotPasswordContext';
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

const emailStepSchema = z.object({ email: emailSchema });

// Screen 1 of the flow (route: /forgot-password). An email can resolve to a User, an
// Employee, both (requiresUserTypeSelection), or neither (404).
const ForgotPasswordEmail = () => {
  const navigate = useNavigate();
  const { startOtpFlow } = useForgotPassword();
  const { error: showError } = useNotification();
  const [isLoading, setIsLoading] = useState(false);
  const [accountTypePrompt, setAccountTypePrompt] = useState(null);

  const form = useForm({ resolver: zodResolver(emailStepSchema), defaultValues: { email: '' } });

  // The resolved `loginType` comes from THIS call's response, never from a local variable —
  // that response is the single source of truth per the API contract.
  // ⚠️ Read defensively: the contract says this response is flat (no `data` key), but if the
  // real backend actually nests it under `data` instead, `res.loginType` alone would silently
  // be undefined and strand the OTP screen with no loginType — check both shapes.
  const attemptForgotPassword = async (email, loginType) => {
    const res = await authApi.forgotPassword(email, loginType);
    if (res.requiresUserTypeSelection) {
      setAccountTypePrompt({ message: res.message, accountTypes: res.accountTypes, email });
      return;
    }
    const resolvedLoginType = res.loginType ?? res.data?.loginType ?? null;
    startOtpFlow(email, resolvedLoginType);
    navigate(ROUTES.FORGOT_PASSWORD_OTP);
  };

  const onSubmit = async ({ email }) => {
    setIsLoading(true);
    try {
      await attemptForgotPassword(email);
    } catch (err) {
      const status = err?.response?.status;
      if (status === 404) {
        form.setError('email', { message: extractApiError(err) });
      } else if (status === 429) {
        // A legitimate "you already have one in flight" case, not a hard failure — the user
        // just waits and resubmits; we don't have a resolved loginType from a 429 to advance
        // to the OTP screen with, so stay here.
        showError(extractApiError(err));
      } else if (status === 422) {
        const { hasFieldErrors, leftover } = applyFieldErrors(err, form, ['email']);
        if (leftover.length) showError(leftover.join(' '));
        else if (!hasFieldErrors) showError(extractApiError(err));
      } else {
        showError(extractApiError(err));
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleAccountTypeSelect = async (type) => {
    if (!accountTypePrompt) return;
    try {
      await attemptForgotPassword(accountTypePrompt.email, type);
      setAccountTypePrompt(null);
    } catch (err) {
      showError(extractApiError(err));
      // Leave the dialog open — the user can retry or pick the other account type.
    }
  };

  return (
    <motion.div initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.3 }}>
      <div className="mb-8">
        <h2 className="text-2xl font-bold tracking-tight">Forgot password?</h2>
        <p className="mt-1.5 text-sm text-muted-foreground">
          Enter your email and we'll send you a one-time code to reset your password.
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
                  <Input type="email" placeholder="Enter your email" autoComplete="email" autoFocus {...field} />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />

          <Button type="submit" className="w-full mt-2" disabled={isLoading} size="lg">
            {isLoading ? (
              <span className="flex items-center gap-2">
                <span className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" />
                Sending…
              </span>
            ) : (
              <span className="flex items-center gap-2">
                <Mail className="h-4 w-4" />
                Send OTP
              </span>
            )}
          </Button>
        </form>
      </Form>

      <Link
        to={ROUTES.LOGIN}
        className="mt-6 flex items-center justify-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
      >
        <ArrowLeft className="h-3.5 w-3.5" />
        Back to Login
      </Link>

      <AccountTypeDialog
        open={!!accountTypePrompt}
        onOpenChange={(open) => !open && setAccountTypePrompt(null)}
        message={accountTypePrompt?.message}
        accountTypes={accountTypePrompt?.accountTypes}
        onSelect={handleAccountTypeSelect}
      />
    </motion.div>
  );
};

export default ForgotPasswordEmail;
