import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicePoMonthlyBudgetApi } from '@/api/servicePoMonthlyBudget.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useCurrentServicePoMonthlyBudget = () =>
  useQuery({
    queryKey: QUERY_KEYS.SERVICE_PO_MONTHLY_BUDGET_CURRENT,
    queryFn: servicePoMonthlyBudgetApi.getCurrentMonthData,
  });

// Saves every row from the modal's FormArray — the upsert API is per Service PO (§10/§15 of the
// spec), so one "Save Data" click fans out into one call per row rather than a single bulk call.
export const useSaveServicePoMonthlyBudget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows) => Promise.all(rows.map((row) => servicePoMonthlyBudgetApi.saveMonthlyData(row))),
    onSuccess: () => qc.invalidateQueries({ queryKey: QUERY_KEYS.SERVICE_PO_MONTHLY_BUDGET_CURRENT }),
  });
};
