import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { managerMappingsApi } from '@/api/managerMappings.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useManagerMappings = () =>
  useQuery({
    queryKey: QUERY_KEYS.MANAGER_MAPPINGS,
    queryFn: managerMappingsApi.getAll,
  });

export const useCreateManagerMapping = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: managerMappingsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.MANAGER_MAPPINGS }),
  });
};

export const useDeleteManagerMapping = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: managerMappingsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.MANAGER_MAPPINGS }),
  });
};
