import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { buAdminsApi } from '@/api/buAdmins.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useBuAdmins = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.BU_ADMINS(params),
    queryFn: () => buAdminsApi.getAll(params),
    placeholderData: (prev) => prev,
  });

export const useBuAdmin = (id) =>
  useQuery({
    queryKey: QUERY_KEYS.BU_ADMIN(id),
    queryFn: () => buAdminsApi.getById(id),
    enabled: !!id,
  });

export const useUpdateBuAdmin = (id) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => buAdminsApi.update(id, payload),
    onSuccess: () => Promise.all([
        qc.invalidateQueries({ queryKey: ['bu-admins'] }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.BU_ADMIN(id) })
      ]),
  });
};

export const useUpdateBuAdminStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, status }) => buAdminsApi.updateStatus(id, status),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['bu-admins'] }),
  });
};
