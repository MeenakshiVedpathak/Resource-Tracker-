import { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Check, ChevronsUpDown, Save } from 'lucide-react';
import { useServicePO, useCreateServicePO, useUpdateServicePO } from '@/hooks/useServicePOs';
import { useActiveClients } from '@/hooks/useClients';
import { useActiveServiceTypes } from '@/hooks/useServiceTypes';
import { useActiveServiceCategories } from '@/hooks/useServiceCategories';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { ROUTES } from '@/constants/routes';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage, FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Switch } from '@/components/ui/switch';
import { Skeleton } from '@/components/ui/skeleton';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

const poSchema = z
  .object({
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
    invoice_amount: z.preprocess(
      (v) => (v === '' || v == null ? undefined : Number(v)),
      z.number({ required_error: 'Invoice amount is required' }).min(0, 'Must be 0 or more')
    ),
    status: z.enum(['in-progress', 'completed', 'on-hold', 'pending', 'cancelled', 'closed']).default('in-progress'),
  })
  .refine(
    (data) => {
      if (!data.start_date || !data.end_date) return true;
      return new Date(data.end_date) >= new Date(data.start_date);
    },
    { message: 'End date must be on or after start date', path: ['end_date'] }
  );

const FormSkeleton = () => (
  <div className="space-y-4 p-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="space-y-2 h-14 bg-muted animate-pulse rounded-md" />
    ))}
  </div>
);

const ServicePOForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { success, error: showError } = useNotification();

  const { data: po, isPending: isLoadingPO } = useServicePO(id);
  const { data: activeClients = [], isPending: isLoadingClients } = useActiveClients();
  const { data: serviceTypes = [], isPending: isLoadingTypes } = useActiveServiceTypes();
  const { data: activeCategories = [], isPending: isLoadingCategories } = useActiveServiceCategories();
  const createMutation = useCreateServicePO();
  const updateMutation = useUpdateServicePO(id);

  const [selectedCategory, setSelectedCategory] = useState('');

  const form = useForm({
    resolver: zodResolver(poSchema),
    defaultValues: {
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
      invoice_amount: '',
      status: 'in-progress',
    },
  });

  useEffect(() => {
    if (po && isEdit) {
      if (serviceTypes.length > 0 && po.service_type_id) {
        const typeObj = serviceTypes.find(t => t.id === po.service_type_id);
        if (typeObj) {
          setSelectedCategory(String(typeObj.service_category_id));
        }
      }
      form.reset({
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
        invoice_amount: po.invoice_amount ?? '',
        status: po.status ?? 'in-progress',
      });
    }
  }, [po, isEdit, form, serviceTypes]);

  const onSubmit = (values) => {
    let is_billable = false;
    if (selectedCategory && activeCategories.length > 0) {
      const category = activeCategories.find((c) => String(c.id) === String(selectedCategory));
      if (category && category.name.toLowerCase() === 'billable') {
        is_billable = true;
      }
    }

    const clean = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== '' && v != null)
    );
    clean.is_billable = is_billable;

    const mutation = isEdit ? updateMutation : createMutation;
    mutation.mutate(clean, {
      onSuccess: () => {
        success(isEdit ? 'Service PO updated successfully.' : 'Service PO created successfully.');
        handleClose();
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  const handleClose = () => {
    navigate(ROUTES.SERVICE_POS);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isEdit && isLoadingPO) return <FormSkeleton />;

  return (
    <Sheet open={true} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent 
        side="right" 
        className="w-full sm:max-w-3xl p-0 flex flex-col bg-white overflow-hidden"
        onInteractOutside={(e) => e.preventDefault()}
      >
        <SheetHeader className="px-5 py-3 border-b">
          <SheetTitle className="text-base font-medium text-left">{isEdit ? 'Edit Service PO' : 'New Service PO'}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {isEdit && isLoadingPO ? (
            <FormSkeleton />
          ) : (
            <Form {...form}>
              <form id="servicepo-form" onSubmit={form.handleSubmit(onSubmit)} className="p-5 flex flex-col gap-6">
                
                {/* PO Details */}
                <div className="space-y-3">
                  <h3 className="text-xs font-semibold text-foreground border-b pb-1">PO Details</h3>
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">

              <FormField
                control={form.control}
                name="service_po_name"
                render={({ field }) => (
                  <FormItem className="space-y-1 sm:col-span-2">
                    <FormLabel className="text-[13px]">
                      <span className="text-destructive">*</span> PO Name
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Annual Support Services" className="h-8 text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="client_id"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[13px]">
                      <span className="text-destructive">*</span> Client
                    </FormLabel>
                    <SearchableSelect
                      options={activeClients.map(c => ({
                        value: String(c.id),
                        label: c.client_name
                      }))}
                      value={field.value}
                      onValueChange={(val) => field.onChange(val ? parseInt(val, 10) : undefined)}
                      disabled={isLoadingClients}
                      placeholder="Select client"
                      searchPlaceholder="Search client..."
                      className="h-8 text-sm"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <div className="space-y-1">
                <FormLabel className="text-[13px]">
                  <span className="text-destructive">*</span> Service Category
                </FormLabel>
                  <SearchableSelect
                    options={activeCategories.map(c => ({
                      value: String(c.id),
                      label: c.name
                    }))}
                    value={selectedCategory}
                    onValueChange={(val) => {
                      setSelectedCategory(val);
                      form.setValue('service_type_id', '');
                    }}
                    disabled={isLoadingCategories}
                    placeholder="Select category"
                    searchPlaceholder="Search category..."
                    className="h-8 text-sm"
                  />
              </div>

              <FormField
                control={form.control}
                name="service_type_id"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[13px]">
                      <span className="text-destructive">*</span> Service Type
                    </FormLabel>
                        <SearchableSelect
                          options={serviceTypes
                            .filter((t) => t.service_category_id === Number(selectedCategory))
                            .map(c => ({
                              value: String(c.id),
                              label: c.service_type_name
                            }))}
                          value={field.value}
                          onValueChange={(val) => field.onChange(val ? parseInt(val, 10) : undefined)}
                          disabled={isLoadingTypes || !selectedCategory}
                          placeholder="Select service type"
                          searchPlaceholder="Search service type..."
                          className="h-8 text-sm"
                        />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="account_manager"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[13px]"><span className="text-destructive">*</span> Account Manager</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Rakesh Wagh" className="h-8 text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="status"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[13px]">Status</FormLabel>
                    <SearchableSelect showSearch={false}
                      options={[
                        { label: "In Progress", value: "in-progress" },
                        { label: "Completed", value: "completed" },
                        { label: "On Hold", value: "on-hold" },
                        { label: "Pending", value: "pending" },
                        { label: "Cancelled", value: "cancelled" },
                        { label: "Closed", value: "closed" }
                      ]}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select status"
                      searchPlaceholder="Search status..."
                      className="h-8 text-sm w-full"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="service_description"
                render={({ field }) => (
                  <FormItem className="space-y-1 sm:col-span-2">
                    <FormLabel className="text-[13px]"><span className="text-destructive">*</span> Service Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the services included in this PO…"
                        rows={2}
                        className="resize-none text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
                  </div>
                </div>

                {/* Commercial */}
                <div className="space-y-3">
                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="po_value"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[13px]">PO Value (INR)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 500000"
                        className="h-8 text-sm"
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
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[13px]">Expected Man-Hours</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.5"
                        placeholder="e.g. 1200"
                        className="h-8 text-sm"
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
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[13px]">
                      <span className="text-destructive">*</span> Start Date 
                    </FormLabel>
                    <FormControl>
                      <Input type="date" className="h-8 text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[13px]">
                      <span className="text-destructive">*</span> End Date 
                    </FormLabel>
                    <FormControl>
                      <Input type="date" className="h-8 text-sm" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice_frequency"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[13px]"><span className="text-destructive">*</span> Invoice Frequency</FormLabel>
                    <SearchableSelect showSearch={false}
                      options={[
                        { label: "Monthly", value: "monthly" },
                        { label: "Milestone based", value: "milestone-based" },
                        { label: "Yearly AMC", value: "yearly-amc" },
                        { label: "Internal - No Invoice", value: "internal-no-invoice" },
                        { label: "POC", value: "poc" }
                      ]}
                      value={field.value}
                      onValueChange={field.onChange}
                      placeholder="Select frequency"
                      searchPlaceholder="Search frequency..."
                      className="h-8 text-sm w-full"
                    />
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="invoice_amount"
                render={({ field }) => (
                  <FormItem className="space-y-1">
                    <FormLabel className="text-[13px]"><span className="text-destructive">*</span> Invoice Amount (INR)</FormLabel>
                    <FormControl>
                      <Input
                        type="number"
                        min="0"
                        step="0.01"
                        placeholder="e.g. 250000"
                        className="h-8 text-sm"
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

                  </div>
                </div>
              </form>
            </Form>
          )}
        </div>

        <SheetFooter className="px-5 py-3 border-t flex items-center justify-end gap-3 sm:justify-end">
          <Button type="button" variant="outline" size="sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" size="sm" disabled={isSubmitting} form="servicepo-form">
            <Save className="mr-1.5 h-3.5 w-3.5" />
            {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Service PO'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default ServicePOForm;
