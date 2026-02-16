// Error handling demonstration component

import React, { useState } from 'react';
import {
  ErrorMessage,
  LoadingSpinner
} from './index';
import * as SkeletonLoader from './SkeletonLoader';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { useComponentError, useApiError, useFormError } from '../../hooks/useComponentError';
import { useNotifications } from './NotificationSystem';
import { ApiError } from '../../services/api-client';

export const ErrorHandlingDemo: React.FC = () => {
  const [isLoading, setIsLoading] = useState(false);
  const [showSkeleton, setShowSkeleton] = useState(false);
  const {
    notifySuccess,
    notifyError,
    notifyWarning,
    notifyInfo
  } = useNotifications();

  const { handleApiError } = useApiError();
  const { handleValidationError, handleFormSubmitError } = useFormError();
  const componentError = useComponentError({
    showNotifications: false, // We'll handle manually for demo
    maxRetries: 3
  });

  // Demo functions to simulate different error types
  const simulateNetworkError = () => {
    const error = new ApiError(
      'Unable to connect to the server',
      'NETWORK_ERROR'
    );
    handleApiError(error);
  };

  const simulateApiError = () => {
    const error = new ApiError(
      'Internal server error occurred',
      'SERVER_ERROR',
      { timestamp: new Date().toISOString() },
      500
    );
    handleApiError(error);
  };

  const simulateValidationError = () => {
    handleValidationError({
      email: 'Please enter a valid email address',
      password: 'Password must be at least 8 characters long'
    });
  };

  const simulateFormError = () => {
    const error = new Error('Failed to submit form. Please try again.');
    handleFormSubmitError(error);
  };

  const simulateComponentError = () => {
    const error = new Error('Component failed to load data');
    componentError.handleError(error);
  };

  const simulateLoadingState = async () => {
    setIsLoading(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    setIsLoading(false);
    notifySuccess('Operation completed successfully!');
  };

  const simulateSkeletonLoading = async () => {
    setShowSkeleton(true);
    await new Promise(resolve => setTimeout(resolve, 3000));
    setShowSkeleton(false);
    notifySuccess('Content loaded!');
  };

  const simulateRetryableError = () => {
    const error = new ApiError(
      'Request timeout. This operation can be retried.',
      'TIMEOUT_ERROR',
      null,
      408
    );
    componentError.handleError(error);
  };

  return (
    <div className="max-w-4xl mx-auto space-y-8">
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">
          Error Handling & Loading States Demo
        </h1>
        <p className="text-gray-600">
          This page demonstrates all the error handling and loading state features implemented in the application.
        </p>
      </div>

      {/* Notifications Demo */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Notification Types</h2>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <Button
            onClick={() => notifySuccess('Operation successful!')}
            className="bg-green-600 hover:bg-green-700"
          >
            Success
          </Button>
          <Button
            onClick={() => notifyError('Something went wrong')}
            className="bg-red-600 hover:bg-red-700"
          >
            Error
          </Button>
          <Button
            onClick={() => notifyWarning('Please check your input')}
            className="bg-yellow-600 hover:bg-yellow-700"
          >
            Warning
          </Button>
          <Button
            onClick={() => notifyInfo('Here\'s some information')}
            className="bg-primary-600 hover:bg-primary-700"
          >
            Info
          </Button>
        </div>
      </Card>

      {/* Error Types Demo */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Error Types</h2>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <Button onClick={simulateNetworkError} variant="outline">
            Network Error
          </Button>
          <Button onClick={simulateApiError} variant="outline">
            API Error
          </Button>
          <Button onClick={simulateValidationError} variant="outline">
            Validation Error
          </Button>
          <Button onClick={simulateFormError} variant="outline">
            Form Error
          </Button>
          <Button onClick={simulateComponentError} variant="outline">
            Component Error
          </Button>
          <Button onClick={simulateRetryableError} variant="outline">
            Retryable Error
          </Button>
        </div>
      </Card>

      {/* Component Error State Demo */}
      {componentError.hasError && (
        <Card className="p-6">
          <ErrorMessage
            title="Component Error"
            message={componentError.errorMessage || 'An error occurred'}
            onRetry={componentError.canRetry ? componentError.handleRetry : undefined}
          />
          {componentError.isRetrying && (
            <div className="mt-4 flex items-center justify-center">
              <LoadingSpinner size="sm" />
              <span className="ml-2 text-gray-600">Retrying...</span>
            </div>
          )}
        </Card>
      )}

      {/* Loading States Demo */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Loading States</h2>
        <div className="space-y-4">
          <div className="flex gap-4">
            <Button
              onClick={simulateLoadingState}
              disabled={isLoading}
              variant="outline"
            >
              {isLoading ? (
                <>
                  <LoadingSpinner size="sm" className="mr-2" />
                  Loading...
                </>
              ) : (
                'Simulate Loading'
              )}
            </Button>
            <Button
              onClick={simulateSkeletonLoading}
              disabled={showSkeleton}
              variant="outline"
            >
              Skeleton Loading
            </Button>
          </div>

          {/* Skeleton Demo */}
          {showSkeleton && (
            <div className="space-y-4">
              <h3 className="font-semibold">Skeleton Loading Example:</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                <SkeletonLoader.ProductCardSkeleton />
                <SkeletonLoader.ProductCardSkeleton />
                <SkeletonLoader.ProductCardSkeleton />
              </div>
            </div>
          )}
        </div>
      </Card>

      {/* Loading Indicators */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Loading Indicators</h2>
        <div className="space-y-4">
          <div>
            <h3 className="font-medium mb-2">Spinner Sizes:</h3>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <LoadingSpinner size="sm" />
                <span className="text-sm">Small</span>
              </div>
              <div className="flex items-center gap-2">
                <LoadingSpinner size="md" />
                <span className="text-sm">Medium</span>
              </div>
              <div className="flex items-center gap-2">
                <LoadingSpinner size="lg" />
                <span className="text-sm">Large</span>
              </div>
            </div>
          </div>

          <div>
            <h3 className="font-medium mb-2">Text Blocks:</h3>
            <SkeletonLoader.TextBlockSkeleton lines={3} />
          </div>

          <div>
            <h3 className="font-medium mb-2">Store Card:</h3>
            <div className="max-w-md">
              <SkeletonLoader.StoreCardSkeleton />
            </div>
          </div>
        </div>
      </Card>

      {/* Error Recovery */}
      <Card className="p-6">
        <h2 className="text-xl font-semibold mb-4">Error Recovery</h2>
        <p className="text-gray-600 mb-4">
          The application includes comprehensive error recovery mechanisms:
        </p>
        <ul className="list-disc list-inside space-y-2 text-gray-700">
          <li>Automatic retry for transient network errors</li>
          <li>Manual retry buttons for recoverable errors</li>
          <li>Exponential backoff for retry attempts</li>
          <li>Global error boundary to catch unhandled errors</li>
          <li>User-friendly error messages with actionable suggestions</li>
          <li>Persistent notifications for important errors</li>
          <li>Network status detection and offline handling</li>
        </ul>
      </Card>

      {/* Clear Component Error */}
      {componentError.hasError && (
        <div className="flex justify-center">
          <Button onClick={componentError.clearError} variant="outline">
            Clear Component Error
          </Button>
        </div>
      )}
    </div>
  );
};
