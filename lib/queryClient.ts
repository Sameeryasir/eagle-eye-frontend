import { QueryClient } from '@tanstack/react-query';

// Cache-first defaults: navigating back should reuse data, not hammer the API.
// Mutations still call invalidateQueries to refresh after writes.
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      staleTime: 2 * 60_000,
      gcTime: 15 * 60_000,
      retry: 1,
      refetchOnMount: false,
      refetchOnReconnect: true,
      refetchOnWindowFocus: false,
    },
    mutations: {
      retry: 0,
    },
  },
});
