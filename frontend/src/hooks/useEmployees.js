import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeesApi } from '@/api/employees.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useEmployees = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.EMPLOYEES(params),
    queryFn: () => employeesApi.getAll(params),
    placeholderData: (prev) => prev,
  });

export const useActiveEmployees = () =>
  useQuery({
    queryKey: QUERY_KEYS.EMPLOYEES_ACTIVE,
    queryFn: employeesApi.getActiveList,
    staleTime: 1000 * 60 * 10,
  });

export const useEmployee = (id) =>
  useQuery({
    queryKey: QUERY_KEYS.EMPLOYEE(id),
    queryFn: () => employeesApi.getById(id),
    enabled: !!id,
  });

export const useCreateEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: employeesApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
};

export const useUpdateEmployee = (id) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => employeesApi.update(id, payload),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['employees'] });
      qc.invalidateQueries({ queryKey: QUERY_KEYS.EMPLOYEE(id) });
    },
  });
};

export const useDeleteEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: employeesApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
};

export const useImportEmployees = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: employeesApi.import,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employees'] }),
  });
};
