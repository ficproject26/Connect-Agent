import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Refresh stale data once when the user returns to the browser tab
      refetchOnWindowFocus: true,
      // Silent 45-second background auto-refresh interval for active queries
      refetchInterval: 45000,
      // Automatically pause polling when the browser tab is hidden/inactive
      refetchIntervalInBackground: false,
      // Keep data fresh for 30s so quick tab changes don't fire duplicate requests
      staleTime: 30000,
      // Keep cached data in memory for 15 minutes
      gcTime: 15 * 60 * 1000,
      // Controlled single retry with backoff, avoiding aggressive retry loops
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 10000),
      // Retain existing data seamlessly during background refetches so UI never drops to empty/flickers
      placeholderData: (previousData) => previousData,
    },
  },
});
