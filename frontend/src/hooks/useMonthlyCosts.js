import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { monthlyCostsApi } from '@/api/monthlyCosts.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useMonthlyCosts = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.MONTHLY_COSTS(params),
    queryFn: () => monthlyCostsApi.getAll(params),
    placeholderData: (prev) => prev,
  });

export const useMonthlyCost = (id) =>
  useQuery({
    queryKey: QUERY_KEYS.MONTHLY_COST(id),
    queryFn: () => monthlyCostsApi.getById(id),
    enabled: !!id,
  });

export const useCreateMonthlyCost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: monthlyCostsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['monthly-costs'] }),
  });
};

export const useUpdateMonthlyCost = (id) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => monthlyCostsApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['monthly-costs'] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.MONTHLY_COST(id) });
    },
  });
};

export const useDeleteMonthlyCost = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: monthlyCostsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['monthly-costs'] }),
  });
};

export const useCalculateMonthlyCosts = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ month, year }) => monthlyCostsApi.calculateForMonth(month, year),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['monthly-costs'] }),
  });
};

export const useImportMonthlyCosts = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: monthlyCostsApi.import,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['monthly-costs'] }),
  });
};
