import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { myTeamApi } from '@/api/myTeam.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useMyTeamEmployees = ({ enabled = true } = {}) =>
  useQuery({
    queryKey: QUERY_KEYS.MY_TEAM_EMPLOYEES,
    queryFn: myTeamApi.getEmployees,
    enabled,
  });

export const useMyTeamServicePos = () =>
  useQuery({
    queryKey: QUERY_KEYS.MY_TEAM_SERVICE_POS,
    queryFn: myTeamApi.getServicePos,
  });

export const useEmployeeServicePos = (employeeId) =>
  useQuery({
    queryKey: [...QUERY_KEYS.MY_TEAM_EMPLOYEES, employeeId, 'service-pos'],
    queryFn: () => myTeamApi.getEmployeeServicePos(employeeId),
    enabled: !!employeeId,
  });

export const useMapMyTeamEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: myTeamApi.mapEmployee,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.MY_TEAM_EMPLOYEES }),
  });
};

export const useUnmapMyTeamEmployee = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: myTeamApi.unmapEmployee,
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.MY_TEAM_EMPLOYEES }),
  });
};

export const useGrantMyTeamServicePo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, servicePOId }) => myTeamApi.grantServicePo(employeeId, servicePOId),
    onSuccess: (_data, { employeeId }) => qc.invalidateQueries({ queryKey: [...QUERY_KEYS.MY_TEAM_EMPLOYEES, employeeId, 'service-pos'] }),
  });
};

export const useRevokeMyTeamServicePo = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, servicePOId }) => myTeamApi.revokeServicePo(employeeId, servicePOId),
    onSuccess: (_data, { employeeId }) => qc.invalidateQueries({ queryKey: [...QUERY_KEYS.MY_TEAM_EMPLOYEES, employeeId, 'service-pos'] }),
  });
};

export const useMyTeamApprovalSummary = (params) =>
  useQuery({
    queryKey: QUERY_KEYS.MY_TEAM_APPROVAL_SUMMARY(params),
    queryFn: () => myTeamApi.getApprovalSummary(params),
  });

export const useApproveMyTeamTimesheets = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: myTeamApi.approveTimesheets,
    // Broad prefix invalidation — any page/filter/employee combination of the summary refetches,
    // so approved rows (and their embedded entries) flip status without locally guessing it.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-team', 'approval-summary'] }),
  });
};

// Entry-level reject/approve (Work Log Rejection Workflow) — same broad invalidation as the
// bulk mutation above, since a single entry's status change also flips its parent bucket's
// aggregated approval_status.
export const useRejectMyTeamTimesheetEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ id, remark }) => myTeamApi.rejectTimesheetEntry(id, remark),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-team', 'approval-summary'] }),
  });
};

export const useApproveMyTeamTimesheetEntry = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (id) => myTeamApi.approveTimesheetEntry(id),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-team', 'approval-summary'] }),
  });
};
