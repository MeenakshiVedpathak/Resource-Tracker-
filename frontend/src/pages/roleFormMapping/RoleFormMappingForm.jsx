import { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useRole } from '@/hooks/useRoles';
import { useForms } from '@/hooks/useForms';
import { useRoleFormMappings, useSetRoleFormMapping } from '@/hooks/useRoleFormMappings';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { ROUTES } from '@/constants/routes';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';

const FormSkeleton = () => (
  <div className="space-y-4 p-4">
    {Array.from({ length: 5 }).map((_, i) => (
      <div key={i} className="space-y-2 h-10 bg-muted animate-pulse rounded-md" />
    ))}
  </div>
);

const RoleFormMappingForm = () => {
  const navigate = useNavigate();
  const { roleId } = useParams();
  const { success, error: showError } = useNotification();

  const { data: role, isPending: isLoadingRole } = useRole(roleId);
  const { data: formsData, isPending: isLoadingForms } = useForms({ status: 'active', limit: 1000 });
  const { data: currentMappings, isPending: isLoadingMappings } = useRoleFormMappings(roleId);

  const setMappingMutation = useSetRoleFormMapping(roleId);

  // Administration forms (Users, Roles, Forms, mapping screens, etc.) are RBAC-admin-only —
  // never offered here so a role can't be granted access to manage RBAC itself.
  const allForms = (formsData?.data ?? []).filter(
    (f) => (f.module_name ?? '').trim().toLowerCase() !== 'administration'
  );
  const [checkedIds, setCheckedIds] = useState([]);
  const [pendingIds, setPendingIds] = useState([]);

  useEffect(() => {
    if (currentMappings) {
      // GET /roles/form-mappings/:roleId returns EVERY mapping row ever created for this
      // role, including ones since unmapped (soft-deleted to status:false) — it is not
      // pre-filtered to "currently mapped." Must filter to status===true here, same as
      // getAccessibleForms does for the sidebar, or an unmapped form's checkbox stays
      // checked forever since its row never disappears from the response.
      // `f.id` is the mapping row's own primary key, NOT the form's id — that's `f.form_id`
      // (or nested `f.form.id`).
      setCheckedIds(
        (currentMappings ?? [])
          .filter((f) => f.status === true)
          .map((f) => f.form_id ?? f.form?.id ?? f.id)
      );
    }
  }, [currentMappings]);

  const groupedByModule = useMemo(() => {
    const groups = {};
    allForms.forEach((f) => {
      const key = f.module_name ?? 'Other';
      if (!groups[key]) groups[key] = [];
      groups[key].push(f);
    });
    return groups;
  }, [allForms]);

  const handleClose = () => navigate(ROUTES.ROLES);

  const toggleForm = (formId, checked) => {
    setPendingIds((prev) => [...prev, formId]);
    const onSettled = () => setPendingIds((prev) => prev.filter((id) => id !== formId));
    const revert = () => setCheckedIds((prev) =>
      checked ? prev.filter((id) => id !== formId) : [...prev, formId]
    );

    setCheckedIds((prev) => (checked ? [...prev, formId] : prev.filter((id) => id !== formId)));
    setMappingMutation.mutate(
      { formId, status: checked },
      {
        onError: (err) => {
          revert();
          showError(extractApiError(err));
        },
        onSuccess: () => success(checked ? 'Form added to role.' : 'Form removed from role.'),
        onSettled,
      }
    );
  };

  const isLoading = isLoadingRole || isLoadingForms || isLoadingMappings;

  return (
    <Sheet open={true} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-xl p-0 flex flex-col bg-white overflow-hidden">
        <SheetHeader className="px-5 py-3 border-b">
          <SheetTitle className="text-base font-medium text-left">
            Manage Forms — {role?.role_name ?? '…'}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <FormSkeleton />
          ) : Object.keys(groupedByModule).length === 0 ? (
            <p className="text-sm text-muted-foreground">No active forms found. Add forms in Form Master first.</p>
          ) : (
            <div className="space-y-5">
              {Object.entries(groupedByModule).map(([moduleName, forms]) => (
                <div key={moduleName} className="space-y-2">
                  <h3 className="text-xs font-semibold text-foreground border-b pb-1">{moduleName}</h3>
                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    {forms.map((form) => {
                      const checked = checkedIds.includes(form.id);
                      const isPendingRow = pendingIds.includes(form.id);
                      return (
                        <label
                          key={form.id}
                          className="flex cursor-pointer items-center gap-3 rounded border px-3 py-2 transition-colors hover:bg-accent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                        >
                          <Checkbox
                            checked={checked}
                            disabled={isPendingRow}
                            onCheckedChange={(val) => toggleForm(form.id, !!val)}
                          />
                          <span className="text-sm font-medium leading-none flex-1 min-w-0 truncate">{form.form_name}</span>
                        </label>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        <SheetFooter className="px-5 py-3 border-t mt-auto flex-row justify-end gap-3 items-center bg-white">
          <Button type="button" className="bg-blue-600 hover:bg-blue-700 h-8 text-sm" onClick={handleClose}>
            Done
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default RoleFormMappingForm;
