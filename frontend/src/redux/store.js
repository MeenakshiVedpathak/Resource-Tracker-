import { configureStore, combineReducers } from '@reduxjs/toolkit';
import {
  persistStore,
  persistReducer,
  FLUSH,
  REHYDRATE,
  PAUSE,
  PERSIST,
  PURGE,
  REGISTER,
} from 'redux-persist';
import storage from 'redux-persist/lib/storage'; // localStorage

// Slice reducers
import authReducer from './slices/authSlice';
import employeeReducer from './slices/employeeSlice';
import userReducer from './slices/userSlice';
import roleReducer from './slices/roleSlice';
import clientReducer from './slices/clientSlice';
import servicePOReducer from './slices/servicePOSlice';
import subProjectReducer from './slices/subProjectSlice';
import monthlyCostReducer from './slices/monthlyCostSlice';
import timesheetReducer from './slices/timesheetSlice';
import reportReducer from './slices/reportSlice';
import dashboardReducer from './slices/dashboardSlice';
import notificationReducer from './slices/notificationSlice';

// ---------------------------------------------------------------------------
// Persistence — only the auth slice is persisted to localStorage.
// All other slices start fresh on page reload to avoid stale data.
// ---------------------------------------------------------------------------

const authPersistConfig = {
  key: 'rut_auth',
  version: 1,
  storage,
  whitelist: ['user', 'token', 'refreshToken', 'isAuthenticated'],
};

const persistedAuthReducer = persistReducer(authPersistConfig, authReducer);

// ---------------------------------------------------------------------------
// Root Reducer
// ---------------------------------------------------------------------------

const rootReducer = combineReducers({
  auth: persistedAuthReducer,
  employees: employeeReducer,
  users: userReducer,
  roles: roleReducer,
  clients: clientReducer,
  servicePOs: servicePOReducer,
  subProjects: subProjectReducer,
  monthlyCosts: monthlyCostReducer,
  timesheets: timesheetReducer,
  reports: reportReducer,
  dashboard: dashboardReducer,
  notifications: notificationReducer,
});

// ---------------------------------------------------------------------------
// Store
// ---------------------------------------------------------------------------

export const store = configureStore({
  reducer: rootReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        // redux-persist dispatches non-serializable actions internally
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }),
  devTools: process.env.NODE_ENV !== 'production',
});

export const persistor = persistStore(store);

export default store;
