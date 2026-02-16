// Application constants

const getBaseUrl = () => {
  const envUrl = import.meta.env.VITE_API_BASE_URL;
  // Force HTTPS for the production domain to avoid CORS/Redirect issues
  if (envUrl && envUrl.includes('cijene.searxngmate.tk')) {
    return envUrl.replace('http://', 'https://');
  }
  // Default to HTTPS production URL if no env var is set
  return envUrl || 'https://cijene.searxngmate.tk';
};

export const API_CONFIG = {
  BASE_URL: getBaseUrl(),
  FALLBACK_URL: import.meta.env.VITE_API_FALLBACK_URL,
  VERSION: 'v1',
  TIMEOUT: 10000,
  RETRY_ATTEMPTS: 3,
  RETRY_DELAY: 1000,
} as const;

export const ENDPOINTS = {
  ARCHIVES: '/v0/list',
  PRODUCTS: '/v1/products',
  STORES: '/v1/stores',
  CHAINS: '/v1/chains',
  CHAIN_STATS: '/v1/chain-stats',
  PRICES: '/v1/prices',
} as const;

export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_PER_PAGE: Number(import.meta.env.VITE_STORES_PER_PAGE) || 20,
  MAX_PER_PAGE: 100,
} as const;

export const SEARCH = {
  MIN_QUERY_LENGTH: 2,
  DEBOUNCE_DELAY: 300,
  MAX_HISTORY_ITEMS: 10,
  MAX_SUGGESTIONS: 5,
} as const;

export const LOCATION = {
  DEFAULT_RADIUS: 5000, // meters
  MAX_RADIUS: 50000, // meters
  MIN_RADIUS: 500, // meters
  GEOLOCATION_TIMEOUT: 10000, // milliseconds
} as const;

export const STORAGE_KEYS = {
  USER_PREFERENCES: 'cijene_user_preferences',
  FAVORITES: 'cijene_favorites',
  SEARCH_HISTORY: 'cijene_search_history',
  LAST_LOCATION: 'cijene_last_location',
  SELECTED_CHAINS: 'cijene_selected_chains',
  AUTH_TOKEN: 'cijene_auth_token',
  REFRESH_TOKEN: 'cijene_refresh_token',
  USER_DATA: 'cijene_user_data',
} as const;

export const THEMES = {
  LIGHT: 'light',
  DARK: 'dark',
} as const;

export const LANGUAGES = {
  EN: 'en',
  HR: 'hr',
} as const;

export const CURRENCIES = {
  EUR: 'EUR',
  HRK: 'HRK',
} as const;

export const NOTIFICATION_DURATION = {
  SUCCESS: 3000,
  ERROR: 5000,
  WARNING: 4000,
  INFO: 3000,
} as const;

export const BREAKPOINTS = {
  SM: 640,
  MD: 768,
  LG: 1024,
  XL: 1280,
  '2XL': 1536,
} as const;

export const ANIMATION_DURATION = {
  FAST: 150,
  NORMAL: 300,
  SLOW: 500,
} as const;

export const REGEX_PATTERNS = {
  EAN: /^\d{8,14}$/,
  PHONE: /^[+]?[0-9\s\-()]{8,20}$/,
  EMAIL: /^[^\s@]+@[^\s@]+\.[^\s@]+$/,
  CHAIN_CODE: /^[A-Z]{2,5}:[A-Z0-9]{4,20}$/,
} as const;

export const DEFAULT_PREFERENCES = {
  theme: THEMES.LIGHT,
  language: LANGUAGES.EN,
  defaultRadius: LOCATION.DEFAULT_RADIUS,
  currency: CURRENCIES.EUR,
} as const;

export const ERROR_MESSAGES = {
  NETWORK_ERROR: 'Network error. Please check your connection.',
  API_ERROR: 'Service temporarily unavailable. Please try again later.',
  GEOLOCATION_ERROR: 'Location access denied. Please enable location services.',
  SEARCH_ERROR: 'Search failed. Please try again.',
  VALIDATION_ERROR: 'Please check your input and try again.',
  AUTH_ERROR: 'Authentication failed. Please check your credentials.',
  TOKEN_EXPIRED: 'Your session has expired. Please log in again.',
  UNAUTHORIZED: 'You are not authorized to access this resource.',
  FORBIDDEN: 'Access to this resource is forbidden.',
  DNS_ERROR: 'Unable to connect to the API server. This may be due to network restrictions or the server being temporarily unavailable.',
  CONNECTION_REFUSED: 'Connection refused by the API server. The server may be down.',
  TIMEOUT_ERROR: 'Request timed out. Please check your connection and try again.',
  API_UNAVAILABLE: 'The API service is currently unavailable. This may be due to network restrictions in your environment.',
} as const;
