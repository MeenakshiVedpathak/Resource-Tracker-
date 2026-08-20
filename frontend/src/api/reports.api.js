import apiClient from '@/services/apiClient';

export const reportsApi = {
  getMonthlyCostSummary: (params) =>
    apiClient.get('/reports/monthly-cost-summary', { params }).then((r) => r.data),
  getResourceAllocation: (params) =>
    apiClient.get('/reports/resource-allocation', { params }).then((r) => r.data),
  getServicePOSummary: (params) =>
    apiClient.get('/reports/service-po-summary', { params }).then((r) => r.data),
  getInvoicePOSummary: (params) =>
    apiClient.get('/reports/invoice-po-summary', { params }).then((r) => r.data),
  getMonthlyResourceUtilization: (params) =>
    apiClient.get('/reports/monthly-resource-utilization', { params }).then((r) => r.data),
  getResourceProjectUtilization: (params) =>
    apiClient.get('/reports/resource-project-utilization-report', { params }).then((r) => r.data),
  getClientServicePOHours: (params) =>
    apiClient.get('/reports/client-service-po-hours', { params }).then((r) => r.data),

  // Analytics — margin/profitability/risk reports (§ new report suite)
  getServicePOProfitability: (params) =>
    apiClient.get('/reports/service-po-profitability', { params }).then((r) => r.data),
  getBudgetedMarginForecast: (params) =>
    apiClient.get('/reports/budgeted-margin-forecast', { params }).then((r) => r.data),
  getResourceStaffingPlanAccuracy: (params) =>
    apiClient.get('/reports/resource-staffing-plan-accuracy', { params }).then((r) => r.data),
  getClientProfitabilityConcentration: (params) =>
    apiClient.get('/reports/client-profitability-concentration', { params }).then((r) => r.data),
  getBUPerformanceScorecard: (params) =>
    apiClient.get('/reports/bu-performance-scorecard', { params }).then((r) => r.data),
  getEmployeeCapacityForecast: (params) =>
    apiClient.get('/reports/employee-capacity-forecast', { params }).then((r) => r.data),
  getServicePOTimelineRisk: (params) =>
    apiClient.get('/reports/service-po-timeline-risk', { params }).then((r) => r.data),
  getDeliveryHeadPerformance: (params) =>
    apiClient.get('/reports/delivery-head-performance', { params }).then((r) => r.data),
  getInvoiceRealizationTrend: (params) =>
    apiClient.get('/reports/invoice-realization-trend', { params }).then((r) => r.data),
  getServiceLineBusinessMix: (params) =>
    apiClient.get('/reports/service-line-business-mix', { params }).then((r) => r.data),

  // Budget/cost analytics reports (§ new report suite 2)
  getBudgetVsBilled: (params) =>
    apiClient.get('/reports/budget-vs-billed', { params }).then((r) => r.data),
  getClientCostAnalytics: (params) =>
    apiClient.get('/reports/client-cost-analytics', { params }).then((r) => r.data),
  getClientWiseAnalytics: (params) =>
    apiClient.get('/reports/client-wise-analytics', { params }).then((r) => r.data),
  getMonthlyHoursTrend: (params) =>
    apiClient.get('/reports/monthly-hours-trend', { params }).then((r) => r.data),
  getEmployeeBenchPercentage: (params) =>
    apiClient.get('/reports/employee-bench-percentage', { params }).then((r) => r.data),
};
