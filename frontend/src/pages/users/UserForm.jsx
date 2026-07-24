import { useEffect, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, Controller, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { ArrowLeft, Save } from 'lucide-react';
import { useUser, useCreateUser, useUpdateUser } from '@/hooks/useUsers';
import { useRoles } from '@/hooks/useRoles';
import { useActiveEmployees } from '@/hooks/useEmployees';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { ROUTES } from '@/constants/routes';
import { isProtectedAccount } from '@/constants/protectedAccounts';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Badge } from '@/components/ui/badge';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { cn } from '@/utils/cn';

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
  <div className="space-y-4 p-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="space-y-2 h-14 bg-muted animate-pulse rounded-md" />
    ))}
  </div>
);

const UserForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { success, error: showError } = useNotification();

  const { data: user, isPending: isLoadingUser } = useUser(id);
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser(id);

  // Direct-URL/row-click safety net — the Edit action is already hidden in UserList for this
  // account, but nothing stops someone navigating to /users/:id/edit by hand.
  useEffect(() => {
    if (isEdit && user && isProtectedAccount(user.email)) {
      showError('This account is protected and cannot be edited.');
      navigate(ROUTES.USERS, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, user]);

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

  const formStatus = useWatch({ control: form.control, name: 'status' });

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
        handleClose();
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  const handleClose = () => {
    navigate(ROUTES.USERS);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={true} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col bg-white overflow-hidden">
        <SheetHeader className="px-5 py-3 border-b">
          <SheetTitle className="text-base font-medium text-left">{isEdit ? 'Edit User' : 'Add New User'}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {isEdit && isLoadingUser ? (
            <FormSkeleton />
          ) : (
            <Form {...form}>
              <form id="user-form" onSubmit={form.handleSubmit(onSubmit)} className="p-5 flex flex-col gap-5">
                
                {/* Account Details */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-foreground border-b pb-1">Account Details</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] text-muted-foreground font-medium"><span className="text-destructive mr-0.5">*</span> Email</FormLabel>
                          <FormControl>
                            <Input type="email" placeholder="user@example.com" className="h-8 text-sm border-gray-200" {...field} />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="employee_id"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] text-muted-foreground font-medium">Linked Employee</FormLabel>
                          <SearchableSelect
                            options={[
                              { label: "None", value: "none" },
                              ...employees.map(e => ({
                                label: e.full_name,
                                value: String(e.id)
                              }))
                            ]}
                            value={field.value != null && field.value !== '' ? String(field.value) : 'none'}
                            onValueChange={(v) => field.onChange(v === 'none' ? null : Number(v))}
                            placeholder="Select Employee"
                            searchPlaceholder="Search employee..."
                            className="h-8 text-sm border-gray-200"
                          />
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Roles */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-foreground border-b pb-1">
                    Roles <span className="text-destructive mr-0.5">*</span>
                  </h3>
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
                                className="flex cursor-pointer items-center gap-3 rounded border px-3 py-2 transition-colors hover:bg-accent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
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
                          <p className="text-[10px] text-destructive">{fieldState.error.message}</p>
                        )}
                        {field.value.length > 0 && (
                          <p className="text-[10px] text-muted-foreground mt-1">
                            {field.value.length} role{field.value.length > 1 ? 's' : ''} selected
                          </p>
                        )}
                      </div>
                    )}
                  />
                </div>

                {/* Password — create mode only */}
                {!isEdit && (
                  <div className="space-y-2">
                    <h3 className="text-xs font-semibold text-foreground border-b pb-1">Password</h3>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[11px] text-muted-foreground font-medium"><span className="text-destructive mr-0.5">*</span> Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Min 8 chars, upper, lower, digit, special" className="h-8 text-sm border-gray-200" {...field} />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                      <FormField
                        control={form.control}
                        name="confirmPassword"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[11px] text-muted-foreground font-medium"><span className="text-destructive mr-0.5">*</span> Confirm Password</FormLabel>
                            <FormControl>
                              <Input type="password" placeholder="Repeat password" className="h-8 text-sm border-gray-200" {...field} />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                )}

                {/* Additional Details */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-foreground border-b pb-1">Additional Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem className="space-y-1 flex flex-col justify-center h-full pt-2">
                          <FormLabel className="text-[11px] text-muted-foreground font-medium mb-1">Status</FormLabel>
                          <FormControl>
                            <button
                              type="button"
                              onClick={() => field.onChange(formStatus === 'active' ? 'inactive' : 'active')}
                              className={cn(
                                "flex items-center justify-between gap-1.5 rounded-full px-2 py-1 w-[72px] transition-all duration-300 focus:outline-none",
                                formStatus === 'active' ? "bg-blue-500 text-white flex-row" : "bg-slate-300 text-slate-700 flex-row-reverse"
                              )}
                            >
                              <span className="text-[11px] font-medium leading-none px-0.5">{formStatus === 'active' ? 'Active' : 'Inactive'}</span>
                              <div className="h-3 w-3 shrink-0 rounded-full bg-white shadow-sm" />
                            </button>
                          </FormControl>
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

              </form>
            </Form>
          )}
        </div>

        <SheetFooter className="px-5 py-3 border-t mt-auto flex-row justify-end gap-3 items-center bg-white">
          <Button type="button" variant="outline" className="border-gray-200 h-8 text-sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form="user-form" className="bg-blue-600 hover:bg-blue-700 h-8 text-sm" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save & Close'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default UserForm;
