import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';
import { useServiceType, useCreateServiceType, useUpdateServiceType } from '@/hooks/useServiceTypes';
import { useActiveServiceCategories } from '@/hooks/useServiceCategories';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { ROUTES } from '@/constants/routes';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Skeleton } from '@/components/ui/skeleton';
import PageHeader from '@/components/common/PageHeader';

const schema = z.object({
  service_type_name: z
    .string()
    .min(2, 'Name must be at least 2 characters')
    .max(100, 'Name cannot exceed 100 characters'),
  service_category_id: z.coerce
    .number({ required_error: 'Service category is required' })
    .positive('Service category is required'),
});

const FormSkeleton = () => (
  <Card>
    <CardContent className="p-6 space-y-4">
      {Array.from({ length: 2 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </CardContent>
  </Card>
);

const ServiceTypeForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { success, error: showError } = useNotification();

  const { data: serviceType, isPending: isLoading } = useServiceType(id);
  const { data: serviceCategories = [], isPending: isLoadingCategories } = useActiveServiceCategories();
  const createMutation = useCreateServiceType();
  const updateMutation = useUpdateServiceType(id);

  const form = useForm({
    resolver: zodResolver(schema),
    defaultValues: {
      service_type_name: '',
      service_category_id: '',
    },
  });

  useEffect(() => {
    if (serviceType && isEdit) {
      form.reset({
        service_type_name: serviceType.service_type_name ?? '',
        service_category_id: serviceType.service_category_id ?? '',
      });
    }
  }, [serviceType, isEdit, form]);

  const onSubmit = (values) => {
    const mutation = isEdit ? updateMutation : createMutation;
    mutation.mutate(values, {
      onSuccess: () => {
        success(isEdit ? 'Service type updated.' : 'Service type created.');
        navigate(ROUTES.SERVICE_TYPES);
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isEdit && isLoading) return <FormSkeleton />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full max-w-lg"
    >
      <PageHeader
        title={isEdit ? 'Edit Service Type' : 'New Service Type'}
        description={
          isEdit
            ? `Updating: ${serviceType?.service_type_name ?? ''}`
            : 'Add a new service type'
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.SERVICE_TYPES)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Service Type Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <FormField
                control={form.control}
                name="service_type_name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>
                      Service Type Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Cloud Support" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="service_category_id"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2">
                    <FormLabel>
                      Service Category <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select
                      value={field.value ? String(field.value) : ''}
                      onValueChange={(v) => field.onChange(Number(v))}
                      disabled={isLoadingCategories}
                    >
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select service category" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {serviceCategories.map((c) => (
                          <SelectItem key={c.id} value={String(c.id)}>
                            {c.name}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />
            </CardContent>
          </Card>

          <div className="flex items-center justify-end gap-3">
            <Button type="button" variant="outline" onClick={() => navigate(ROUTES.SERVICE_TYPES)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-1.5 h-4 w-4" />
              {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Service Type'}
            </Button>
          </div>
        </form>
      </Form>
    </motion.div>
  );
};

export default ServiceTypeForm;
