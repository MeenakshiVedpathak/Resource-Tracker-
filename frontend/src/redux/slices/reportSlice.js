import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import reportService from '../../services/reportService';

// ---------------------------------------------------------------------------
// Async Thunks
// ---------------------------------------------------------------------------

export const fetchEmployeeHourlyRate = createAsyncThunk(
  'reports/employeeHourlyRate',
  async (params, { rejectWithValue }) => {
    try {
      const response = await reportService.getEmployeeHourlyRate(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch employee hourly rate report'
      );
    }
  }
);

export const fetchMonthlyCostSummary = createAsyncThunk(
  'reports/monthlyCostSummary',
  async (params, { rejectWithValue }) => {
    try {
      const response = await reportService.getMonthlyCostSummary(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch monthly cost summary'
      );
    }
  }
);

export const fetchTimesheetSummary = createAsyncThunk(
  'reports/timesheetSummary',
  async (params, { rejectWithValue }) => {
    try {
      const response = await reportService.getTimesheetSummary(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch timesheet summary'
      );
    }
  }
);

export const fetchServicePOUtilisation = createAsyncThunk(
  'reports/servicePOUtilisation',
  async (params, { rejectWithValue }) => {
    try {
      const response = await reportService.getServicePOUtilisation(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch service PO utilisation report'
      );
    }
  }
);

export const fetchSubProjectHours = createAsyncThunk(
  'reports/subProjectHours',
  async (params, { rejectWithValue }) => {
    try {
      const response = await reportService.getSubProjectHours(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch sub-project hours report'
      );
    }
  }
);

export const fetchResourceAllocation = createAsyncThunk(
  'reports/resourceAllocation',
  async (params, { rejectWithValue }) => {
    try {
      const response = await reportService.getResourceAllocation(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch resource allocation report'
      );
    }
  }
);

export const fetchOperationalCostBreakdown = createAsyncThunk(
  'reports/operationalCostBreakdown',
  async (params, { rejectWithValue }) => {
    try {
      const response = await reportService.getOperationalCostBreakdown(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch operational cost breakdown'
      );
    }
  }
);

export const exportReport = createAsyncThunk(
  'reports/export',
  async ({ reportType, params }, { rejectWithValue }) => {
    try {
      const response = await reportService.exportReport(reportType, params);
      // Create a download link for the blob
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `${reportType}-${Date.now()}.xlsx`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      window.URL.revokeObjectURL(url);
      return { reportType };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Export failed'
      );
    }
  }
);

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

const emptyReport = { data: null, loading: false, error: null };

const initialState = {
  employeeHourlyRate: { ...emptyReport },
  monthlyCostSummary: { ...emptyReport },
  timesheetSummary: { ...emptyReport },
  servicePOUtilisation: { ...emptyReport },
  subProjectHours: { ...emptyReport },
  resourceAllocation: { ...emptyReport },
  operationalCostBreakdown: { ...emptyReport },
  exporting: false,
  exportError: null,
};

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const pendingReport = (reportKey) => (state) => {
  state[reportKey].loading = true;
  state[reportKey].error = null;
};

const fulfilledReport = (reportKey) => (state, action) => {
  state[reportKey].loading = false;
  state[reportKey].data = action.payload;
};

const rejectedReport = (reportKey) => (state, action) => {
  state[reportKey].loading = false;
  state[reportKey].error = action.payload;
};

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const reportSlice = createSlice({
  name: 'reports',
  initialState,
  reducers: {
    clearReport: (state, action) => {
      const key = action.payload;
      if (state[key]) state[key] = { ...emptyReport };
    },
    clearAllReports: () => initialState,
    clearExportError: (state) => {
      state.exportError = null;
    },
  },
  extraReducers: (builder) => {
    // ---- Employee Hourly Rate ----
    builder
      .addCase(fetchEmployeeHourlyRate.pending, pendingReport('employeeHourlyRate'))
      .addCase(fetchEmployeeHourlyRate.fulfilled, fulfilledReport('employeeHourlyRate'))
      .addCase(fetchEmployeeHourlyRate.rejected, rejectedReport('employeeHourlyRate'));

    // ---- Monthly Cost Summary ----
    builder
      .addCase(fetchMonthlyCostSummary.pending, pendingReport('monthlyCostSummary'))
      .addCase(fetchMonthlyCostSummary.fulfilled, fulfilledReport('monthlyCostSummary'))
      .addCase(fetchMonthlyCostSummary.rejected, rejectedReport('monthlyCostSummary'));

    // ---- Timesheet Summary ----
    builder
      .addCase(fetchTimesheetSummary.pending, pendingReport('timesheetSummary'))
      .addCase(fetchTimesheetSummary.fulfilled, fulfilledReport('timesheetSummary'))
      .addCase(fetchTimesheetSummary.rejected, rejectedReport('timesheetSummary'));

    // ---- Service PO Utilisation ----
    builder
      .addCase(fetchServicePOUtilisation.pending, pendingReport('servicePOUtilisation'))
      .addCase(fetchServicePOUtilisation.fulfilled, fulfilledReport('servicePOUtilisation'))
      .addCase(fetchServicePOUtilisation.rejected, rejectedReport('servicePOUtilisation'));

    // ---- Sub-Project Hours ----
    builder
      .addCase(fetchSubProjectHours.pending, pendingReport('subProjectHours'))
      .addCase(fetchSubProjectHours.fulfilled, fulfilledReport('subProjectHours'))
      .addCase(fetchSubProjectHours.rejected, rejectedReport('subProjectHours'));

    // ---- Resource Allocation ----
    builder
      .addCase(fetchResourceAllocation.pending, pendingReport('resourceAllocation'))
      .addCase(fetchResourceAllocation.fulfilled, fulfilledReport('resourceAllocation'))
      .addCase(fetchResourceAllocation.rejected, rejectedReport('resourceAllocation'));

    // ---- Operational Cost Breakdown ----
    builder
      .addCase(fetchOperationalCostBreakdown.pending, pendingReport('operationalCostBreakdown'))
      .addCase(fetchOperationalCostBreakdown.fulfilled, fulfilledReport('operationalCostBreakdown'))
      .addCase(fetchOperationalCostBreakdown.rejected, rejectedReport('operationalCostBreakdown'));

    // ---- Export ----
    builder
      .addCase(exportReport.pending, (state) => {
        state.exporting = true;
        state.exportError = null;
      })
      .addCase(exportReport.fulfilled, (state) => {
        state.exporting = false;
      })
      .addCase(exportReport.rejected, (state, action) => {
        state.exporting = false;
        state.exportError = action.payload;
      });
  },
});

export const { clearReport, clearAllReports, clearExportError } =
  reportSlice.actions;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectEmployeeHourlyRate = (state) =>
  state.reports.employeeHourlyRate;
export const selectMonthlyCostSummary = (state) =>
  state.reports.monthlyCostSummary;
export const selectTimesheetSummary = (state) => state.reports.timesheetSummary;
export const selectServicePOUtilisation = (state) =>
  state.reports.servicePOUtilisation;
export const selectSubProjectHours = (state) => state.reports.subProjectHours;
export const selectResourceAllocation = (state) =>
  state.reports.resourceAllocation;
export const selectOperationalCostBreakdown = (state) =>
  state.reports.operationalCostBreakdown;
export const selectReportExporting = (state) => state.reports.exporting;
export const selectReportExportError = (state) => state.reports.exportError;

export default reportSlice.reducer;
