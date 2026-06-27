import { useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { ArrowLeft, Save } from 'lucide-react';
import { useSubProject, useCreateSubProject, useUpdateSubProject } from '@/hooks/useSubProjects';
import { useActiveServicePOs } from '@/hooks/useServicePOs';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { ROUTES } from '@/constants/routes';
import {
  Form,
  FormField,
  FormItem,
  FormLabel,
  FormControl,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import PageHeader from '@/components/common/PageHeader';
import { Skeleton } from '@/components/ui/skeleton';

const subProjectSchema = z.object({
  sub_project_name: z
    .string()
    .min(1, 'Sub-project name is required')
    .max(150, 'Name cannot exceed 150 characters'),
  service_po_id: z
    .string()
    .min(1, 'Service PO is required'),
  description: z.string().max(1000, 'Description cannot exceed 1000 characters').optional().or(z.literal('')),
  start_date: z.string().optional().or(z.literal('')),
  end_date: z.string().optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).default('active'),
}).refine(
  (d) => {
    if (d.start_date && d.end_date) return d.end_date >= d.start_date;
    return true;
  },
  { message: 'End date cannot be before start date', path: ['end_date'] }
);

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

const SubProjectForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const isEdit = !!id;
  const { success, error: showError } = useNotification();

  const { data: subProject, isPending: isLoadingSubProject } = useSubProject(id);
  const { data: activePOs = [] } = useActiveServicePOs();
  const createMutation = useCreateSubProject();
  const updateMutation = useUpdateSubProject(id);

  const form = useForm({
    resolver: zodResolver(subProjectSchema),
    defaultValues: {
      sub_project_name: '',
      service_po_id: '',
      description: '',
      start_date: '',
      end_date: '',
      status: 'active',
    },
  });

  useEffect(() => {
    if (subProject && isEdit) {
      form.reset({
        sub_project_name: subProject.sub_project_name ?? '',
        service_po_id: subProject.service_po_id ? String(subProject.service_po_id) : '',
        description: subProject.description ?? '',
        start_date: subProject.start_date?.split('T')[0] ?? '',
        end_date: subProject.end_date?.split('T')[0] ?? '',
        status: subProject.status ?? 'active',
      });
    }
  }, [subProject, isEdit, form]);

  const onSubmit = (values) => {
    const payload = {
      sub_project_name: values.sub_project_name,
      service_po_id: Number(values.service_po_id),
      status: values.status,
      ...(values.description && { description: values.description }),
      ...(values.start_date && { start_date: values.start_date }),
      ...(values.end_date && { end_date: values.end_date }),
    };

    const mutation = isEdit ? updateMutation : createMutation;
    mutation.mutate(payload, {
      onSuccess: () => {
        success(isEdit ? 'Sub-project updated successfully.' : 'Sub-project created successfully.');
        navigate(ROUTES.SUB_PROJECTS);
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isEdit && isLoadingSubProject) return <FormSkeleton />;

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      className="w-full"
    >
      <PageHeader
        title={isEdit ? 'Edit Sub-Project' : 'Add Sub-Project'}
        description={
          isEdit
            ? `Updating "${subProject?.sub_project_name ?? ''}"`
            : 'Create a new sub-project under a Service PO'
        }
        actions={
          <Button variant="outline" size="sm" onClick={() => navigate(ROUTES.SUB_PROJECTS)}>
            <ArrowLeft className="mr-1.5 h-4 w-4" />
            Back
          </Button>
        }
      />

      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-5">
          <Card>
            <CardHeader>
              <CardTitle className="text-sm">Sub-Project Details</CardTitle>
            </CardHeader>
            <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
              <FormField
                control={form.control}
                name="sub_project_name"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2 lg:col-span-3">
                    <FormLabel>
                      Sub-Project Name <span className="text-destructive">*</span>
                    </FormLabel>
                    <FormControl>
                      <Input placeholder="e.g. Phase 1 – Discovery" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="service_po_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>
                      Service PO <span className="text-destructive">*</span>
                    </FormLabel>
                    <Select value={field.value} onValueChange={field.onChange}>
                      <FormControl>
                        <SelectTrigger>
                          <SelectValue placeholder="Select a Service PO" />
                        </SelectTrigger>
                      </FormControl>
                      <SelectContent>
                        {activePOs.map((po) => (
                          <SelectItem key={po.id} value={String(po.id)}>
                            {po.po_number ?? po.service_po_name ?? po.id}
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
                        <SelectItem value="inactive">Inactive</SelectItem>
                      </SelectContent>
                    </Select>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="start_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Start Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="end_date"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>End Date</FormLabel>
                    <FormControl><Input type="date" {...field} /></FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />

              <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                  <FormItem className="sm:col-span-2 lg:col-span-3">
                    <FormLabel>Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Optional description of this sub-project…"
                        className="min-h-24 resize-y"
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
            <Button type="button" variant="outline" onClick={() => navigate(ROUTES.SUB_PROJECTS)}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting}>
              <Save className="mr-1.5 h-4 w-4" />
              {isSubmitting ? 'Saving…' : isEdit ? 'Save Changes' : 'Create Sub-Project'}
            </Button>
          </div>
        </form>
      </Form>
    </motion.div>
  );
};

export default SubProjectForm;
