import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import {
  addToCart,
  decrementCartItem,
  getCartItems,
  incrementCartItem,
  optimizeCart as optimizeCartApi,
  removeFromCart,
  submitCartOptimizationFeedback,
  type CartItem,
} from '../api/cart';
import type { CartOptimizeRequest, CartOptimizationResponse } from '../types';
import { LocalizedApiError } from '../utils/apiErrors';

interface CartStoreState {
  items: CartItem[];
  isLoading: boolean;
  isInitialized: boolean;
  error: unknown | null;
  itemCount: number;
  optimization: CartOptimizationResponse | null;
  isOptimizing: boolean;
  optimizationError: unknown | null;
  isSubmittingOptimizationFeedback: boolean;
  loadCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  incrementItem: (productId: string) => Promise<void>;
  decrementItem: (productId: string) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
  optimizeCart: (request: CartOptimizeRequest) => Promise<void>;
  submitOptimizationFeedback: (accepted: boolean) => Promise<void>;
  clearOptimization: () => void;
  resetCart: () => void;
  clearError: () => void;
}

const calculateItemCount = (items: CartItem[]): number => {
  return items.reduce((total, item) => {
    const amount = item.cart_quantity ?? item.quantity ?? 1;
    return total + Math.max(0, Number(amount));
  }, 0);
};

export const useCartStore = create<CartStoreState>((set, get) => ({
  items: [],
  isLoading: false,
  isInitialized: false,
  error: null,
  itemCount: 0,
  optimization: null,
  isOptimizing: false,
  optimizationError: null,
  isSubmittingOptimizationFeedback: false,

  clearError: () => set({ error: null }),

  clearOptimization: () => set({ optimization: null, optimizationError: null }),

  resetCart: () => set({
    items: [],
    itemCount: 0,
    error: null,
    optimization: null,
    optimizationError: null,
    isSubmittingOptimizationFeedback: false,
    isOptimizing: false,
    isInitialized: false,
    isLoading: false,
  }),

  loadCart: async () => {
    set({ isLoading: true, error: null });
    try {
      const data = await getCartItems(supabase);
      const items = data.items || [];
      set({
        items,
        itemCount: calculateItemCount(items),
        optimization: items.length > 0 ? get().optimization : null,
        isInitialized: true,
        isLoading: false,
      });
    } catch (error) {
      set({
        error: error instanceof Error ? error.message : String(error),
        isInitialized: true,
        isLoading: false,
      });
    }
  },

  addItem: async (productId: string, quantity = 1) => {
    const result = await addToCart(supabase, productId, quantity);
    if (!result.success) {
      throw new LocalizedApiError('CART_ADD_FAILED', result.message || 'Failed to add item to cart.');
    }
    await get().loadCart();
  },

  incrementItem: async (productId: string) => {
    const result = await incrementCartItem(supabase, productId);
    if (!result.success) {
      throw new LocalizedApiError('CART_INCREMENT_FAILED', result.message || 'Failed to increase quantity.');
    }
    await get().loadCart();
  },

  decrementItem: async (productId: string) => {
    const result = await decrementCartItem(supabase, productId);
    if (!result.success) {
      throw new LocalizedApiError('CART_DECREMENT_FAILED', result.message || 'Failed to decrease quantity.');
    }
    await get().loadCart();
  },

  removeItem: async (productId: string) => {
    const result = await removeFromCart(supabase, productId);
    if (!result.success) {
      throw new LocalizedApiError('CART_REMOVE_FAILED', result.message || 'Failed to remove item from cart.');
    }
    await get().loadCart();
  },

  optimizeCart: async (request: CartOptimizeRequest) => {
    set({ isOptimizing: true, optimizationError: null });
    try {
      const optimization = await optimizeCartApi(supabase, request);
      set({ optimization, isOptimizing: false, optimizationError: null });
    } catch (error: unknown) {
      set({ isOptimizing: false, optimizationError: error instanceof Error ? error.message : String(error) });
    }
  },

  submitOptimizationFeedback: async (accepted: boolean) => {
    const optimization = get().optimization;
    if (!optimization?.recommendation?.mode) {
      throw new LocalizedApiError('CART_OPTIMIZATION_MISSING', 'No optimization recommendation available.');
    }

    set({ isSubmittingOptimizationFeedback: true });
    try {
      await submitCartOptimizationFeedback(supabase, {
        mode: optimization.recommendation.mode,
        accepted,
        algorithmUsed: optimization.metadata?.algorithmUsed,
        recommendationTotalCost: optimization.recommendation.totalCost,
        recommendationStoresVisited: optimization.recommendation.storesVisited,
        recommendationAverageDistanceKm: optimization.recommendation.averageDistanceKm,
      });
    } finally {
      set({ isSubmittingOptimizationFeedback: false });
    }
  },
}));