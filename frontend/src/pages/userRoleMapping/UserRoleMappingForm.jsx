import { useEffect, useState, useRef } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useUser } from '@/hooks/useUsers';
import { useRoles } from '@/hooks/useRoles';
import { useUserRoleMappings, useReplaceUserRoleMappings } from '@/hooks/useUserRoleMappings';
import { useNotification } from '@/hooks/useNotification';
import { extractApiError } from '@/services/apiClient';
import { ROUTES } from '@/constants/routes';
import { isProtectedAccount } from '@/constants/protectedAccounts';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import {
  Sheet, SheetContent, SheetHeader, SheetTitle, SheetFooter,
} from '@/components/ui/sheet';

const FormSkeleton = () => (
  <div className="space-y-4 p-4">
    {Array.from({ length: 4 }).map((_, i) => (
      <div key={i} className="space-y-2 h-14 bg-muted animate-pulse rounded-md" />
    ))}
  </div>
);

const UserRoleMappingForm = () => {
  const navigate = useNavigate();
  const { userId } = useParams();
  const { success, error: showError } = useNotification();

  const { data: user, isPending: isLoadingUser } = useUser(userId);
  const { data: rolesData } = useRoles({ status: 'active', limit: 100 });
  const { data: currentMappings, isPending: isLoadingMappings } = useUserRoleMappings(userId);
  const replaceMutation = useReplaceUserRoleMappings(userId);

  // Direct-URL safety net — the "Manage Roles" action is already disabled in the list for
  // this account, but nothing stops someone navigating to the edit URL by hand.
  useEffect(() => {
    if (user && isProtectedAccount(user.email)) {
      showError('This account is protected and its roles cannot be changed.');
      navigate(ROUTES.USER_ROLE_MAPPING, { replace: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user]);

  const roles = rolesData?.data ?? [];
  const [selectedIds, setSelectedIds] = useState([]);
  const didInitRef = useRef(false);

  useEffect(() => {
    if (currentMappings && !didInitRef.current) {
      didInitRef.current = true;
      // Same shape as GET /roles/form-mappings/:roleId, which is confirmed to return EVERY
      // mapping row ever created — including soft-unmapped ones (status:false) — not just
      // the currently-active ones. Filtering to status===true here defensively, so an
      // unassigned role's checkbox doesn't stay checked forever, the same bug that hit
      // Role Form Mapping. `r.id` is the mapping row's own primary key, NOT the role's id
      // (that's `r.role_id` or nested `r.role.id`).
      setSelectedIds(
        (currentMappings ?? [])
          .filter((r) => r.status !== false)
          .map((r) => r.role_id ?? r.role?.id ?? r.id)
      );
    }
  }, [currentMappings]);

  const toggleRole = (roleId, checked) => {
    setSelectedIds((prev) => (checked ? [...prev, roleId] : prev.filter((id) => id !== roleId)));
  };

  const handleClose = () => navigate(ROUTES.USER_ROLE_MAPPING);

  const handleSave = () => {
    replaceMutation.mutate(selectedIds, {
      onSuccess: () => {
        success('Roles updated successfully.');
        handleClose();
      },
      onError: (err) => showError(extractApiError(err)),
    });
  };

  const isLoading = isLoadingUser || isLoadingMappings;

  return (
    <Sheet open={true} onOpenChange={(open) => !open && handleClose()}>
      <SheetContent side="right" className="w-full sm:max-w-lg p-0 flex flex-col bg-white overflow-hidden">
        <SheetHeader className="px-5 py-3 border-b">
          <SheetTitle className="text-base font-medium text-left">
            Manage Roles — {user?.email ?? '…'}
          </SheetTitle>
        </SheetHeader>

        <div className="flex-1 overflow-y-auto p-5">
          {isLoading ? (
            <FormSkeleton />
          ) : (
            <div className="space-y-2">
              <h3 className="text-xs font-semibold text-foreground border-b pb-1">Roles</h3>
              <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                {roles.map((role) => {
                  const checked = selectedIds.includes(role.id);
                  return (
                    <label
                      key={role.id}
                      className="flex cursor-pointer items-center gap-3 rounded border px-3 py-2 transition-colors hover:bg-accent has-[[data-state=checked]]:border-primary has-[[data-state=checked]]:bg-primary/5"
                    >
                      <Checkbox
                        checked={checked}
                        onCheckedChange={(val) => toggleRole(role.id, !!val)}
                      />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none">{role.role_name}</p>
                        <p className="text-[10px] text-muted-foreground mt-0.5">{role.permission}</p>
                      </div>
                      {checked && (
                        <Badge variant="secondary" className="text-[10px] shrink-0">Selected</Badge>
                      )}
                    </label>
                  );
                })}
              </div>
              {selectedIds.length > 0 && (
                <p className="text-[10px] text-muted-foreground mt-1">
                  {selectedIds.length} role{selectedIds.length > 1 ? 's' : ''} selected
                </p>
              )}
            </div>
          )}
        </div>

        <SheetFooter className="px-5 py-3 border-t mt-auto flex-row justify-end gap-3 items-center bg-white">
          <Button type="button" variant="outline" className="border-gray-200 h-8 text-sm" onClick={handleClose}>
            Cancel
          </Button>
          <Button
            type="button"
            className="bg-blue-600 hover:bg-blue-700 h-8 text-sm"
            onClick={handleSave}
            disabled={replaceMutation.isPending || isLoading}
          >
            {replaceMutation.isPending ? 'Saving…' : 'Save & Close'}
          </Button>
        </SheetFooter>
      </SheetContent>
    </Sheet>
  );
};

export default UserRoleMappingForm;
