// Enhanced error handling utilities and hooks

import { useState, useCallback, useEffect } from 'react';
import { ApiError } from '../services/api-client';

// Error types for better categorization
export const ErrorType = {
  NETWORK: 'NETWORK',
  API: 'API', 
  VALIDATION: 'VALIDATION',
  AUTHENTICATION: 'AUTHENTICATION',
  AUTHORIZATION: 'AUTHORIZATION',
  NOT_FOUND: 'NOT_FOUND',
  SERVER: 'SERVER',
  UNKNOWN: 'UNKNOWN'
} as const;

export type ErrorType = typeof ErrorType[keyof typeof ErrorType];

export interface EnhancedError {
  type: ErrorType;
  message: string;
  code?: string;
  details?: unknown;
  timestamp: string;
  isRetryable: boolean;
  retryCount?: number;
  maxRetries?: number;
}

interface ErrorLike {
  name?: string;
  message?: string;
  code?: string;
  details?: unknown;
}

// Error classification utility
export const classifyError = (error: unknown): EnhancedError => {
  const timestamp = new Date().toISOString();
  const typedError = error as ErrorLike;
  
  if (error instanceof ApiError) {
    let type: ErrorType = ErrorType.API;
    let isRetryable = false;
    
    if (error.status === 401) {
      type = ErrorType.AUTHENTICATION;
      isRetryable = false;
    } else if (error.status === 403) {
      type = ErrorType.AUTHORIZATION;
      isRetryable = false;
    } else if (error.status === 404) {
      type = ErrorType.NOT_FOUND;
      isRetryable = false;
    } else if (error.status && error.status >= 500) {
      type = ErrorType.SERVER;
      isRetryable = true;
    } else if (error.isNetworkError()) {
      type = ErrorType.NETWORK;
      isRetryable = true;
    }
    
    return {
      type,
      message: error.message,
      code: error.code,
      details: error.details,
      timestamp,
      isRetryable
    };
  }
  
  // Network/connection errors
  if (!navigator.onLine) {
    return {
      type: ErrorType.NETWORK,
      message: 'NETWORK_UNAVAILABLE',
      code: 'NETWORK_UNAVAILABLE',
      timestamp,
      isRetryable: true
    };
  }
  
  // Validation errors (usually from forms)
  if (typedError.name === 'ValidationError' || typedError.code === 'VALIDATION_ERROR') {
    return {
      type: ErrorType.VALIDATION,
      message: typedError.message || 'VALIDATION_ERROR',
      code: typedError.code || 'VALIDATION_ERROR',
      details: typedError.details,
      timestamp,
      isRetryable: false
    };
  }
  
  // Generic error fallback
  return {
    type: ErrorType.UNKNOWN,
    message: typedError.message || 'API_GENERIC',
    code: typedError.code,
    timestamp,
    isRetryable: false
  };
};

// Get user-friendly error message
export const getUserFriendlyMessage = (error: EnhancedError): string => {
  switch (error.type) {
    case ErrorType.NETWORK:
      return error.code || 'NETWORK_UNAVAILABLE';
    case ErrorType.AUTHENTICATION:
      return error.code || 'UNAUTHORIZED';
    case ErrorType.AUTHORIZATION:
      return error.code || 'FORBIDDEN';
    case ErrorType.VALIDATION:
      return error.message; // Use specific validation message
    case ErrorType.SERVER:
      return error.code || 'API_GENERIC';
    default:
      return error.message || 'API_GENERIC';
  }
};

// Enhanced error state hook
export interface UseErrorStateOptions {
  maxRetries?: number;
  retryDelay?: number;
  onRetry?: (error: EnhancedError) => void;
  onMaxRetriesReached?: (error: EnhancedError) => void;
}

