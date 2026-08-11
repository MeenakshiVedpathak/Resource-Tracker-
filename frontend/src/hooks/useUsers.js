import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi, managerCandidatesParams } from '@/api/users.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useUsers = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.USERS(params),
    queryFn: () => usersApi.getAll(params),
    placeholderData: (prev) => prev,
  });

// Manager-tier Users (Manager, Service PO Admin, Project Admin — §3.1) for the Employee
// primary/secondary manager pickers. Restricted to those also linked to an Employee record
// (`employee_id` set) — a manager-tier User Master account with no Employee record isn't a
// valid pick here, only actual Employees are.
export const useAssignableManagers = () =>
  useQuery({
    queryKey: QUERY_KEYS.USERS(managerCandidatesParams),
    queryFn: () => usersApi.getAll(managerCandidatesParams),
    select: (res) => (res?.data ?? []).filter((u) => u.employee_id != null || u.employee != null),
  });

export const useUser = (id) =>
  useQuery({
    queryKey: QUERY_KEYS.USER(id),
    queryFn: () => usersApi.getById(id),
    enabled: !!id,
  });

export const useCreateUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useUpdateUser = (id) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => usersApi.update(id, payload),
    onSuccess: () => Promise.all([
        qc.invalidateQueries({ queryKey: ['users'] }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.USER(id) })
      ]),
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

export const useToggleUserStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => usersApi.update(id, { status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};

// HR/senior-admin resets a User's forgotten password — no old password required (§2.6). Used
// both from the Users screen directly and from Employee List (targeting the Employee's linked
// User id, not the Employee id).
export const useResetUserPassword = () =>
  useMutation({
    mutationFn: ({ id, newPassword, confirmPassword }) => usersApi.resetPassword(id, newPassword, confirmPassword),
  });
