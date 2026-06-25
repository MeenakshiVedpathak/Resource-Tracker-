import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import servicePOService from '../../services/servicePOService';

// ---------------------------------------------------------------------------
// Async Thunks
// ---------------------------------------------------------------------------

export const fetchServicePOs = createAsyncThunk(
  'servicePOs/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await servicePOService.getAll(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch service POs'
      );
    }
  }
);

export const fetchServicePO = createAsyncThunk(
  'servicePOs/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const response = await servicePOService.getById(id);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch service PO'
      );
    }
  }
);

export const createServicePO = createAsyncThunk(
  'servicePOs/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await servicePOService.create(data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to create service PO'
      );
    }
  }
);

export const updateServicePO = createAsyncThunk(
  'servicePOs/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await servicePOService.update(id, data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to update service PO'
      );
    }
  }
);

export const deleteServicePO = createAsyncThunk(
  'servicePOs/delete',
  async (id, { rejectWithValue }) => {
    try {
      await servicePOService.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to delete service PO'
      );
    }
  }
);

export const allocateResources = createAsyncThunk(
  'servicePOs/allocateResources',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await servicePOService.allocateResources(id, payload);
      return { id, resources: response.data.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to allocate resources'
      );
    }
  }
);

export const deallocateResource = createAsyncThunk(
  'servicePOs/deallocateResource',
  async ({ poId, employeeId }, { rejectWithValue }) => {
    try {
      await servicePOService.deallocateResource(poId, employeeId);
      return { poId, employeeId };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to deallocate resource'
      );
    }
  }
);

export const closePO = createAsyncThunk(
  'servicePOs/close',
  async (id, { rejectWithValue }) => {
    try {
      const response = await servicePOService.closePO(id);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to close PO'
      );
    }
  }
);

export const fetchUtilisation = createAsyncThunk(
  'servicePOs/fetchUtilisation',
  async ({ id, params }, { rejectWithValue }) => {
    try {
      const response = await servicePOService.getUtilisation(id, params);
      return { id, data: response.data.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch utilisation'
      );
    }
  }
);

export const fetchActivePOs = createAsyncThunk(
  'servicePOs/fetchActive',
  async (_, { rejectWithValue }) => {
    try {
      const response = await servicePOService.getActive();
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch active POs'
      );
    }
  }
);

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

const initialState = {
  servicePOs: [],
  activePOs: [],
  currentServicePO: null,
  utilisationData: null,
  total: 0,
  loading: false,
  error: null,
  filters: {
    page: 1,
    limit: 10,
    search: '',
    status: '',
    client_id: '',
    service_type_id: '',
  },
};

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const servicePOSlice = createSlice({
  name: 'servicePOs',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearCurrentServicePO: (state) => {
      state.currentServicePO = null;
      state.utilisationData = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // ---- Fetch All ----
    builder
      .addCase(fetchServicePOs.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchServicePOs.fulfilled, (state, action) => {
        state.loading = false;
        state.servicePOs = action.payload.servicePOs ?? action.payload;
        state.total = action.payload.total ?? action.payload.length;
      })
      .addCase(fetchServicePOs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Fetch One ----
    builder
      .addCase(fetchServicePO.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchServicePO.fulfilled, (state, action) => {
        state.loading = false;
        state.currentServicePO = action.payload;
      })
      .addCase(fetchServicePO.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Create ----
    builder
      .addCase(createServicePO.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createServicePO.fulfilled, (state, action) => {
        state.loading = false;
        state.servicePOs.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createServicePO.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Update ----
    builder
      .addCase(updateServicePO.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateServicePO.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.servicePOs.findIndex(
          (po) => po.id === action.payload.id
        );
        if (index !== -1) state.servicePOs[index] = action.payload;
        if (state.currentServicePO?.id === action.payload.id) {
          state.currentServicePO = action.payload;
        }
      })
      .addCase(updateServicePO.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Delete ----
    builder
      .addCase(deleteServicePO.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteServicePO.fulfilled, (state, action) => {
        state.loading = false;
        state.servicePOs = state.servicePOs.filter(
          (po) => po.id !== action.payload
        );
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(deleteServicePO.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Allocate Resources ----
    builder
      .addCase(allocateResources.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(allocateResources.fulfilled, (state, action) => {
        state.loading = false;
        if (state.currentServicePO?.id === action.payload.id) {
          state.currentServicePO.resources = action.payload.resources;
        }
      })
      .addCase(allocateResources.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Deallocate Resource ----
    builder
      .addCase(deallocateResource.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deallocateResource.fulfilled, (state, action) => {
        state.loading = false;
        if (state.currentServicePO?.resources) {
          state.currentServicePO.resources =
            state.currentServicePO.resources.filter(
              (r) => r.employee_id !== action.payload.employeeId
            );
        }
      })
      .addCase(deallocateResource.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Close PO ----
    builder
      .addCase(closePO.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(closePO.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.servicePOs.findIndex(
          (po) => po.id === action.payload.id
        );
        if (index !== -1) state.servicePOs[index] = action.payload;
        if (state.currentServicePO?.id === action.payload.id) {
          state.currentServicePO = action.payload;
        }
      })
      .addCase(closePO.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Fetch Utilisation ----
    builder
      .addCase(fetchUtilisation.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUtilisation.fulfilled, (state, action) => {
        state.loading = false;
        state.utilisationData = action.payload.data;
      })
      .addCase(fetchUtilisation.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Fetch Active POs ----
    builder
      .addCase(fetchActivePOs.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchActivePOs.fulfilled, (state, action) => {
        state.loading = false;
        state.activePOs = action.payload;
      })
      .addCase(fetchActivePOs.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setFilters,
  resetFilters,
  clearCurrentServicePO,
  clearError,
} = servicePOSlice.actions;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectServicePOs = (state) => state.servicePOs.servicePOs;
export const selectActivePOs = (state) => state.servicePOs.activePOs;
export const selectCurrentServicePO = (state) =>
  state.servicePOs.currentServicePO;
export const selectUtilisationData = (state) =>
  state.servicePOs.utilisationData;
export const selectServicePOTotal = (state) => state.servicePOs.total;
export const selectServicePOLoading = (state) => state.servicePOs.loading;
export const selectServicePOError = (state) => state.servicePOs.error;
export const selectServicePOFilters = (state) => state.servicePOs.filters;

export default servicePOSlice.reducer;
