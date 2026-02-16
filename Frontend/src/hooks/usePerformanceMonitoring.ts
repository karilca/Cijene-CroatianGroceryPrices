// Performance monitoring hook for mobile optimization

import { useEffect, useRef, useState } from 'react';

interface PerformanceMetrics {
  renderTime: number;
  memoryUsage?: number;
  networkType?: string;
  connectionSpeed?: 'slow-2g' | '2g' | '3g' | '4g' | 'unknown';
  isOnline: boolean;
}

interface UsePerformanceOptions {
  trackRender?: boolean;
  trackMemory?: boolean;
  trackNetwork?: boolean;
  onMetricsUpdate?: (metrics: PerformanceMetrics) => void;
}

export function usePerformanceMonitoring(options: UsePerformanceOptions = {}) {
  const {
    trackRender = true,
    trackMemory = false,
    trackNetwork = true,
    onMetricsUpdate,
  } = options;

  const [metrics, setMetrics] = useState<PerformanceMetrics>({
    renderTime: 0,
    isOnline: navigator.onLine,
  });

  const renderStartTime = useRef(performance.now());

  // Track render performance
  useEffect(() => {
    if (trackRender) {
      const renderTime = performance.now() - renderStartTime.current;
      setMetrics(prev => ({ ...prev, renderTime }));
    }
  }, [trackRender]);

  // Track memory usage (if available)
  useEffect(() => {
    if (trackMemory && 'memory' in performance) {
      const updateMemory = () => {
        const memory = (performance as any).memory;
        setMetrics(prev => ({
          ...prev,
          memoryUsage: memory.usedJSHeapSize / 1024 / 1024, // MB
        }));
      };

      updateMemory();
      const interval = setInterval(updateMemory, 5000); // Update every 5 seconds
      return () => clearInterval(interval);
    }
  }, [trackMemory]);

  // Track network information
  useEffect(() => {
    if (trackNetwork && 'connection' in navigator) {
      const connection = (navigator as any).connection;
      
      const updateNetworkInfo = () => {
        setMetrics(prev => ({
          ...prev,
          networkType: connection.effectiveType,
          connectionSpeed: connection.effectiveType,
        }));
      };

      updateNetworkInfo();
      connection.addEventListener('change', updateNetworkInfo);
      return () => connection.removeEventListener('change', updateNetworkInfo);
    }
  }, [trackNetwork]);

  // Track online/offline status
  useEffect(() => {
    const updateOnlineStatus = () => {
      setMetrics(prev => ({ ...prev, isOnline: navigator.onLine }));
    };

    window.addEventListener('online', updateOnlineStatus);
    window.addEventListener('offline', updateOnlineStatus);

    return () => {
      window.removeEventListener('online', updateOnlineStatus);
      window.removeEventListener('offline', updateOnlineStatus);
    };
  }, []);

  // Call metrics update callback
  useEffect(() => {
    if (onMetricsUpdate) {
      onMetricsUpdate(metrics);
    }
  }, [metrics, onMetricsUpdate]);

  // Utility functions
  const measureAsyncOperation = async <T>(
    operation: () => Promise<T>,
    label?: string
  ): Promise<{ result: T; duration: number }> => {
    const start = performance.now();
    const result = await operation();
    const duration = performance.now() - start;
    
    if (label && process.env.NODE_ENV === 'development') {
      console.log(`${label} took ${duration.toFixed(2)}ms`);
    }
    
    return { result, duration };
  };

  const reportVitals = (metric: { name: string; value: number }) => {
    if (process.env.NODE_ENV === 'development') {
      console.log(`Performance metric: ${metric.name} = ${metric.value}`);
    }
    // In production, you would send this to your analytics service
  };

  return {
    metrics,
    measureAsyncOperation,
    reportVitals,
    isSlowConnection: metrics.connectionSpeed === 'slow-2g' || metrics.connectionSpeed === '2g',
    shouldOptimizeForPerformance: !metrics.isOnline || metrics.connectionSpeed === 'slow-2g',
  };
}
