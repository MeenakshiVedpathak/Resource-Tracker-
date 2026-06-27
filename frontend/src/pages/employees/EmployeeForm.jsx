import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';
import { useEmployee, useCreateEmployee, useUpdateEmployee } from '@/hooks/useEmployees';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { ROUTES } from '@/constants/routes';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/common/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';

const employeeSchema = z.object({
  employee_code: z
    .string()
    .min(2, 'Employee code must be at least 2 characters')
    .max(20, 'Employee code cannot exceed 20 characters')
    .regex(/^[A-Z0-9_-]+$/, 'Only uppercase letters, numbers, hyphens, and underscores are allowed')
    .transform((v) => v.toUpperCase()),
  full_name: z.string().min(2, 'Full name must be at least 2 characters').max(100),
  designation: z.string().max(100).optional().or(z.literal('')),
  total_experience: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().min(0, 'Must be 0 or more').max(60, 'Cannot exceed 60').nullable().optional()
  ),
  company_experience: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().min(0, 'Must be 0 or more').max(60, 'Cannot exceed 60').nullable().optional()
  ),
  resource_description: z.string().max(2000).optional().or(z.literal('')),
  date_of_joining: z.string().optional().or(z.literal('')),
  date_of_leaving: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).default('active'),
});

const FormSkeleton = () => (
  <Card>
    <CardContent className="p-6 space-y-4">
      {Array.from({ length: 5 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </CardContent>
  </Card>
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
        navigate(ROUTES.EMPLOYEES);
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isEdit && isLoadingEmployee) return <FormSkeleton />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <PageHeader
        title={isEdit ? 'Edit Employee' : 'Add Employee'}
        description={isEdit ? `Updating ${employee?.full_name ?? ''}` : 'Create a new employee record'}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.EMPLOYEES)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* Identity */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Identity</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="employee_code"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Employee Code <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        placeholder="EMP-001"
                        {...field}
                        onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        disabled={isEdit}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="full_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Full Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl><Input placeholder="e.g. Rahul Sharma" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="designation"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Designation</FormLabel>
                    <FormControl><Input placeholder="e.g. Senior Engineer" {...field} /></FormControl>
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
            </CardContent>
          </Card>
          {/* Experience & Employment */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Experience &amp; Employment</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
              <FormField
                control={form.control}
                name="date_of_joining"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Joining</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="date_of_leaving"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Date of Leaving</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="total_experience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Total Experience (yrs)</FormLabel>
                    <FormControl>
                      <Input type="number" step="0.1" min="0" max="60" placeholder="e.g. 7.5" {...field} />
                    </FormControl>
                    <FormDescription className="text-xs">Incl. previous companies</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="company_experience"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Company Experience (yrs)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        step="0.1"
                        placeholder="Auto-calculated"
                        readOnly
                        tabIndex={-1}
                        className="bg-muted cursor-not-allowed"
                        {...field}
                        value={field.value ?? ''}
                      />
                    </FormControl>
                    <FormDescription className="text-xs">From Date of Joining</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>



          {/* Description */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Resource Description</CardTitle>
            </CardHeader>
            <CardContent>
              <FormField
                control={form.control}
                name="resource_description"
                render={({ field }) => (
                  <FormItem>
                    <FormControl>
                      <Textarea
                        placeholder="Skills, certifications, and project experience…"
                        className="min-h-[5rem] resize-y"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="sticky bottom-0 z-10 -mx-6 flex items-center justify-end gap-3 border-t bg-background px-6 py-4">
            <Button type="button" variant="outline" onClick={() => navigate(ROUTES.EMPLOYEES)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-1.5 h-4 w-4" />
              {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Employee'}
            </Button>
          </div>
        </form>
      </Form>
    </motion.div>
  );
};

export default EmployeeForm;
