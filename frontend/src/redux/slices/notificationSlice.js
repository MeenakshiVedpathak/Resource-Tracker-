import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import api from '../../services/api';

// ---------------------------------------------------------------------------
// Async Thunks
// ---------------------------------------------------------------------------

export const fetchNotifications = createAsyncThunk(
  'notifications/fetchAll',
  async (params = {}, { rejectWithValue }) => {
    try {
      const response = await api.get('/notifications', { params });
      return response.data.data; // { notifications, total, unreadCount }
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to fetch notifications'
      );
    }
  }
);

export const markAsRead = createAsyncThunk(
  'notifications/markAsRead',
  async (id, { rejectWithValue }) => {
    try {
      await api.put(`/notifications/${id}/read`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to mark notification as read'
      );
    }
  }
);

export const markAllRead = createAsyncThunk(
  'notifications/markAllRead',
  async (_, { rejectWithValue }) => {
    try {
      await api.put('/notifications/read-all');
      return true;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to mark all notifications as read'
      );
    }
  }
);

export const deleteNotification = createAsyncThunk(
  'notifications/delete',
  async (id, { rejectWithValue }) => {
    try {
      await api.delete(`/notifications/${id}`);
      return id;
    } catch (error) {
      return rejectWithValue(
        error.response?.data?.message || error.message || 'Failed to delete notification'
      );
    }
  }
);

// ---------------------------------------------------------------------------
// Initial State
// ---------------------------------------------------------------------------

const initialState = {
  notifications: [],
  unreadCount: 0,
  total: 0,
  loading: false,
  error: null,
};

// ---------------------------------------------------------------------------
// Slice
// ---------------------------------------------------------------------------

const notificationSlice = createSlice({
  name: 'notifications',
  initialState,
  reducers: {
    /** Optimistically add a real-time notification (e.g. from a WebSocket push). */
    addNotification: (state, action) => {
      state.notifications.unshift(action.payload);
      state.total += 1;
      if (!action.payload.is_read) {
        state.unreadCount += 1;
      }
    },
    clearError: (state) => {
      state.error = null;
    },
  },
  extraReducers: (builder) => {
    // ---- Fetch All ----
    builder
      .addCase(fetchNotifications.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchNotifications.fulfilled, (state, action) => {
        state.loading = false;
        state.notifications =
          action.payload.notifications ?? action.payload;
        state.total = action.payload.total ?? action.payload.length;
        state.unreadCount = action.payload.unreadCount ?? 0;
      })
      .addCase(fetchNotifications.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });

    // ---- Mark As Read ----
    builder
      .addCase(markAsRead.fulfilled, (state, action) => {
        const notification = state.notifications.find(
          (n) => n.id === action.payload
        );
        if (notification && !notification.is_read) {
          notification.is_read = true;
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
      })
      .addCase(markAsRead.rejected, (state, action) => {
        state.error = action.payload;
      });

    // ---- Mark All Read ----
    builder
      .addCase(markAllRead.fulfilled, (state) => {
        state.notifications.forEach((n) => {
          n.is_read = true;
        });
        state.unreadCount = 0;
      })
      .addCase(markAllRead.rejected, (state, action) => {
        state.error = action.payload;
      });

    // ---- Delete ----
    builder
      .addCase(deleteNotification.fulfilled, (state, action) => {
        const removed = state.notifications.find(
          (n) => n.id === action.payload
        );
        if (removed && !removed.is_read) {
          state.unreadCount = Math.max(0, state.unreadCount - 1);
        }
        state.notifications = state.notifications.filter(
          (n) => n.id !== action.payload
        );
        state.total = Math.max(0, state.total - 1);
      })
      .addCase(deleteNotification.rejected, (state, action) => {
        state.error = action.payload;
      });
  },
});

export const { addNotification, clearError } = notificationSlice.actions;

// ---------------------------------------------------------------------------
// Selectors
// ---------------------------------------------------------------------------

export const selectNotifications = (state) =>
  state.notifications.notifications;
export const selectUnreadCount = (state) => state.notifications.unreadCount;
export const selectNotificationTotal = (state) => state.notifications.total;
export const selectNotificationLoading = (state) =>
  state.notifications.loading;
export const selectNotificationError = (state) => state.notifications.error;

export default notificationSlice.reducer;
