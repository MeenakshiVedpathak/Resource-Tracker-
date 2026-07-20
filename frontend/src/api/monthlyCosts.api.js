import apiClient from '@/services/apiClient';

export const monthlyCostsApi = {
  getAll: (params) => apiClient.get('/monthly-costs', { params }).then((r) => r.data),
  getById: (id) => apiClient.get(`/monthly-costs/${id}`).then((r) => r.data?.data),
  create: (payload) => apiClient.post('/monthly-costs', payload).then((r) => r.data),
  update: (id, payload) => apiClient.put(`/monthly-costs/${id}`, payload).then((r) => r.data),
  delete: (id) => apiClient.delete(`/monthly-costs/${id}`, { data: { is_delete: true } }).then((r) => r.data),
  deleteMany: (ids) => apiClient.delete('/monthly-costs', { data: { ids } }).then((r) => r.data),
  // Fetches every record id for a given month/year (paged internally at the API's 200-row cap)
  // so a whole period can be bulk-deleted from the grouped summary list.
  getIdsForPeriod: async (month, year) => {
    const ids = [];
    let page = 1;
    let total = Infinity;
    while (ids.length < total) {
      const res = await apiClient.get('/monthly-costs', { params: { month, year, page, limit: 200 } }).then((r) => r.data);
      const rows = Array.isArray(res?.data) ? res.data : [];
      ids.push(...rows.map((r) => r.id));
      total = res?.meta?.total ?? ids.length;
      if (rows.length === 0) break;
      page += 1;
    }
    return ids;
  },
  calculateForMonth: (month, year) =>
    apiClient.post('/monthly-costs/calculate', { month, year }).then((r) => r.data),
  import: (file) => {
    const form = new FormData();
    form.append('file', file);
    return apiClient
      .post('/monthly-costs/import', form, {
        headers: { 'Content-Type': 'multipart/form-data' },
      })
      .then((r) => r.data);
  },
};
