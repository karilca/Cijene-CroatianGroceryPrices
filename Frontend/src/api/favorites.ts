import { SupabaseClient } from '@supabase/supabase-js';
import { apiUrl } from '../config/api';
import type { Product, Store } from '../types';
import { createLocalizedApiErrorFromPayload, LocalizedApiError } from '../utils/apiErrors';

interface FavoriteProductsPayload {
  items: Array<{
    product_id: string;
    name?: string;
    brand?: string;
    ean?: string;
    quantity?: string;
    unit?: string;
  }>;
}

interface FavoriteStoresPayload {
  items: Array<{
    store_id: string;
    chain_code: string;
    store_code: string;
    address?: string;
    city?: string;
    lat?: number;
    lon?: number;
    phone?: string;
  }>;
}

const getAccessToken = async (supabase: SupabaseClient): Promise<string> => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) {
    throw new LocalizedApiError('AUTH_REQUIRED', 'Authentication is required.');
  }
  return session.access_token;
};

const buildStoreId = (chainCode: string, storeCode: string): string => `${chainCode}:${storeCode}`;

export const getFavoriteProducts = async (supabase: SupabaseClient): Promise<Product[]> => {
  const accessToken = await getAccessToken(supabase);
  const response = await fetch(apiUrl('/v1/favorites/products'), {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw createLocalizedApiErrorFromPayload(payload, 'Failed to load favorites.');
  }

  const payload = await response.json() as FavoriteProductsPayload;
  return payload.items.map((item) => ({
    id: item.product_id,
    ean: item.ean || item.product_id,
    name: item.name || item.product_id,
    brand: item.brand,
    quantity: item.quantity,
    unit: item.unit,
  }));
};

export const addFavoriteProduct = async (supabase: SupabaseClient, productId: string): Promise<void> => {
  const accessToken = await getAccessToken(supabase);
  const response = await fetch(apiUrl('/v1/favorites/products'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({ product_id: productId }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw createLocalizedApiErrorFromPayload(payload, 'Failed to update favorites.');
  }
};

export const removeFavoriteProduct = async (supabase: SupabaseClient, productId: string): Promise<void> => {
  const accessToken = await getAccessToken(supabase);
  const response = await fetch(apiUrl(`/v1/favorites/products/${encodeURIComponent(productId)}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw createLocalizedApiErrorFromPayload(payload, 'Failed to update favorites.');
  }
};

export const getFavoriteStores = async (supabase: SupabaseClient): Promise<Store[]> => {
  const accessToken = await getAccessToken(supabase);
  const response = await fetch(apiUrl('/v1/favorites/stores'), {
    method: 'GET',
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw createLocalizedApiErrorFromPayload(payload, 'Failed to load favorites.');
  }

  const payload = await response.json() as FavoriteStoresPayload;
  return payload.items.map((item) => ({
    id: item.store_id || buildStoreId(item.chain_code, item.store_code),
    code: item.store_code,
    chain_code: item.chain_code,
    chain: item.chain_code,
    name: item.address || item.store_code,
    address: item.address || item.store_code,
    city: item.city || '',
    phone: item.phone,
    latitude: item.lat,
    longitude: item.lon,
  }));
};

export const addFavoriteStore = async (
  supabase: SupabaseClient,
  storeId: string,
  chainCode: string,
  storeCode: string,
): Promise<void> => {
  const accessToken = await getAccessToken(supabase);
  const response = await fetch(apiUrl('/v1/favorites/stores'), {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${accessToken}`,
    },
    body: JSON.stringify({
      store_id: storeId,
      chain_code: chainCode,
      store_code: storeCode,
    }),
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw createLocalizedApiErrorFromPayload(payload, 'Failed to update favorites.');
  }
};

export const removeFavoriteStore = async (supabase: SupabaseClient, storeId: string): Promise<void> => {
  const accessToken = await getAccessToken(supabase);
  const response = await fetch(apiUrl(`/v1/favorites/stores/${encodeURIComponent(storeId)}`), {
    method: 'DELETE',
    headers: { Authorization: `Bearer ${accessToken}` }
  });

  if (!response.ok) {
    const payload = await response.json().catch(() => null);
    throw createLocalizedApiErrorFromPayload(payload, 'Failed to update favorites.');
  }
};

export const getNormalizedStoreId = (store: Store): string => {
  if (store.id) {
    return String(store.id);
  }

  if (store.chain_code && store.code) {
    return buildStoreId(store.chain_code, store.code);
  }

  return `${store.chain_code}-${store.address}`;
};
