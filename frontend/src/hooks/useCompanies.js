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
    // Create also bootstraps a BU Admin (bu-admins list) and, per the BU-Admin-is-also-an-Employee
    // requirement, an Employee Master record — so both lists need to go stale alongside companies.
    onSuccess: () => Promise.all([
      qc.invalidateQueries({ queryKey: ['companies'] }),
      qc.invalidateQueries({ queryKey: ['bu-admins'] }),
      qc.invalidateQueries({ queryKey: ['employees'] }),
    ]),
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
