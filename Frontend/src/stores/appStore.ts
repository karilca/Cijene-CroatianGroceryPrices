import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';
import type { Product, Store } from '../types';

// App state interface
interface AppState {
  // UI state
  sidebarOpen: boolean;
  theme: 'light' | 'dark' | 'system';

  // User preferences
  defaultLocation: {
    latitude: number | null;
    longitude: number | null;
    city: string | null;
    country: string;
  };
  searchRadius: number;
  preferredChains: string[];
  currency: 'EUR' | 'HRK';
  language: 'en' | 'hr';

  // Favorites
  favoriteProducts: Product[];
  favoriteStores: Store[];

  // Search history
  searchHistory: {
    products: string[];
    stores: string[];
  };

  // Recent views
  recentlyViewedProducts: Product[];
  recentlyViewedStores: Store[];

  // Compare products
  compareProducts: Product[];

  // Actions for UI state
  toggleSidebar: () => void;
  setSidebarOpen: (open: boolean) => void;
  setTheme: (theme: 'light' | 'dark' | 'system') => void;

  // Actions for user preferences
  setDefaultLocation: (location: {
    latitude: number | null;
    longitude: number | null;
    city: string | null;
    country: string;
  }) => void;
  setSearchRadius: (radius: number) => void;
  setPreferredChains: (chains: string[]) => void;
  addPreferredChain: (chainCode: string) => void;
  removePreferredChain: (chainCode: string) => void;
  setCurrency: (currency: 'EUR' | 'HRK') => void;
  setLanguage: (language: 'en' | 'hr') => void;

  // Actions for favorites
  addFavoriteProduct: (product: Product) => void;
  removeFavoriteProduct: (productId: string) => void;
  isFavoriteProduct: (productId: string) => boolean;
  addFavoriteStore: (store: Store) => void;
  removeFavoriteStore: (storeId: string) => void;
  isFavoriteStore: (storeId: string) => boolean;
  clearFavorites: () => void;

  // Actions for search history
  addProductSearch: (query: string) => void;
  addStoreSearch: (query: string) => void;
  clearSearchHistory: () => void;
  clearProductSearchHistory: () => void;
  clearStoreSearchHistory: () => void;

  // Actions for recent views
  addRecentlyViewedProduct: (product: Product) => void;
  addRecentlyViewedStore: (store: Store) => void;
  clearRecentlyViewed: () => void;

  // Actions for compare products
  addCompareProduct: (product: Product) => void;
  removeCompareProduct: (productId: string) => void;
  isProductInCompare: (productId: string) => boolean;
  clearCompareProducts: () => void;

  // Utility actions
  resetAppState: () => void;
}

// Initial state
const initialState = {
  // UI state
  sidebarOpen: false,
  theme: 'system' as const,

  // User preferences
  defaultLocation: {
    latitude: null,
    longitude: null,
    city: null,
    country: 'HR', // Default to Croatia
  },
  searchRadius: 5000, // 5km default
  preferredChains: [],
  currency: 'EUR' as const,
  language: 'en' as const,

  // Favorites
  favoriteProducts: [],
  favoriteStores: [],

  // Search history
  searchHistory: {
    products: [],
    stores: [],
  },

  // Recent views
  recentlyViewedProducts: [],
  recentlyViewedStores: [],

  // Compare products
  compareProducts: [],
};

// Maximum items to keep in arrays
const MAX_SEARCH_HISTORY = 10;
const MAX_RECENT_ITEMS = 20;

