import { useCallback } from 'react';
import { useAppStore } from '../stores/appStore';
import type { Product, Store } from '../types';

export interface UseFavoriteParams<T> {
  item: T;
  getId: (item: T) => string;
  addFavorite: (item: T) => void;
  removeFavorite: (id: string) => void;
  isFavorite: boolean;
}

export function useFavorite<T>({
  item,
  getId,
  addFavorite,
  removeFavorite,
  isFavorite
}: UseFavoriteParams<T>) {
  const itemId = getId(item);
  const favorite = isFavorite;

  const toggleFavorite = useCallback((e?: React.MouseEvent) => {
    e?.stopPropagation();

    if (favorite) {
      removeFavorite(itemId);
    } else {
      addFavorite(item);
    }
  }, [favorite, itemId, item, addFavorite, removeFavorite]);

  return {
    isFavorite: favorite,
    toggleFavorite
  };
}

// Specific implementations for different types
export function useProductFavorite(product: Product) {
  const productId = product.ean || product.id || '';
  const isFavorite = useAppStore(state =>
    state.favoriteProducts.some(p => (p.ean || p.id) === productId)
  );
  const addProduct = useAppStore(state => state.addFavoriteProduct);
  const removeProduct = useAppStore(state => state.removeFavoriteProduct);

  return useFavorite({
    item: product,
    getId: () => productId,
    addFavorite: addProduct,
    removeFavorite: removeProduct,
    isFavorite
  });
}

export function useStoreFavorite(store: Store) {
  const storeId = store.id || store.code || `${store.chain_code}-${store.address}`;
  const isFavorite = useAppStore(state =>
    state.favoriteStores.some(s => (s.id || s.code || `${s.chain_code}-${s.address}`) === storeId)
  );
  const addStore = useAppStore(state => state.addFavoriteStore);
  const removeStore = useAppStore(state => state.removeFavoriteStore);

  return useFavorite({
    item: store,
    getId: () => storeId,
    addFavorite: addStore,
    removeFavorite: removeStore,
    isFavorite
  });
}