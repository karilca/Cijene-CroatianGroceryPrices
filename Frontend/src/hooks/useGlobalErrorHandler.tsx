// Global error handling integration for the application

import React, { useEffect } from 'react';
import { useNotifications } from '../components/common/NotificationSystem';
import { GlobalErrorHandler, ErrorType } from '../utils/errorHandling';
import { ERROR_MESSAGES } from '../constants';

export const useGlobalErrorHandler = () => {
  const { notifyError, notifyWarning } = useNotifications();

  useEffect(() => {
    const globalHandler = GlobalErrorHandler.getInstance();

    // Subscribe to global errors and show notifications
    const unsubscribe = globalHandler.subscribe((error) => {
      // Don't show notifications for auth errors (handled by auth system)
      if (error.type === ErrorType.AUTHENTICATION || error.type === ErrorType.AUTHORIZATION) {
        return;
      }

      // Show error notification based on error type
      switch (error.type) {
        case ErrorType.NETWORK:
          notifyError(
            ERROR_MESSAGES.NETWORK_ERROR,
            'Connection Error',
            {
              label: 'Retry',
              onClick: () => window.location.reload()
            }
          );
          break;

        case ErrorType.SERVER:
          notifyError(
            ERROR_MESSAGES.API_ERROR,
            'Server Error',
            error.isRetryable ? {
              label: 'Retry',
              onClick: () => window.location.reload()
            } : undefined
          );
          break;

        case ErrorType.VALIDATION:
          notifyWarning(error.message, 'Validation Error');
          break;

        case ErrorType.NOT_FOUND:
          notifyWarning('The requested resource was not found.', 'Not Found');
          break;

        default:
          notifyError(
            error.message || 'An unexpected error occurred.',
            'Error'
          );
          break;
      }
    });

    // Handle unhandled promise rejections
    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      globalHandler.handleError(event.reason);
    };

    // Handle global JavaScript errors
    const handleGlobalError = (event: ErrorEvent) => {
      console.error('Global error:', event.error);
      globalHandler.handleError(event.error);
    };

    window.addEventListener('unhandledrejection', handleUnhandledRejection);
    window.addEventListener('error', handleGlobalError);

    return () => {
      unsubscribe();
      window.removeEventListener('unhandledrejection', handleUnhandledRejection);
      window.removeEventListener('error', handleGlobalError);
    };
  }, [notifyError, notifyWarning]);
};

// Hook to integrate global error handling into the app
export const GlobalErrorHandlerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useGlobalErrorHandler();
  return <>{children}</>;
};
