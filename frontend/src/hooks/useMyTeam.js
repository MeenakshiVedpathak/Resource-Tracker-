import { useQuery, useQueries, useMutation, useQueryClient } from '@tanstack/react-query';
import { myTeamApi } from '@/api/myTeam.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useMyTeamEmployees = (params = {}, { enabled = true } = {}) =>
  useQuery({
    queryKey: [QUERY_KEYS.MY_TEAM_EMPLOYEES, params],
    queryFn: () => myTeamApi.getEmployees(params),
    enabled,
  });

// "All Business Units" has no single X-Company-Id header confirmed to mean "every BU this login
// can see" — see apiClient's explicitBuScope — so a plain useMyTeamEmployees({}) call there can
// silently fall back to whichever BU happens to be globally active, or to whatever a header-less
// call resolves to for this particular role, hiding Employees mapped only under a different BU.
// Confirmed live even for a nominally "cross-BU" Admin login (an Employee mapped under one
// specific BU was missing under "All Business Units" but appeared once that BU was picked
// explicitly), so this is used for ANY login with more than one selectable BU, not only BU-scoped
// multi-BU ones — see the call site in ManagerTimesheetApproval.jsx for the exact condition. Fans
// out one GET /my-team/employees call per BU (`units`, from useSelectableBusinessUnits) and merges
// the results, deduped by id. Each per-BU query shares its cache entry with
// useMyTeamEmployees({ buId }) above (same query key shape), so picking that same BU from the
// dropdown elsewhere never re-fetches it.
export const useMyTeamEmployeesAcrossBus = (units, { enabled = true } = {}) => {
  const queries = useQueries({
    queries: units.map((bu) => ({
      queryKey: [QUERY_KEYS.MY_TEAM_EMPLOYEES, { buId: bu.id }],
      queryFn: () => myTeamApi.getEmployees({ buId: bu.id }),
      enabled: enabled && !!bu.id,
    })),
  });

  const seen = new Map();
  queries.forEach((q) => (q.data ?? []).forEach((emp) => {
    if (!seen.has(emp.id)) seen.set(emp.id, emp);
  }));

  return {
    data: Array.from(seen.values()),
    isLoading: queries.some((q) => q.isLoading),
    isError: queries.some((q) => q.isError),
  };
};

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

// Manager Timesheet Approval's default landing table — every mapped Employee's approval-summary
// buckets in one combined list, tagged with which Employee each row belongs to, so the Manager
// never has to open an Employee individually just to see whether they have anything pending.
// There's no "every Employee at once" backend endpoint, so this fans out one request per Employee
// (useQueries) and flattens the results client-side. Each request is capped to the summary
// endpoint's normal first page (100 buckets) rather than looping through every page — doing that
// here would mean up to 50 sequential requests PER Employee just to render the default page. 100
// daily/monthly buckets for one Employee within a single filtered range comfortably covers real
// use; an Employee past that cap can still be drilled into via the Employee filter above the table.
export const useMyTeamAllEmployeesApprovalSummary = (employees, filterParams) => {
  const queries = useQueries({
    queries: employees.map((emp) => {
      const params = { ...filterParams, employee_id: emp.id, page: 1, limit: 100 };
      return {
        queryKey: QUERY_KEYS.MY_TEAM_APPROVAL_SUMMARY(params),
        queryFn: () => myTeamApi.getApprovalSummary(params),
        enabled: !!emp.id,
      };
    }),
  });

  const rows = queries.flatMap((q, i) => {
    const emp = employees[i];
    return (q.data?.data ?? []).map((row) => ({
      ...row,
      employeeId: emp.id,
      employeeName: emp.full_name || emp.name || `Employee #${emp.id}`,
    }));
  });

  return {
    rows,
    isLoading: queries.some((q) => q.isLoading),
    isError: queries.some((q) => q.isError),
    error: queries.find((q) => q.isError)?.error,
  };
};

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

