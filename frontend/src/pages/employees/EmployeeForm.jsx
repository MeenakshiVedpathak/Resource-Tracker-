import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Eye, EyeOff } from 'lucide-react';
import { useEmployee, useCreateEmployee, useUpdateEmployee } from '@/hooks/useEmployees';
import { useAssignableManagers } from '@/hooks/useUsers';
import { useRoles } from '@/hooks/useRoles';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { passwordSchema } from '@/utils/validators';
import { ROUTES } from '@/constants/routes';
import { isProtectedAccount } from '@/constants/protectedAccounts';
import { getAssignableRoleNames, ADDITIONAL_ROLE_NAMES, SENIOR_ROLE_NAMES, ROLE_NAMES } from '@/constants/roleHierarchy';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { MultiSelect } from '@/components/ui/multi-select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';
import { cn } from '@/utils/cn';

const baseFields = {
  employee_code: z.string().min(2, 'Must be at least 2 characters').max(20).regex(/^[A-Z0-9_-]+$/).transform((v) => v.toUpperCase()),
  full_name: z.string().min(2, 'Must be at least 2 characters').max(100),
  email: z.string().min(1, 'Email is required').email('Invalid email address'),
  designation: z.string().max(100).optional().or(z.literal('')),
  total_experience: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().min(0).max(60).nullable().optional()),
  company_experience: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().min(0).max(60).nullable().optional()),
  resource_description: z.string().max(2000).optional().or(z.literal('')),
  date_of_joining: z.string().min(1, 'Date of joining is required'),
  date_of_leaving: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).default('active'),
  secondary_manager_user_id: z.coerce.number().positive().optional().nullable(),
  is_timesheet_approval_required: z.boolean(),
};

const roleIdsField = z.array(z.coerce.number()).min(1, 'Select at least one role');

const passwordField = passwordSchema
  .regex(/[A-Z]/, 'Must contain at least one uppercase letter')
  .regex(/[a-z]/, 'Must contain at least one lowercase letter')
  .regex(/[0-9]/, 'Must contain at least one digit')
  .regex(/[^A-Za-z0-9]/, 'Must contain at least one special character');

// Create requires a Role and a Password (this is now the only place a login gets created —
// former User Master's Account Details/Role sections, merged in) — Primary Manager stays optional.
const createSchema = z
  .object({
    ...baseFields,
    primary_manager_user_id: z.coerce.number().positive().optional().nullable(),
    role_ids: roleIdsField,
    password: passwordField,
    confirmPassword: z.string(),
  })
  .refine((d) => d.password === d.confirmPassword, {
    message: 'Passwords do not match',
    path: ['confirmPassword'],
  });

// Manager reassignment is optional on update (§3.2) — password is never editable here (use the
// Employee List's Reset Password action instead), but Role can be changed and email can be
// corrected/backfilled (e.g. an employee record with no linked user account yet).
const editSchema = z.object({
  ...baseFields,
  primary_manager_user_id: z.coerce.number().positive().optional().nullable(),
  role_ids: roleIdsField,
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
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="space-y-2 h-14 bg-muted animate-pulse rounded-md" />
    ))}
  </div>
);

const EmployeeForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { success, error: showError } = useNotification();
  const { role: actorRoleName } = useAuth();

  const { data: employee, isPending: isLoadingEmployee } = useEmployee(id);
  const { data: managers = [], isPending: isLoadingManagers } = useAssignableManagers();
  const { data: rolesData } = useRoles({ status: 'active', limit: 100 });
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee(id);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  // Direct-URL/row-click safety net — the Edit action is already hidden in EmployeeList for this
  // account, but nothing stops someone navigating to /employees/:id/edit by hand.
  useEffect(() => {
    if (isEdit && employee && isProtectedAccount(employee)) {
      showError('This account is protected and cannot be edited.');
      navigate(ROUTES.EMPLOYEES, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, employee]);

  const allRoles = rolesData?.data ?? [];

  // The Role Creation Matrix (§0, expanded for BU Admin) plus every operational role that's
  // always eligible as an additional role (§4) — the union of everything the actor could
  // validly use in some combination. What actually becomes the "leader" of role_ids is worked
  // out on submit (orderRoleIds), never surfaced as a separate field in this UI.
  //
  // Employee Master always allows assigning the plain Employee role regardless of the actor's
  // tier, even though the matrix's HR entry is empty — HR is the primary actor here, and per the
  // matrix's own comment ("HR creates Employee via the dedicated Employee-creation flow, not the
  // generic Users screen") that was always a deliberate bypass, previously baked into the old
  // Employee form hardcoding role_id to Employee with no picker at all. Every role beyond plain
  // Employee still goes through the actor's real Role Creation Matrix.
  const assignableNames = [...new Set([...getAssignableRoleNames(actorRoleName), ROLE_NAMES.EMPLOYEE])];
  const roleOptions = allRoles
    .filter((r) => assignableNames.includes(r.role_name) || ADDITIONAL_ROLE_NAMES.includes(r.role_name))
    .map((r) => ({ label: r.role_name, value: String(r.id) }));

  const form = useForm({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: {
      employee_code: '',
      full_name: '',
      email: '',
      designation: '',
      total_experience: '',
      company_experience: '',
      resource_description: '',
      date_of_joining: '',
      date_of_leaving: '',
      status: 'active',
      role_ids: [],
      password: 'Gtt@1234',
      confirmPassword: 'Gtt@1234',
      primary_manager_user_id: null,
      secondary_manager_user_id: null,
      // No backend value exists yet for a brand-new employee, so this just seeds the toggle in
      // its recommended starting position — every other case (loading an existing employee)
      // always uses the value the API actually returned, never this default.
      is_timesheet_approval_required: true,
    },
  });

  const dateOfJoining = useWatch({ control: form.control, name: 'date_of_joining' });
  const formStatus = useWatch({ control: form.control, name: 'status' });
  const primaryManagerId = useWatch({ control: form.control, name: 'primary_manager_user_id' });
  const timesheetApprovalRequired = useWatch({ control: form.control, name: 'is_timesheet_approval_required' });

  const managerOptions = managers.map((m) => ({
    label: m.employee?.full_name ?? m.email,
    value: String(m.id),
  }));
  const secondaryManagerOptions = [
    { label: 'None', value: 'none' },
    ...managerOptions.filter((o) => o.value !== String(primaryManagerId)),
  ];

  useEffect(() => {
    if (!dateOfJoining) {
      form.setValue('company_experience', '');
      return;
    }
    const start = new Date(dateOfJoining);
    if (isNaN(start.getTime())) return;
    const diffMs = Date.now() - start.getTime();
    const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
    form.setValue('company_experience', Math.max(0, parseFloat(years.toFixed(1))));
  }, [dateOfJoining, form]);

  // Employee is the common case for this form (§ role bypass above), so pre-select it on create
  // instead of making every submission start from an empty Roles picker — the admin can still
  // swap/add roles before saving. Runs once roles are loaded and only if nothing's selected yet,
  // so it never clobbers a role the admin already picked.
  useEffect(() => {
    if (isEdit || !allRoles.length || form.getValues('role_ids').length) return;
    const employeeRole = allRoles.find((r) => r.role_name === ROLE_NAMES.EMPLOYEE);
    if (employeeRole) form.setValue('role_ids', [employeeRole.id]);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isEdit, rolesData, form]);

  useEffect(() => {
    if (employee && isEdit) {
      form.reset({
        employee_code: employee.employee_code ?? '',
        full_name: employee.full_name ?? '',
        email: employee.email ?? '',
        designation: employee.designation ?? '',
        total_experience: employee.total_experience ?? '',
        company_experience: employee.company_experience ?? '',
        resource_description: employee.resource_description ?? '',
        date_of_joining: employee.date_of_joining?.split('T')[0] ?? '',
        date_of_leaving: employee.date_of_leaving?.split('T')[0] ?? '',
        status: employee.status ?? 'active',
        role_ids: [employee.role_id ?? employee.role?.id, ...(employee.additionalRoles ?? []).map((r) => r.id)].filter(Boolean),
        primary_manager_user_id: employee.primary_manager_user_id ?? null,
        secondary_manager_user_id: employee.secondary_manager_user_id ?? null,
        // Straight from the API response — never assumed. `?? true` only covers an employee
        // record that predates this field entirely (backend returns null/undefined for it),
        // not a real ON/OFF answer.
        is_timesheet_approval_required: employee.is_timesheet_approval_required ?? true,
      });
    }
  }, [employee, isEdit, form]);

  const onSubmit = async (values) => {
    const { password, confirmPassword, secondary_manager_user_id, primary_manager_user_id, email, role_ids, ...rest } = values;

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

    const clean = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== '' && v != null)
    );

    clean.email = email;
    clean.role_ids = ordered;
    if (!isEdit) clean.password = password;
    if (primary_manager_user_id) {
      clean.primary_manager_user_id = primary_manager_user_id;
    }
    // Always sent explicitly (even null) so clearing the Secondary Manager on update actually
    // reaches the backend/mock — the blanket filter above would otherwise drop a `null`.
    clean.secondary_manager_user_id = secondary_manager_user_id ?? null;

    const mutation = isEdit ? updateMutation : createMutation;
    mutation.mutate(clean, {
      onSuccess: () => {
        success(isEdit ? 'Employee updated successfully.' : 'Employee created successfully.');
        handleClose();
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  const handleClose = () => {
    navigate(ROUTES.EMPLOYEES);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={true} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-6xl p-0 flex flex-col bg-white overflow-hidden">
        <SheetHeader className="px-5 py-3 border-b">
          <SheetTitle className="text-base font-medium text-left">{isEdit ? 'Edit Employee' : 'Add New Employee'}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {isEdit && isLoadingEmployee ? (
            <FormSkeleton />
          ) : (
            <Form {...form}>
              <form id="employee-form" onSubmit={form.handleSubmit(onSubmit)} className="p-5 flex flex-col gap-4">

                {/* Identity Group */}
                <div className="rounded-lg border border-gray-200 bg-slate-50/60 p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide border-b border-gray-200 pb-2">Identity</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="employee_code"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] text-muted-foreground font-medium"><span className="text-destructive mr-0.5">*</span> Employee ID</FormLabel>
                          <FormControl>
                            <Input
                              placeholder="e.g. EMP-001"
                              {...field}
                              onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                              disabled={isEdit}
                              className="h-8 text-sm border-gray-200"
                            />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="full_name"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] text-muted-foreground font-medium"><span className="text-destructive mr-0.5">*</span> Full Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. John Smith" {...field} className="h-8 text-sm border-gray-200" />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="email"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] text-muted-foreground font-medium"><span className="text-destructive mr-0.5">*</span> Email</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. john@example.com" type="email" {...field} className="h-8 text-sm border-gray-200" />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="designation"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] text-muted-foreground font-medium">Designation</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Senior Engineer" {...field} className="h-8 text-sm border-gray-200" />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />

                  </div>
                </div>

                {/* Account & Role Group — merged in from the retired User Master (role
                    assignment, password) since every Employee now IS the login account. */}
                <div className="rounded-lg border border-gray-200 bg-slate-50/60 p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide border-b border-gray-200 pb-2">Account &amp; Role</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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

                    {!isEdit && (
                      <>
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
                      </>
                    )}
                  </div>
                  {roleOptions.length === 0 && (
                    <p className="text-[11px] text-muted-foreground">
                      Your role ({actorRoleName ?? '—'}) is not permitted to assign any role here.
                    </p>
                  )}
                </div>

                {/* Reporting Group */}
                <div className="rounded-lg border border-gray-200 bg-slate-50/60 p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide border-b border-gray-200 pb-2">Reporting</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <FormField
                      control={form.control}
                      name="primary_manager_user_id"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] text-muted-foreground font-medium">Primary Manager</FormLabel>
                          <SearchableSelect
                            options={managerOptions}
                            value={field.value != null ? String(field.value) : ''}
                            onValueChange={(v) => field.onChange(v ? Number(v) : null)}
                            disabled={isLoadingManagers}
                            placeholder="Select manager"
                            searchPlaceholder="Search managers…"
                            className="h-8 text-sm border-gray-200"
                          />
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="secondary_manager_user_id"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] text-muted-foreground font-medium">Secondary Manager</FormLabel>
                          <SearchableSelect
                            options={secondaryManagerOptions}
                            value={field.value != null ? String(field.value) : 'none'}
                            onValueChange={(v) => field.onChange(v === 'none' ? null : Number(v))}
                            disabled={isLoadingManagers}
                            placeholder="Select manager"
                            searchPlaceholder="Search managers…"
                            className="h-8 text-sm border-gray-200"
                          />
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Experience Group */}
                <div className="rounded-lg border border-gray-200 bg-slate-50/60 p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide border-b border-gray-200 pb-2">Experience &amp; Employment</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                    <FormField
                      control={form.control}
                      name="date_of_joining"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] text-muted-foreground font-medium"><span className="text-destructive mr-0.5">*</span> Date of Joining</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} className="h-8 text-sm border-gray-200" />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="date_of_leaving"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] text-muted-foreground font-medium">Date of Leaving</FormLabel>
                          <FormControl>
                            <Input type="date" {...field} className="h-8 text-sm border-gray-200" />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="total_experience"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] text-muted-foreground font-medium">Total Experience (yrs)</FormLabel>
                          <FormControl>
                            <Input type="number" step="0.1" min="0" max="60" placeholder="e.g. 7.5" {...field} className="h-8 text-sm border-gray-200" />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="company_experience"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] text-muted-foreground font-medium">Company Exp. (yrs)</FormLabel>
                          <FormControl>
                            <Input
                              type="number"
                              step="0.1"
                              placeholder="Auto-calculated"
                              readOnly
                              tabIndex={-1}
                              className="h-8 text-sm bg-muted cursor-not-allowed border-gray-200"
                              {...field}
                              value={field.value ?? ''}
                            />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                  </div>
                </div>

                {/* Additional Group */}
                <div className="rounded-lg border border-gray-200 bg-slate-50/60 p-4 space-y-3">
                  <h3 className="text-xs font-semibold text-foreground uppercase tracking-wide border-b border-gray-200 pb-2">Additional Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto_auto] gap-4 items-start">
                    <FormField
                      control={form.control}
                      name="resource_description"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] text-muted-foreground font-medium">Resource Description</FormLabel>
                          <FormControl>
                            <Textarea
                              placeholder="Skills, certifications, and project experience…"
                              className="h-12 min-h-0 text-sm resize-none border-gray-200"
                              {...field}
                            />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="is_timesheet_approval_required"
                      render={({ field }) => (
                        <FormItem className="space-y-1 flex flex-col justify-center h-full pt-4 max-w-[220px]">
                          <FormLabel className="text-[11px] text-muted-foreground font-medium mb-1">Timesheet Approval Required</FormLabel>
                          <FormControl>
                            <div className="flex items-center gap-2">
                              <Switch checked={field.value} onCheckedChange={field.onChange} />
                              <span className="text-[11px] font-medium">{timesheetApprovalRequired ? 'ON' : 'OFF'}</span>
                            </div>
                          </FormControl>
                          {/* <p className="text-[10px] text-muted-foreground leading-snug">
                            Turn on if this employee's timesheets require manager approval.
                          </p> */}
                        </FormItem>
                      )}
                    />

                    <FormField
                      control={form.control}
                      name="status"
                      render={({ field }) => (
                        <FormItem className="space-y-1 flex flex-col justify-center h-full pt-4">
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
          <Button type="submit" form="employee-form" className="bg-blue-600 hover:bg-blue-700 h-8 text-sm" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save & Close'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default EmployeeForm;
