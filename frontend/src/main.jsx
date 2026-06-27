import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { Provider } from 'react-redux';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { Toaster } from 'react-hot-toast';
import store from '@/store';
import { ThemeProvider } from '@/contexts/ThemeContext';
import { registerLogoutCallback } from '@/services/apiClient';
import { logout } from '@/store/slices/authSlice';
import App from './App';
import '@/styles/index.css';

// Wire up the logout callback after store is created
registerLogoutCallback(() => {
  store.dispatch(logout());
  window.location.href = '/login';
});

const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 1000 * 60 * 5,      // 5 minutes
      gcTime: 1000 * 60 * 10,         // 10 minutes
      retry: (failureCount, error) => {
        if (error?.response?.status >= 400 && error?.response?.status < 500) return false;
        return failureCount < 2;
      },
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <Provider store={store}>
      <QueryClientProvider client={queryClient}>
        <ThemeProvider>
          <App />
          <Toaster
            position="top-right"
            gutter={8}
            toastOptions={{
              duration: 4000,
              style: {
                background: 'hsl(var(--card))',
                color: 'hsl(var(--card-foreground))',
                border: '1px solid hsl(var(--border))',
                borderRadius: '0.625rem',
                fontSize: '0.875rem',
                padding: '10px 14px',
                boxShadow: '0 4px 24px 0 rgba(0,0,0,0.10)',
              },
              success: {
                iconTheme: { primary: 'hsl(var(--success))', secondary: '#fff' },
              },
              error: {
                iconTheme: { primary: 'hsl(var(--destructive))', secondary: '#fff' },
              },
            }}
          />
        </ThemeProvider>
      </QueryClientProvider>
    </Provider>
  </StrictMode>
);