// Create the store with persistence
export const useAppStore = create<AppState>()(
  persist(
    (set, get) => ({
      ...initialState,

      // UI actions
      toggleSidebar: () => set((state) => ({ sidebarOpen: !state.sidebarOpen })),
      setSidebarOpen: (open: boolean) => set({ sidebarOpen: open }),
      setTheme: (theme: 'light' | 'dark' | 'system') => set({ theme }),

      // User preference actions
      setDefaultLocation: (location) => set({ defaultLocation: location }),
      setSearchRadius: (radius: number) => set({ searchRadius: Math.max(100, Math.min(radius, 50000)) }),
      setPreferredChains: (chains: string[]) => set({ preferredChains: chains }),
      addPreferredChain: (chainCode: string) => set((state) => ({
        preferredChains: state.preferredChains.includes(chainCode)
          ? state.preferredChains
          : [...state.preferredChains, chainCode]
      })),
      removePreferredChain: (chainCode: string) => set((state) => ({
        preferredChains: state.preferredChains.filter(code => code !== chainCode)
      })),
      setCurrency: (currency: 'EUR' | 'HRK') => set({ currency }),
      setLanguage: (language: 'en' | 'hr') => set({ language }),

      // Favorite actions
      addFavoriteProduct: (product: Product) => set((state) => {
        const productId = product.ean || product.id;
        if (!productId || state.favoriteProducts.some(p => (p.ean || p.id) === productId)) {
          return state;
        }
        return { favoriteProducts: [...state.favoriteProducts, product] };
      }),
      removeFavoriteProduct: (productId: string) => set((state) => ({
        favoriteProducts: state.favoriteProducts.filter(p => (p.ean || p.id) !== productId)
      })),
      isFavoriteProduct: (productId: string) => {
        const state = get();
        return state.favoriteProducts.some(p => (p.ean || p.id) === productId);
      },
      addFavoriteStore: (store: Store) => set((state) => {
        const storeId = store.id || store.code || `${store.chain_code}-${store.address}`;
        if (!storeId || state.favoriteStores.some(s => (s.id || s.code || `${s.chain_code}-${s.address}`) === storeId)) {
          return state;
        }
        return { favoriteStores: [...state.favoriteStores, store] };
      }),
      removeFavoriteStore: (storeId: string) => set((state) => ({
        favoriteStores: state.favoriteStores.filter(s => (s.id || s.code || `${s.chain_code}-${s.address}`) !== storeId)
      })),
      isFavoriteStore: (storeId: string) => {
        const state = get();
        return state.favoriteStores.some(s => (s.id || s.code || `${s.chain_code}-${s.address}`) === storeId);
      },
      clearFavorites: () => set({ favoriteProducts: [], favoriteStores: [] }),

      // Search history actions
      addProductSearch: (query: string) => set((state) => {
        const trimmedQuery = query.trim();
        if (!trimmedQuery || state.searchHistory.products.includes(trimmedQuery)) {
          return state;
        }
        const newHistory = [trimmedQuery, ...state.searchHistory.products].slice(0, MAX_SEARCH_HISTORY);
        return {
          searchHistory: {
            ...state.searchHistory,
            products: newHistory
          }
        };
      }),
      addStoreSearch: (query: string) => set((state) => {
        const trimmedQuery = query.trim();
        if (!trimmedQuery || state.searchHistory.stores.includes(trimmedQuery)) {
          return state;
        }
        const newHistory = [trimmedQuery, ...state.searchHistory.stores].slice(0, MAX_SEARCH_HISTORY);
        return {
          searchHistory: {
            ...state.searchHistory,
            stores: newHistory
          }
        };
      }),
      clearSearchHistory: () => set({
        searchHistory: { products: [], stores: [] }
      }),
      clearProductSearchHistory: () => set((state) => ({
        searchHistory: { ...state.searchHistory, products: [] }
      })),
      clearStoreSearchHistory: () => set((state) => ({
        searchHistory: { ...state.searchHistory, stores: [] }
      })),

      // Recent views actions
      addRecentlyViewedProduct: (product: Product) => set((state) => {
        const productId = product.ean || product.id;
        const filtered = state.recentlyViewedProducts.filter(p => (p.ean || p.id) !== productId);
        return {
          recentlyViewedProducts: [product, ...filtered].slice(0, MAX_RECENT_ITEMS)
        };
      }),
      addRecentlyViewedStore: (store: Store) => set((state) => {
        const filtered = state.recentlyViewedStores.filter(s => s.id !== store.id);
        return {
          recentlyViewedStores: [store, ...filtered].slice(0, MAX_RECENT_ITEMS)
        };
      }),
      clearRecentlyViewed: () => set({
        recentlyViewedProducts: [],
        recentlyViewedStores: []
      }),

      // Compare products actions
      addCompareProduct: (product: Product) => set((state) => {
        const productId = product.ean || product.id;
        if (!productId || state.compareProducts.some(p => (p.ean || p.id) === productId)) {
          return state;
        }
        // Maximum 4 products for comparison
        if (state.compareProducts.length >= 4) {
          return state;
        }
        return { compareProducts: [...state.compareProducts, product] };
      }),
      removeCompareProduct: (productId: string) => set((state) => ({
        compareProducts: state.compareProducts.filter(p => (p.ean || p.id) !== productId)
      })),
      isProductInCompare: (productId: string) => {
        const state = get();
        return state.compareProducts.some(p => (p.ean || p.id) === productId);
      },
      clearCompareProducts: () => set({ compareProducts: [] }),

      // Utility actions
      resetAppState: () => set(initialState),
    }),
    {
      name: 'cijene-app-store', // Storage key
      storage: createJSONStorage(() => localStorage),
      // Only persist user preferences and user data, not UI state
      partialize: (state) => ({
        theme: state.theme,
        defaultLocation: state.defaultLocation,
        searchRadius: state.searchRadius,
        preferredChains: state.preferredChains,
        currency: state.currency,
        language: state.language,
        favoriteProducts: state.favoriteProducts,
        favoriteStores: state.favoriteStores,
        searchHistory: state.searchHistory,
        recentlyViewedProducts: state.recentlyViewedProducts,
        recentlyViewedStores: state.recentlyViewedStores,
      }),
    }
  )
);

