import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, managerCandidatesParams } from '@/api/users.api';
import { QUERY_KEYS } from '@/constants/queryKeys';
import { MANAGER_TIER_ROLES } from '@/constants/roleHierarchy';

// The real backend only supports filtering /users by role_id (not role_name — see
// managerCandidatesParams), so it silently ignores that param and returns every user,
// Employee-role accounts included. Re-check the role client-side against both the primary
// role (`role`) and any additional roles (`additionalRoles` — confirmed against a live
// response; NOT `roles`) so an Employee never ends up in the manager picker, and a manager-tier
// role held only as an additional role still counts.
const hasManagerTierRole = (u) => {
  const roleNames = [u.role?.role_name, ...(u.additionalRoles ?? []).map((r) => r.role_name)];
  return roleNames.some((name) => MANAGER_TIER_ROLES.includes(name));
};

// Manager-tier Users (Manager, Service PO Admin, Project Admin — §3.1) for the Employee
// primary/secondary manager pickers. Restricted to those also linked to an Employee record
// (`employee_id` set) — a manager-tier User Master account with no Employee record isn't a
// valid pick here, only actual Employees are.
export const useAssignableManagers = () =>
  useQuery({
    queryKey: QUERY_KEYS.USERS(managerCandidatesParams),
    queryFn: () => usersApi.getAll(managerCandidatesParams),
    select: (res) => (res?.data ?? [])
      .filter((u) => u.employee_id != null || u.employee != null)
      .filter(hasManagerTierRole),
  });

// The Employee List's "Reset password" action needs the Employee's linked User id, but
// GET /employees doesn't return one (confirmed against the real backend response — no
// user_id/linked_user_id field). Users do carry `employee_id` back to their Employee, so —
// same client-side-filter workaround as useAssignableManagers, since the real backend only
// honors role_id as a /users filter — fetch and match locally.
export const useUserByEmployeeId = (employeeId) =>
  useQuery({
    queryKey: QUERY_KEYS.USERS({ limit: 200 }),
    queryFn: () => usersApi.getAll({ limit: 200 }),
    select: (res) => (res?.data ?? []).find((u) => u.employee_id === employeeId),
    enabled: !!employeeId,
  });

// HR/senior-admin resets a User's forgotten password — no old password required (§2.6). Used
// both from the Users screen directly and from Employee List (targeting the Employee's linked
// User id, not the Employee id).
export const useResetUserPassword = () =>
  useMutation({
    mutationFn: ({ id, newPassword, confirmPassword }) => usersApi.resetPassword(id, newPassword, confirmPassword),
  });
