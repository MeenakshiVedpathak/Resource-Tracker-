import apiClient from '@/services/apiClient';

export const servicePoMonthlyBudgetApi = {
  // Active Service POs the logged-in user is allowed to save budgets for — role-scoped on the
  // backend (Manager: only mapped POs; everyone else: full company). No budget data here.
  getServicePOs: () =>
    apiClient.get('/service-po-monthly-budgets/service-pos').then((r) => r.data?.data ?? []),

  // No service_po_id → every saved budget record for that month, across every PO the caller
  // can see. Only rows that were actually saved come back — not a full PO grid.
  getMonthList: (month, year) =>
    apiClient
      .get('/service-po-monthly-budgets', { params: { month, year } })
      .then((r) => r.data?.data?.records ?? []),

  // 404 means nothing has been saved yet for this PO+month+year (same response as "not yours"/
  // "doesn't exist") — not an error state, so it resolves to null instead of throwing.
  getRecord: async (servicePoId, month, year) => {
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

  // Upserts on service_po_id + month + year. Response includes the saved record plus a
  // `deadline` block ({ deadline, days_remaining, deadline_passed }) for an overdue warning.
  saveBudget: (payload) =>
    apiClient.post('/service-po-monthly-budgets', payload).then((r) => r.data?.data),
};
