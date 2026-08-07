import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { projectsApi } from '@/api/projects.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useProjects = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.PROJECTS(params),
    queryFn: () => projectsApi.getAll(params),
    placeholderData: (prev) => prev,
  });

export const useActiveProjects = () =>
  useQuery({
    queryKey: QUERY_KEYS.PROJECTS_ACTIVE,
    queryFn: projectsApi.getActiveList,
    staleTime: 1000 * 60 * 10,
  });

export const useProject = (id) =>
  useQuery({
    queryKey: QUERY_KEYS.PROJECT(id),
    queryFn: () => projectsApi.getById(id),
    enabled: !!id,
  });

export const useCreateProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsApi.create,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
};

export const useUpdateProject = (id) => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (payload) => projectsApi.update(id, payload),
    onSuccess: () => Promise.all([
        qc.invalidateQueries({ queryKey: ['projects'] }),
        qc.invalidateQueries({ queryKey: QUERY_KEYS.PROJECT(id) })
      ]),
  });
};

export const useDeleteProject = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: projectsApi.delete,
    onSuccess: () => qc.invalidateQueries({ queryKey: ['projects'] }),
  });
};
