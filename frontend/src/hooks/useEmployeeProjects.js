import { useQuery } from '@tanstack/react-query';
import { employeeProjectsApi } from '@/api/employeeProjects.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useEmployeeMappedProjects = () =>
  useQuery({
    queryKey: QUERY_KEYS.EMPLOYEE_PROJECTS,
    queryFn: employeeProjectsApi.getMappedProjects,
  });
