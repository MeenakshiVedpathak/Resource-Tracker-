import { useEffect, useRef } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Building2, Calendar, Save, Network } from 'lucide-react';
import { useCompany, useCreateCompany, useUpdateCompany } from '@/hooks/useCompanies';
import { useActiveEntities } from '@/hooks/useEntities';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError, extractFieldErrors } from '@/services/apiClient';
import { ROUTES } from '@/constants/routes';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { cn } from '@/utils/cn';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetFooter,
} from '@/components/ui/sheet';

import { WEEK_OFF_POLICY_OPTIONS } from '@/utils/weekOffPolicy';

// Per-option accent used only for the little dot icon in the Week Off Policy dropdown — purely
// decorative, keeps the four options visually distinguishable at a glance.
const WEEK_OFF_POLICY_COLORS = {
  ALL: 'text-blue-600',
  ALT_1_3: 'text-green-600',
  ALT_2_4: 'text-orange-500',
  NONE: 'text-slate-400',
};

// Creating a top-level BU collects the full shell — Entity, BU Code, BU Name, Week Off Policy.
// A Sub-BU (`isSubBu`) only ever asks for the name: it inherits its parent's Entity, BU Code
// scheme, and Week Off Policy, so none of those fields are shown or required — `isSubBu` turns
// entity_id/company_code/saturday_off_rule all optional and the form itself hides those fields
// (see the JSX below).
const createSchema = (isSubBu) => z.object({
  entity_id: isSubBu
    ? z.coerce.number().optional()
    : z.coerce.number({ required_error: 'Entity is required' }).positive('Entity is required'),
  company_code: isSubBu ? z.string().optional() : z.string().min(1, 'BU code is required').max(50),
  company_name: z.string().min(1, 'BU name is required').max(100),
  saturday_off_rule: z.enum(['ALL', 'ALT_1_3', 'ALT_2_4', 'NONE']).default('ALL'),
});

const editSchema = z.object({
  company_name: z.string().min(1, 'BU name is required').max(100),
  status: z.enum(['active', 'inactive']).default('active'),
  saturday_off_rule: z.enum(['ALL', 'ALT_1_3', 'ALT_2_4', 'NONE']).default('ALL'),
});

// Known create-mode field names — used to route a backend field-validation error (duplicate BU
// code, invalid entity, etc.) to the right input instead of a generic toast.
const CREATE_FIELD_NAMES = ['entity_id', 'company_code', 'company_name', 'saturday_off_rule', 'parent_business_unit_id'];

const FormSkeleton = () => (
  <div className="space-y-4 p-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="space-y-2 h-14 bg-muted animate-pulse rounded-md" />
    ))}
  </div>
);

