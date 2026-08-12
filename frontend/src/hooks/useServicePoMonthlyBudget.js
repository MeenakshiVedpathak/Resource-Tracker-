import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { servicePoMonthlyBudgetApi } from '@/api/servicePoMonthlyBudget.api';
import { QUERY_KEYS } from '@/constants/queryKeys';

export const useCurrentServicePoMonthlyBudget = () =>
  useQuery({
    queryKey: QUERY_KEYS.SERVICE_PO_MONTHLY_BUDGET_CURRENT,
    queryFn: servicePoMonthlyBudgetApi.getCurrentMonthData,
  });

// For any non-current month there's no single "period" endpoint, so this fans out one
// getMonthlyData call per active Service PO (metadata from activePOs, values from the API — a
// 404/null just means that PO hasn't been filled for this month yet) and merges them into the
// same shape the modal/card expect from the `/current` endpoint's `service_pos[]`.
export const useServicePoMonthlyBudgetMonth = (month, year, activePOs) =>
  useQuery({
    queryKey: QUERY_KEYS.SERVICE_PO_MONTHLY_BUDGET_MONTH(month, year),
    queryFn: async () => {
      const rows = await Promise.all(
        activePOs.map((po) => servicePoMonthlyBudgetApi.getMonthlyData(po.id, month, year))
      );
      return activePOs.map((po, i) => ({
        service_po_id: po.id,
        service_po_code: po.service_po_code,
        service_po_name: po.service_po_name,
        client_name: po.client_name,
        updated_at: rows[i]?.updated_at ?? null,
        invoice_amount: rows[i]?.invoice_amount ?? null,
        invoice_description: rows[i]?.invoice_description ?? null,
        billed_amount: rows[i]?.billed_amount ?? null,
        billed_remark: rows[i]?.billed_remark ?? null,
      }));
    },
    enabled: !!month && !!year && activePOs.length > 0,
  });

// Saves every row from the modal's FormArray — the upsert API is per Service PO (§10/§15 of the
// spec), so one "Save Data" click fans out into one call per row rather than a single bulk call.
export const useSaveServicePoMonthlyBudget = () => {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (rows) => Promise.all(rows.map((row) => servicePoMonthlyBudgetApi.saveMonthlyData(row))),
    // Broad prefix match — a save for any month can affect both the `/current` card (if that
    // month is the current period) and that month's own grid card, so invalidate everything
    // under this feature rather than tracking which key applies.
    onSuccess: () => qc.invalidateQueries({ queryKey: ['service-po-monthly-budget'] }),
  });
};
