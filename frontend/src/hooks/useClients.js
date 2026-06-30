import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { clientsApi } from '@/api/clients.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useClients = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.CLIENTS(params),
    queryFn: () => clientsApi.getAll(params),
    placeholderData: (prev) => prev,
  });

export const useActiveClients = () =>
  useQuery({
    queryKey: QUERY_KEYS.CLIENTS_ACTIVE,
    queryFn: clientsApi.getActiveList,
    staleTime: 1000 * 60 * 10,
  });

export const useClient = (id) =>
  useQuery({
    queryKey: QUERY_KEYS.CLIENT(id),
    queryFn: () => clientsApi.getById(id),
    enabled: !!id,
  });

export const useCreateClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clientsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
};

export const useUpdateClient = (id) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => clientsApi.update(id, payload),
    onSuccess: () => Promise.all([
        qc.invalidateQueries({ queryKey: ['clients'] }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.CLIENT(id) })
      ]),
  });
};

export const useDeleteClient = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: clientsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['clients'] }),
  });
};
