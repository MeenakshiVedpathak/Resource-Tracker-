import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { entitiesApi } from '@/api/entities.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useEntities = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.ENTITIES(params),
    queryFn: () => entitiesApi.getAll(params),
    placeholderData: (prev) => prev,
  });

// No dedicated /entities/active/list endpoint (unlike Clients/Projects) — reuse the paginated
// list with a generous limit, same fallback the app already uses for Service Types/Categories.
export const useActiveEntities = () =>
  useQuery({
    queryKey: QUERY_KEYS.ENTITIES_ACTIVE,
    queryFn: () => entitiesApi.getAll({ status: 'active', limit: 200 }),
    select: (data) => (Array.isArray(data?.data) ? data.data : []),
    staleTime: 1000 * 60 * 10,
  });

export const useEntity = (id) =>
  useQuery({
    queryKey: QUERY_KEYS.ENTITY(id),
    queryFn: () => entitiesApi.getById(id),
    enabled: !!id,
  });

export const useCreateEntity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: entitiesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entities'] }),
  });
};

export const useUpdateEntity = (id) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => entitiesApi.update(id, payload),
    onSuccess: () => Promise.all([
        qc.invalidateQueries({ queryKey: ['entities'] }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.ENTITY(id) })
      ]),
  });
};

export const useDeleteEntity = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: entitiesApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['entities'] }),
  });
};
