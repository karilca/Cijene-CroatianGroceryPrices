import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import type { UseQueryOptions, UseMutationOptions } from '@tanstack/react-query';
import {
  productService,
  storeService,
  chainService,
  archiveService,
} from '../services';
import type {
  ProductSearchRequest,
  ProductSearchResponse,
  Product,
  PriceRequest,
  PriceComparison,
  StoreSearchRequest,
  StoreSearchResponse,
  Store,
  ChainListResponse,
  Chain,
  ArchiveListResponse,
  Archive,
} from '../types';
import { queryKeys } from '../config/queryClient';

// Product hooks
export function useProductSearch(
  params: ProductSearchRequest,
  options?: Omit<UseQueryOptions<ProductSearchResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.products.list(params),
    queryFn: async () => {
      // If EAN is provided, use the direct lookup endpoint
      if (params.ean) {
        try {
          const product = await productService.getProductByEAN(params.ean);
          return {
            products: [product],
            total_count: 1,
            page: 1,
            per_page: 1,
            total_pages: 1
          } as ProductSearchResponse;
        } catch (error: any) {
          // If product not found (404), return empty result
          if (error?.response?.status === 404 || error?.status === 404 || error?.message?.includes('404')) {
            return {
              products: [],
              total_count: 0,
              page: 1,
              per_page: 1,
              total_pages: 0
            } as ProductSearchResponse;
          }
          throw error;
        }
      }

      // Otherwise use the standard search
      return productService.searchProducts(params);
    },
    enabled: !!(params.query || params.ean || params.chain_code),
    ...options,
  });
}

export function useProduct(
  id: string,
  options?: Omit<UseQueryOptions<Product>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.products.detail(id),
    queryFn: () => productService.getProductById(id),
    enabled: !!id,
    ...options,
  });
}

export function useProductByEAN(
  ean: string,
  options?: Omit<UseQueryOptions<Product>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.products.byEAN(ean),
    queryFn: () => productService.getProductByEAN(ean),
    enabled: !!ean && ean.length >= 8, // Basic EAN validation
    ...options,
  });
}

export function useProductPrices(
  params: PriceRequest,
  product: Product,
  options?: Omit<UseQueryOptions<PriceComparison>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.products.prices(params.eans, { ...params, eans: undefined }),
    queryFn: () => productService.getProductPrices(params, product),
    enabled: !!params.eans,
    ...options,
  });
}

export function useProductSuggestions(
  query: string,
  limit: number = 5,
  options?: Omit<UseQueryOptions<Product[]>, 'queryKey' | 'queryFn'>
) {
  const safeQuery = query || '';
  return useQuery({
    queryKey: queryKeys.products.suggestions(safeQuery),
    queryFn: () => productService.getProductSuggestions(safeQuery, limit),
    enabled: !!safeQuery && safeQuery.trim().length >= 2,
    staleTime: 30 * 1000, // 30 seconds for suggestions
    ...options,
  });
}

export function usePopularProducts(
  limit: number = 10,
  options?: Omit<UseQueryOptions<Product[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.products.popular(),
    queryFn: () => productService.getPopularProducts(limit),
    staleTime: 10 * 60 * 1000, // 10 minutes for popular products
    ...options,
  });
}

// Store hooks
export function useStoreSearch(
  params: StoreSearchRequest,
  options?: Omit<UseQueryOptions<StoreSearchResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.stores.list(params),
    queryFn: () => storeService.searchStores(params),
    enabled: !!(params.query || params.city || (params.latitude && params.longitude)),
    ...options,
  });
}

export function useStore(
  id: string,
  options?: Omit<UseQueryOptions<Store>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.stores.detail(id),
    queryFn: () => storeService.getStoreById(id),
    enabled: !!id,
    ...options,
  });
}

export function useNearbyStores(
  latitude: number,
  longitude: number,
  radius: number = 5000,
  chainCodes?: string[],
  options?: Omit<UseQueryOptions<Store[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.stores.nearby(latitude, longitude, radius),
    queryFn: () => storeService.findNearbyStores(latitude, longitude, radius, chainCodes),
    enabled: !!(latitude && longitude),
    ...options,
  });
}

