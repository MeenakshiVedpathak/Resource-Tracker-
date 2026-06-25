import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import subProjectService from '../../services/subProjectService';

// ---------------------------------------------------------------------------
// Async Thunks
// ---------------------------------------------------------------------------

export const fetchSubProjects = createAsyncThunk(
  'subProjects/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await subProjectService.getAll(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch sub-projects'
      );
    }
  }
);

export const fetchSubProject = createAsyncThunk(
  'subProjects/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const response = await subProjectService.getById(id);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch sub-project'
      );
    }
  }
);

export const createSubProject = createAsyncThunk(
  'subProjects/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await subProjectService.create(data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to create sub-project'
      );
    }
  }
);

export const updateSubProject = createAsyncThunk(
  'subProjects/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await subProjectService.update(id, data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to update sub-project'
      );
    }
  }
);

export const deleteSubProject = createAsyncThunk(
  'subProjects/delete',
  async (id, { rejectWithValue }) => {
    try {
      await subProjectService.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to delete sub-project'
      );
    }
  }
);

export const fetchSubProjectsByPO = createAsyncThunk(
  'subProjects/fetchByPO',
  async ({ servicePOId, params }, { rejectWithValue }) => {
    try {
      const response = await subProjectService.getByPO(servicePOId, params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch sub-projects for PO'
      );
    }
  }
);

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

const initialState = {
  subProjects: [],
  currentSubProject: null,
  total: 0,
  loading: false,
  error: null,
  filters: {
    page: 1,
    limit: 10,
    search: '',
    status: '',
  },
};

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const subProjectSlice = createSlice({
  name: 'subProjects',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearCurrentSubProject: (state) => {
      state.currentSubProject = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // ---- Fetch All ----
    builder
      .addCase(fetchSubProjects.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubProjects.fulfilled, (state, action) => {
        state.loading = false;
        state.subProjects = action.payload.subProjects ?? action.payload;
        state.total = action.payload.total ?? action.payload.length;
      })
      .addCase(fetchSubProjects.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Fetch One ----
    builder
      .addCase(fetchSubProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubProject.fulfilled, (state, action) => {
        state.loading = false;
        state.currentSubProject = action.payload;
      })
      .addCase(fetchSubProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Create ----
    builder
      .addCase(createSubProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createSubProject.fulfilled, (state, action) => {
        state.loading = false;
        state.subProjects.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createSubProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Update ----
    builder
      .addCase(updateSubProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateSubProject.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.subProjects.findIndex(
          (sp) => sp.id === action.payload.id
        );
        if (index !== -1) state.subProjects[index] = action.payload;
        if (state.currentSubProject?.id === action.payload.id) {
          state.currentSubProject = action.payload;
        }
      })
      .addCase(updateSubProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Delete ----
    builder
      .addCase(deleteSubProject.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteSubProject.fulfilled, (state, action) => {
        state.loading = false;
        state.subProjects = state.subProjects.filter(
          (sp) => sp.id !== action.payload
        );
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(deleteSubProject.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Fetch By PO ----
    builder
      .addCase(fetchSubProjectsByPO.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSubProjectsByPO.fulfilled, (state, action) => {
        state.loading = false;
        state.subProjects = action.payload.subProjects ?? action.payload;
        state.total = action.payload.total ?? action.payload.length;
      })
      .addCase(fetchSubProjectsByPO.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setFilters,
  resetFilters,
  clearCurrentSubProject,
  clearError,
} = subProjectSlice.actions;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectSubProjects = (state) => state.subProjects.subProjects;
export const selectCurrentSubProject = (state) =>
  state.subProjects.currentSubProject;
export const selectSubProjectTotal = (state) => state.subProjects.total;
export const selectSubProjectLoading = (state) => state.subProjects.loading;
export const selectSubProjectError = (state) => state.subProjects.error;
export const selectSubProjectFilters = (state) => state.subProjects.filters;

export default subProjectSlice.reducer;
