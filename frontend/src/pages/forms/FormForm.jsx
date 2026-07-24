import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useFormById, useCreateForm, useUpdateForm } from '@/hooks/useForms';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { ROUTES } from '@/constants/routes';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';
import { cn } from '@/utils/cn';

const formSchema = z.object({
  module_name: z.string().min(2, 'Must be at least 2 characters').max(100),
  form_name: z.string().min(2, 'Must be at least 2 characters').max(100),
  status: z.enum(['active', 'inactive']).default('active'),
});

const FormSkeleton = () => (
  <div className="space-y-4 p-4">
    {Array.from({ length: 3 }).map((_, i) => (
      <div key={i} className="space-y-2 h-14 bg-muted animate-pulse rounded-md" />
    ))}
  </div>
);

const FormForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { success, error: showError } = useNotification();

  const { data: formRecord, isPending: isLoadingForm } = useFormById(id);
  const createMutation = useCreateForm();
  const updateMutation = useUpdateForm(id);

  const rhForm = useForm({
    resolver: zodResolver(formSchema),
    defaultValues: { module_name: '', form_name: '', status: 'active' },
  });

  const formStatus = useWatch({ control: rhForm.control, name: 'status' });

  useEffect(() => {
    if (formRecord && isEdit) {
      rhForm.reset({
        module_name: formRecord.module_name ?? '',
        form_name: formRecord.form_name ?? '',
        status: formRecord.status ?? 'active',
      });
    }
  }, [formRecord, isEdit, rhForm]);

  const onSubmit = (values) => {
    const mutation = isEdit ? updateMutation : createMutation;
    mutation.mutate(values, {
      onSuccess: () => {
        success(isEdit ? 'Form updated successfully.' : 'Form created successfully.');
        handleClose();
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  const handleClose = () => {
    navigate(ROUTES.FORMS);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  return (
    <Sheet open={true} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col bg-white overflow-hidden">
        <SheetHeader className="px-5 py-3 border-b">
          <SheetTitle className="text-base font-medium text-left">{isEdit ? 'Edit Form' : 'Add New Form'}</SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto">
          {isEdit && isLoadingForm ? (
            <FormSkeleton />
          ) : (
            <Form {...rhForm}>
              <form id="form-master-form" onSubmit={rhForm.handleSubmit(onSubmit)} className="p-5 flex flex-col gap-4">
                <FormField
                  control={rhForm.control}
                  name="module_name"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[11px] text-muted-foreground font-medium"><span className="text-destructive mr-0.5">*</span> Module Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Masters" {...field} className="h-8 text-sm border-gray-200" />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={rhForm.control}
                  name="form_name"
                  render={({ field }) => (
                    <FormItem className="space-y-1">
                      <FormLabel className="text-[11px] text-muted-foreground font-medium"><span className="text-destructive mr-0.5">*</span> Form Name</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. Employee Master" {...field} className="h-8 text-sm border-gray-200" />
                      </FormControl>
                      <FormMessage className="text-[10px]" />
                    </FormItem>
                  )}
                />

                <FormField
                  control={rhForm.control}
                  name="status"
                  render={({ field }) => (
                    <FormItem className="space-y-1 flex flex-col justify-center pt-2">
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
              </form>
            </Form>
          )}
        </div>

        <SheetFooter className="px-5 py-3 border-t mt-auto flex-row justify-end gap-3 items-center bg-white">
          <Button type="button" variant="outline" className="border-gray-200 h-8 text-sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" form="form-master-form" className="bg-blue-600 hover:bg-blue-700 h-8 text-sm" disabled={isSubmitting}>
            {isSubmitting ? 'Saving…' : 'Save & Close'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default FormForm;
