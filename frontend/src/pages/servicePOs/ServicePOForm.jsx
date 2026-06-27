import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';
import { useServicePO, useCreateServicePO, useUpdateServicePO } from '@/hooks/useServicePOs';
import { useActiveClients } from '@/hooks/useClients';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { ROUTES } from '@/constants/routes';
import { SERVICE_TYPES } from '@/constants/serviceTypes';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/common/PageHeader';

const poSchema = z
  .object({
    service_po_code: z
      .string()
      .min(2, 'PO code must be at least 2 characters')
      .max(30, 'PO code cannot exceed 30 characters')
      .regex(/^[A-Z0-9/_-]+$/, 'Only uppercase letters, numbers, /, _, - allowed')
      .transform((v) => v.toUpperCase()),
    service_po_name: z
      .string()
      .min(3, 'PO name must be at least 3 characters')
      .max(200, 'PO name cannot exceed 200 characters'),
    client_id: z.coerce.number({ required_error: 'Client is required' }).positive('Client is required'),
    service_type_id: z.coerce
      .number({ required_error: 'Service type is required' })
      .positive('Service type is required'),
    po_value: z.preprocess(
      (v) => (v === '' || v == null ? undefined : Number(v)),
      z.number().positive('PO value must be positive').optional()
    ),
    start_date: z.string().min(1, 'Start date is required'),
    end_date: z.string().min(1, 'End date is required'),
    expected_man_hours: z.preprocess(
      (v) => (v === '' || v == null ? undefined : Number(v)),
      z.number().positive('Expected hours must be positive').optional()
    ),
    account_manager: z.string().min(1, 'Account manager is required').max(100),
    service_description: z.string().min(1, 'Service description is required').max(1000),
    invoice_frequency: z.string().min(1, 'Invoice frequency is required'),
    invoiced_amount: z.preprocess(
      (v) => (v === '' || v == null ? undefined : Number(v)),
      z.number({ required_error: 'Invoiced amount is required' }).min(0, 'Must be 0 or more')
    ),
    is_billable: z.boolean().default(true),
    status: z.enum(['active', 'closed', 'cancelled']).default('active'),
  })
  .refine(
    (data) => {
      if (!data.start_date || !data.end_date) return true;
      return new Date(data.end_date) >= new Date(data.start_date);
    },
    { message: 'End date must be on or after start date', path: ['end_date'] }
  );

