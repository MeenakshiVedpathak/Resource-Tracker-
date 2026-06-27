import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { usersApi } from '@/api/users.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useUsers = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.USERS(params),
    queryFn: () => usersApi.getAll(params),
    placeholderData: (prev) => prev,
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
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['users'] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.USER(id) });
    },
  });
};

export const useDeleteUser = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: usersApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['users'] }),
  });
};
