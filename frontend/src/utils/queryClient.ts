import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // Avoid firing redundant network requests on every window focus
      refetchOnWindowFocus: false,
      // Do not automatically poll globally; pages opt in individually if real-time is required
      refetchInterval: false,
      refetchIntervalInBackground: false,
      // Keep data fresh for 60s so rapid navigation and tab switching use instant cache
      staleTime: 60000,
      // Keep cached data in memory for 15 minutes
      gcTime: 15 * 60 * 1000,
      // Controlled single retry with backoff, avoiding aggressive retry loops
      retry: 1,
      retryDelay: (attemptIndex) => Math.min(1000 * 2 ** attemptIndex, 5000),
      // Retain existing data seamlessly during background refetches so UI never drops to empty/flickers
      placeholderData: (previousData) => previousData,
    },
  },
});
