// Base card component with common functionality

import React from 'react';
import { Heart } from 'lucide-react';
import { Card } from '../ui/Card';
import { useLanguage } from '../../contexts/LanguageContext';

export interface BaseCardProps {
  className?: string;
  onClick?: () => void;
  onLongPress?: () => void;
  variant?: 'default' | 'interactive';
  children: React.ReactNode;
  
  // Favorite functionality (optional)
  isFavorite?: boolean;
  onFavoriteToggle?: (e: React.MouseEvent) => void;
  favoriteIconPosition?: 'top-right' | 'bottom-right';
  
  // Action buttons (optional)
  actions?: React.ReactNode;
  actionsPosition?: 'bottom' | 'side';
}

export const BaseCard: React.FC<BaseCardProps> = ({
  className = '',
  onClick,
  onLongPress,
  variant = 'default',
  children,
  isFavorite,
  onFavoriteToggle,
  favoriteIconPosition = 'top-right',
  actions,
  actionsPosition = 'bottom'
}) => {
  const { t } = useLanguage();

  const handleCardClick = (e: React.MouseEvent) => {
    // Don't trigger card click if clicking on favorite or action buttons
    if ((e.target as Element).closest('.card-action-button')) {
      return;
    }
    onClick?.();
  };

  const handleFavoriteClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    onFavoriteToggle?.(e);
  };

  const cardClasses = [
    'relative',
    variant === 'interactive' && 'cursor-pointer hover:shadow-md transition-shadow',
    className
  ].filter(Boolean).join(' ');

  const favoriteButton = onFavoriteToggle && (
    <button
      onClick={handleFavoriteClick}
      className={`card-action-button absolute p-2 rounded-full bg-white shadow-md hover:bg-gray-50 transition-colors ${
        favoriteIconPosition === 'top-right' ? 'top-2 right-2' : 'bottom-2 right-2'
      }`}
      aria-label={isFavorite ? t('favoritesList.removeFromFavorites') : t('favoritesList.addToFavorites')}
    >
      <Heart
        className={`h-4 w-4 ${
          isFavorite ? 'fill-red-500 text-red-500' : 'text-gray-400'
        }`}
      />
    </button>
  );

  return (
    <Card 
      className={cardClasses}
      onClick={variant === 'interactive' ? handleCardClick : undefined}
      onContextMenu={onLongPress ? (e) => { e.preventDefault(); onLongPress(); } : undefined}
    >
      {favoriteButton}
      
      <div className="p-4">
        {actionsPosition === 'side' ? (
          <div className="flex gap-4">
            <div className="flex-1">
              {children}
            </div>
            {actions && (
              <div className="flex flex-col gap-2 card-action-button">
                {actions}
              </div>
            )}
          </div>
        ) : (
          <>
            {children}
            {actions && (
              <div className="mt-4 pt-4 border-t border-gray-200 flex gap-2 card-action-button">
                {actions}
              </div>
            )}
          </>
        )}
      </div>
    </Card>
  );
};