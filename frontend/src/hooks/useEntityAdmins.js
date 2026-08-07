import { useMutation } from '@tanstack/react-query';
import { entityAdminsApi } from '@/api/entityAdmins.api';

export const useCreateEntityAdmin = () =>
  useMutation({
    mutationFn: entityAdminsApi.create,
  });
