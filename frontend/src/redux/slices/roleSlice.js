import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import roleService from '../../services/roleService';

// ---------------------------------------------------------------------------
// Async Thunks
// ---------------------------------------------------------------------------

export const fetchRoles = createAsyncThunk(
  'roles/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await roleService.getAll(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch roles'
      );
    }
  }
);

export const fetchRole = createAsyncThunk(
  'roles/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const response = await roleService.getById(id);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch role'
      );
    }
  }
);

export const createRole = createAsyncThunk(
  'roles/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await roleService.create(data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to create role'
      );
    }
  }
);

export const updateRole = createAsyncThunk(
  'roles/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await roleService.update(id, data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to update role'
      );
    }
  }
);

export const deleteRole = createAsyncThunk(
  'roles/delete',
  async (id, { rejectWithValue }) => {
    try {
      await roleService.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to delete role'
      );
    }
  }
);

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

const initialState = {
  roles: [],
  currentRole: null,
  total: 0,
  loading: false,
  error: null,
};

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const roleSlice = createSlice({
  name: 'roles',
  initialState,
  reducers: {
    clearCurrentRole: (state) => {
      state.currentRole = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // ---- Fetch All ----
    builder
      .addCase(fetchRoles.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRoles.fulfilled, (state, action) => {
        state.loading = false;
        state.roles = action.payload.roles ?? action.payload;
        state.total = action.payload.total ?? action.payload.length;
      })
      .addCase(fetchRoles.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Fetch One ----
    builder
      .addCase(fetchRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchRole.fulfilled, (state, action) => {
        state.loading = false;
        state.currentRole = action.payload;
      })
      .addCase(fetchRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Create ----
    builder
      .addCase(createRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createRole.fulfilled, (state, action) => {
        state.loading = false;
        state.roles.push(action.payload);
        state.total += 1;
      })
      .addCase(createRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Update ----
    builder
      .addCase(updateRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateRole.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.roles.findIndex((r) => r.id === action.payload.id);
        if (index !== -1) state.roles[index] = action.payload;
        if (state.currentRole?.id === action.payload.id) {
          state.currentRole = action.payload;
        }
      })
      .addCase(updateRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Delete ----
    builder
      .addCase(deleteRole.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteRole.fulfilled, (state, action) => {
        state.loading = false;
        state.roles = state.roles.filter((r) => r.id !== action.payload);
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(deleteRole.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearCurrentRole, clearError } = roleSlice.actions;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectRoles = (state) => state.roles.roles;
export const selectCurrentRole = (state) => state.roles.currentRole;
export const selectRoleTotal = (state) => state.roles.total;
export const selectRoleLoading = (state) => state.roles.loading;
export const selectRoleError = (state) => state.roles.error;

export default roleSlice.reducer;