// Selector hooks for better performance
export const useAppTheme = () => useAppStore((state) => state.theme);
export const useSidebarState = () => useAppStore((state) => ({
  isOpen: state.sidebarOpen,
  toggle: state.toggleSidebar,
  setOpen: state.setSidebarOpen
}));
export const useUserLocation = () => useAppStore((state) => ({
  location: state.defaultLocation,
  setLocation: state.setDefaultLocation,
  searchRadius: state.searchRadius,
  setSearchRadius: state.setSearchRadius
}));
export const useUserPreferences = () => useAppStore((state) => ({
  preferredChains: state.preferredChains,
  addChain: state.addPreferredChain,
  removeChain: state.removePreferredChain,
  setChains: state.setPreferredChains,
  currency: state.currency,
  setCurrency: state.setCurrency,
  language: state.language,
  setLanguage: state.setLanguage
}));
// Individual selectors to avoid object creation on each render
export const useFavoriteProducts = () => useAppStore((state) => state.favoriteProducts);
export const useFavoriteStores = () => useAppStore((state) => state.favoriteStores);

// Individual action selectors - these should not cause re-renders since functions are stable
export const useAddFavoriteProduct = () => useAppStore((state) => state.addFavoriteProduct);
export const useRemoveFavoriteProduct = () => useAppStore((state) => state.removeFavoriteProduct);
export const useIsProductFavorite = () => useAppStore((state) => state.isFavoriteProduct);
export const useAddFavoriteStore = () => useAppStore((state) => state.addFavoriteStore);
export const useRemoveFavoriteStore = () => useAppStore((state) => state.removeFavoriteStore);
export const useIsStoreFavorite = () => useAppStore((state) => state.isFavoriteStore);
export const useClearFavorites = () => useAppStore((state) => state.clearFavorites);

// Combined actions hook - avoid using this in components that frequently re-render
export const useFavoriteActions = () => {
  const addProduct = useAddFavoriteProduct();
  const removeProduct = useRemoveFavoriteProduct();
  const isProductFavorite = useIsProductFavorite();
  const addStore = useAddFavoriteStore();
  const removeStore = useRemoveFavoriteStore();
  const isStoreFavorite = useIsStoreFavorite();
  const clear = useClearFavorites();

  return {
    addProduct,
    removeProduct,
    isProductFavorite,
    addStore,
    removeStore,
    isStoreFavorite,
    clear
  };
};

// Backward compatibility - but use individual selectors when possible
export const useFavorites = () => {
  const products = useFavoriteProducts();
  const stores = useFavoriteStores();
  const actions = useFavoriteActions();

  return {
    products,
    stores,
    ...actions
  };
};
export const useSearchHistory = () => useAppStore((state) => ({
  history: state.searchHistory,
  addProductSearch: state.addProductSearch,
  addStoreSearch: state.addStoreSearch,
  clearAll: state.clearSearchHistory,
  clearProducts: state.clearProductSearchHistory,
  clearStores: state.clearStoreSearchHistory
}));
export const useRecentlyViewed = () => useAppStore((state) => ({
  products: state.recentlyViewedProducts,
  stores: state.recentlyViewedStores,
  addProduct: state.addRecentlyViewedProduct,
  addStore: state.addRecentlyViewedStore,
  clear: state.clearRecentlyViewed
}));

// Compare products selectors
export const useCompareProducts = () => useAppStore((state) => state.compareProducts);
export const useAddCompareProduct = () => useAppStore((state) => state.addCompareProduct);
export const useRemoveCompareProduct = () => useAppStore((state) => state.removeCompareProduct);
export const useIsProductInCompare = () => useAppStore((state) => state.isProductInCompare);
export const useClearCompareProducts = () => useAppStore((state) => state.clearCompareProducts);

export const useCompareActions = () => {
  const products = useCompareProducts();
  const addProduct = useAddCompareProduct();
  const removeProduct = useRemoveCompareProduct();
  const isInCompare = useIsProductInCompare();
  const clear = useClearCompareProducts();

  return {
    products,
    addProduct,
    removeProduct,
    isInCompare,
    clear
  };
};
