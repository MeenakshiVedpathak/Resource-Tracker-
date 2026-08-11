import apiClient from '@/services/apiClient';

export const servicePoMonthlyBudgetApi = {
  getCurrentMonthData: () =>
    apiClient.get('/service-po-monthly-budgets/current').then((r) => r.data?.data),

  // 404 "Service PO monthly budget not found." means valid PO with nothing filled in yet for
  // that month/year — not an error state, so it resolves to null instead of throwing.
  getMonthlyData: async (servicePoId, month, year) => {
    try {
      const res = await apiClient.get('/service-po-monthly-budgets', {
        params: { service_po_id: servicePoId, month, year },
      });
      return res.data?.data ?? null;
    } catch (err) {
      if (err?.response?.status === 404) return null;
      throw err;
    }
  },

  // One upsert call per Service PO row — the endpoint is per-PO, not a bulk save; the modal's
  // FormArray fans this out into one POST per edited row.
  saveMonthlyData: (payload) =>
    apiClient.post('/service-po-monthly-budgets', payload).then((r) => r.data?.data),
};
