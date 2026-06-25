import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import authService from '../../services/authService';

// ---------------------------------------------------------------------------
// Async Thunks
// ---------------------------------------------------------------------------

export const loginThunk = createAsyncThunk(
  'auth/login',
  async (credentials, { rejectWithValue }) => {
    try {
      const response = await authService.login(credentials);
      return response.data.data; // { user, token, refreshToken }
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Login failed'
      );
    }
  }
);

export const logoutThunk = createAsyncThunk(
  'auth/logout',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { refreshToken } = getState().auth;
      if (refreshToken) {
        await authService.logout({ refreshToken });
      }
    } catch (error) {
      // Still clear credentials on the client even if the server call fails
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Logout failed'
      );
    }
  }
);

export const refreshTokenThunk = createAsyncThunk(
  'auth/refreshToken',
  async (_, { getState, rejectWithValue }) => {
    try {
      const { refreshToken } = getState().auth;
      const response = await authService.refreshToken({ refreshToken });
      return response.data.data; // { token, refreshToken }
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Token refresh failed'
      );
    }
  }
);

export const getProfileThunk = createAsyncThunk(
  'auth/getProfile',
  async (_, { rejectWithValue }) => {
    try {
      const response = await authService.getProfile();
      return response.data.data; // user object
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch profile'
      );
    }
  }
);

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

const initialState = {
  user: null,
  token: null,
  refreshToken: null,
  isAuthenticated: false,
  loading: false,
  error: null,
};

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const authSlice = createSlice({
  name: 'auth',
  initialState,
  reducers: {
    /** Manually set credentials (e.g. after token refresh in the axios interceptor). */
    setCredentials: (state, action) => {
      const { user, token, refreshToken } = action.payload;
      if (token) state.token = token;
      if (refreshToken) state.refreshToken = refreshToken;
      if (user) state.user = user;
      state.isAuthenticated = true;
      state.error = null;
    },

    /** Clear all auth state (logout / session expired). */
    clearCredentials: (state) => {
      state.user = null;
      state.token = null;
      state.refreshToken = null;
      state.isAuthenticated = false;
      state.loading = false;
      state.error = null;
    },

    /** Toggle loading flag manually when needed. */
    setLoading: (state, action) => {
      state.loading = action.payload;
    },

    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // ---- Login ----
    builder
      .addCase(loginThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(loginThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload.user;
        state.token = action.payload.token;
        state.refreshToken = action.payload.refreshToken;
        state.isAuthenticated = true;
        state.error = null;
      })
      .addCase(loginThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
        state.isAuthenticated = false;
      });

    // ---- Logout ----
    builder
      .addCase(logoutThunk.pending, (state) => {
        state.loading = true;
      })
      .addCase(logoutThunk.fulfilled, (state) => {
        return { ...initialState }; // full reset
      })
      .addCase(logoutThunk.rejected, (state) => {
        return { ...initialState }; // clear regardless
      });

    // ---- Refresh Token ----
    builder
      .addCase(refreshTokenThunk.fulfilled, (state, action) => {
        state.token = action.payload.token;
        if (action.payload.refreshToken) {
          state.refreshToken = action.payload.refreshToken;
        }
        state.isAuthenticated = true;
      })
      .addCase(refreshTokenThunk.rejected, (state) => {
        return { ...initialState };
      });

    // ---- Get Profile ----
    builder
      .addCase(getProfileThunk.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(getProfileThunk.fulfilled, (state, action) => {
        state.loading = false;
        state.user = action.payload;
      })
      .addCase(getProfileThunk.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { setCredentials, clearCredentials, setLoading, clearError } =
  authSlice.actions;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectCurrentUser = (state) => state.auth.user;
export const selectIsAuthenticated = (state) => state.auth.isAuthenticated;
export const selectAuthLoading = (state) => state.auth.loading;
export const selectAuthError = (state) => state.auth.error;
export const selectToken = (state) => state.auth.token;
export const selectUserRole = (state) => state.auth.user?.role?.role_name;

export default authSlice.reducer;
