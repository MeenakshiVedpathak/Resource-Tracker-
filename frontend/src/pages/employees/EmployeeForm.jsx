import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useEmployee, useCreateEmployee, useUpdateEmployee } from '@/hooks/useEmployees';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { ROUTES } from '@/constants/routes';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';
import { cn } from '@/utils/cn';

const employeeSchema = z.object({
  employee_code: z.string().min(2, 'Must be at least 2 characters').max(20).regex(/^[A-Z0-9_-]+$/).transform((v) => v.toUpperCase()),
  full_name: z.string().min(2, 'Must be at least 2 characters').max(100),
  email_id: z.string().min(1, 'Email ID is required').email('Invalid email address'),
  designation: z.string().max(100).optional().or(z.literal('')),
  total_experience: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().min(0).max(60).nullable().optional()),
  company_experience: z.preprocess((v) => (v === '' || v == null ? null : Number(v)), z.number().min(0).max(60).nullable().optional()),
  resource_description: z.string().max(2000).optional().or(z.literal('')),
  date_of_joining: z.string().min(1, 'Date of joining is required'),
  date_of_leaving: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).default('active'),
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
  const createMutation = useCreateEmployee();
  const updateMutation = useUpdateEmployee(id);

  const form = useForm({
    resolver: zodResolver(employeeSchema),
    defaultValues: {
      employee_code: '',
      full_name: '',
      email_id: '',
      designation: '',
      total_experience: '',
      company_experience: '',
      resource_description: '',
      date_of_joining: '',
      date_of_leaving: '',
      status: 'active',
    },
  });

  const dateOfJoining = useWatch({ control: form.control, name: 'date_of_joining' });
  const formStatus = useWatch({ control: form.control, name: 'status' });

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
        email_id: employee.email_id ?? '',
        designation: employee.designation ?? '',
        total_experience: employee.total_experience ?? '',
        company_experience: employee.company_experience ?? '',
        resource_description: employee.resource_description ?? '',
        date_of_joining: employee.date_of_joining?.split('T')[0] ?? '',
        date_of_leaving: employee.date_of_leaving?.split('T')[0] ?? '',
        status: employee.status ?? 'active',
      });
    }
  }, [employee, isEdit, form]);

  const onSubmit = async (values) => {
    const clean = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== '' && v != null)
    );

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
      <SheetContent side="right" className="w-full sm:max-w-4xl p-0 flex flex-col bg-white overflow-hidden">
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
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-foreground border-b pb-1">Identity</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
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
                      name="email_id"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] text-muted-foreground font-medium"><span className="text-destructive mr-0.5">*</span> Email ID</FormLabel>
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

                {/* Experience Group */}
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-foreground border-b pb-1">Experience &amp; Employment</h3>
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
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-foreground border-b pb-1">Additional Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-[1fr_auto] gap-4 items-start">
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
