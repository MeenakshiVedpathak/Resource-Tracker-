import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from '@/api/roles.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useUserRoleMappings = (userId) =>
  useQuery({
    queryKey: QUERY_KEYS.USER_ROLE_MAPPINGS(userId),
    queryFn: () => rolesApi.getUserMappings(userId),
    enabled: !!userId,
  });

export const useReplaceUserRoleMappings = (userId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (roleIds) => rolesApi.replaceUserMappings(userId, roleIds),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.USER_ROLE_MAPPINGS(userId) }),
  });
};
