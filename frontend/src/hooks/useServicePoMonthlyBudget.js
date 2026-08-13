import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicePoMonthlyBudgetApi } from '@/api/servicePoMonthlyBudget.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useServicePoMonthlyBudgetServicePOs = () =>
  useQuery({
    queryKey: QUERY_KEYS.SERVICE_PO_MONTHLY_BUDGET_SERVICE_POS,
    queryFn: servicePoMonthlyBudgetApi.getServicePOs,
    staleTime: 1000 * 60 * 10,
  });

export const useServicePoMonthlyBudgetList = (month, year) =>
  useQuery({
    queryKey: QUERY_KEYS.SERVICE_PO_MONTHLY_BUDGET_LIST(month, year),
    queryFn: () => servicePoMonthlyBudgetApi.getMonthList(month, year),
    enabled: !!month && !!year,
  });

// Backs the Yearly tab — only enabled once that tab is actually opened, since it's an
// unconfirmed query shape (see api layer) and shouldn't fire on every Monthly-tab page load.
export const useServicePoMonthlyBudgetYearList = (year, enabled) =>
  useQuery({
    queryKey: QUERY_KEYS.SERVICE_PO_MONTHLY_BUDGET_YEAR_LIST(year),
    queryFn: () => servicePoMonthlyBudgetApi.getYearList(year),
    enabled: !!year && enabled,
    retry: false,
  });

// Prefills the entry form once a Service PO + month + year are all chosen; a null result (no
// prior save for this combination) just means the form stays empty rather than an error.
export const useServicePoMonthlyBudgetRecord = (servicePoId, month, year) =>
  useQuery({
    queryKey: QUERY_KEYS.SERVICE_PO_MONTHLY_BUDGET_RECORD(servicePoId, month, year),
    queryFn: () => servicePoMonthlyBudgetApi.getRecord(servicePoId, month, year),
    enabled: !!servicePoId && !!month && !!year,
  });

export const useSaveServicePoMonthlyBudget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: servicePoMonthlyBudgetApi.saveBudget,
    // Broad prefix match — a save affects both this month's list and this PO's own record
    // query, so invalidate everything under this feature rather than tracking which key applies.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-po-monthly-budget'] }),
  });
};
