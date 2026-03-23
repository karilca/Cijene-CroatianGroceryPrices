// Error boundary component for handling React errors

import { Component, useContext } from 'react';
import type { ErrorInfo, ReactNode } from 'react';
import { ErrorMessage } from './ErrorMessage';
import { LanguageContext } from '../../contexts/LanguageContext';

interface Props {
  children?: ReactNode;
  fallback?: ReactNode;
}

interface ErrorBoundaryLabels {
  title: string;
  fallbackMessage: string;
  tryAgain: string;
  refreshPage: string;
  detailsDevelopment: string;
  componentStack: string;
}

interface ErrorBoundaryInternalProps extends Props {
  labels: ErrorBoundaryLabels;
}

interface State {
  hasError: boolean;
  error?: Error;
  errorInfo?: ErrorInfo;
}

class ErrorBoundaryInternal extends Component<ErrorBoundaryInternalProps, State> {
  constructor(props: ErrorBoundaryInternalProps) {
    super(props);
    this.state = { hasError: false };
  }

  public static getDerivedStateFromError(error: Error): State {
    // Update state so the next render will show the fallback UI
    return { hasError: true, error };
  }

  public componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    console.error('ErrorBoundary caught an error:', error, errorInfo);
    this.setState({
      error,
      errorInfo,
    });
  }

  private handleRetry = () => {
    this.setState({ hasError: false, error: undefined, errorInfo: undefined });
  };

  public render() {
    if (this.state.hasError) {
      // Custom fallback UI
      if (this.props.fallback) {
        return this.props.fallback;
      }

      // Default error UI
      return (
        <div className="min-h-screen bg-gray-50 flex flex-col justify-center py-12 sm:px-6 lg:px-8">
          <div className="sm:mx-auto sm:w-full sm:max-w-md">
            <div className="bg-white py-8 px-4 shadow sm:rounded-lg sm:px-10">
              <div className="text-center">
                <h2 className="text-2xl font-bold text-gray-900 mb-4">
                  {this.props.labels.title}
                </h2>
                <ErrorMessage
                  message={
                    this.state.error?.message ||
                    this.props.labels.fallbackMessage
                  }
                  className="mb-6"
                />

                <div className="space-y-4">
                  <button
                    onClick={this.handleRetry}
                    className="w-full flex justify-center py-2 px-4 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-primary-600 hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    {this.props.labels.tryAgain}
                  </button>

                  <button
                    onClick={() => window.location.reload()}
                    className="w-full flex justify-center py-2 px-4 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-primary-500"
                  >
                    {this.props.labels.refreshPage}
                  </button>
                </div>

                {/* Show error details in development */}
                {process.env.NODE_ENV === 'development' && this.state.error && (
                  <details className="mt-6 text-left">
                    <summary className="cursor-pointer text-sm text-gray-600 hover:text-gray-800">
                      {this.props.labels.detailsDevelopment}
                    </summary>
                    <div className="mt-2 p-4 bg-gray-100 rounded text-xs font-mono">
                      <div className="text-red-600 font-bold mb-2">
                        {this.state.error.name}: {this.state.error.message}
                      </div>
                      <div className="whitespace-pre-wrap text-gray-700">
                        {this.state.error.stack}
                      </div>
                      {this.state.errorInfo && (
                        <div className="mt-4 pt-4 border-t border-gray-300">
                          <div className="font-bold text-gray-600 mb-2">{this.props.labels.componentStack}</div>
                          <div className="whitespace-pre-wrap text-gray-600">
                            {this.state.errorInfo.componentStack}
                          </div>
                        </div>
                      )}
                    </div>
                  </details>
                )}
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}

export const ErrorBoundary = ({ children, fallback }: Props) => {
  const languageContext = useContext(LanguageContext);

  const labels: ErrorBoundaryLabels = {
    title: languageContext ? languageContext.t('errors.errorBoundary.title') : 'Something went wrong',
    fallbackMessage: languageContext
      ? languageContext.t('errors.errorBoundary.fallbackMessage')
      : 'An unexpected error occurred. Please try refreshing the page.',
    tryAgain: languageContext ? languageContext.t('common.tryAgain') : 'Try again',
    refreshPage: languageContext ? languageContext.t('errors.errorBoundary.refreshPage') : 'Refresh page',
    detailsDevelopment: languageContext
      ? languageContext.t('errors.errorBoundary.detailsDevelopment')
      : 'Error details (development)',
    componentStack: languageContext ? languageContext.t('errors.errorBoundary.componentStack') : 'Component stack:',
  };

  return (
    <ErrorBoundaryInternal fallback={fallback} labels={labels}>
      {children}
    </ErrorBoundaryInternal>
  );
};
