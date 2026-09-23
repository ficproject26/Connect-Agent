import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: false,
      refetchInterval: false,
      refetchIntervalInBackground: false,
      staleTime: 5 * 60 * 1000, // 5 minutes fresh data caching
      gcTime: 15 * 60 * 1000,    // 15 minutes garbage collection time
      retry: 1,
    },
  },
});
