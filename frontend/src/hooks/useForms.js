import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { formsApi } from '@/api/forms.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useForms = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.FORMS(params),
    queryFn: () => formsApi.getAll(params),
    placeholderData: (prev) => prev,
  });

export const useFormById = (id) =>
  useQuery({
    queryKey: QUERY_KEYS.FORM(id),
    queryFn: () => formsApi.getById(id),
    enabled: !!id,
  });

export const useCreateForm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: formsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  });
};

export const useUpdateForm = (id) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => formsApi.update(id, payload),
    onSuccess: () => Promise.all([
        qc.invalidateQueries({ queryKey: ['forms'] }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.FORM(id) })
      ]),
  });
};

export const useDeleteForm = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: formsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['forms'] }),
  });
};