export function useStoresByCity(
  city: string,
  chainCodes?: string[],
  options?: Omit<UseQueryOptions<Store[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.stores.byCity(city),
    queryFn: () => storeService.findStoresByCity(city, chainCodes),
    enabled: !!city,
    ...options,
  });
}

export function useStoresByChain(
  chainCode: string,
  options?: Omit<UseQueryOptions<Store[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.stores.byChain(chainCode),
    queryFn: () => storeService.getStoresByChain(chainCode),
    enabled: !!chainCode,
    ...options,
  });
}

export function useStoreSuggestions(
  query: string,
  limit: number = 5,
  options?: Omit<UseQueryOptions<Store[]>, 'queryKey' | 'queryFn'>
) {
  const safeQuery = query || '';
  return useQuery({
    queryKey: queryKeys.stores.suggestions(safeQuery),
    queryFn: () => storeService.getStoreSuggestions(safeQuery, limit),
    enabled: !!safeQuery && safeQuery.trim().length >= 2,
    staleTime: 30 * 1000, // 30 seconds for suggestions
    ...options,
  });
}

// Chain hooks
export function useChains(
  options?: Omit<UseQueryOptions<ChainListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.chains.lists(),
    queryFn: () => chainService.getChains(),
    staleTime: 30 * 60 * 1000, // 30 minutes for chains list
    ...options,
  });
}

export function useChain(
  code: string,
  options?: Omit<UseQueryOptions<Chain>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.chains.detail(code),
    queryFn: () => chainService.getChainByCode(code),
    enabled: !!code,
    ...options,
  });
}

export function useChainStats(
  code: string,
  options?: Omit<UseQueryOptions<{ stores_count: number; products_count: number; last_updated: string }>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.chains.stats(code),
    queryFn: () => chainService.getChainStats(code),
    enabled: !!code,
    ...options,
  });
}

export function useChainCodes(
  options?: Omit<UseQueryOptions<string[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.chains.codes(),
    queryFn: () => chainService.getChainCodes(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

export function useChainMap(
  options?: Omit<UseQueryOptions<Record<string, string>>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.chains.map(),
    queryFn: () => chainService.getChainMap(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

export function useChainSearch(
  query: string,
  options?: Omit<UseQueryOptions<Chain[]>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.chains.search(query),
    queryFn: () => chainService.searchChains(query),
    enabled: !!query && query.trim().length >= 2,
    ...options,
  });
}

// Archive hooks
export function useArchives(
  options?: Omit<UseQueryOptions<ArchiveListResponse>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.archives.list(),
    queryFn: () => archiveService.getArchives(),
    staleTime: 60 * 60 * 1000, // 1 hour for archives
    ...options,
  });
}

export function useArchive(
  date: string,
  options?: Omit<UseQueryOptions<string>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.archives.detail(date),
    queryFn: () => archiveService.getArchiveByDate(date),
    enabled: !!date,
    ...options,
  });
}

export function useLatestArchive(
  options?: Omit<UseQueryOptions<Archive>, 'queryKey' | 'queryFn'>
) {
  return useQuery({
    queryKey: queryKeys.archives.latest(),
    queryFn: () => archiveService.getLatestArchive(),
    staleTime: 30 * 60 * 1000, // 30 minutes
    ...options,
  });
}

// Mutation hooks for operations that modify data
export function useDownloadArchive(
  options?: Omit<UseMutationOptions<Blob, Error, string>, 'mutationFn'>
) {
  return useMutation({
    mutationFn: (date: string) => archiveService.downloadArchive(date),
    ...options,
  });
}

// Hook to invalidate related queries
export function useInvalidateQueries() {
  const queryClient = useQueryClient();

  return {
    invalidateProducts: () => queryClient.invalidateQueries({ queryKey: queryKeys.products.all }),
    invalidateStores: () => queryClient.invalidateQueries({ queryKey: queryKeys.stores.all }),
    invalidateChains: () => queryClient.invalidateQueries({ queryKey: queryKeys.chains.all }),
    invalidateArchives: () => queryClient.invalidateQueries({ queryKey: queryKeys.archives.all }),
    invalidateAll: () => queryClient.invalidateQueries(),
  };
}
