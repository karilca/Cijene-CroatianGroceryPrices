import React from 'react';
import { useGlobalErrorHandler } from './useGlobalErrorHandlerHook';

// Hook to integrate global error handling into the app
export const GlobalErrorHandlerProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  useGlobalErrorHandler();
  return <>{children}</>;
};