const CompanyForm = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const [searchParams] = useSearchParams();
  const entityIdParam = searchParams.get('entity_id');
  // Present only when arriving via a "Add Sub-BU" action (see CompanyList.jsx) — the Parent BU
  // this new BU will belong to. Entity Admin's own default-entity effect below is skipped in this
  // mode (see its guard), since a Sub-BU's Entity comes from the parent, not the actor's own.
  const parentIdParam = searchParams.get('parent_business_unit_id');
  const isEdit = !!id;
  const isSubBu = !isEdit && !!parentIdParam;
  const { success, error: showError } = useNotification();
  const { hasRole } = useAuth();

  const { data: company, isPending: isLoadingCompany } = useCompany(id);
  // A Sub-BU never had its own BU Code or Week Off Policy to begin with — both are inherited from
  // its Parent at creation (see isSubBu above) and stay that way for its lifetime, so editing an
  // existing Sub-BU record must hide the same two fields, not just creating one. Without this,
  // `isSubBu` (which is forced false whenever isEdit is true) let both fields silently reappear
  // in Edit mode for any BU that happens to already be a Sub-BU — including a read-only "BU Code"
  // box showing a value the record never really had of its own.
  const isEditingSubBu = isEdit && (company?.parent_business_unit_id ?? company?.parent?.id) != null;
  const { data: parentCompany, isPending: isLoadingParent } = useCompany(isSubBu ? parentIdParam : undefined);
  const {
    data: activeEntities = [],
    isPending: isLoadingEntities,
    isError: isEntitiesError,
    error: entitiesError,
  } = useActiveEntities();
  const createMutation = useCreateCompany();
  const updateMutation = useUpdateCompany(id);

  const form = useForm({
    resolver: zodResolver(isEdit ? editSchema : createSchema(isSubBu)),
    defaultValues: isEdit
      ? { company_name: '', status: 'active', saturday_off_rule: 'ALL' }
      : { entity_id: entityIdParam ?? '', company_code: '', company_name: '', saturday_off_rule: 'ALL' },
  });

  useEffect(() => {
    if (company && isEdit) {
      form.reset({
        company_name: company.company_name ?? '',
        status: company.status ?? 'active',
        saturday_off_rule: company.saturday_off_rule ?? 'ALL',
      });
    }
  }, [company, isEdit, form]);

  // Surfaces a silent-failure gap: without this, a failed /entities fetch just renders the
  // dropdown empty with no indication anything went wrong.
  useEffect(() => {
    if (isEntitiesError) showError(`Failed to load entities: ${extractApiError(entitiesError)}`);
  }, [isEntitiesError, entitiesError, showError]);

  // An Entity Admin is only ever adding a BU to their own Entity — GET /entities is already
  // scoped to whatever's assigned to them, so default-select it instead of making them pick
  // from a list of one (still changeable if they hold more than one Entity).
  const didDefaultEntityRef = useRef(false);
  useEffect(() => {
    if (
      !isEdit && !isSubBu && !entityIdParam && hasRole('Entity Admin') &&
      !isLoadingEntities && activeEntities.length > 0 && !didDefaultEntityRef.current
    ) {
      didDefaultEntityRef.current = true;
      form.setValue('entity_id', activeEntities[0].id);
    }
  }, [isEdit, entityIdParam, hasRole, isLoadingEntities, activeEntities, form]);

  // Maps a 422/409 field-validation error (duplicate BU code, invalid entity, etc.) onto the
  // specific input it belongs to. Returns whether anything matched, so the caller can fall back
  // to a form-level toast for anything it couldn't place.
  const applyFieldErrors = (err) => {
    const fieldErrors = extractFieldErrors(err);
    let matched = false;
    Object.entries(fieldErrors).forEach(([field, message]) => {
      const short = field.includes('.') ? field.split('.').pop() : field;
      if (CREATE_FIELD_NAMES.includes(short)) {
        form.setError(short, { message });
        matched = true;
      }
    });
    return matched;
  };

  const onSubmit = (values) => {
    const mutation = isEdit ? updateMutation : createMutation;
    // Sub-BU creation only asks for a name — entity_id, company_code and saturday_off_rule all
    // come from the parent instead, so none of those unrendered fields' stale/empty
    // react-hook-form values are sent; `parent_business_unit_id` (the actual parent, from the
    // "Add Sub-BU" action's own URL) is attached in their place.
    const payload = isSubBu
      ? { company_name: values.company_name, parent_business_unit_id: Number(parentIdParam) }
      : isEditingSubBu
      ? { company_name: values.company_name, status: values.status }
      : values;
    mutation.mutate(payload, {
      onSuccess: () => {
        success(isEdit ? 'BU updated successfully.' : 'BU created successfully.');
        handleClose();
      },
      onError: (err) => {
        if (!applyFieldErrors(err)) showError(extractApiError(err));
      },
    });
  };

  const handleClose = () => {
    navigate(ROUTES.COMPANIES);
  };

  const isSubmitting = createMutation.isPending || updateMutation.isPending;

  if (isEdit && isLoadingCompany) return <FormSkeleton />;

  return (
    <Sheet open={true} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-md p-0 flex flex-col bg-white overflow-hidden">
        <SheetHeader className="flex-row items-start gap-3 space-y-0 px-6 py-2 border-b">
          <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-blue-50">
            <Building2 className="h-5 w-5 text-blue-600" />
          </div>
          <div className="space-y-0.5">
            <SheetTitle className="text-lg">
              {isEdit ? 'Edit Business Unit' : isSubBu ? 'Create Sub-BU' : 'Create Business Unit'}
            </SheetTitle>
            <SheetDescription>
              {isEdit
                ? 'Update the details for this business unit.'
                : isSubBu
                ? `A Sub-BU nested under ${parentCompany?.company_name ?? 'the selected Parent BU'} — it inherits that Business Unit's Entity automatically.`
                : 'Set up a new organizational unit for your company.'}
            </SheetDescription>
          </div>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          {isEdit && isLoadingCompany ? (
            <FormSkeleton />
          ) : (
            <Form {...form}>
              <form id="company-form" onSubmit={form.handleSubmit(onSubmit)} className="px-6 py-0 flex flex-col gap-6">
                <div className="space-y-4">
                  {isSubBu && (
                    <div className="flex items-start gap-2 rounded-md border border-primary/20 bg-primary/5 px-3 py-2.5">
                      <Network className="mt-0.5 h-4 w-4 shrink-0 text-primary" />
                      <p className="text-xs text-foreground">
                        Parent BU: <span className="font-medium">{isLoadingParent ? 'Loading…' : (parentCompany?.company_name ?? `#${parentIdParam}`)}</span>
                      </p>
                    </div>
                  )}
                  <div className="grid grid-cols-1 gap-4">
                    {isEdit && !isEditingSubBu && (
                      <div className="space-y-1">
                        <span className="text-xs text-foreground font-medium"># BU Code</span>
                        <Input value={company?.company_code ?? ''} disabled className="h-9 text-sm border-gray-200 bg-muted/40" />
                      </div>
                    )}

                    {!isEdit && !isSubBu && (
                      <FormField
                        control={form.control}
                        name="entity_id"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-xs text-foreground font-medium">
                              Entity <span className="text-destructive ml-0.5">*</span>
                            </FormLabel>
                            <SearchableSelect
                              options={activeEntities.map((e) => ({
                                value: String(e.id),
                                label: e.entity_name,
                              }))}
                              value={field.value ? String(field.value) : ''}
                              onValueChange={(val) => field.onChange(val ? parseInt(val, 10) : undefined)}
                              disabled={isLoadingEntities || hasRole('Entity Admin')}
                              placeholder="Select entity"
                              searchPlaceholder="Search entity..."
                              emptyMessage={isEntitiesError ? 'Failed to load entities.' : 'No active entities found.'}
                              className="h-9 text-sm"
                            />
                            <p className="text-[11px] text-muted-foreground">Choose the parent entity for this business unit.</p>
                            {isEntitiesError && (
                              <p className="text-[11px] text-destructive">
                                Couldn't load entities: {extractApiError(entitiesError)}
                              </p>
                            )}
                            <FormMessage className="text-[11px]" />
                          </FormItem>
                        )}
                      />
                    )}

                    {!isEdit && !isSubBu && (
                      <FormField
                        control={form.control}
                        name="company_code"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-xs text-foreground font-medium">
                              BU Code <span className="text-destructive ml-0.5">*</span>
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. ACME" maxLength={20} className="h-9 text-sm border-gray-200" {...field} />
                            </FormControl>
                            <p className="text-[11px] text-muted-foreground">Unique code for the business unit (max 20 characters).</p>
                            <FormMessage className="text-[11px]" />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="company_name"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-xs text-foreground font-medium">
                            {isSubBu ? 'Sub BU Name' : 'BU Name'} <span className="text-destructive ml-0.5">*</span>
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Acme Corporation" className="h-9 text-sm border-gray-200" {...field} />
                          </FormControl>
                          <p className="text-[11px] text-muted-foreground">
                            {isSubBu ? 'Enter a descriptive name for the Sub-BU.' : 'Enter a descriptive name for the business unit.'}
                          </p>
                          <FormMessage className="text-[11px]" />
                        </FormItem>
                      )}
                    />

                    {isEdit && (
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-xs text-foreground font-medium mb-1">Status</FormLabel>
                            <FormControl>
                              <button
                                type="button"
                                onClick={() => field.onChange(field.value === 'active' ? 'inactive' : 'active')}
                                className={cn(
                                  'flex items-center justify-between gap-1.5 rounded-full px-2 py-1 w-[72px] transition-all duration-300 focus:outline-none',
                                  field.value === 'active' ? 'bg-blue-500 text-white flex-row' : 'bg-slate-300 text-slate-700 flex-row-reverse'
                                )}
                              >
                                <span className="text-[11px] font-medium leading-none px-0.5">
                                  {field.value === 'active' ? 'Active' : 'Inactive'}
                                </span>
                                <div className="h-3 w-3 shrink-0 rounded-full bg-white shadow-sm" />
                              </button>
                            </FormControl>
                            <FormMessage className="text-[11px]" />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>

                {/* A Sub-BU inherits its parent's Week Off Policy — not asked for here at all,
                    same reasoning as Entity/BU Code above, and equally true once it already
                    exists (isEditingSubBu), not just while it's being created. */}
                {!isSubBu && !isEditingSubBu && (
                <div className="space-y-3 pt-1 border-t">
                  <div className="flex items-start gap-2.5 pt-4">
                    {/* <Calendar className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" /> */}
                    <div className="space-y-0.5">
                      <h3 className="peer-disabled:cursor-not-allowed peer-disabled:opacity-70 text-xs text-foreground font-medium">Week Off Policy</h3>
                      {/* <p className="text-xs text-muted-foreground">Select the regular Saturday off schedule for this business unit.</p> */}
                    </div>
                  </div>

                  <FormField
                    control={form.control}
                    name="saturday_off_rule"
                    render={({ field }) => (
                      <FormItem className="space-y-1.5">
                        <FormControl>
                          <Select value={field.value} onValueChange={field.onChange}>
                            <SelectTrigger className="h-11 text-sm border-gray-200">
                              <SelectValue />
                            </SelectTrigger>
                            <SelectContent>
                              {WEEK_OFF_POLICY_OPTIONS.map((opt) => (
                                <SelectItem key={opt.value} value={opt.value} className="py-2 pl-3 pr-3 [&>span:first-child]:hidden">
                                  <div className="flex items-center gap-2.5">
                                    <Calendar className={cn('h-4 w-4 shrink-0', WEEK_OFF_POLICY_COLORS[opt.value])} />
                                    <div className="text-sm font-medium leading-tight">{opt.label}</div>
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </FormControl>
                        <FormMessage className="text-[11px]" />
                      </FormItem>
                    )}
                  />

                </div>
                )}
              </form>
            </Form>
          )}
        </div>

        <SheetFooter className="px-6 py-4 border-t bg-gray-50/80 mt-auto flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleClose} className="h-9 text-xs">
            Cancel
          </Button>
          <Button type="submit" form="company-form" disabled={isSubmitting} size="sm" className="h-9 text-xs bg-blue-600 hover:bg-blue-700 text-white">
            <Save className="mr-2 h-3.5 w-3.5" />
            {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : isSubBu ? 'Create Sub-BU' : 'Create BU'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default CompanyForm;
