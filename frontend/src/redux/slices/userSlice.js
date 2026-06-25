import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import userService from '../../services/userService';

// ---------------------------------------------------------------------------
// Async Thunks
// ---------------------------------------------------------------------------

export const fetchUsers = createAsyncThunk(
  'users/fetchAll',
  async (params, { rejectWithValue }) => {
    try {
      const response = await userService.getAll(params);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch users'
      );
    }
  }
);

export const fetchUser = createAsyncThunk(
  'users/fetchOne',
  async (id, { rejectWithValue }) => {
    try {
      const response = await userService.getById(id);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch user'
      );
    }
  }
);

export const createUser = createAsyncThunk(
  'users/create',
  async (data, { rejectWithValue }) => {
    try {
      const response = await userService.create(data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to create user'
      );
    }
  }
);

export const updateUser = createAsyncThunk(
  'users/update',
  async ({ id, data }, { rejectWithValue }) => {
    try {
      const response = await userService.update(id, data);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to update user'
      );
    }
  }
);

export const deleteUser = createAsyncThunk(
  'users/delete',
  async (id, { rejectWithValue }) => {
    try {
      await userService.delete(id);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to delete user'
      );
    }
  }
);

export const resetUserPassword = createAsyncThunk(
  'users/resetPassword',
  async ({ id, payload }, { rejectWithValue }) => {
    try {
      const response = await userService.resetPassword(id, payload);
      return response.data.data;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to reset password'
      );
    }
  }
);

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

const initialState = {
  users: [],
  currentUser: null,
  total: 0,
  loading: false,
  error: null,
  filters: {
    page: 1,
    limit: 10,
    search: '',
    status: '',
    role_id: '',
  },
};

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const userSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    setFilters: (state, action) => {
      state.filters = { ...state.filters, ...action.payload };
    },
    resetFilters: (state) => {
      state.filters = initialState.filters;
    },
    clearCurrentUser: (state) => {
      state.currentUser = null;
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // ---- Fetch All ----
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        state.users = action.payload.users ?? action.payload;
        state.total = action.payload.total ?? action.payload.length;
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Fetch One ----
    builder
      .addCase(fetchUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUser.fulfilled, (state, action) => {
        state.loading = false;
        state.currentUser = action.payload;
      })
      .addCase(fetchUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Create ----
    builder
      .addCase(createUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(createUser.fulfilled, (state, action) => {
        state.loading = false;
        state.users.unshift(action.payload);
        state.total += 1;
      })
      .addCase(createUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Update ----
    builder
      .addCase(updateUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(updateUser.fulfilled, (state, action) => {
        state.loading = false;
        const index = state.users.findIndex((u) => u.id === action.payload.id);
        if (index !== -1) state.users[index] = action.payload;
        if (state.currentUser?.id === action.payload.id) {
          state.currentUser = action.payload;
        }
      })
      .addCase(updateUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Delete ----
    builder
      .addCase(deleteUser.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(deleteUser.fulfilled, (state, action) => {
        state.loading = false;
        state.users = state.users.filter((u) => u.id !== action.payload);
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(deleteUser.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Reset Password ----
    builder
      .addCase(resetUserPassword.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(resetUserPassword.fulfilled, (state) => {
        state.loading = false;
      })
      .addCase(resetUserPassword.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setFilters, resetFilters, clearCurrentUser, clearError } =
  userSlice.actions;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectUsers = (state) => state.users.users;
export const selectCurrentUser = (state) => state.users.currentUser;
export const selectUserTotal = (state) => state.users.total;
export const selectUserLoading = (state) => state.users.loading;
export const selectUserError = (state) => state.users.error;
export const selectUserFilters = (state) => state.users.filters;

export default userSlice.reducer;
