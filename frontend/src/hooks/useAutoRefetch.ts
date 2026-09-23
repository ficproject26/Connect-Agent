import { useQuery, UseQueryOptions, QueryKey } from '@tanstack/react-query';
import { queryClient } from '../utils/queryClient';

export const DEFAULT_REFETCH_INTERVAL = 30000; // 30 seconds moderate background refresh

/**
 * Standard auto-refetching query hook with background polling,
 * automatic tab-visibility pausing/resuming, and fast initial caching.
 */
export function useAutoRefetch<TData = any, TError = any>(
  queryKey: QueryKey,
  queryFn: () => Promise<TData>,
  options?: Omit<UseQueryOptions<TData, TError, TData, QueryKey>, 'queryKey' | 'queryFn'>
) {
  return useQuery<TData, TError, TData, QueryKey>({
    queryKey,
    queryFn,
    refetchInterval: DEFAULT_REFETCH_INTERVAL,
    refetchIntervalInBackground: false,
    refetchOnWindowFocus: false,
    staleTime: 30000,
    ...options,
  });
}

/**
 * Helper to invalidate affected queries after any mutation
 * without doing a full browser page refresh.
 */
export function invalidateAutoQueries(queryKeys: QueryKey | QueryKey[]) {
  const keys = Array.isArray(queryKeys[0]) ? queryKeys as QueryKey[] : [queryKeys as QueryKey];
  keys.forEach((key) => {
    queryClient.invalidateQueries({ queryKey: key });
  });
}
