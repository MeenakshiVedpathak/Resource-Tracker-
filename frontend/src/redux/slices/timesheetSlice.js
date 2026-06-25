import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import timesheetService from '../../services/timesheetService';

// ---------------------------------------------------------------------------
// Async Thunks
// ---------------------------------------------------------------------------

export const fetchTimesheets = createAsyncThunk(
  'timesheets/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await timesheetService.getAll(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch timesheets'
      );
    }
  }
);

export const fetchTimesheet = createAsyncThunk(
  'timesheets/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const response = await timesheetService.getById(id);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch timesheet'
      );
    }
  }
);

export const createTimesheet = createAsyncThunk(
  'timesheets/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await timesheetService.create(data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to create timesheet entry'
      );
    }
  }
);

export const updateTimesheet = createAsyncThunk(
  'timesheets/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await timesheetService.update(id, data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to update timesheet entry'
      );
    }
  }
);

export const deleteTimesheet = createAsyncThunk(
  'timesheets/delete',
  async (id, { rejectWithValue }) => {
    try {
      await timesheetService.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to delete timesheet entry'
      );
    }
  }
);

export const uploadTimesheet = createAsyncThunk(
  'timesheets/upload',
  async (formData, { rejectWithValue }) => {
    try {
      const response = await timesheetService.upload(formData);
      return response.data.data; // { importId, previewData, validRows, errorRows, errors }
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'File upload failed'
      );
    }
  }
);

export const confirmImport = createAsyncThunk(
  'timesheets/confirmImport',
  async (importId, { rejectWithValue }) => {
    try {
      const response = await timesheetService.confirmImport(importId);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to confirm import'
      );
    }
  }
);

export const cancelImport = createAsyncThunk(
  'timesheets/cancelImport',
  async (importId, { rejectWithValue }) => {
    try {
      await timesheetService.cancelImport(importId);
      return importId;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to cancel import'
      );
    }
  }
);

export const fetchImportHistory = createAsyncThunk(
  'timesheets/fetchImportHistory',
  async (params, { rejectWithValue }) => {
    try {
      const response = await timesheetService.getImportHistory(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch import history'
      );
    }
  }
);

export const fetchImportErrors = createAsyncThunk(
  'timesheets/fetchImportErrors',
  async (importId, { rejectWithValue }) => {
    try {
      const response = await timesheetService.getImportErrors(importId);
      return { importId, errors: response.data.data };
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch import errors'
      );
    }
  }
);

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

const initialState = {
  timesheets: [],
  currentTimesheet: null,
  total: 0,

  // Import workflow
  importHistory: [],
  importHistoryTotal: 0,
  currentImport: null,   // { importId, status, totalRows, validRows, errorRows }
  previewData: [],       // rows returned after upload, before confirmation
  importErrors: [],      // row-level errors for the active/selected import

  loading: false,
  uploading: false,
  error: null,

  filters: {
    page: 1,
    limit: 10,
    employee_id: '',
    service_po_id: '',
    sub_project_id: '',
    from_date: '',
    to_date: '',
    month: '',
    year: '',
  },
};

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const timesheetSlice = createSlice({
  name: 'timesheets',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearCurrentTimesheet: (state) => {
      state.currentTimesheet = null;
    },
    clearImportState: (state) => {
      state.currentImport = null;
      state.previewData = [];
      state.importErrors = [];
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // ---- Fetch All ----
    builder
      .addCase(fetchTimesheets.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTimesheets.fulfilled, (state, action) => {
        state.loading = false;
        state.timesheets = action.payload.timesheets ?? action.payload;
        state.total = action.payload.total ?? action.payload.length;
      })
      .addCase(fetchTimesheets.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Fetch One ----
    builder
      .addCase(fetchTimesheet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchTimesheet.fulfilled, (state, action) => {
        state.loading = false;
        state.currentTimesheet = action.payload;
      })
      .addCase(fetchTimesheet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Create ----
    builder
      .addCase(createTimesheet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createTimesheet.fulfilled, (state, action) => {
        state.loading = false;
        state.timesheets.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createTimesheet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Update ----
    builder
      .addCase(updateTimesheet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateTimesheet.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.timesheets.findIndex(
          (t) => t.id === action.payload.id
        );
        if (index !== -1) state.timesheets[index] = action.payload;
        if (state.currentTimesheet?.id === action.payload.id) {
          state.currentTimesheet = action.payload;
        }
      })
      .addCase(updateTimesheet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Delete ----
    builder
      .addCase(deleteTimesheet.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteTimesheet.fulfilled, (state, action) => {
        state.loading = false;
        state.timesheets = state.timesheets.filter(
          (t) => t.id !== action.payload
        );
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(deleteTimesheet.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Upload ----
    builder
      .addCase(uploadTimesheet.pending, (state) => {
        state.uploading = true;
        state.error = null;
        state.previewData = [];
        state.importErrors = [];
        state.currentImport = null;
      })
      .addCase(uploadTimesheet.fulfilled, (state, action) => {
        state.uploading = false;
        state.currentImport = {
          importId: action.payload.importId,
          status: 'preview',
          totalRows: action.payload.totalRows,
          validRows: action.payload.validRows,
          errorRows: action.payload.errorRows,
          fileName: action.payload.fileName,
        };
        state.previewData = action.payload.previewData ?? [];
        state.importErrors = action.payload.errors ?? [];
      })
      .addCase(uploadTimesheet.rejected, (state, action) => {
        state.uploading = false;
        state.error = action.payload;
      });

    // ---- Confirm Import ----
    builder
      .addCase(confirmImport.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(confirmImport.fulfilled, (state, action) => {
        state.loading = false;
        if (state.currentImport) {
          state.currentImport.status = 'confirmed';
        }
        state.previewData = [];
        state.importErrors = [];
      })
      .addCase(confirmImport.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Cancel Import ----
    builder
      .addCase(cancelImport.fulfilled, (state) => {
        state.currentImport = null;
        state.previewData = [];
        state.importErrors = [];
      });

    // ---- Import History ----
    builder
      .addCase(fetchImportHistory.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchImportHistory.fulfilled, (state, action) => {
        state.loading = false;
        state.importHistory = action.payload.history ?? action.payload;
        state.importHistoryTotal =
          action.payload.total ?? action.payload.length;
      })
      .addCase(fetchImportHistory.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Import Errors ----
    builder
      .addCase(fetchImportErrors.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchImportErrors.fulfilled, (state, action) => {
        state.loading = false;
        state.importErrors = action.payload.errors;
      })
      .addCase(fetchImportErrors.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const {
  setFilters,
  resetFilters,
  clearCurrentTimesheet,
  clearImportState,
  clearError,
} = timesheetSlice.actions;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectTimesheets = (state) => state.timesheets.timesheets;
export const selectCurrentTimesheet = (state) =>
  state.timesheets.currentTimesheet;
export const selectTimesheetTotal = (state) => state.timesheets.total;
export const selectTimesheetLoading = (state) => state.timesheets.loading;
export const selectTimesheetUploading = (state) => state.timesheets.uploading;
export const selectTimesheetError = (state) => state.timesheets.error;
export const selectTimesheetFilters = (state) => state.timesheets.filters;
export const selectImportHistory = (state) => state.timesheets.importHistory;
export const selectImportHistoryTotal = (state) =>
  state.timesheets.importHistoryTotal;
export const selectCurrentImport = (state) => state.timesheets.currentImport;
export const selectPreviewData = (state) => state.timesheets.previewData;
export const selectImportErrors = (state) => state.timesheets.importErrors;

export default timesheetSlice.reducer;
