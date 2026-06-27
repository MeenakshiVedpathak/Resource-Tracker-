import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';
import { useMonthlyCost, useCreateMonthlyCost, useUpdateMonthlyCost } from '@/hooks/useMonthlyCosts';
import { useActiveEmployees } from '@/hooks/useEmployees';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { ROUTES } from '@/constants/routes';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import PageHeader from '@/components/common/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';

const MONTH_OPTIONS = [
  { value: '1',  label: 'January' },
  { value: '2',  label: 'February' },
  { value: '3',  label: 'March' },
  { value: '4',  label: 'April' },
  { value: '5',  label: 'May' },
  { value: '6',  label: 'June' },
  { value: '7',  label: 'July' },
  { value: '8',  label: 'August' },
  { value: '9',  label: 'September' },
  { value: '10', label: 'October' },
  { value: '11', label: 'November' },
  { value: '12', label: 'December' },
];

const monthlyCostSchema = z.object({
  employee_id: z.string().min(1, 'Employee is required'),
  month: z.string().min(1, 'Month is required'),
  year: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().min(2000, 'Year must be 2000 or later').max(2100, 'Year cannot exceed 2100')
  ),
  salary_cost: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().min(0, 'Must be 0 or more')
  ),
  ops_cost: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().min(0, 'Must be 0 or more').nullable().optional()
  ),
  billable_cost: z.preprocess(
    (v) => (v === '' || v == null ? null : Number(v)),
    z.number().min(0, 'Must be 0 or more').nullable().optional()
  ),
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

// Rendered only after record + employees are both ready — useForm initialises from correct data immediately
const MonthlyCostFormContent = ({ id, isEdit, record, activeEmployees }) => {
  const navigate = useNavigate();
  const { success, error: showError } = useNotification();
  const createMutation = useCreateMonthlyCost();
  const updateMutation = useUpdateMonthlyCost(id);
  const currentYear = new Date().getFullYear();

  const form = useForm({
    resolver: zodResolver(monthlyCostSchema),
    defaultValues: {
      employee_id: record?.employee_id ? String(record.employee_id) : '',
      month:       record?.month       ? String(record.month)       : String(new Date().getMonth() + 1),
      year:        record?.year        ?? currentYear,
      salary_cost: record?.salary_cost ?? '',
      ops_cost:    record?.ops_cost    ?? '',
      billable_cost: record?.billable_cost ?? '',
    },
  });

  const onSubmit = (values) => {
    const payload = {
      employee_id: Number(values.employee_id),
      month:       Number(values.month),
      year:        Number(values.year),
      salary_cost: Number(values.salary_cost),
      ...(values.ops_cost != null && values.ops_cost !== ''
        ? { ops_cost: Number(values.ops_cost) }
        : {}),
      ...(values.billable_cost != null && values.billable_cost !== ''
        ? { billable_cost: Number(values.billable_cost) }
        : {}),
    };

    const mutation = isEdit ? updateMutation : createMutation;
    mutation.mutate(payload, {
      onSuccess: () => {
        success(isEdit ? 'Monthly cost record updated.' : 'Monthly cost record created.');
        navigate(ROUTES.MONTHLY_COSTS);
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <PageHeader
        title={isEdit ? 'Edit Monthly Cost' : 'Add Monthly Cost'}
        description={isEdit ? 'Update this monthly cost record' : 'Create a new monthly cost entry'}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.MONTHLY_COSTS)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Cost Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">

              {/* Employee */}
              <FormField
                control={form.control}
                name="employee_id"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2 lg:col-span-3">
                    <FormLabel>Employee <span className="text-destructive">*</span></FormLabel>
                    <Select
                      value={field.value}
                      onValueChange={field.onChange}
                      disabled={isEdit}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select an employee" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeEmployees.map((e) => (
                          <SelectItem key={e.id} value={String(e.id)}>
                            {e.full_name}
                            {e.employee_code && (
                              <span className="ml-2 text-xs text-muted-foreground font-mono">
                                ({e.employee_code})
                              </span>
                            )}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Month */}
              <FormField
                control={form.control}
                name="month"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Month <span className="text-destructive">*</span></FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger><SelectValue placeholder="Select month" /></SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {MONTH_OPTIONS.map((m) => (
                          <SelectItem key={m.value} value={m.value}>{m.label}</SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Year */}
              <FormField
                control={form.control}
                name="year"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Year <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="number" min="2000" max="2100" placeholder="e.g. 2026" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Salary Cost */}
              <FormField
                control={form.control}
                name="salary_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Salary Cost <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" placeholder="e.g. 50000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Ops Cost */}
              <FormField
                control={form.control}
                name="ops_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Ops Cost</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" placeholder="e.g. 5000" {...field} />
                    </FormControl>
                    <FormDescription>Leave blank to use the system default</FormDescription>
                    <FormMessage />
                  </FormItem>
                )}
              />

              {/* Billable Cost */}
              <FormField
                control={form.control}
                name="billable_cost"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Billable Cost</FormLabel>
                    <FormControl>
                      <Input type="number" min="0" step="0.01" placeholder="e.g. 45000" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

            </CardContent>
          </Card>

          <div className="sticky bottom-0 z-10 -mx-6 flex items-center justify-end gap-3 border-t bg-background px-6 py-4">
            <Button type="button" variant="outline" onClick={() => navigate(ROUTES.MONTHLY_COSTS)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-1.5 h-4 w-4" />
              {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Record'}
            </Button>
          </div>
        </form>
      </Form>
    </motion.div>
  );
};

// Outer shell — waits for all data before mounting the form
const MonthlyCostForm = () => {
  const { id } = useParams();
  const isEdit = !!id;
  const { data: record, isPending: isLoadingRecord } = useMonthlyCost(id);
  const { data: activeEmployees = [], isSuccess: employeesReady } = useActiveEmployees();

  if (isEdit && (isLoadingRecord || !employeesReady)) return <FormSkeleton />;

  return (
    <MonthlyCostFormContent
      id={id}
      isEdit={isEdit}
      record={record}
      activeEmployees={activeEmployees}
    />
  );
};

export default MonthlyCostForm;
