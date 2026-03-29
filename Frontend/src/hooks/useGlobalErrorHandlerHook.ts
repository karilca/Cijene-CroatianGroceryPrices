import { useEffect } from 'react';
import { useNotifications } from '../components/common/NotificationContext';
import { GlobalErrorHandler, ErrorType } from '../utils/errorHandling';
import { useLanguage } from '../contexts/LanguageContext';

export const useGlobalErrorHandler = () => {
  const { notifyError, notifyWarning } = useNotifications();
  const { t } = useLanguage();

  useEffect(() => {
    const globalHandler = GlobalErrorHandler.getInstance();

    const unsubscribe = globalHandler.subscribe((error) => {
      if (error.type === ErrorType.AUTHENTICATION || error.type === ErrorType.AUTHORIZATION) {
        return;
      }

      switch (error.type) {
        case ErrorType.NETWORK:
          notifyError(
            t('errors.network.message'),
            t('errors.connection.title'),
            {
              label: t('common.retry'),
              onClick: () => window.location.reload()
            }
          );
          break;

        case ErrorType.SERVER:
          notifyError(
            t('errors.server.message'),
            t('errors.server.title'),
            error.isRetryable ? {
              label: t('common.retry'),
              onClick: () => window.location.reload()
            } : undefined
          );
          break;

        case ErrorType.VALIDATION:
          notifyWarning(error.message || t('errors.validation.message'), t('errors.validation.title'));
          break;

        case ErrorType.NOT_FOUND:
          notifyWarning(t('errors.notFound.message'), t('errors.notFound.title'));
          break;

        default:
          notifyError(
            error.message || t('errors.unexpected'),
            t('common.error')
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
  }, [notifyError, notifyWarning, t]);
};
