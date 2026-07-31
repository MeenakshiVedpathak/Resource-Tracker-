import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { employeeServicePOMappingApi } from '@/api/employeeServicePOMapping.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useServicePOEmployeeMappings = (servicePOId) =>
  useQuery({
    queryKey: QUERY_KEYS.EMPLOYEE_SERVICEPO_MAPPING_BY_SERVICE_PO(servicePOId),
    queryFn: () => employeeServicePOMappingApi.getByServicePO(servicePOId),
    enabled: !!servicePOId,
  });

export const useCreateEmployeeServicePOMapping = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, servicePOId }) => employeeServicePOMappingApi.create(employeeId, servicePOId),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee-servicepo-mapping'] }),
  });
};

export const useDeleteEmployeeServicePOMapping = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => employeeServicePOMappingApi.delete(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee-servicepo-mapping'] }),
  });
};

export const useSetEmployeeServicePOMappingStatus = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, active }) =>
      active ? employeeServicePOMappingApi.activate(id) : employeeServicePOMappingApi.deactivate(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['employee-servicepo-mapping'] }),
  });
};
