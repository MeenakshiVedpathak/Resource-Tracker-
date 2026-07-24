import { rolesApi } from '@/api/roles.api';
import { useAuth } from '@/hooks/useAuth';

// Imperative fetch — call this after a Role Master edit (see RoleForm.jsx) so the current
// session picks up an is_original_data_visible change immediately instead of waiting for the
// next login. (Login itself derives the flag straight from the login response's roles[] —
// see Login.jsx — so this hook only covers the mid-session refresh.)
//
// Refetches GET /roles, matches the rows against the logged-in user's own role id(s), and
// re-derives is_original_data_visible from those matches — true if ANY of the user's roles
// has it set, same "any role grants it" rule as useCanWrite/useCanViewOriginalData.
export const useRefreshOriginalDataVisibility = () => {
  const { roleIds, isAuthenticated, setIsOriginalDataVisible } = useAuth();
  return async () => {
    if (!isAuthenticated || !roleIds?.length) return;
    try {
      const res = await rolesApi.getAll({ limit: 1000 });
      const allRoles = Array.isArray(res?.data) ? res.data : [];
      const myRoles = allRoles.filter((r) => roleIds.includes(r.id));
      setIsOriginalDataVisible(myRoles.some((r) => r.is_original_data_visible === true));
    } catch {
      // Non-fatal: the toggle just stays at its last known value until the next successful refresh.
    }
  };
};
