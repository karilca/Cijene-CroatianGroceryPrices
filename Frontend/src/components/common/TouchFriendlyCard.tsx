// Touch-friendly card component with optimized mobile interactions

import React, { useRef } from 'react';
import { useTouchGestures } from '../../hooks/useTouchGestures';

interface TouchFriendlyCardProps {
  children: React.ReactNode;
  onClick?: () => void;
  onDoubleClick?: () => void;
  onLongPress?: () => void;
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  className?: string;
  disabled?: boolean;
  variant?: 'default' | 'interactive' | 'elevated';
}

export const TouchFriendlyCard: React.FC<TouchFriendlyCardProps> = ({
  children,
  onClick,
  onDoubleClick,
  onLongPress,
  onSwipeLeft,
  onSwipeRight,
  className = '',
  disabled = false,
  variant = 'default',
}) => {
  const cardRef = useRef<HTMLDivElement>(null);

  // Set up touch gestures
  useTouchGestures(cardRef as React.RefObject<HTMLElement>, {
    onTap: !disabled ? onClick : undefined,
    onDoubleTap: !disabled ? onDoubleClick : undefined,
    onLongPress: !disabled ? onLongPress : undefined,
    onSwipeLeft: !disabled ? onSwipeLeft : undefined,
    onSwipeRight: !disabled ? onSwipeRight : undefined,
    threshold: 50,
    longPressDelay: 500,
  });

  const baseClasses = 'bg-white rounded-lg shadow-md transition-all duration-200 touch-manipulation select-none';

  const variantClasses = {
    default: 'hover:shadow-lg',
    interactive: 'hover:shadow-lg active:scale-[0.98] cursor-pointer',
    elevated: 'shadow-lg hover:shadow-xl transform hover:-translate-y-1',
  };

  const interactionClasses = onClick || onDoubleClick || onLongPress
    ? 'cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2'
    : '';

  const disabledClasses = disabled
    ? 'opacity-50 cursor-not-allowed'
    : '';

  const combinedClasses = `${baseClasses} ${variantClasses[variant]} ${interactionClasses} ${disabledClasses} ${className}`;

  return (
    <div
      ref={cardRef}
      className={combinedClasses}
      tabIndex={(onClick || onDoubleClick || onLongPress) && !disabled ? 0 : undefined}
      role={onClick ? 'button' : undefined}
      onKeyDown={(e) => {
        if ((e.key === 'Enter' || e.key === ' ') && onClick && !disabled) {
          e.preventDefault();
          onClick();
        }
      }}
      style={{
        WebkitTouchCallout: 'none',
        WebkitTapHighlightColor: 'transparent',
        minHeight: '44px', // Minimum touch target size
      }}
    >
      {children}
    </div>
  );
};
