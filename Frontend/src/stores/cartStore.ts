import { create } from 'zustand';
import { supabase } from '../lib/supabase';
import { addToCart, getCartItems, removeFromCart, type CartItem } from '../api/cart';

interface CartStoreState {
  items: CartItem[];
  isLoading: boolean;
  isInitialized: boolean;
  error: string | null;
  itemCount: number;
  loadCart: () => Promise<void>;
  addItem: (productId: string, quantity?: number) => Promise<void>;
  removeItem: (productId: string) => Promise<void>;
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
        error: error instanceof Error ? error.message : 'Failed to load cart',
        isInitialized: true,
        isLoading: false,
      });
    }
  },

  addItem: async (productId: string, quantity = 1) => {
    const result = await addToCart(supabase, productId, quantity);
    if (!result.success) {
      throw new Error(result.message || 'Failed to add item to cart');
    }
    await get().loadCart();
  },

  removeItem: async (productId: string) => {
    const result = await removeFromCart(supabase, productId);
    if (!result.success) {
      throw new Error(result.message || 'Failed to remove item from cart');
    }
    await get().loadCart();
  },
}));