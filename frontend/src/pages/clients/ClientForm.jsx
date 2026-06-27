import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';
import { useClient, useCreateClient, useUpdateClient } from '@/hooks/useClients';
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
import PageHeader from '@/components/common/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';

const clientSchema = z.object({
  client_name: z
    .string()
    .min(1, 'Client name is required')
    .max(100, 'Client name cannot exceed 100 characters'),
  industry: z.string().max(100).optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).default('active'),
});

const FormSkeleton = () => (
  <Card>
    <CardContent className="p-6 space-y-4">
      {Array.from({ length: 4 }).map((_, i) => (
        <div key={i} className="space-y-2">
          <Skeleton className="h-4 w-24" />
          <Skeleton className="h-9 w-full" />
        </div>
      ))}
    </CardContent>
  </Card>
);

const ClientForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { success, error: showError } = useNotification();

  const { data: client, isPending: isLoadingClient } = useClient(id);
  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient(id);

  const form = useForm({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      client_name: '',
      industry: '',
      status: 'active',
    },
  });

  useEffect(() => {
    if (client && isEdit) {
      form.reset({
        client_name: client.client_name ?? '',
        industry: client.industry ?? '',
        status: client.status ?? 'active',
      });
    }
  }, [client, isEdit, form]);

  const onSubmit = (values) => {
    const clean = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== '' && v != null)
    );

    const mutation = isEdit ? updateMutation : createMutation;
    mutation.mutate(clean, {
      onSuccess: () => {
        success(isEdit ? 'Client updated successfully.' : 'Client created successfully.');
        navigate(ROUTES.CLIENTS);
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isEdit && isLoadingClient) return <FormSkeleton />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <PageHeader
        title={isEdit ? 'Edit Client' : 'Add Client'}
        description={isEdit ? `Updating ${client?.client_name ?? ''}` : 'Create a new client record'}
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.CLIENTS)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Client Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="client_name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Client Name <span className="text-destructive">*</span></FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Acme Corporation" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="industry"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Industry</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Technology" {...field} />
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

          <div className="sticky bottom-0 z-10 -mx-6 flex items-center justify-end gap-3 border-t bg-background px-6 py-4">
            <Button type="button" variant="outline" onClick={() => navigate(ROUTES.CLIENTS)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-1.5 h-4 w-4" />
              {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Client'}
            </Button>
          </div>
        </form>
      </Form>
    </motion.div>
  );
};

export default ClientForm;
