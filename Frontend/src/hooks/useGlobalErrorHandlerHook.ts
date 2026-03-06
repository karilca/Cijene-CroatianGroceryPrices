import { useEffect } from 'react';
import { useNotifications } from '../components/common/NotificationContext';
import { GlobalErrorHandler, ErrorType } from '../utils/errorHandling';
import { ERROR_MESSAGES } from '../constants';

export const useGlobalErrorHandler = () => {
  const { notifyError, notifyWarning } = useNotifications();

  useEffect(() => {
    const globalHandler = GlobalErrorHandler.getInstance();

    const unsubscribe = globalHandler.subscribe((error) => {
      if (error.type === ErrorType.AUTHENTICATION || error.type === ErrorType.AUTHORIZATION) {
        return;
      }

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

    const handleUnhandledRejection = (event: PromiseRejectionEvent) => {
      console.error('Unhandled promise rejection:', event.reason);
      globalHandler.handleError(event.reason);
    };

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
