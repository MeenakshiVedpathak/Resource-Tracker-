import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';
import { useUser, useCreateUser, useUpdateUser } from '@/hooks/useUsers';
import { useRoles } from '@/hooks/useRoles';
import { useActiveEmployees } from '@/hooks/useEmployees';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { ROUTES } from '@/constants/routes';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Badge } from '@/components/ui/badge';
import PageHeader from '@/components/common/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';

const createSchema = z
  .object({
    email: z.string().email('Enter a valid email address'),
    password: z
      .string()
      .min(8, 'Password must be at least 8 characters')
      .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
      .regex(/[a-z]/, 'Must contain at least one lowercase letter')
      .regex(/[0-9]/, 'Must contain at least one digit')
      .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character'),
    confirmPassword: z.string(),
    role_ids: z.array(z.number()).min(1, 'Select at least one role'),
    employee_id: z.coerce.number().positive().optional().nullable(),
    status: z.enum(['active', 'inactive']).default('active'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const editSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  role_ids: z.array(z.number()).min(1, 'Select at least one role'),
  employee_id: z.coerce.number().positive().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
});

const FormSkeleton = () => (
  <Card>
    <CardContent className="p-6 space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </CardContent>
  </Card>
);

const UserForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { success, error: showError } = useNotification();

  const { data: user, isPending: isLoadingUser } = useUser(id);
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser(id);

  const { data: rolesData } = useRoles({ status: 'active', limit: 100 });
  const { data: activeEmployees, isSuccess: employeesReady } = useActiveEmployees();

  const roles = rolesData?.data ?? [];
  const employees = activeEmployees ?? [];

  const form = useForm({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      role_ids: [],
      employee_id: '',
      status: 'active',
    },
  });

  const didResetRef = useRef(false);

  useEffect(() => {
    // Wait for both user data AND employees list before resetting —
    // Radix Select can't resolve the display label for a value with no matching item,
    // so we must ensure options exist before setting the controlled value.
    if (user && isEdit && employeesReady && !didResetRef.current) {
      didResetRef.current = true;

      let ids = [];
      if (Array.isArray(user.roles)) {
        ids = user.roles.map((r) => r.id ?? r);
      } else if (Array.isArray(user.role_ids)) {
        ids = user.role_ids;
      } else if (user.role?.id) {
        ids = [user.role.id];
      } else if (user.role_id) {
        ids = [user.role_id];
      }

      form.reset({
        email: user.email ?? '',
        role_ids: ids,
        employee_id: user.employee_id ?? user.employee?.id ?? null,
        status: user.status ?? 'active',
      });
    }
  }, [user, isEdit, form, employeesReady]);

  const onSubmit = (values) => {
    const { confirmPassword, ...rest } = values;
    const payload = { ...rest };

    if (isEdit) {
      delete payload.password;
    } else {
      payload.confirm_password = confirmPassword;
    }

    if (!payload.employee_id) {
      delete payload.employee_id;
    }

    const mutation = isEdit ? updateMutation : createMutation;
    mutation.mutate(payload, {
      onSuccess: () => {
        success(isEdit ? 'User updated successfully.' : 'User created successfully.');
        navigate(ROUTES.USERS);
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isEdit && isLoadingUser) return <FormSkeleton />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <PageHeader
        title={isEdit ? 'Edit User' : 'Add User'}
        description={isEdit ? `Updating ${user?.email ?? ''}` : 'Create a new portal user account'}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.USERS)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Account Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Account Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="email"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2 lg:col-span-3">
                    <FormLabel>Email <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="email" placeholder="user@example.com" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Status</FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="employee_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Linked Employee</FormLabel>
                    <Select
                      value={field.value != null && field.value !== '' ? String(field.value) : 'none'}
                      onValueChange={(v) => field.onChange(v === 'none' ? null : Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="None" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="none">None</SelectItem>
                        {employees.map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>{e.full_name}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Roles */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">
                Roles <span className="text-destructive">*</span>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <Controller
                control={form.control}
                name="role_ids"
                render={({ field, fieldState }) => (
                  <div className="space-y-2">
                    <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                      {roles.map((role) => {
                        const checked = field.value.includes(role.id);
                        return (
                          <label
                            key={role.id}
                            className="flex cursor-pointer items-center gap-3 rounded-lg border px-4 py-3 transition-colors hover:bg-accent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                          >
                            <Checkbox
                              checked={checked}
                              onCheckedChange={(val) => {
                                if (val) {
                                  field.onChange([...field.value, role.id]);
                                } else {
                                  field.onChange(field.value.filter((id) => id !== role.id));
                                }
                              }}
                            />
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-medium leading-none">{role.role_name}</p>
                            </div>
                            {checked && (
                              <Badge variant="secondary" className="text-[10px] shrink-0">Selected</Badge>
                            )}
                          </label>
                        );
                      })}
                    </div>
                    {fieldState.error && (
                      <p className="text-sm text-destructive">{fieldState.error.message}</p>
                    )}
                    {field.value.length > 0 && (
                      <p className="text-xs text-muted-foreground mt-1">
                        {field.value.length} role{field.value.length > 1 ? 's' : ''} selected
                      </p>
                    )}
                  </div>
                )}
              />
            </CardContent>
          </Card>

          {/* Password — create mode only */}
          {!isEdit && (
            <Card>
              <CardHeader>
                <CardTitle className="text-sm">Password</CardTitle>
              </CardHeader>
              <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <FormField
                  control={form.control}
                  name="password"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Password <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Min 8 chars, upper, lower, digit, special" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                <FormField
                  control={form.control}
                  name="confirmPassword"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Confirm Password <span className="text-destructive">*</span></FormLabel>
                      <FormControl>
                        <Input type="password" placeholder="Repeat password" {...field} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              </CardContent>
            </Card>
          )}

          <div className="sticky bottom-0 z-10 -mx-6 flex items-center justify-end gap-3 border-t bg-background px-6 py-4">
            <Button type="button" variant="outline" onClick={() => navigate(ROUTES.USERS)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-1.5 h-4 w-4" />
              {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create User'}
            </Button>
          </div>
        </form>
      </Form>
    </motion.div>
  );
};

export default UserForm;
