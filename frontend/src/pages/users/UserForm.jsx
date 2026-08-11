import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { useUser, useCreateUser, useUpdateUser } from '@/hooks/useUsers';
import { useRoles } from '@/hooks/useRoles';
import { useActiveEmployees } from '@/hooks/useEmployees';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { ROUTES } from '@/constants/routes';
import { isProtectedAccount } from '@/constants/protectedAccounts';
import { getAssignableRoleNames, ADDITIONAL_ROLE_NAMES, SENIOR_ROLE_NAMES } from '@/constants/roleHierarchy';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MultiSelect } from '@/components/ui/multi-select';
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter } from '@/components/ui/sheet';
import { cn } from '@/utils/cn';

const roleIdsField = z.array(z.coerce.number()).min(1, 'Select at least one role');

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
    role_ids: roleIdsField,
    employee_id: z.coerce.number().positive().optional().nullable(),
    status: z.enum(['active', 'inactive']).default('active'),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

const editSchema = z.object({
  email: z.string().email('Enter a valid email address'),
  role_ids: roleIdsField,
  employee_id: z.coerce.number().positive().optional().nullable(),
  status: z.enum(['active', 'inactive']).default('active'),
});

// The backend still wants role_ids ordered as [primary, ...additional] (§4/§9) even though the
// UI is just one flat "Roles" picker — this reconstructs that order without asking the user to
// think about "primary" at all. A senior tier (if selected) always leads; otherwise the most
// senior selected role the actor is actually permitted to assign becomes the leader. Returns
// null if no selected role is one the actor's Role Creation Matrix allows as a leader at all.
const orderRoleIds = (selectedRoles, assignableNames) => {
  const senior = selectedRoles.find((r) => SENIOR_ROLE_NAMES.includes(r.role_name));
  const leader = senior ?? [...selectedRoles]
    .sort((a, b) => (a.hierarchy_rank ?? 99) - (b.hierarchy_rank ?? 99))
    .find((r) => assignableNames.includes(r.role_name));
  if (!leader) return null;
  return [leader.id, ...selectedRoles.filter((r) => r.id !== leader.id).map((r) => r.id)];
};

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
  const { role: actorRoleName } = useAuth();

  const { data: user, isPending: isLoadingUser } = useUser(id);
  const createMutation = useCreateUser();
  const updateMutation = useUpdateUser(id);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Direct-URL/row-click safety net — the Edit action is already hidden in UserList for this
  // account, but nothing stops someone navigating to /users/:id/edit by hand.
  useEffect(() => {
    if (isEdit && user && isProtectedAccount(user)) {
      showError('This account is protected and cannot be edited.');
      navigate(ROUTES.USERS, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, user]);

  const { data: rolesData } = useRoles({ status: 'active', limit: 100 });
  const { data: activeEmployees, isSuccess: employeesReady } = useActiveEmployees();

  const allRoles = rolesData?.data ?? [];
  const employees = activeEmployees ?? [];

  // The Role Creation Matrix (§0, expanded for BU Admin) plus every operational role that's
  // always eligible as an additional role (§4) — the union of everything the actor could
  // validly use in some combination. What actually becomes the "leader" of role_ids is worked
  // out on submit (orderRoleIds), never surfaced as a separate field in this UI.
  const assignableNames = getAssignableRoleNames(actorRoleName);
  const roleOptions = allRoles
    .filter((r) => assignableNames.includes(r.role_name) || ADDITIONAL_ROLE_NAMES.includes(r.role_name))
    .map((r) => ({ label: r.role_name, value: String(r.id) }));

  const form = useForm({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: {
      email: '',
      password: '',
      confirmPassword: '',
      role_ids: [],
      employee_id: null,
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

      const primaryId = user.role_id ?? user.role?.id;
      form.reset({
        email: user.email ?? '',
        role_ids: [primaryId, ...(user.additionalRoles ?? []).map((r) => r.id)].filter(Boolean),
        employee_id: user.employee_id ?? user.employee?.id ?? null,
        status: user.status ?? 'active',
      });
    }
  }, [user, isEdit, form, employeesReady]);

  const onSubmit = (values) => {
    const { confirmPassword, role_ids, ...rest } = values;
    const selectedRoles = role_ids.map((rid) => allRoles.find((r) => r.id === Number(rid))).filter(Boolean);
    const ordered = orderRoleIds(selectedRoles, assignableNames);
    if (!ordered) {
      showError(
        assignableNames.length
          ? `Select at least one role you're permitted to assign: ${assignableNames.join(', ')}.`
          : `Your role (${actorRoleName ?? '—'}) is not permitted to assign any role here.`
      );
      return;
    }
    const payload = { ...rest, role_ids: ordered };

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

                {/* Role — a user can hold multiple roles at once (§4/§9). Which one ends up
                    "primary" for hierarchy/scoping purposes is worked out automatically on
                    save (a senior tier always leads; otherwise no such concept is exposed
                    here — just pick every role this account should have). */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-foreground border-b pb-1">Role</h3>
                  <FormField
                    control={form.control}
                    name="role_ids"
                    render={({ field }) => (
                      <FormItem className="space-y-1">
                        <FormLabel className="text-[11px] text-muted-foreground font-medium"><span className="text-destructive mr-0.5">*</span> Roles</FormLabel>
                        <MultiSelect
                          options={roleOptions}
                          value={(field.value ?? []).map(String)}
                          onValueChange={(vals) => {
                            const numeric = vals.map(Number);
                            const seniorSelected = numeric.filter((rid) => {
                              const r = allRoles.find((x) => x.id === rid);
                              return r && SENIOR_ROLE_NAMES.includes(r.role_name);
                            });
                            if (seniorSelected.length > 1) {
                              // At most one senior tier (Platform Admin/Admin/Entity
                              // Admin/BU Admin) at a time — keep only the one just picked.
                              const prevIds = new Set((field.value ?? []).map(Number));
                              const newest = seniorSelected.find((rid) => !prevIds.has(rid)) ?? seniorSelected.at(-1);
                              field.onChange(numeric.filter((rid) => !seniorSelected.includes(rid) || rid === newest));
                            } else {
                              field.onChange(numeric);
                            }
                          }}
                          placeholder="Select roles…"
                          searchPlaceholder="Search roles…"
                          className="h-8 text-sm border-gray-200"
                        />
                        <FormMessage className="text-[10px]" />
                      </FormItem>
                    )}
                  />
                  {roleOptions.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Your role ({actorRoleName ?? '—'}) is not permitted to assign any role here.
                    </p>
                  )}
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
                              <div className="relative">
                                <Input
                                  type={showPassword ? 'text' : 'password'}
                                  placeholder="Min 8 chars, upper, lower, digit, special"
                                  autoComplete="new-password"
                                  className="h-8 text-sm border-gray-200 pr-9"
                                  {...field}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword((v) => !v)}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                  tabIndex={-1}
                                >
                                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                              </div>
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
                              <div className="relative">
                                <Input
                                  type={showConfirmPassword ? 'text' : 'password'}
                                  placeholder="Repeat password"
                                  autoComplete="new-password"
                                  className="h-8 text-sm border-gray-200 pr-9"
                                  {...field}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowConfirmPassword((v) => !v)}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                  tabIndex={-1}
                                >
                                  {showConfirmPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                              </div>
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
