// Mobile optimization wrapper component

import React, { useRef } from 'react';
import { useTouchGestures } from '../../hooks/useTouchGestures';
import { useScreenOrientation } from '../../hooks/useScreenOrientation';

interface MobileOptimizedProps {
  children: React.ReactNode;
  enableSwipeGestures?: boolean;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  className?: string;
  adaptToOrientation?: boolean;
}

export const MobileOptimized: React.FC<MobileOptimizedProps> = ({
  children,
  enableSwipeGestures = false,
  onSwipeLeft,
  onSwipeRight,
  onSwipeUp,
  onSwipeDown,
  className = '',
  adaptToOrientation = false,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const { isLandscape, isPortrait } = useScreenOrientation();

  // Set up touch gestures if enabled
  useTouchGestures(containerRef as React.RefObject<HTMLElement>, enableSwipeGestures ? {
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
  } : {});

  // Build orientation-aware classes
  const orientationClasses = adaptToOrientation 
    ? `${isLandscape ? 'landscape:flex-row' : ''} ${isPortrait ? 'portrait:flex-col' : ''}`
    : '';

  return (
    <div
      ref={containerRef}
      className={`mobile-optimized ${orientationClasses} ${className}`}
      style={{
        // Prevent text selection during swipe gestures
        WebkitUserSelect: enableSwipeGestures ? 'none' : 'auto',
        userSelect: enableSwipeGestures ? 'none' : 'auto',
        // Improve touch response
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
      }}
    >
      {children}
    </div>
  );
};
