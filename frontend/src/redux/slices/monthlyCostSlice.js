import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import monthlyCostService from '../../services/monthlyCostService';

// ---------------------------------------------------------------------------
// Async Thunks
// ---------------------------------------------------------------------------

export const fetchMonthlyCosts = createAsyncThunk(
  'monthlyCosts/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await monthlyCostService.getAll(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch monthly costs'
      );
    }
  }
);

export const fetchMonthlyCost = createAsyncThunk(
  'monthlyCosts/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const response = await monthlyCostService.getById(id);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch monthly cost'
      );
    }
  }
);

export const createMonthlyCost = createAsyncThunk(
  'monthlyCosts/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await monthlyCostService.create(data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to create monthly cost'
      );
    }
  }
);

export const updateMonthlyCost = createAsyncThunk(
  'monthlyCosts/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await monthlyCostService.update(id, data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to update monthly cost'
      );
    }
  }
);

export const deleteMonthlyCost = createAsyncThunk(
  'monthlyCosts/delete',
  async (id, { rejectWithValue }) => {
    try {
      await monthlyCostService.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to delete monthly cost'
      );
    }
  }
);

export const calculateForMonth = createAsyncThunk(
  'monthlyCosts/calculate',
  async (payload, { rejectWithValue }) => {
    try {
      const response = await monthlyCostService.calculateForMonth(payload);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to calculate monthly costs'
      );
    }
  }
);

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

const initialState = {
  monthlyCosts: [],
  currentMonthlyCost: null,
  total: 0,
  calculating: false,
  loading: false,
  error: null,
  filters: {
    page: 1,
    limit: 10,
    month: '',
    year: '',
    employee_id: '',
  },
};

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const monthlyCostSlice = createSlice({
  name: 'monthlyCosts',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearCurrentMonthlyCost: (state) => {
      state.currentMonthlyCost = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // ---- Fetch All ----
    builder
      .addCase(fetchMonthlyCosts.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMonthlyCosts.fulfilled, (state, action) => {
        state.loading = false;
        state.monthlyCosts = action.payload.monthlyCosts ?? action.payload;
        state.total = action.payload.total ?? action.payload.length;
      })
      .addCase(fetchMonthlyCosts.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Fetch One ----
    builder
      .addCase(fetchMonthlyCost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchMonthlyCost.fulfilled, (state, action) => {
        state.loading = false;
        state.currentMonthlyCost = action.payload;
      })
      .addCase(fetchMonthlyCost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Create ----
    builder
      .addCase(createMonthlyCost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createMonthlyCost.fulfilled, (state, action) => {
        state.loading = false;
        state.monthlyCosts.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createMonthlyCost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Update ----
    builder
      .addCase(updateMonthlyCost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateMonthlyCost.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.monthlyCosts.findIndex(
          (mc) => mc.id === action.payload.id
        );
        if (index !== -1) state.monthlyCosts[index] = action.payload;
        if (state.currentMonthlyCost?.id === action.payload.id) {
          state.currentMonthlyCost = action.payload;
        }
      })
      .addCase(updateMonthlyCost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Delete ----
    builder
      .addCase(deleteMonthlyCost.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteMonthlyCost.fulfilled, (state, action) => {
        state.loading = false;
        state.monthlyCosts = state.monthlyCosts.filter(
          (mc) => mc.id !== action.payload
        );
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(deleteMonthlyCost.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Calculate For Month ----
    builder
      .addCase(calculateForMonth.pending, (state) => {
        state.calculating = true;
        state.error = null;
      })
      .addCase(calculateForMonth.fulfilled, (state, action) => {
        state.calculating = false;
        // Merge or replace the costs returned from the calculation
        const updated = Array.isArray(action.payload)
          ? action.payload
          : [action.payload];
        updated.forEach((item) => {
          const index = state.monthlyCosts.findIndex(
            (mc) => mc.id === item.id
          );
          if (index !== -1) {
            state.monthlyCosts[index] = item;
          } else {
            state.monthlyCosts.push(item);
          }
        });
      })
      .addCase(calculateForMonth.rejected, (state, action) => {
        state.calculating = false;
        state.error = action.payload;
      });
  },
});

export const {
  setFilters,
  resetFilters,
  clearCurrentMonthlyCost,
  clearError,
} = monthlyCostSlice.actions;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectMonthlyCosts = (state) => state.monthlyCosts.monthlyCosts;
export const selectCurrentMonthlyCost = (state) =>
  state.monthlyCosts.currentMonthlyCost;
export const selectMonthlyCostTotal = (state) => state.monthlyCosts.total;
export const selectMonthlyCostLoading = (state) => state.monthlyCosts.loading;
export const selectMonthlyCostCalculating = (state) =>
  state.monthlyCosts.calculating;
export const selectMonthlyCostError = (state) => state.monthlyCosts.error;
export const selectMonthlyCostFilters = (state) => state.monthlyCosts.filters;

export default monthlyCostSlice.reducer;
