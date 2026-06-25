import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import clientService from '../../services/clientService';

// ---------------------------------------------------------------------------
// Async Thunks
// ---------------------------------------------------------------------------

export const fetchClients = createAsyncThunk(
  'clients/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await clientService.getAll(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch clients'
      );
    }
  }
);

export const fetchClient = createAsyncThunk(
  'clients/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const response = await clientService.getById(id);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch client'
      );
    }
  }
);

export const createClient = createAsyncThunk(
  'clients/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await clientService.create(data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to create client'
      );
    }
  }
);

export const updateClient = createAsyncThunk(
  'clients/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await clientService.update(id, data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to update client'
      );
    }
  }
);

export const deleteClient = createAsyncThunk(
  'clients/delete',
  async (id, { rejectWithValue }) => {
    try {
      await clientService.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to delete client'
      );
    }
  }
);

export const fetchActiveClients = createAsyncThunk(
  'clients/fetchActive',
  async (_, { rejectWithValue }) => {
    try {
      const response = await clientService.getActive();
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch active clients'
      );
    }
  }
);

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

const initialState = {
  clients: [],
  activeClients: [],
  currentClient: null,
  total: 0,
  loading: false,
  error: null,
  filters: {
    page: 1,
    limit: 10,
    search: '',
    status: '',
    industry: '',
  },
};

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const clientSlice = createSlice({
  name: 'clients',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearCurrentClient: (state) => {
      state.currentClient = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // ---- Fetch All ----
    builder
      .addCase(fetchClients.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClients.fulfilled, (state, action) => {
        state.loading = false;
        state.clients = action.payload.clients ?? action.payload;
        state.total = action.payload.total ?? action.payload.length;
      })
      .addCase(fetchClients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Fetch One ----
    builder
      .addCase(fetchClient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchClient.fulfilled, (state, action) => {
        state.loading = false;
        state.currentClient = action.payload;
      })
      .addCase(fetchClient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Create ----
    builder
      .addCase(createClient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createClient.fulfilled, (state, action) => {
        state.loading = false;
        state.clients.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createClient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Update ----
    builder
      .addCase(updateClient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateClient.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.clients.findIndex((c) => c.id === action.payload.id);
        if (index !== -1) state.clients[index] = action.payload;
        if (state.currentClient?.id === action.payload.id) {
          state.currentClient = action.payload;
        }
      })
      .addCase(updateClient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Delete ----
    builder
      .addCase(deleteClient.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteClient.fulfilled, (state, action) => {
        state.loading = false;
        state.clients = state.clients.filter((c) => c.id !== action.payload);
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(deleteClient.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Fetch Active ----
    builder
      .addCase(fetchActiveClients.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchActiveClients.fulfilled, (state, action) => {
        state.loading = false;
        state.activeClients = action.payload;
      })
      .addCase(fetchActiveClients.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setFilters, resetFilters, clearCurrentClient, clearError } =
  clientSlice.actions;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectClients = (state) => state.clients.clients;
export const selectActiveClients = (state) => state.clients.activeClients;
export const selectCurrentClient = (state) => state.clients.currentClient;
export const selectClientTotal = (state) => state.clients.total;
export const selectClientLoading = (state) => state.clients.loading;
export const selectClientError = (state) => state.clients.error;
export const selectClientFilters = (state) => state.clients.filters;

export default clientSlice.reducer;
