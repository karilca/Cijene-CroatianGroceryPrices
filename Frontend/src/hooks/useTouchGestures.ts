import { useState, useEffect } from 'react';
import type { RefObject } from 'react';

interface TouchGestureOptions {
  threshold?: number;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onTap?: () => void;
  onDoubleTap?: () => void;
  onLongPress?: () => void;
  longPressDelay?: number;
}

interface TouchState {
  startX: number;
  startY: number;
  startTime: number;
  lastTapTime: number;
  longPressTimer: NodeJS.Timeout | null;
}

export function useTouchGestures(
  ref: RefObject<HTMLElement>,
  options: TouchGestureOptions = {}
) {
  const {
    threshold = 50,
    onSwipeLeft,
    onSwipeRight,
    onSwipeUp,
    onSwipeDown,
    onTap,
    onDoubleTap,
    onLongPress,
    longPressDelay = 500,
  } = options;

  const [touchState, setTouchState] = useState<TouchState>({
    startX: 0,
    startY: 0,
    startTime: 0,
    lastTapTime: 0,
    longPressTimer: null,
  });

  useEffect(() => {
    const element = ref.current;
    if (!element) return;

    const handleTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0];
      const now = Date.now();

      // Clear any existing long press timer
      if (touchState.longPressTimer) {
        clearTimeout(touchState.longPressTimer);
      }

      // Set up long press detection
      const longPressTimer = setTimeout(() => {
        onLongPress?.();
      }, longPressDelay);

      setTouchState({
        startX: touch.clientX,
        startY: touch.clientY,
        startTime: now,
        lastTapTime: touchState.lastTapTime,
        longPressTimer,
      });
    };

    const handleTouchEnd = (e: TouchEvent) => {
      const touch = e.changedTouches[0];
      const endX = touch.clientX;
      const endY = touch.clientY;
      const endTime = Date.now();

      const deltaX = endX - touchState.startX;
      const deltaY = endY - touchState.startY;
      const deltaTime = endTime - touchState.startTime;

      // Clear long press timer
      if (touchState.longPressTimer) {
        clearTimeout(touchState.longPressTimer);
      }

      // Check for swipe gestures
      const isSwipe = Math.abs(deltaX) > threshold || Math.abs(deltaY) > threshold;
      
      if (isSwipe && deltaTime < 300) {
        if (Math.abs(deltaX) > Math.abs(deltaY)) {
          // Horizontal swipe
          if (deltaX > 0) {
            onSwipeRight?.();
          } else {
            onSwipeLeft?.();
          }
        } else {
          // Vertical swipe
          if (deltaY > 0) {
            onSwipeDown?.();
          } else {
            onSwipeUp?.();
          }
        }
      } else if (!isSwipe && deltaTime < 300) {
        // Check for tap or double tap
        const isDoubleTap = endTime - touchState.lastTapTime < 300;
        
        if (isDoubleTap && onDoubleTap) {
          onDoubleTap();
        } else if (onTap) {
          onTap();
        }

        setTouchState(prev => ({
          ...prev,
          lastTapTime: endTime,
          longPressTimer: null,
        }));
      }
    };

    const handleTouchCancel = () => {
      if (touchState.longPressTimer) {
        clearTimeout(touchState.longPressTimer);
      }
      setTouchState(prev => ({
        ...prev,
        longPressTimer: null,
      }));
    };

    element.addEventListener('touchstart', handleTouchStart, { passive: true });
    element.addEventListener('touchend', handleTouchEnd, { passive: true });
    element.addEventListener('touchcancel', handleTouchCancel, { passive: true });

    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
      element.removeEventListener('touchcancel', handleTouchCancel);
      
      if (touchState.longPressTimer) {
        clearTimeout(touchState.longPressTimer);
      }
    };
  }, [ref, threshold, onSwipeLeft, onSwipeRight, onSwipeUp, onSwipeDown, onTap, onDoubleTap, onLongPress, longPressDelay, touchState]);

  return touchState;
}
