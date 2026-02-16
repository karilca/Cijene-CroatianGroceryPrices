// Progress indicator components for multi-step operations

import React from 'react';

interface ProgressBarProps {
  progress: number; // 0-100
  className?: string;
  showLabel?: boolean;
  color?: 'blue' | 'green' | 'red' | 'yellow';
  size?: 'sm' | 'md' | 'lg';
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  className = '',
  showLabel = true,
  color = 'blue',
  size = 'md'
}) => {
  const clampedProgress = Math.min(Math.max(progress, 0), 100);

  const colorClasses = {
    blue: 'bg-primary-500',
    green: 'bg-green-500',
    red: 'bg-red-500',
    yellow: 'bg-yellow-500'
  };

  const sizeClasses = {
    sm: 'h-1',
    md: 'h-2',
    lg: 'h-3'
  };

  return (
    <div className={`w-full ${className}`}>
      {showLabel && (
        <div className="flex justify-between items-center mb-1">
          <span className="text-sm font-medium text-gray-700">Progress</span>
          <span className="text-sm font-medium text-gray-700">{clampedProgress}%</span>
        </div>
      )}
      <div className={`w-full bg-gray-200 rounded-full ${sizeClasses[size]}`}>
        <div
          className={`${colorClasses[color]} ${sizeClasses[size]} rounded-full transition-all duration-300 ease-out`}
          style={{ width: `${clampedProgress}%` }}
        />
      </div>
    </div>
  );
};

interface Step {
  id: string;
  title: string;
  description?: string;
  isCompleted?: boolean;
  isActive?: boolean;
  hasError?: boolean;
}

interface StepperProps {
  steps: Step[];
  orientation?: 'horizontal' | 'vertical';
  className?: string;
}

export const Stepper: React.FC<StepperProps> = ({
  steps,
  orientation = 'horizontal',
  className = ''
}) => {
  if (orientation === 'vertical') {
    return (
      <div className={`space-y-4 ${className}`}>
        {steps.map((step, index) => (
          <div key={step.id} className="flex items-start">
            {/* Step indicator */}
            <div className="flex-shrink-0 mr-4">
              <div
                className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step.hasError
                  ? 'bg-red-500 text-white'
                  : step.isCompleted
                    ? 'bg-green-500 text-white'
                    : step.isActive
                      ? 'bg-primary-500 text-white'
                      : 'bg-gray-300 text-gray-600'
                  }`}
              >
                {step.hasError ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                  </svg>
                ) : step.isCompleted ? (
                  <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                    <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                  </svg>
                ) : (
                  index + 1
                )}
              </div>
              {/* Connecting line */}
              {index < steps.length - 1 && (
                <div className="w-px bg-gray-300 h-6 ml-4 mt-2" />
              )}
            </div>

            {/* Step content */}
            <div className="flex-1 min-w-0">
              <h3
                className={`text-sm font-medium ${step.isActive ? 'text-primary-600' : 'text-gray-900'
                  }`}
              >
                {step.title}
              </h3>
              {step.description && (
                <p className="text-sm text-gray-500 mt-1">{step.description}</p>
              )}
            </div>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={`flex items-center ${className}`}>
      {steps.map((step, index) => (
        <React.Fragment key={step.id}>
          <div className="flex flex-col items-center">
            {/* Step indicator */}
            <div
              className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${step.hasError
                ? 'bg-red-500 text-white'
                : step.isCompleted
                  ? 'bg-green-500 text-white'
                  : step.isActive
                    ? 'bg-primary-500 text-white'
                    : 'bg-gray-300 text-gray-600'
                }`}
            >
              {step.hasError ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
                </svg>
              ) : step.isCompleted ? (
                <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z" clipRule="evenodd" />
                </svg>
              ) : (
                index + 1
              )}
            </div>

            {/* Step label */}
            <div className="mt-2 text-center">
              <h3
                className={`text-xs font-medium ${step.isActive ? 'text-primary-600' : 'text-gray-900'
                  }`}
              >
                {step.title}
              </h3>
            </div>
          </div>

          {/* Connecting line */}
          {index < steps.length - 1 && (
            <div className="flex-1 h-px bg-gray-300 mx-4 mt-4" />
          )}
        </React.Fragment>
      ))}
    </div>
  );
};

interface LoadingProgressProps {
  message?: string;
  progress?: number;
  steps?: Step[];
  className?: string;
}

export const LoadingProgress: React.FC<LoadingProgressProps> = ({
  message = 'Loading...',
  progress,
  steps,
  className = ''
}) => {
  return (
    <div className={`text-center ${className}`}>
      <div className="mb-4">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary-500 mx-auto mb-4" />
        <p className="text-gray-600">{message}</p>
      </div>

      {progress !== undefined && (
        <div className="mb-4">
          <ProgressBar progress={progress} showLabel />
        </div>
      )}

      {steps && steps.length > 0 && (
        <div className="mt-6">
          <Stepper steps={steps} />
        </div>
      )}
    </div>
  );
};

// Upload Progress Component
interface UploadProgressProps {
  fileName: string;
  progress: number;
  onCancel?: () => void;
  error?: string;
  className?: string;
}

export const UploadProgress: React.FC<UploadProgressProps> = ({
  fileName,
  progress,
  onCancel,
  error,
  className = ''
}) => {
  return (
    <div className={`bg-white border border-gray-200 rounded-lg p-4 ${className}`}>
      <div className="flex items-center justify-between mb-2">
        <span className="text-sm font-medium text-gray-900 truncate">
          {fileName}
        </span>
        {onCancel && (
          <button
            onClick={onCancel}
            className="text-gray-400 hover:text-gray-600 ml-2"
          >
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z" clipRule="evenodd" />
            </svg>
          </button>
        )}
      </div>

      {error ? (
        <div className="text-red-600 text-sm">{error}</div>
      ) : (
        <ProgressBar
          progress={progress}
          color={progress === 100 ? 'green' : 'blue'}
          size="sm"
        />
      )}
    </div>
  );
};
