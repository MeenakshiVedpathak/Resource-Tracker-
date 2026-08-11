import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEmployee, useCreateEmployee, useUpdateEmployee } from '@/hooks/useEmployees';
import { useAssignableManagers } from '@/hooks/useUsers';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { passwordSchema } from '@/utils/validators';
import { ROUTES } from '@/constants/routes';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Switch } from '@/components/ui/switch';
import { SearchableSelect } from '@/components/ui/searchable-select';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';
import TemporaryPasswordDialog from '@/components/employees/TemporaryPasswordDialog';
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

// Create allows an optional Primary Manager and an optional password (omit -> backend/mock
// auto-generates and returns a one-time temporaryPassword, §3.1).
const createSchema = z.object({
  ...baseFields,
  primary_manager_user_id: z.coerce.number().positive().optional().nullable(),
  password: passwordSchema.optional().or(z.literal('')),
});

// Manager reassignment is optional on update (§3.2) — password is never editable here, but
// email can be corrected/backfilled (e.g. an employee record with no linked user account yet).
const editSchema = z.object({
  ...baseFields,
  primary_manager_user_id: z.coerce.number().positive().optional().nullable(),
});

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

  const { data: employee, isPending: isLoadingEmployee } = useEmployee(id);
  const { data: managers = [], isPending: isLoadingManagers } = useAssignableManagers();
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee(id);
  const [temporaryCredential, setTemporaryCredential] = useState(null);

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
      password: '',
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
    const { password, secondary_manager_user_id, primary_manager_user_id, email, ...rest } = values;
    const clean = Object.fromEntries(
      Object.entries(rest).filter(([, v]) => v !== '' && v != null)
    );

    clean.email = email;
    if (!isEdit && password) clean.password = password;
    if (primary_manager_user_id) {
      clean.primary_manager_user_id = primary_manager_user_id;
    }
    // Always sent explicitly (even null) so clearing the Secondary Manager on update actually
    // reaches the backend/mock — the blanket filter above would otherwise drop a `null`.
    clean.secondary_manager_user_id = secondary_manager_user_id ?? null;

    const mutation = isEdit ? updateMutation : createMutation;
    mutation.mutate(clean, {
      onSuccess: (res) => {
        const temporaryPassword = res?.data?.temporaryPassword;
        if (!isEdit && temporaryPassword) {
          setTemporaryCredential({ email, password: temporaryPassword });
        } else {
          success(isEdit ? 'Employee updated successfully.' : 'Employee created successfully.');
          handleClose();
        }
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  const handleClose = () => {
    navigate(ROUTES.EMPLOYEES);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={true} onOpenChange={(open) => !open && !temporaryCredential && handleClose()}>
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
                  <div className="grid grid-cols-1 sm:grid-cols-3 lg:grid-cols-5 gap-4">
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

                    {!isEdit && (
                      <FormField
                        control={form.control}
                        name="password"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[11px] text-muted-foreground font-medium">Password</FormLabel>
                            <FormControl>
                              <Input
                                type="text"
                                placeholder="Leave blank to auto-generate"
                                autoComplete="new-password"
                                {...field}
                                className="h-8 text-sm border-gray-200"
                              />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
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

      <TemporaryPasswordDialog
        open={!!temporaryCredential}
        onOpenChange={(open) => {
          if (!open) {
            setTemporaryCredential(null);
            success('Employee created successfully.');
            handleClose();
          }
        }}
        email={temporaryCredential?.email}
        password={temporaryCredential?.password}
      />
    </Sheet>
  );
};

export default EmployeeForm;
