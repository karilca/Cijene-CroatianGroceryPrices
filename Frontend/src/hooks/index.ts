// Export all custom hooks from a single entry point

export { default as useGeolocation } from './useGeolocation';
export * from './useApiQueries';
export * from './useComponentError';
export { useGlobalErrorHandler } from './useGlobalErrorHandlerHook';
export { GlobalErrorHandlerProvider } from './useGlobalErrorHandler';
export { useBaseSearch } from './useBaseSearch';
export { useFavorite, useProductFavorite, useStoreFavorite } from './useFavorite';
