import { QueryClient } from '@tanstack/react-query';

export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      refetchInterval: 5000, // 5s automatic real-time data refresh
      refetchIntervalInBackground: false, // Pause polling when tab is inactive to prevent unnecessary backend load
      staleTime: 2000,
      retry: 1,
    },
  },
});
