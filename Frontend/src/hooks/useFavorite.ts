import { useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAppStore } from '../stores/appStore';
import type { Product, Store } from '../types';
import { useAuth } from './useAuth';
import { supabase } from '../lib/supabase';
import {
  addFavoriteProduct as addFavoriteProductApi,
  addFavoriteStore as addFavoriteStoreApi,
  getNormalizedStoreId,
  removeFavoriteProduct as removeFavoriteProductApi,
  removeFavoriteStore as removeFavoriteStoreApi,
} from '../api/favorites';

export interface UseFavoriteParams<T> {
  item: T;
  getId: (item: T) => string;
  addFavorite: (item: T) => void | Promise<void>;
  removeFavorite: (id: string) => void | Promise<void>;
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
      void removeFavorite(itemId);
    } else {
      void addFavorite(item);
    }
  }, [favorite, itemId, item, addFavorite, removeFavorite]);

  return {
    isFavorite: favorite,
    toggleFavorite
  };
}

// Specific implementations for different types
export function useProductFavorite(product: Product) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const productId = product.ean || product.id || '';
  const isFavorite = useAppStore(state =>
    state.favoriteProducts.some(p => (p.ean || p.id) === productId)
  );
  const addProduct = useAppStore(state => state.addFavoriteProduct);
  const removeProduct = useAppStore(state => state.removeFavoriteProduct);
  const setProducts = useAppStore(state => state.setFavoriteProducts);

  const addFavorite = useCallback(async (item: Product) => {
    if (!session) {
      navigate('/auth');
      return;
    }

    const id = item.ean || item.id;
    if (!id) {
      return;
    }

    addProduct(item);
    try {
      await addFavoriteProductApi(supabase, id);
    } catch {
      setProducts(useAppStore.getState().favoriteProducts.filter(p => (p.ean || p.id) !== id));
    }
  }, [session, navigate, addProduct, setProducts]);

  const removeFavorite = useCallback(async (id: string) => {
    if (!session) {
      navigate('/auth');
      return;
    }

    const previous = useAppStore.getState().favoriteProducts;
    removeProduct(id);
    try {
      await removeFavoriteProductApi(supabase, id);
    } catch {
      setProducts(previous);
    }
  }, [session, navigate, removeProduct, setProducts]);

  return useFavorite({
    item: product,
    getId: () => productId,
    addFavorite,
    removeFavorite,
    isFavorite
  });
}

export function useStoreFavorite(store: Store) {
  const navigate = useNavigate();
  const { session } = useAuth();
  const storeId = getNormalizedStoreId(store);
  const isFavorite = useAppStore(state =>
    state.favoriteStores.some(s => getNormalizedStoreId(s) === storeId)
  );
  const addStore = useAppStore(state => state.addFavoriteStore);
  const removeStore = useAppStore(state => state.removeFavoriteStore);
  const setStores = useAppStore(state => state.setFavoriteStores);

  const addFavorite = useCallback(async (item: Store) => {
    if (!session) {
      navigate('/auth');
      return;
    }

    const nextStoreId = getNormalizedStoreId(item);
    const chainCode = item.chain_code || item.chain;
    const storeCode = item.code || item.id;

    if (!nextStoreId || !chainCode || !storeCode) {
      return;
    }

    addStore({ ...item, id: nextStoreId });
    try {
      await addFavoriteStoreApi(supabase, nextStoreId, chainCode, storeCode);
    } catch {
      setStores(useAppStore.getState().favoriteStores.filter(s => getNormalizedStoreId(s) !== nextStoreId));
    }
  }, [session, navigate, addStore, setStores]);

  const removeFavorite = useCallback(async (id: string) => {
    if (!session) {
      navigate('/auth');
      return;
    }

    const previous = useAppStore.getState().favoriteStores;
    removeStore(id);
    try {
      await removeFavoriteStoreApi(supabase, id);
    } catch {
      setStores(previous);
    }
  }, [session, navigate, removeStore, setStores]);

  return useFavorite({
    item: store,
    getId: () => storeId,
    addFavorite,
    removeFavorite,
    isFavorite
  });
}