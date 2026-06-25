import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import dashboardService from '../../services/dashboardService';

// ---------------------------------------------------------------------------
// Async Thunks
// ---------------------------------------------------------------------------

export const fetchDashboardStats = createAsyncThunk(
  'dashboard/fetchStats',
  async (params, { rejectWithValue }) => {
    try {
      const response = await dashboardService.getStats(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch dashboard stats'
      );
    }
  }
);

export const fetchRecentActivity = createAsyncThunk(
  'dashboard/fetchRecentActivity',
  async (params, { rejectWithValue }) => {
    try {
      const response = await dashboardService.getRecentActivity(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch recent activity'
      );
    }
  }
);

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

const initialState = {
  stats: {
    totalEmployees: 0,
    activeEmployees: 0,
    totalClients: 0,
    activePOs: 0,
    closedPOs: 0,
    currentMonthHours: 0,
    utilisationPercent: 0,
    totalRevenue: 0,
  },
  recentActivity: [],
  loading: false,
  error: null,
  lastUpdated: null,
};

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const dashboardSlice = createSlice({
  name: 'dashboard',
  initialState,
  reducers: {
    clearError: (state) => {
      state.error = null;
    },
    resetDashboard: () => initialState,
  },
  extraReducers: (builder) => {
    // ---- Fetch Stats ----
    builder
      .addCase(fetchDashboardStats.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchDashboardStats.fulfilled, (state, action) => {
        state.loading = false;
        state.stats = {
          totalEmployees: action.payload.totalEmployees ?? 0,
          activeEmployees: action.payload.activeEmployees ?? 0,
          totalClients: action.payload.totalClients ?? 0,
          activePOs: action.payload.activePOs ?? 0,
          closedPOs: action.payload.closedPOs ?? 0,
          currentMonthHours: action.payload.currentMonthHours ?? 0,
          utilisationPercent: action.payload.utilisationPercent ?? 0,
          totalRevenue: action.payload.totalRevenue ?? 0,
        };
        state.lastUpdated = new Date().toISOString();
      })
      .addCase(fetchDashboardStats.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Fetch Recent Activity ----
    builder
      .addCase(fetchRecentActivity.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchRecentActivity.fulfilled, (state, action) => {
        state.loading = false;
        state.recentActivity = action.payload;
      })
      .addCase(fetchRecentActivity.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearError, resetDashboard } = dashboardSlice.actions;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectDashboardStats = (state) => state.dashboard.stats;
export const selectRecentActivity = (state) => state.dashboard.recentActivity;
export const selectDashboardLoading = (state) => state.dashboard.loading;
export const selectDashboardError = (state) => state.dashboard.error;
export const selectDashboardLastUpdated = (state) =>
  state.dashboard.lastUpdated;

export default dashboardSlice.reducer;
