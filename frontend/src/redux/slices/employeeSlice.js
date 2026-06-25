import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import employeeService from '../../services/employeeService';

// ---------------------------------------------------------------------------
// Async Thunks
// ---------------------------------------------------------------------------

export const fetchEmployees = createAsyncThunk(
  'employees/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await employeeService.getAll(params);
      return response.data.data; // { employees, total, page, limit }
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch employees'
      );
    }
  }
);

export const fetchEmployee = createAsyncThunk(
  'employees/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const response = await employeeService.getById(id);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch employee'
      );
    }
  }
);

export const createEmployee = createAsyncThunk(
  'employees/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await employeeService.create(data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to create employee'
      );
    }
  }
);

export const updateEmployee = createAsyncThunk(
  'employees/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await employeeService.update(id, data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to update employee'
      );
    }
  }
);

export const deleteEmployee = createAsyncThunk(
  'employees/delete',
  async (id, { rejectWithValue }) => {
    try {
      await employeeService.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to delete employee'
      );
    }
  }
);

export const fetchActiveEmployees = createAsyncThunk(
  'employees/fetchActive',
  async (_, { rejectWithValue }) => {
    try {
      const response = await employeeService.getActive();
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch active employees'
      );
    }
  }
);

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

const initialState = {
  employees: [],
  activeEmployees: [],
  currentEmployee: null,
  total: 0,
  loading: false,
  error: null,
  filters: {
    page: 1,
    limit: 10,
    search: '',
    status: '',
    designation: '',
  },
};

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const employeeSlice = createSlice({
  name: 'employees',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearCurrentEmployee: (state) => {
      state.currentEmployee = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // ---- Fetch All ----
    builder
      .addCase(fetchEmployees.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.employees = action.payload.employees ?? action.payload;
        state.total = action.payload.total ?? action.payload.length;
      })
      .addCase(fetchEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Fetch One ----
    builder
      .addCase(fetchEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.currentEmployee = action.payload;
      })
      .addCase(fetchEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Create ----
    builder
      .addCase(createEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.employees.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Update ----
    builder
      .addCase(updateEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateEmployee.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.employees.findIndex(
          (e) => e.id === action.payload.id
        );
        if (index !== -1) state.employees[index] = action.payload;
        if (state.currentEmployee?.id === action.payload.id) {
          state.currentEmployee = action.payload;
        }
      })
      .addCase(updateEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Delete ----
    builder
      .addCase(deleteEmployee.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteEmployee.fulfilled, (state, action) => {
        state.loading = false;
        state.employees = state.employees.filter((e) => e.id !== action.payload);
        state.total = Math.max(0, state.total - 1);
        if (state.currentEmployee?.id === action.payload) {
          state.currentEmployee = null;
        }
      })
      .addCase(deleteEmployee.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Fetch Active ----
    builder
      .addCase(fetchActiveEmployees.pending, (state) => {
        state.loading = true;
      })
      .addCase(fetchActiveEmployees.fulfilled, (state, action) => {
        state.loading = false;
        state.activeEmployees = action.payload;
      })
      .addCase(fetchActiveEmployees.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setFilters, resetFilters, clearCurrentEmployee, clearError } =
  employeeSlice.actions;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectEmployees = (state) => state.employees.employees;
export const selectActiveEmployees = (state) => state.employees.activeEmployees;
export const selectCurrentEmployee = (state) => state.employees.currentEmployee;
export const selectEmployeeTotal = (state) => state.employees.total;
export const selectEmployeeLoading = (state) => state.employees.loading;
export const selectEmployeeError = (state) => state.employees.error;
export const selectEmployeeFilters = (state) => state.employees.filters;

export default employeeSlice.reducer;
