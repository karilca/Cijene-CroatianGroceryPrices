// Export all custom hooks from a single entry point

export { default as useGeolocation } from './useGeolocation';
export * from './useApiQueries';
export * from './useComponentError';
export { useGlobalErrorHandler, GlobalErrorHandlerProvider } from './useGlobalErrorHandler';
export { useScreenOrientation } from './useScreenOrientation';
export { useTouchGestures } from './useTouchGestures';
export { usePerformanceMonitoring } from './usePerformanceMonitoring';
export { useBaseSearch } from './useBaseSearch';
export { useFavorite, useProductFavorite, useStoreFavorite } from './useFavorite';
