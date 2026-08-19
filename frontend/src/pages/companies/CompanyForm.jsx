import { useEffect, useRef, useState } from 'react';
import { useNavigate, useParams, useSearchParams } from 'react-router-dom';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Save, Eye, EyeOff } from 'lucide-react';
import { useCompany, useCreateCompany, useUpdateCompany } from '@/hooks/useCompanies';
import { useActiveEntities } from '@/hooks/useEntities';
import { useAuth } from '@/hooks/useAuth';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError, extractFieldErrors } from '@/services/apiClient';
import { employeeBaseFields } from '@/constants/employeeFormSchema';
import { ROUTES } from '@/constants/routes';
import {
  Form, FormField, FormItem, FormLabel, FormControl, FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SearchableSelect } from '@/components/ui/searchable-select';
import { cn } from '@/utils/cn';
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetFooter,
} from '@/components/ui/sheet';

// A BU Admin always comes bundled with a new Company AND, per the "BU Admin is also an Employee"
// requirement, a new Employee Master record — one form, one submit, one backend call. The
// Employee-shaped fields below (full_name/employee_code/designation/etc.) are literally the same
// Zod schemas EmployeeForm.jsx uses (imported from constants/employeeFormSchema.js), not a
// re-typed copy, so validation can't drift between the two forms. Email is intentionally NOT
// duplicated as a separate Employee field — admin_email is reused as the Employee's email, since
// this is one person's one login.
const createSchema = z.object({
  entity_id: z.coerce.number({ required_error: 'Entity is required' }).positive('Entity is required'),
  company_code: z.string().min(1, 'BU code is required').max(50),
  company_name: z.string().min(1, 'BU name is required').max(100),
  admin_email: z.string().min(1, 'Admin email is required').email('Enter a valid email'),
  admin_password: z.string().min(8, 'Password must be at least 8 characters'),
  full_name: employeeBaseFields.full_name,
  employee_code: employeeBaseFields.employee_code,
  designation: employeeBaseFields.designation,
  date_of_joining: employeeBaseFields.date_of_joining,
  date_of_leaving: employeeBaseFields.date_of_leaving,
  total_experience: employeeBaseFields.total_experience,
  company_experience: employeeBaseFields.company_experience,
  resource_description: employeeBaseFields.resource_description,
});

const editSchema = z.object({
  company_name: z.string().min(1, 'BU name is required').max(100),
  status: z.enum(['active', 'inactive']).default('active'),
});

