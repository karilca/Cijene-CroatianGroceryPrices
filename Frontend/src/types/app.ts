// Application-specific types

export interface AppState {
  isLoading: boolean;
  error: string | null;
  selectedChains: string[];
  searchHistory: string[];
  favorites: {
    products: string[];
    stores: string[];
  };
  preferences: {
    theme: 'light' | 'dark';
    language: 'en' | 'hr';
    defaultRadius: number;
    currency: string;
  };
}

export interface SearchFilters {
  chains: string[];
  priceRange: {
    min: number;
    max: number;
  };
  date: string;
  location: {
    latitude: number;
    longitude: number;
    radius: number;
  } | null;
}

export interface LocationState {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface FavoriteProduct {
  id: string;
  name: string;
  brand?: string;
  addedAt: string;
}

export interface FavoriteStore {
  id: string;
  name: string;
  address: string;
  city: string;
  chain: string;
  addedAt: string;
}

export interface NavigationItem {
  id: string;
  label: string;
  path: string;
  icon?: string;
  isActive?: boolean;
}

export interface BreadcrumbItem {
  label: string;
  path?: string;
  isActive?: boolean;
}

export interface SearchSuggestion {
  id: string;
  text: string;
  type: 'product' | 'store' | 'chain';
  metadata?: any;
}

export interface NotificationMessage {
  id: string;
  type: 'success' | 'error' | 'warning' | 'info';
  title: string;
  message: string;
  duration?: number;
  isVisible: boolean;
}

export interface LoadingState {
  isLoading: boolean;
  message?: string;
  progress?: number;
}

export interface ErrorState {
  hasError: boolean;
  message: string;
  code?: string;
  retryable?: boolean;
}

export interface PaginationState {
  page: number;
  perPage: number;
  totalItems: number;
  totalPages: number;
}

export interface SortOption {
  key: string;
  label: string;
  direction: 'asc' | 'desc';
}

export interface FilterOption {
  key: string;
  label: string;
  value: any;
  isActive: boolean;
}

export type ViewMode = 'grid' | 'list' | 'table';
export type SearchType = 'product' | 'store' | 'chain';
export type PriceDisplayMode = 'regular' | 'special' | 'both';

// Service validation types
export interface ValidationRule {
  field: string;
  message: string;
  validator: (value: any) => boolean;
}

export interface ValidationResult {
  isValid: boolean;
  errors: ValidationError[];
}

export interface ValidationError {
  field: string;
  message: string;
  value?: any;
}

// Service response wrapper types
export interface ServiceResponse<T> {
  success: boolean;
  data?: T;
  error?: ServiceError;
  metadata?: ServiceMetadata;
}

export interface ServiceError {
  code: string;
  message: string;
  details?: any;
  timestamp: string;
}

export interface ServiceMetadata {
  requestId?: string;
  duration?: number;
  cached?: boolean;
  source?: string;
}
