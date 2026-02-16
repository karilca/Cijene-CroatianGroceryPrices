// Enhanced error handling hooks for components

import { useCallback } from 'react';
import { useNotifications } from '../components/common/NotificationSystem';
import { useErrorState, classifyError, getUserFriendlyMessage } from '../utils/errorHandling';
import { ERROR_MESSAGES } from '../constants';

export interface UseComponentErrorOptions {
  showNotifications?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: any) => void;
  onRetry?: () => void;
}

/**
 * Hook for component-level error handling with notifications
 */
export const useComponentError = (options: UseComponentErrorOptions = {}) => {
  const {
    showNotifications = true,
    maxRetries = 3,
    retryDelay = 1000,
    onError,
    onRetry
  } = options;

  const { notifyError } = useNotifications();
  const errorState = useErrorState({ 
    maxRetries, 
    retryDelay,
    onRetry
  });

  const handleError = useCallback((error: any) => {
    const enhancedError = classifyError(error);
    errorState.setError(error);

    // Show notification if enabled
    if (showNotifications) {
      const message = getUserFriendlyMessage(enhancedError);
      notifyError(message, 'Error', enhancedError.isRetryable ? {
        label: 'Retry',
        onClick: () => errorState.retry()
      } : undefined);
    }

    // Call custom error handler
    onError?.(enhancedError);
  }, [errorState, showNotifications, notifyError, onError]);

  const handleRetry = useCallback(() => {
    if (onRetry) {
      onRetry();
    } else {
      errorState.retry();
    }
  }, [errorState, onRetry]);

  return {
    ...errorState,
    handleError,
    handleRetry,
    hasError: !!errorState.error,
    errorMessage: errorState.userMessage,
    canRetry: errorState.canRetry
  };
};

/**
 * Hook for API operation error handling
 */
export const useApiError = () => {
  const { notifyError, notifyWarning } = useNotifications();

  const handleApiError = useCallback((error: any) => {
    const enhancedError = classifyError(error);

    switch (enhancedError.type) {
      case 'NETWORK':
        notifyError(
          ERROR_MESSAGES.NETWORK_ERROR, 
          'Connection Error',
          {
            label: 'Retry',
            onClick: () => window.location.reload()
          }
        );
        break;

      case 'AUTHENTICATION':
        // Don't show notification, let auth system handle it
        break;

      case 'VALIDATION':
        notifyWarning(enhancedError.message, 'Validation Error');
        break;

      case 'NOT_FOUND':
        notifyWarning('The requested resource was not found.', 'Not Found');
        break;

      default:
        notifyError(
          enhancedError.message || ERROR_MESSAGES.API_ERROR,
          'Error'
        );
        break;
    }
  }, [notifyError, notifyWarning]);

  return { handleApiError };
};

/**
 * Hook for form validation error handling
 */
export const useFormError = () => {
  const { notifyWarning } = useNotifications();

  const handleValidationError = useCallback((errors: Record<string, string>) => {
    const errorMessages = Object.values(errors);
    if (errorMessages.length > 0) {
      notifyWarning(
        errorMessages.length === 1 
          ? errorMessages[0] 
          : `Please fix ${errorMessages.length} validation errors`,
        'Validation Error'
      );
    }
  }, [notifyWarning]);

  const handleFormSubmitError = useCallback((error: any) => {
    const enhancedError = classifyError(error);
    
    if (enhancedError.type === 'VALIDATION') {
      notifyWarning(enhancedError.message, 'Form Error');
    } else {
      notifyWarning(
        enhancedError.message || 'Failed to submit form. Please try again.',
        'Submission Error'
      );
    }
  }, [notifyWarning]);

  return {
    handleValidationError,
    handleFormSubmitError
  };
};
