import { useEffect } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { useNavigate, useParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { motion } from 'framer-motion';
import { Save } from 'lucide-react';
import { useClient, useCreateClient, useUpdateClient } from '@/hooks/useClients';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { useSelectableBusinessUnits } from '@/hooks/useSelectableBusinessUnits';
import { BusinessUnitCascadeSelect, SubBusinessUnitSelect, useBuHierarchy } from '@/components/common/BusinessUnitCascadeSelect';
import { ROUTES } from '@/constants/routes';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Skeleton } from '@/components/ui/skeleton';
import { cn } from '@/utils/cn';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from "@/components/ui/sheet";

const clientSchema = z.object({
  client_name: z
    .string()
    .min(1, 'Client name is required')
    .max(100, 'Client name cannot exceed 100 characters'),
  industry: z.string().max(100).optional().or(z.literal('')),
  status: z.enum(['active', 'inactive']).default('active'),
  // Only relevant for BU-scoped logins mapped to multiple BUs (e.g. BU Head, multi-BU BU Admin).
  // Admin/Entity Admin/Platform Admin never send this — their clients are always BU-less. Always
  // the ROOT (top-level) BU's id — a Sub-BU pick lives in sub_business_unit_id instead, so Client
  // list scoping elsewhere that keys off this field never waits on the (possibly still-empty,
  // separately mandatory) Sub-BU choice.
  company_id: z.string().optional(),
  // UI-only grouping field, never sent to the backend as-is (see onSubmit) — required only when
  // the picked root BU actually has Sub-BUs (checked at submit time, since it depends on the
  // BU master's live hierarchy, not a static rule this schema can encode on its own).
  sub_business_unit_id: z.string().optional(),
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

  const queryClient = useQueryClient();

  // BU selector logic:
  //   Admin / Entity Admin / Platform Admin  → isCrossBu → NO selector. Their clients are always
  //       created BU-less: company_id is simply never sent, so the backend saves null.
  //   BU Admin / BU Head with 1 BU           → NO selector — nothing to choose, and the
  //       X-Company-Id header already says which BU.
  //   BU Admin / BU Head with multiple BUs   → REQUIRED selector, listing only their mapped BUs.
  //
  // What is picked here is independent of the global BU switcher: the header keeps carrying
  // whatever BU is active app-wide, so a user browsing under BU "A" can still file a client
  // under BU "B".
  const { units, isCrossBu, canFilter } = useSelectableBusinessUnits();
  const showBuSelector = !isCrossBu && canFilter;
  const { childrenOf } = useBuHierarchy(units);

  const { data: client, isPending: isLoadingClient } = useClient(id);
  const createMutation = useCreateClient();
  const updateMutation = useUpdateClient(id);

  const form = useForm({
    resolver: zodResolver(clientSchema),
    defaultValues: {
      client_name: '',
      industry: '',
      status: 'active',
      company_id: '',
      sub_business_unit_id: '',
    },
  });

  // A root's Sub-BUs — recomputed live off whatever BU is currently picked, never off a snapshot,
  // so switching roots immediately shows (or hides) the right Sub-BU list.
  const selectedRootId = form.watch('company_id');
  const subBuOptions = childrenOf(selectedRootId).map((u) => ({ value: String(u.id), label: u.name }));
  const showSubBuField = subBuOptions.length > 0;

  useEffect(() => {
    if (client && isEdit) {
      // The client's saved company_id can itself be a Sub-BU's id — resolve which root it
      // belongs to so the form reopens with BOTH dropdowns correctly pre-populated (root BU, and
      // that Sub-BU already selected under it) instead of just the flat id sitting in company_id
      // with no root chosen to reveal the Sub-BU dropdown at all.
      const currentUnit = client.company_id ? units.find((u) => String(u.id) === String(client.company_id)) : null;
      const isSubBu = currentUnit?.parentId != null;
      form.reset({
        client_name: client.client_name ?? '',
        industry: client.industry ?? '',
        status: client.status ?? 'active',
        company_id: client.company_id
          ? String(isSubBu ? currentUnit.parentId : client.company_id)
          : '',
        sub_business_unit_id: isSubBu ? String(client.company_id) : '',
      });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [client, isEdit, form, units]);

  const onSubmit = (values) => {
    // Multi-BU BU Admin/BU Head must pick a BU before saving.
    if (showBuSelector && !values.company_id) {
      form.setError('company_id', { message: 'Business Unit is required.' });
      return;
    }
    // The picked root BU has Sub-BUs — picking one of them is mandatory, not optional, once
    // they exist (the whole point of a Sub-BU is to record which of them a Client actually
    // belongs to, not just its Parent BU).
    if (showSubBuField && !values.sub_business_unit_id) {
      form.setError('sub_business_unit_id', { message: 'Sub Business Unit is required.' });
      return;
    }

    const clean = Object.fromEntries(
      Object.entries(values).filter(([, v]) => v !== '' && v != null)
    );
    // Send company_id as a number; absent for a cross-BU login, which the empty-string filter
    // above already strips — a BU-less client is created by the ABSENCE of the field, not by
    // sending null. A chosen Sub-BU overrides the root — the backend only ever sees ONE BU id,
    // whichever is the most specific one actually picked.
    if (clean.sub_business_unit_id) clean.company_id = Number(clean.sub_business_unit_id);
    else if (clean.company_id) clean.company_id = Number(clean.company_id);
    delete clean.sub_business_unit_id;

    // Edit only: PUT /clients/:id treats company_id as "reassign the BU" — omitting it leaves
    // the BU unchanged. The field is prefilled from the client's current BU, so it's always
    // present here even when the user never touched the dropdown; sending it unchanged would
    // still succeed, but it also re-checks that value against the caller's CURRENT mapped BUs,
    // which can needlessly 403 if that mapping has drifted since the client was assigned (e.g.
    // this login lost access to the client's existing BU) even though nothing on the form
    // actually changed. So it's only sent when it differs from the value the form loaded with.
    if (isEdit && clean.company_id != null && clean.company_id === Number(client?.company_id)) {
      delete clean.company_id;
    }

    const mutation = isEdit ? updateMutation : createMutation;
    mutation.mutate(clean, {
      onSuccess: () => {
        success(isEdit ? 'Client updated successfully.' : 'Client created successfully.');
        handleClose();
      },
      onError: (err) => {
        const message = extractApiError(err);
        // A cached BU list can outlive the mapping behind it, letting someone submit a BU the
        // backend no longer accepts ("Business Unit #X is not one of your mapped Business
        // Units."). Pin that 403 to the field that caused it instead of leaving it as a toast
        // the sheet scrolls past, and drop the cached list so reopening the form shows the
        // BUs that are actually still mapped.
        if (err?.response?.status === 403 && /business unit/i.test(message)) {
          form.setError(showSubBuField ? 'sub_business_unit_id' : 'company_id', { message });
          queryClient.invalidateQueries({ queryKey: ['companies'] });
        }
        showError(message);
      },
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

                    {/* BU selector — only for BU-scoped logins with more than one BU.
                        Admin/Entity Admin always create BU-less clients (no field sent);
                        single-BU logins rely on the X-Company-Id header the interceptor sends. */}
                    {showBuSelector && (
                      <FormField
                        control={form.control}
                        name="company_id"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[11px] text-muted-foreground font-medium">
                              <span className="text-destructive mr-0.5">*</span> Business Unit
                            </FormLabel>
                            <FormControl>
                              <BusinessUnitCascadeSelect
                                units={units}
                                value={field.value}
                                onValueChange={(val) => {
                                  field.onChange(val);
                                  // A different root's own Sub-BUs are a different set — never
                                  // leave a Sub-BU id from the PREVIOUS root silently selected.
                                  form.setValue('sub_business_unit_id', '');
                                  form.clearErrors('sub_business_unit_id');
                                }}
                                placeholder="Select business unit"
                                searchPlaceholder="Search business unit..."
                                className="h-8 text-sm border-gray-200 w-full"
                              />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    )}

                    {/* Mandatory, not optional, once the picked BU actually has Sub-BUs — its own
                        sibling field (not nested inside the BU field above) so it renders in its
                        own slot rather than stretching the BU field's own layout. */}
                    {showBuSelector && showSubBuField && (
                      <FormField
                        control={form.control}
                        name="sub_business_unit_id"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[11px] text-muted-foreground font-medium">
                              <span className="text-destructive mr-0.5">*</span> Sub Business Unit
                            </FormLabel>
                            <FormControl>
                              <SubBusinessUnitSelect
                                options={subBuOptions}
                                value={field.value}
                                onValueChange={field.onChange}
                                className="h-8 text-sm border-gray-200 w-full"
                              />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    )}

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
