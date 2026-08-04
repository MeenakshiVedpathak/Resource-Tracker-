import { useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import dayjs from 'dayjs';
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter,
} from '@/components/ui/dialog';
import { Form, FormField, FormItem, FormLabel, FormControl, FormMessage } from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import ProjectSelect from './ProjectSelect';
import { useCreateWorkLogEntry, useUpdateWorkLogEntry } from '@/hooks/useEmployeeWorkLog';
import { useEmployeeMappedProjects } from '@/hooks/useEmployeeProjects';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError, extractFieldErrors } from '@/services/apiClient';
import { flattenHierarchyTree } from '@/utils/servicePOHierarchy';

export const DAILY_HOURS_CAP = 12;

// Client-side messages match the backend's Joi wording exactly, so an error looks the same
// whether it's caught here or comes back from the server. The cross-entry daily-total cap
// (this entry + everything else already logged that day > 12h) is deliberately NOT checked
// here — that's a server-owned rule (400, with an exact "current total would be N hours"
// message) surfaced as a toast via extractApiError instead of approximated client-side.
const taskSchema = z.object({
  service_po_id: z.string().min(1, 'Service PO is required.'),
  hierarchy_node_id: z.string().optional(),
  hours: z.coerce
    .number({ invalid_type_error: 'Hours is required.' })
    .gt(0, 'Hours must be greater than 0.')
    .max(DAILY_HOURS_CAP, 'Hours cannot exceed 12 per day.'),
  description: z.string().min(1, 'Description is required.').max(1000),
  timesheet_date: z.string().min(1, 'Date is required.'),
});

const buildDefaults = (task, date) => ({
  service_po_id: task ? String(task.service_po_id) : '',
  hierarchy_node_id: task?.hierarchy_node_id != null ? String(task.hierarchy_node_id) : '',
  hours: task?.hours ?? '',
  description: task?.description ?? '',
  timesheet_date: task ? dayjs(task.timesheet_date ?? task.work_date).format('YYYY-MM-DD') : dayjs(date).format('YYYY-MM-DD'),
});

// Create/edit modal for a single Work Log entry. Save & New only applies to create mode —
// there's no "new" flow while editing an existing entry. A synced entry never reaches this
// modal in edit mode — WorkLogEntryTable disables Edit for those rows entirely.
const WorkLogEntryModal = ({ open, onOpenChange, date, task }) => {
  const { success, error: showError } = useNotification();
  const createMutation = useCreateWorkLogEntry();
  const updateMutation = useUpdateWorkLogEntry();
  const isEdit = !!task;
  const isSaving = createMutation.isPending || updateMutation.isPending;

  const today = dayjs().format('YYYY-MM-DD');
  const { data: projects = [] } = useEmployeeMappedProjects();

  const form = useForm({
    resolver: zodResolver(taskSchema),
    defaultValues: buildDefaults(task, date),
  });

  useEffect(() => {
    if (!open) return;
    form.reset(buildDefaults(task, date));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, task]);

  const selectedServicePOId = form.watch('service_po_id');
  const selectedProject = projects.find((p) => String(p.id) === String(selectedServicePOId));
  const hierarchyOptions = flattenHierarchyTree(selectedProject?.hierarchy ?? []);

  const submit = async (values, { keepOpen }) => {
    const payload = {
      service_po_id: values.service_po_id,
      hierarchy_node_id: values.hierarchy_node_id || null,
      sub_project_id: null, // no sub-project selector in this UI
      hours: values.hours,
      description: values.description,
      timesheet_date: values.timesheet_date,
    };
    try {
      if (isEdit) {
        await updateMutation.mutateAsync({ id: task.id, payload });
        success('Entry updated.');
      } else {
        await createMutation.mutateAsync(payload);
        success('Entry saved.');
      }
      if (keepOpen) {
        form.reset(buildDefaults(null, date));
      } else {
        onOpenChange(false);
      }
    } catch (err) {
      const fieldErrors = extractFieldErrors(err);
      if (Object.keys(fieldErrors).length) {
        Object.entries(fieldErrors).forEach(([field, message]) => form.setError(field, { message }));
      } else {
        showError(extractApiError(err));
      }
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle>{isEdit ? 'Edit Work Log Entry' : 'Add Work Log Entry'}</DialogTitle>
        </DialogHeader>

        <Form {...form}>
          <form className="space-y-4">
            <FormField
              control={form.control}
              name="timesheet_date"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Date</FormLabel>
                  <FormControl>
                    <Input type="date" max={today} disabled={isSaving} {...field} />
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
                  <FormLabel>Project</FormLabel>
                  <FormControl>
                    <ProjectSelect
                      value={field.value}
                      onChange={(v) => {
                        if (v !== field.value) form.setValue('hierarchy_node_id', '');
                        field.onChange(v);
                      }}
                      disabled={isSaving}
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            {hierarchyOptions.length > 0 && (
              <FormField
                control={form.control}
                name="hierarchy_node_id"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Hierarchy Node (optional)</FormLabel>
                    <FormControl>
                      <SearchableSelect
                        options={[
                          { label: 'None — log against the Service PO itself', value: '' },
                          ...hierarchyOptions.map((n) => ({
                            value: String(n.id),
                            searchValue: [n.parentName, n.name].filter(Boolean).join(' '),
                            label: (
                              <span className="flex items-baseline gap-1.5" style={{ paddingLeft: `${n.depth * 16}px` }}>
                                {n.depth > 0 && <span className="text-muted-foreground">{'└'}</span>}
                                <span>{n.name}</span>
                              </span>
                            ),
                          })),
                        ]}
                        value={field.value || ''}
                        onValueChange={(v) => field.onChange(v)}
                        disabled={isSaving}
                        placeholder="None — log against the Service PO itself"
                        searchPlaceholder="Search hierarchy…"
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
            )}

            <FormField
              control={form.control}
              name="hours"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Hours</FormLabel>
                  <FormControl>
                    <Input type="number" step="0.5" min="0" max={DAILY_HOURS_CAP} placeholder="e.g. 4.5" disabled={isSaving} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <FormField
              control={form.control}
              name="description"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Description</FormLabel>
                  <FormControl>
                    <Textarea placeholder="What did you work on?" disabled={isSaving} {...field} />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
          </form>
        </Form>

        <DialogFooter className="gap-2">
          <Button variant="outline" size="sm" onClick={() => onOpenChange(false)} disabled={isSaving}>
            Cancel
          </Button>
          {!isEdit && (
            <Button
              variant="secondary"
              size="sm"
              onClick={form.handleSubmit((v) => submit(v, { keepOpen: true }))}
              disabled={isSaving}
            >
              Save & New
            </Button>
          )}
          <Button
            size="sm"
            onClick={form.handleSubmit((v) => submit(v, { keepOpen: false }))}
            disabled={isSaving}
          >
            {isSaving ? 'Saving…' : 'Save & Close'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default WorkLogEntryModal;
