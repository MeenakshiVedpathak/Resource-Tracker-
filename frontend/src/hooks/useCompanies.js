import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { companiesApi } from '@/api/companies.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useCompanies = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.COMPANIES(params),
    queryFn: () => companiesApi.getAll(params),
    placeholderData: (prev) => prev,
  });

export const useCompany = (id) =>
  useQuery({
    queryKey: QUERY_KEYS.COMPANY(id),
    queryFn: () => companiesApi.getById(id),
    enabled: !!id,
  });

export const useCreateCompany = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: companiesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['companies'] }),
  });
};

export const useUpdateCompany = (id) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => companiesApi.update(id, payload),
    onSuccess: () => Promise.all([
      qc.invalidateQueries({ queryKey: ['companies'] }),
      qc.invalidateQueries({ queryKey: QUERY_KEYS.COMPANY(id) }),
    ]),
  });
};