const FormSkeleton = () => (
  <Card>
    <CardContent className="p-6 space-y-4">
      {Array.from({ length: 6 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </CardContent>
  </Card>
);

const ServicePOForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { success, error: showError } = useNotification();

  const { data: po, isPending: isLoadingPO } = useServicePO(id);
  const { data: activeClients = [], isPending: isLoadingClients } = useActiveClients();
  const createMutation = useCreateServicePO();
  const updateMutation = useUpdateServicePO(id);

  const form = useForm({
    resolver: zodResolver(poSchema),
    defaultValues: {
      service_po_code: '',
      service_po_name: '',
      client_id: '',
      service_type_id: '',
      po_value: '',
      start_date: '',
      end_date: '',
      expected_man_hours: '',
      account_manager: '',
      service_description: '',
      invoice_frequency: '',
      invoiced_amount: '',
      is_billable: true,
      status: 'active',
    },
  });

  useEffect(() => {
    if (po && isEdit) {
      form.reset({
        service_po_code: po.service_po_code ?? '',
        service_po_name: po.service_po_name ?? '',
        client_id: po.client_id ?? '',
        service_type_id: po.service_type_id ?? '',
        po_value: po.po_value ?? '',
        start_date: po.start_date ? po.start_date.slice(0, 10) : '',
        end_date: po.end_date ? po.end_date.slice(0, 10) : '',
        expected_man_hours: po.expected_man_hours ?? '',
        account_manager: po.account_manager ?? '',
        service_description: po.service_description ?? '',
        invoice_frequency: po.invoice_frequency ?? '',
        invoiced_amount: po.invoiced_amount ?? '',
        is_billable: po.is_billable ?? true,
        status: po.status ?? 'active',
      });
    }
  }, [po, isEdit, form]);

  const onSubmit = (values) => {
    const clean = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== '' && v != null)
    );

    const mutation = isEdit ? updateMutation : createMutation;
    mutation.mutate(clean, {
      onSuccess: () => {
        success(isEdit ? 'Service PO updated successfully.' : 'Service PO created successfully.');
        navigate(ROUTES.SERVICE_POS);
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isEdit && isLoadingPO) return <FormSkeleton />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <PageHeader
        title={isEdit ? 'Edit Service PO' : 'New Service PO'}
        description={
          isEdit
            ? `Updating ${po?.service_po_name ?? ''}`
            : 'Create a new service purchase order'
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.SERVICE_POS)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          {/* PO Details */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">PO Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              {!isEdit && (
                <FormField
                  control={form.control}
                  name="service_po_code"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>
                        PO Code <span className="text-destructive">*</span>
                      </FormLabel>
                      <FormControl>
                        <Input
                          placeholder="e.g. PO/2024/001"
                          {...field}
                          onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                        />
                      </FormControl>
                      <FormDescription>Uppercase letters, numbers, /, _, - (2–30 chars)</FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />
              )}

              <FormField
                control={form.control}
                name="service_po_name"
                render={({ field }) => (
                  <FormItem className={!isEdit ? '' : 'sm:col-span-2'}>
                    <FormLabel>
                      PO Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Annual Support Services 2024" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Client <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(v) => field.onChange(Number(v))}
                      disabled={isLoadingClients}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select client" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activeClients.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.client_name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="service_type_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Service Type <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(v) => field.onChange(Number(v))}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service type" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {SERVICE_TYPES.map((t) => (
                          <SelectItem key={t.id} value={String(t.id)}>
                            {t.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="account_manager"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Account Manager <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Rakesh Wagh" {...field} />
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
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="active">Active</SelectItem>
                        <SelectItem value="closed">Closed</SelectItem>
                        <SelectItem value="cancelled">Cancelled</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="service_description"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>Service Description <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the services included in this PO…"
                        rows={3}
                        className="resize-none"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          {/* Commercial */}
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Commercial</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="po_value"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>PO Value (INR)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 500000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="expected_man_hours"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Expected Man-Hours</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="e.g. 1200"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Start Date <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      End Date <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input type="date" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice_frequency"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoice Frequency <span className="text-destructive">*</span></FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select frequency" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        <SelectItem value="Monthly">Monthly</SelectItem>
                        <SelectItem value="Quarterly">Quarterly</SelectItem>
                        <SelectItem value="Milestone based">Milestone based</SelectItem>
                        <SelectItem value="Yearly AMC">Yearly AMC</SelectItem>
                        <SelectItem value="One-time">One-time</SelectItem>
                        <SelectItem value="Internal - No Invoice">Internal - No Invoice</SelectItem>
                        <SelectItem value="POC">POC</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoiced_amount"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Invoiced Amount (INR) <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 250000"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="is_billable"
                render={({ field }) => (
                  <FormItem className="flex flex-row items-center justify-between rounded-lg border p-3 sm:col-span-2">
                    <div>
                      <FormLabel className="text-sm font-medium">Billable</FormLabel>
                      <FormDescription className="text-xs">
                        This PO involves billable work for the client
                      </FormDescription>
                    </div>
                    <FormControl>
                      <Switch checked={field.value} onCheckedChange={field.onChange} />
                    </FormControl>
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="sticky bottom-0 z-10 -mx-6 flex items-center justify-end gap-3 border-t bg-background px-6 py-4">
            <Button type="button" variant="outline" onClick={() => navigate(ROUTES.SERVICE_POS)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-1.5 h-4 w-4" />
              {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Service PO'}
            </Button>
          </div>
        </form>
      </Form>
    </motion.div>
  );
};

export default ServicePOForm;