// "Log Work for My Team" — a Manager filling in a mapped Employee's monthly work log on their
// behalf (see pages/myTeam/ManagerFillWorkLog.jsx). `enabled` follows the caller (only fetch once
// both an Employee and a Month/Year are picked).
export const useEmployeeMonthlyWorkLog = (employeeId, { month, year } = {}, { enabled = true } = {}) =>
  useQuery({
    queryKey: QUERY_KEYS.MY_TEAM_EMPLOYEE_MONTHLY_WORKLOG(employeeId, month, year),
    queryFn: () => myTeamApi.getEmployeeMonthlyWorkLog(employeeId, { month, year }),
    enabled: enabled && !!employeeId && !!month && !!year,
  });

export const useSaveEmployeeMonthlyWorkLog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, month, year, entries }) =>
      myTeamApi.saveEmployeeMonthlyWorkLog(employeeId, { month, year, entries }),
    onSuccess: (_data, { employeeId, month, year }) =>
      qc.invalidateQueries({ queryKey: QUERY_KEYS.MY_TEAM_EMPLOYEE_MONTHLY_WORKLOG(employeeId, month, year) }),
  });
};

export const useDeleteEmployeeMonthlyWorkLog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ employeeId, month, year }) => myTeamApi.deleteEmployeeMonthlyWorkLog(employeeId, { month, year }),
    onSuccess: (_data, { employeeId, month, year }) =>
      qc.invalidateQueries({ queryKey: QUERY_KEYS.MY_TEAM_EMPLOYEE_MONTHLY_WORKLOG(employeeId, month, year) }),
  });
};

// Bulk Upload mode — one file can touch any number of the caller's Employees, so on success this
// invalidates every cached MY_TEAM_EMPLOYEE_MONTHLY_WORKLOG entry by prefix (that key shape is
// `['my-team', 'employees', employeeId, 'monthly-worklog', month, year]`, so a 2-element prefix
// matches all of them) rather than trying to enumerate which employee/month combinations were
// touched from the response alone.
export const useImportMyTeamMonthlyWorkLog = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ file, month, year, onUploadProgress }) =>
      myTeamApi.importMonthlyWorkLog({ file, month, year, onUploadProgress }),
    onSuccess: () => qc.invalidateQueries({ queryKey: ['my-team', 'employees'] }),
  });
};

// Mirrors ManagerFillWorkLogDrawer's own filter — a hierarchy node nested under a Service PO is
// shown there for context only, never editable by the Manager, so it's excluded here too: this
// total must read as "what the drawer would show as already filled in" for that Employee, not a
// bigger number the drawer itself never displays.
const isTopLevelServicePO = (po) =>
  (po.depth ?? 0) === 0 && !(po.ancestorKeys?.length) && po.hierarchy_node_id == null && po.parent_id == null;

const sumWorkLogHours = (workLog) =>
  (workLog?.service_pos ?? [])
    .filter(isTopLevelServicePO)
    .reduce((sum, po) => sum + Number(po.hours ?? po.existing_hours ?? po.total_hours ?? 0), 0);

// Employee list's "Total Hours" column — one GET .../monthly-worklog per Employee for the
// selected Month/Year, fanned out the same way useMyTeamAllEmployeesApprovalSummary does. Shares
// its cache entry (same MY_TEAM_EMPLOYEE_MONTHLY_WORKLOG key) with useEmployeeMonthlyWorkLog, so
// opening the drawer for a row already warmed by this list re-uses it instead of re-fetching, and
// vice versa.
export const useMyTeamEmployeesMonthlyWorkLogTotals = (employees, { month, year } = {}, { enabled = true } = {}) => {
  const queries = useQueries({
    queries: employees.map((emp) => ({
      queryKey: QUERY_KEYS.MY_TEAM_EMPLOYEE_MONTHLY_WORKLOG(emp.id, month, year),
      queryFn: () => myTeamApi.getEmployeeMonthlyWorkLog(emp.id, { month, year }),
      enabled: enabled && !!emp.id && !!month && !!year,
    })),
  });

  const totalsByEmployeeId = new Map();
  queries.forEach((q, i) => {
    const emp = employees[i];
    if (!emp) return;
    totalsByEmployeeId.set(emp.id, { totalHours: sumWorkLogHours(q.data), isLoading: q.isLoading });
  });

  return totalsByEmployeeId;
};
