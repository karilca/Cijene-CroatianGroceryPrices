// API response types based on the Cijene API documentation

export interface Archive {
  date: string;
  url: string;
  size: number;
  updated: string;
}

export interface ArchiveListResponse {
  archives: Archive[];
}

export interface Product {
  id: string;
  name: string;
  brand?: string;
  quantity?: string;
  unit?: string;
  ean?: string;
  chain_code?: string;
  chain?: string;
  category?: string;
  description?: string;
}

export interface Store {
  id: string;
  code?: string;
  name: string;
  address: string;
  city: string;
  phone?: string;
  chain: string;
  chain_code: string;
  store_type?: string;
  latitude?: number;
  longitude?: number;
  distance?: number;
}

export interface ChainStats {
  chain_code: string;
  price_date: string;
  price_count: number;
  store_count: number;
  created_at: string;
}

export interface ChainStatsResponse {
  chain_stats: ChainStats[];
}

export interface Chain {
  code: string;
  name: string;
  stores_count: number;
  products_count: number;
  last_updated: string;
}

export interface Price {
  product_id: string;
  store_id: string;
  chain: string;
  price: number;
  special_price?: number;
  currency: string;
  date: string;
  unit?: string;
  store_address?: string;
  store_city?: string;
}

export interface PriceComparison {
  product: Product;
  prices: Price[];
  min_price: number;
  max_price: number;
  avg_price: number;
  chains: string[];
}

export interface ProductSearchResponse {
  products: Product[];
  total_count: number;
  page: number;
  per_page: number;
}

export interface StoreSearchResponse {
  stores: Store[];
  total_count: number;
  page: number;
  per_page: number;
}

export interface ChainListResponse {
  chains: Chain[];
}

export interface ApiErrorResponse {
  message: string;
  code: string;
  details?: any;
}

// Request types
export interface ProductSearchRequest {
  query?: string;
  ean?: string;
  chain_code?: string;
  chains?: string[];
  page?: number;
  per_page?: number;
  date?: string;
  city?: string;
}

export interface StoreSearchRequest {
  query?: string;
  city?: string;
  chain_codes?: string[];
  latitude?: number;
  longitude?: number;
  radius?: number;
  page?: number;
  per_page?: number;
}

export interface PriceRequest {
  eans: string;
  chains?: string | string[];
  city?: string;
  address?: string;
  lat?: number;
  lon?: number;
  d?: number;
}

export interface ApiStore {
  chain_id: number;
  code: string;
  type?: string;
  address?: string;
  city?: string;
  zipcode?: string;
  lat?: number;
  lon?: number;
  phone?: string;
}

export interface StorePrice {
  chain: string;
  ean: string;
  price_date: string;
  regular_price?: string;
  special_price?: string;
  unit_price?: string;
  best_price_30?: string;
  anchor_price?: string;
  store: ApiStore;
}

export interface StorePricesResponse {
  store_prices: StorePrice[];
}

// Utility types for API responses
export type ApiResponse<T> = {
  data: T;
  status: number;
  message?: string;
};

export type PaginatedResponse<T> = {
  data: T[];
  pagination: {
    page: number;
    per_page: number;
    total_count: number;
    total_pages: number;
  };
};

// Search filter utility types
export interface BaseSearchParams {
  page?: number;
  per_page?: number;
}

export interface LocationSearchParams {
  latitude?: number;
  longitude?: number;
  radius?: number;
}

export interface ChainFilterParams {
  chain_codes?: string[];
  chains?: string[];
}

export interface DateFilterParams {
  date?: string;
  date_from?: string;
  date_to?: string;
}

// Service method options
export interface ServiceMethodOptions {
  timeout?: number;
  retries?: number;
  abortSignal?: AbortSignal;
}

// Authentication types
export interface User {
  id: string;
  email: string;
  username?: string;
  firstName?: string;
  lastName?: string;
  verified: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  tokenType: string;
}

export interface LoginRequest {
  email: string;
  password: string;
  rememberMe?: boolean;
}

export interface RegisterRequest {
  email: string;
  password: string;
  confirmPassword: string;
  username?: string;
  firstName?: string;
  lastName?: string;
}

export interface LoginResponse {
  user: User;
  tokens: AuthTokens;
  message: string;
}

export interface RegisterResponse {
  user: User;
  tokens: AuthTokens;
  message: string;
}

export interface RefreshTokenRequest {
  refreshToken: string;
}

export interface RefreshTokenResponse {
  tokens: AuthTokens;
}

export interface LogoutRequest {
  refreshToken?: string;
}

export interface AuthError {
  code: string;
  message: string;
  field?: string;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  error: AuthError | null;
}
