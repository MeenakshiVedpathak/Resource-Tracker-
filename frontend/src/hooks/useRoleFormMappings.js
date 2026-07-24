import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { rolesApi } from '@/api/roles.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useRoleFormMappings = (roleId) =>
  useQuery({
    queryKey: QUERY_KEYS.ROLE_FORM_MAPPINGS(roleId),
    queryFn: () => rolesApi.getRoleFormMappings(roleId),
    enabled: !!roleId,
  });

// Primary map/unmap mutation — POST /roles/forms/mapping with an explicit status flag.
export const useSetRoleFormMapping = (roleId) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ formId, status }) => rolesApi.setFormMapping({ roleId, formId, status }),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.ROLE_FORM_MAPPINGS(roleId) }),
  });
};
