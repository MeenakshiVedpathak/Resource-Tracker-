import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Save } from 'lucide-react';
import { useClient, useCreateClient, useUpdateClient } from '@/hooks/useClients';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { ROUTES } from '@/constants/routes';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from "@/components/ui/sheet";

const clientSchema = z.object({
  client_name: z
    .string()
    .min(1, 'Client name is required')
    .max(100, 'Client name cannot exceed 100 characters'),
  industry: z.string().max(100).optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).default('active'),
});

const FormSkeleton = () => (
  <div className="space-y-4 p-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="space-y-2 h-14 bg-muted animate-pulse rounded-md" />
    ))}
  </div>
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
        handleClose();
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  const handleClose = () => {
    navigate(ROUTES.CLIENTS);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isEdit && isLoadingClient) return <FormSkeleton />;

  return (
    <Sheet open={true} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-white overflow-hidden">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="text-base font-medium text-left">{isEdit ? 'Edit Client' : 'Add New Client'}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          {isEdit && isLoadingClient ? (
            <FormSkeleton />
          ) : (
            <Form {...form}>
              <form id="client-form" onSubmit={form.handleSubmit(onSubmit)} className="p-5 flex flex-col gap-6">
                
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-foreground border-b pb-1">Client Details</h3>
                  <div className="grid grid-cols-1 gap-4">
                    <FormField
                      control={form.control}
                      name="client_name"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] text-muted-foreground font-medium"><span className="text-destructive mr-0.5">*</span> Client Name</FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Acme Corporation" className="h-8 text-sm border-gray-200" {...field} />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />
                    
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="industry"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[11px] text-muted-foreground font-medium">Industry</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Technology" className="h-8 text-sm border-gray-200" {...field} />
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
                                onClick={() => field.onChange(field.value === 'active' ? 'inactive' : 'active')}
                                className={cn(
                                  "flex items-center justify-between gap-1.5 rounded-full px-2 py-1 w-[72px] transition-all duration-300 focus:outline-none",
                                  field.value === 'active' ? "bg-blue-500 text-white flex-row" : "bg-slate-300 text-slate-700 flex-row-reverse"
                                )}
                              >
                                <span className="text-[11px] font-medium leading-none px-0.5">{field.value === 'active' ? 'Active' : 'Inactive'}</span>
                                <div className="h-3 w-3 shrink-0 rounded-full bg-white shadow-sm" />
                              </button>
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    </div>
                  </div>
                </div>

              </form>
            </Form>
          )}
        </div>

        <SheetFooter className="px-5 py-4 border-t bg-gray-50/80 mt-auto flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleClose} className="h-8 text-xs">
            Cancel
          </Button>
          <Button type="submit" form="client-form" disabled={isSubmitting} size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white">
            <Save className="mr-2 h-3.5 w-3.5" />
            {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create Client'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default ClientForm;
