// Enhanced error handling hooks for components

import { useCallback } from 'react';
import { useNotifications } from '../components/common/NotificationContext';
import { useErrorState, classifyError } from '../utils/errorHandling';
import { useLanguage } from '../contexts/LanguageContext';

export interface UseComponentErrorOptions {
  showNotifications?: boolean;
  maxRetries?: number;
  retryDelay?: number;
  onError?: (error: unknown) => void;
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
  const { t } = useLanguage();
  const errorState = useErrorState({ 
    maxRetries, 
    retryDelay,
    onRetry
  });

  const handleError = useCallback((error: unknown) => {
    const enhancedError = classifyError(error);
    errorState.setError(error);

    // Show notification if enabled
    if (showNotifications) {
      let message = enhancedError.message || t('errors.unexpected');
      switch (enhancedError.type) {
        case 'NETWORK':
          message = t('errors.network.message');
          break;
        case 'SERVER':
          message = t('errors.server.message');
          break;
        case 'NOT_FOUND':
          message = t('errors.notFound.message');
          break;
        case 'VALIDATION':
          message = enhancedError.message || t('errors.validation.message');
          break;
        default:
          break;
      }

      notifyError(message, t('common.error'), enhancedError.isRetryable ? {
        label: t('common.retry'),
        onClick: () => errorState.retry()
      } : undefined);
    }

    // Call custom error handler
    onError?.(enhancedError);
  }, [errorState, showNotifications, notifyError, onError, t]);

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
  const { t } = useLanguage();

  const handleApiError = useCallback((error: unknown) => {
    const enhancedError = classifyError(error);

    switch (enhancedError.type) {
      case 'NETWORK':
        notifyError(
          t('errors.network.message'),
          t('errors.connection.title'),
          {
            label: t('common.retry'),
            onClick: () => window.location.reload()
          }
        );
        break;

      case 'AUTHENTICATION':
        // Don't show notification, let auth system handle it
        break;

      case 'VALIDATION':
        notifyWarning(enhancedError.message, t('errors.validation.title'));
        break;

      case 'NOT_FOUND':
        notifyWarning(t('errors.notFound.message'), t('errors.notFound.title'));
        break;

      default:
        notifyError(
          enhancedError.message || t('errors.server.message'),
          t('common.error')
        );
        break;
    }
  }, [notifyError, notifyWarning, t]);

  return { handleApiError };
};

/**
 * Hook for form validation error handling
 */
export const useFormError = () => {
  const { notifyWarning } = useNotifications();
  const { t } = useLanguage();

  const handleValidationError = useCallback((errors: Record<string, string>) => {
    const errorMessages = Object.values(errors);
    if (errorMessages.length > 0) {
      notifyWarning(
        errorMessages.length === 1 
          ? errorMessages[0] 
          : t('errors.form.validationMultiple').replace('{count}', String(errorMessages.length)),
        t('errors.validation.title')
      );
    }
  }, [notifyWarning, t]);

  const handleFormSubmitError = useCallback((error: unknown) => {
    const enhancedError = classifyError(error);
    
    if (enhancedError.type === 'VALIDATION') {
      notifyWarning(enhancedError.message, t('errors.form.title'));
    } else {
      notifyWarning(
        enhancedError.message || t('errors.form.submitFailed'),
        t('errors.form.submissionTitle')
      );
    }
  }, [notifyWarning, t]);

  return {
    handleValidationError,
    handleFormSubmitError
  };
};