// Known create-mode field names — used to route a backend field-validation error (duplicate
// email, duplicate employee code, invalid entity, etc.) to the right input instead of a generic
// toast. A returned field key may come back dot-prefixed (e.g. "employee.employee_code") since the
// request body is grouped into company/admin/employee sections — matched on the suffix after the
// last '.' as well as the raw key, so either shape lands correctly.
const CREATE_FIELD_NAMES = [
  'entity_id', 'company_code', 'company_name', 'admin_email', 'admin_password',
  'full_name', 'employee_code', 'designation', 'date_of_joining', 'date_of_leaving',
  'total_experience', 'company_experience', 'resource_description',
];

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
  const isEdit = !!id;
  const { success, error: showError } = useNotification();
  const { hasRole } = useAuth();
  const [showPassword, setShowPassword] = useState(false);

  const { data: company, isPending: isLoadingCompany } = useCompany(id);
  const {
    data: activeEntities = [],
    isPending: isLoadingEntities,
    isError: isEntitiesError,
    error: entitiesError,
  } = useActiveEntities();
  const createMutation = useCreateCompany();
  const updateMutation = useUpdateCompany(id);

  const form = useForm({
    resolver: zodResolver(isEdit ? editSchema : createSchema),
    defaultValues: isEdit
      ? { company_name: '', status: 'active' }
      : {
          entity_id: entityIdParam ?? '', company_code: '', company_name: '',
          admin_email: '', admin_password: '',
          full_name: '', employee_code: '', designation: '',
          date_of_joining: '', date_of_leaving: '',
          total_experience: '', company_experience: '', resource_description: '',
        },
  });

  useEffect(() => {
    if (company && isEdit) {
      form.reset({
        company_name: company.company_name ?? '',
        status: company.status ?? 'active',
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
      !isEdit && !entityIdParam && hasRole('Entity Admin') &&
      !isLoadingEntities && activeEntities.length > 0 && !didDefaultEntityRef.current
    ) {
      didDefaultEntityRef.current = true;
      form.setValue('entity_id', activeEntities[0].id);
    }
  }, [isEdit, entityIdParam, hasRole, isLoadingEntities, activeEntities, form]);

  // Same auto-calc EmployeeForm uses for its own Company Exp. field — kept in sync here since
  // this create form is also creating that Employee record.
  const dateOfJoining = useWatch({ control: form.control, name: 'date_of_joining' });
  useEffect(() => {
    if (isEdit) return;
    if (!dateOfJoining) {
      form.setValue('company_experience', '');
      return;
    }
    const start = new Date(dateOfJoining);
    if (isNaN(start.getTime())) return;
    const diffMs = Date.now() - start.getTime();
    const years = diffMs / (1000 * 60 * 60 * 24 * 365.25);
    form.setValue('company_experience', Math.max(0, parseFloat(years.toFixed(1))));
  }, [isEdit, dateOfJoining, form]);

  // Maps a 422/409 field-validation error (duplicate email, duplicate employee code, invalid
  // entity, etc.) onto the specific input it belongs to. Returns whether anything matched, so the
  // caller can fall back to a form-level toast for anything it couldn't place (e.g. a generic
  // transaction failure with no field attached).
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
    if (isEdit) {
      updateMutation.mutate(values, {
        onSuccess: () => {
          success('BU updated successfully.');
          handleClose();
        },
        onError: (err) => {
          if (!applyFieldErrors(err)) showError(extractApiError(err));
        },
      });
      return;
    }

    // One request, three logical sections — the backend creates Company + Employee + User +
    // both role assignments (BU Admin, Employee) inside a single transaction. The frontend never
    // makes separate create calls for these.
    const payload = {
      company: {
        entity_id: values.entity_id,
        company_code: values.company_code,
        company_name: values.company_name,
      },
      admin: {
        admin_email: values.admin_email,
        admin_password: values.admin_password,
      },
      employee: Object.fromEntries(
        Object.entries({
          employee_code: values.employee_code,
          full_name: values.full_name,
          email: values.admin_email,
          designation: values.designation,
          total_experience: values.total_experience,
          company_experience: values.company_experience,
          resource_description: values.resource_description,
          date_of_joining: values.date_of_joining,
          date_of_leaving: values.date_of_leaving,
        }).filter(([, v]) => v !== '' && v != null)
      ),
    };

    createMutation.mutate(payload, {
      onSuccess: () => {
        success('BU and BU Admin created successfully.');
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
      <SheetContent side="right" className="w-full sm:max-w-2xl p-0 flex flex-col bg-white overflow-hidden">
        <SheetHeader className="px-5 py-4 border-b">
          <SheetTitle className="text-base font-medium text-left">
            {isEdit ? 'Edit BU' : 'Create BU'}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto bg-slate-50/50">
          {isEdit && isLoadingCompany ? (
            <FormSkeleton />
          ) : (
            <Form {...form}>
              <form id="company-form" onSubmit={form.handleSubmit(onSubmit)} className="p-5 flex flex-col gap-6">
                <div className="space-y-2">
                  <h3 className="text-xs font-semibold text-foreground border-b pb-1">BU Details</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    {isEdit && (
                      <div className="space-y-1">
                        <span className="text-[11px] text-muted-foreground font-medium">BU Code</span>
                        <Input value={company?.company_code ?? ''} disabled className="h-8 text-sm border-gray-200 bg-muted/40" />
                      </div>
                    )}

                    {!isEdit && (
                      <FormField
                        control={form.control}
                        name="entity_id"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[11px] text-muted-foreground font-medium">
                              <span className="text-destructive mr-0.5">*</span> Entity
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
                              className="h-8 text-sm"
                            />
                            {isEntitiesError && (
                              <p className="text-[10px] text-destructive">
                                Couldn't load entities: {extractApiError(entitiesError)}
                              </p>
                            )}
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    )}

                    {!isEdit && (
                      <FormField
                        control={form.control}
                        name="company_code"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[11px] text-muted-foreground font-medium">
                              <span className="text-destructive mr-0.5">*</span> BU Code
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. ACME" className="h-8 text-sm border-gray-200" {...field} />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    )}

                    <FormField
                      control={form.control}
                      name="company_name"
                      render={({ field }) => (
                        <FormItem className="space-y-1">
                          <FormLabel className="text-[11px] text-muted-foreground font-medium">
                            <span className="text-destructive mr-0.5">*</span> BU Name
                          </FormLabel>
                          <FormControl>
                            <Input placeholder="e.g. Acme Corporation" className="h-8 text-sm border-gray-200" {...field} />
                          </FormControl>
                          <FormMessage className="text-[10px]" />
                        </FormItem>
                      )}
                    />

                    {isEdit && (
                      <FormField
                        control={form.control}
                        name="status"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[11px] text-muted-foreground font-medium mb-1">Status</FormLabel>
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
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    )}
                  </div>
                </div>

                {!isEdit && (
                  <div className="space-y-2">
                    <div className="border-t pt-4 space-y-1">
                      <h3 className="text-xs font-semibold text-foreground pb-1">BU Admin / Employee Details</h3>
                      <p className="text-[11px] text-muted-foreground">
                        This person is created as both the BU's first admin login and its first Employee Master record.
                      </p>
                    </div>
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                      <FormField
                        control={form.control}
                        name="full_name"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[11px] text-muted-foreground font-medium">
                              <span className="text-destructive mr-0.5">*</span> Full Name
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. John Smith"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value.replace(/[^A-Za-z\s]/g, ''))}
                                className="h-8 text-sm border-gray-200"
                              />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="employee_code"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[11px] text-muted-foreground font-medium">
                              <span className="text-destructive mr-0.5">*</span> Employee Code
                            </FormLabel>
                            <FormControl>
                              <Input
                                placeholder="e.g. EMP-001"
                                {...field}
                                onChange={(e) => field.onChange(e.target.value.toUpperCase())}
                                className="h-8 text-sm border-gray-200"
                              />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="admin_email"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[11px] text-muted-foreground font-medium">
                              <span className="text-destructive mr-0.5">*</span> Email
                            </FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. admin@acme.com" type="email" className="h-8 text-sm border-gray-200" {...field} />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="admin_password"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[11px] text-muted-foreground font-medium">
                              <span className="text-destructive mr-0.5">*</span> Password
                            </FormLabel>
                            <FormControl>
                              <div className="relative">
                                <Input
                                  type={showPassword ? 'text' : 'password'}
                                  placeholder="Min. 8 characters"
                                  autoComplete="new-password"
                                  className="h-8 text-sm border-gray-200 pr-9"
                                  {...field}
                                />
                                <button
                                  type="button"
                                  onClick={() => setShowPassword((v) => !v)}
                                  className="absolute right-2.5 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground transition-colors"
                                  tabIndex={-1}
                                >
                                  {showPassword ? <EyeOff className="h-3.5 w-3.5" /> : <Eye className="h-3.5 w-3.5" />}
                                </button>
                              </div>
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="designation"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[11px] text-muted-foreground font-medium">Designation</FormLabel>
                            <FormControl>
                              <Input placeholder="e.g. Senior Engineer" {...field} className="h-8 text-sm border-gray-200" />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="date_of_joining"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[11px] text-muted-foreground font-medium">
                              <span className="text-destructive mr-0.5">*</span> Date of Joining
                            </FormLabel>
                            <FormControl>
                              <Input type="date" {...field} className="h-8 text-sm border-gray-200" />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="total_experience"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[11px] text-muted-foreground font-medium">Total Experience (yrs)</FormLabel>
                            <FormControl>
                              <Input type="number" step="0.1" min="0" max="60" placeholder="e.g. 7.5" {...field} className="h-8 text-sm border-gray-200" />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="company_experience"
                        render={({ field }) => (
                          <FormItem className="space-y-1">
                            <FormLabel className="text-[11px] text-muted-foreground font-medium">Company Exp. (yrs)</FormLabel>
                            <FormControl>
                              <Input
                                type="number"
                                step="0.1"
                                placeholder="Auto-calculated"
                                readOnly
                                tabIndex={-1}
                                className="h-8 text-sm bg-muted cursor-not-allowed border-gray-200"
                                {...field}
                                value={field.value ?? ''}
                              />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />

                      <FormField
                        control={form.control}
                        name="resource_description"
                        render={({ field }) => (
                          <FormItem className="space-y-1 sm:col-span-2">
                            <FormLabel className="text-[11px] text-muted-foreground font-medium">Resource Description</FormLabel>
                            <FormControl>
                              <Textarea
                                placeholder="Skills, certifications, and project experience…"
                                className="h-12 min-h-0 text-sm resize-none border-gray-200"
                                {...field}
                              />
                            </FormControl>
                            <FormMessage className="text-[10px]" />
                          </FormItem>
                        )}
                      />
                    </div>

                    <div className="border-t pt-3 space-y-1.5">
                      <span className="text-[11px] text-muted-foreground font-medium">Roles automatically assigned</span>
                      <div className="flex items-center gap-1.5">
                        <Badge variant="info">BU Admin</Badge>
                        <Badge variant="muted">Employee</Badge>
                      </div>
                      <p className="text-[10px] text-muted-foreground">
                        This BU Admin will also be created as an Employee — roles are assigned automatically and can't be changed here.
                      </p>
                    </div>
                  </div>
                )}
              </form>
            </Form>
          )}
        </div>

        <SheetFooter className="px-5 py-4 border-t bg-gray-50/80 mt-auto flex justify-end gap-2">
          <Button type="button" variant="outline" size="sm" onClick={handleClose} className="h-8 text-xs">
            Cancel
          </Button>
          <Button type="submit" form="company-form" disabled={isSubmitting} size="sm" className="h-8 text-xs bg-blue-600 hover:bg-blue-700 text-white">
            <Save className="mr-2 h-3.5 w-3.5" />
            {isSubmitting ? 'Saving...' : isEdit ? 'Save Changes' : 'Create BU'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default CompanyForm;