export const useErrorState = (options: UseErrorStateOptions = {}) => {
  const [error, setError] = useState<EnhancedError | null>(null);
  const [isRetrying, setIsRetrying] = useState(false);
  
  const {
    maxRetries = 3,
    retryDelay = 1000,
    onRetry,
    onMaxRetriesReached
  } = options;

  const setEnhancedError = useCallback((rawError: unknown) => {
    const enhancedError = classifyError(rawError);
    enhancedError.maxRetries = maxRetries;
    enhancedError.retryCount = 0;
    setError(enhancedError);
  }, [maxRetries]);

  const clearError = useCallback(() => {
    setError(null);
    setIsRetrying(false);
  }, []);

  const retry = useCallback(async () => {
    if (!error || !error.isRetryable || isRetrying) return;
    
    const currentRetryCount = (error.retryCount || 0) + 1;
    
    if (currentRetryCount > maxRetries) {
      onMaxRetriesReached?.(error);
      return;
    }
    
    setIsRetrying(true);
    setError(prev => prev ? { ...prev, retryCount: currentRetryCount } : null);
    
    // Exponential backoff delay
    const delay = retryDelay * Math.pow(2, currentRetryCount - 1);
    await new Promise(resolve => setTimeout(resolve, delay));
    
    try {
      onRetry?.(error);
      setIsRetrying(false);
    } catch (retryError) {
      setIsRetrying(false);
      setEnhancedError(retryError);
    }
  }, [error, isRetrying, maxRetries, retryDelay, onRetry, onMaxRetriesReached, setEnhancedError]);

  const canRetry = error?.isRetryable && (error.retryCount || 0) < maxRetries && !isRetrying;

  return {
    error,
    isRetrying,
    canRetry,
    setError: setEnhancedError,
    clearError,
    retry,
    userMessage: error ? getUserFriendlyMessage(error) : null
  };
};

// Network status hook
export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(navigator.onLine);
  
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);
    
    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);
    
    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);
  
  return isOnline;
};

// Global error handler utility
export class GlobalErrorHandler {
  private static instance: GlobalErrorHandler;
  private errorCallbacks: Array<(error: EnhancedError) => void> = [];
  
  static getInstance(): GlobalErrorHandler {
    if (!GlobalErrorHandler.instance) {
      GlobalErrorHandler.instance = new GlobalErrorHandler();
    }
    return GlobalErrorHandler.instance;
  }
  
  subscribe(callback: (error: EnhancedError) => void): () => void {
    this.errorCallbacks.push(callback);
    return () => {
      this.errorCallbacks = this.errorCallbacks.filter(cb => cb !== callback);
    };
  }
  
  handleError(error: unknown): void {
    const enhancedError = classifyError(error);
    console.error('Global error:', enhancedError);
    
    this.errorCallbacks.forEach(callback => {
      try {
        callback(enhancedError);
      } catch (callbackError) {
        console.error('Error in error callback:', callbackError);
      }
    });
  }
}

// Error boundary fallback component props
export interface ErrorFallbackProps {
  error: Error;
  resetError: () => void;
}

// Hook for error boundaries
export const useErrorBoundary = () => {
  const [error, setError] = useState<Error | null>(null);
  
  const resetError = useCallback(() => {
    setError(null);
  }, []);
  
  const captureError = useCallback((error: Error) => {
    setError(error);
  }, []);
  
  useEffect(() => {
    if (error) {
      throw error;
    }
  }, [error]);
  
  return { captureError, resetError };
};

// Async operation with error handling hook
export interface UseAsyncOptions<T> {
  immediate?: boolean;
  onSuccess?: (data: T) => void;
  onError?: (error: EnhancedError) => void;
  maxRetries?: number;
}

export const useAsync = <T,>(
  asyncFunction: () => Promise<T>,
  options: UseAsyncOptions<T> = {}
) => {
  const [data, setData] = useState<T | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const errorState = useErrorState({
    maxRetries: options.maxRetries,
    onRetry: () => execute()
  });
  
  const execute = useCallback(async () => {
    setIsLoading(true);
    errorState.clearError();
    
    try {
      const result = await asyncFunction();
      setData(result);
      options.onSuccess?.(result);
    } catch (error) {
      errorState.setError(error);
      options.onError?.(classifyError(error));
    } finally {
      setIsLoading(false);
    }
  }, [asyncFunction, options, errorState]);
  
  useEffect(() => {
    if (options.immediate !== false) {
      execute();
    }
  }, [execute, options.immediate]);
  
  return {
    data,
    isLoading,
    execute,
    ...errorState
  };
};
