import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { addToCart, getCartItems, removeFromCart, type CartItem } from '../api/cart';
import { LocalizedApiError } from '../utils/apiErrors';

interface CartStoreState {
  items: CartItem[];
  isLoading: boolean;
  isInitialized: boolean;
  error: unknown | null;
  itemCount: number;
  loadCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
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

  clearError: () => set({ error: null }),

  resetCart: () => set({
    items: [],
    itemCount: 0,
    error: null,
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

  removeItem: async (productId: string) => {
    const result = await removeFromCart(supabase, productId);
    if (!result.success) {
      throw new LocalizedApiError('CART_REMOVE_FAILED', result.message || 'Failed to remove item from cart.');
    }
    await get().loadCart();
  },
}));