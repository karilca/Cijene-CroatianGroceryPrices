import { QueryClient } from '@tanstack/react-query';

// Query client configuration
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      // 5 minutes cache time
      staleTime: 5 * 60 * 1000,
      // 10 minutes garbage collection time
      gcTime: 10 * 60 * 1000,
      // Retry failed requests up to 3 times with backoff
      retry: (failureCount, error: any) => {
        // Don't retry on authentication errors
        if (error?.status === 401 || error?.status === 403) {
          return false;
        }
        // Don't retry on client errors (4xx except auth)
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 3 times for other errors
        return failureCount < 3;
      },
      // Enable background refetching when window gains focus
      refetchOnWindowFocus: true,
      // Enable background refetching when reconnecting
      refetchOnReconnect: true,
      // Refetch after 5 minutes of being stale
      refetchInterval: 5 * 60 * 1000,
    },
    mutations: {
      // Retry mutations up to 2 times with custom logic
      retry: (failureCount, error: any) => {
        // Don't retry on authentication or client errors
        if (error?.status >= 400 && error?.status < 500) {
          return false;
        }
        // Retry up to 2 times for other errors
        return failureCount < 2;
      },
    },
  },
});

// Query keys factory for consistent key generation
export const queryKeys = {
  // Product queries
  products: {
    all: ['products'] as const,
    lists: () => [...queryKeys.products.all, 'list'] as const,
    list: (params: any) => [...queryKeys.products.lists(), params] as const,
    details: () => [...queryKeys.products.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.products.details(), id] as const,
    prices: (id: string, params?: any) => [...queryKeys.products.detail(id), 'prices', params] as const,
    suggestions: (query: string) => [...queryKeys.products.all, 'suggestions', query] as const,
    popular: () => [...queryKeys.products.all, 'popular'] as const,
    byEAN: (ean: string) => [...queryKeys.products.all, 'ean', ean] as const,
    byChainCode: (chainCode: string) => [...queryKeys.products.all, 'chain', chainCode] as const,
  },

  // Store queries
  stores: {
    all: ['stores'] as const,
    lists: () => [...queryKeys.stores.all, 'list'] as const,
    list: (params: any) => [...queryKeys.stores.lists(), params] as const,
    details: () => [...queryKeys.stores.all, 'detail'] as const,
    detail: (id: string) => [...queryKeys.stores.details(), id] as const,
    nearby: (lat: number, lng: number, radius: number) =>
      [...queryKeys.stores.all, 'nearby', lat, lng, radius] as const,
    byCity: (city: string) => [...queryKeys.stores.all, 'city', city] as const,
    byChain: (chainCode: string) => [...queryKeys.stores.all, 'chain', chainCode] as const,
    suggestions: (query: string) => [...queryKeys.stores.all, 'suggestions', query] as const,
  },

  // Chain queries
  chains: {
    all: ['chains'] as const,
    lists: () => [...queryKeys.chains.all, 'list'] as const,
    details: () => [...queryKeys.chains.all, 'detail'] as const,
    detail: (code: string) => [...queryKeys.chains.details(), code] as const,
    stats: (code: string) => [...queryKeys.chains.detail(code), 'stats'] as const,
    codes: () => [...queryKeys.chains.all, 'codes'] as const,
    map: () => [...queryKeys.chains.all, 'map'] as const,
    search: (query: string) => [...queryKeys.chains.all, 'search', query] as const,
    byStoreCount: () => [...queryKeys.chains.all, 'by-store-count'] as const,
    byProductCount: () => [...queryKeys.chains.all, 'by-product-count'] as const,
    recentlyUpdated: (days: number) => [...queryKeys.chains.all, 'recently-updated', days] as const,
  },

  // Archive queries
  archives: {
    all: ['archives'] as const,
    list: () => [...queryKeys.archives.all, 'list'] as const,
    detail: (date: string) => [...queryKeys.archives.all, 'detail', date] as const,
    metadata: (date: string) => [...queryKeys.archives.detail(date), 'metadata'] as const,
    dates: () => [...queryKeys.archives.all, 'dates'] as const,
    latest: () => [...queryKeys.archives.all, 'latest'] as const,
  },

  // User/Auth queries
  user: {
    all: ['user'] as const,
    profile: () => [...queryKeys.user.all, 'profile'] as const,
    preferences: () => [...queryKeys.user.all, 'preferences'] as const,
  },
} as const;
