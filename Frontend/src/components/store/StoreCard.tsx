import React from 'react';
import { MapPin, Phone, Navigation } from 'lucide-react';
import { BaseCard } from '../common/BaseCard';
import { Button } from '../ui/Button';
import { useStoreFavorite } from '../../hooks/useFavorite';
import { geolocationService } from '../../services/geolocation.service';
import type { Store } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

export interface StoreCardProps {
  store: Store;
  userLocation?: { latitude: number; longitude: number } | null;
  className?: string;
  onClick?: (store: Store) => void;
}

export const StoreCard: React.FC<StoreCardProps> = ({
  store,
  userLocation,
  className = '',
  onClick,
}) => {
  const { isFavorite, toggleFavorite } = useStoreFavorite(store);
  const { t } = useLanguage();

  // Calculate distance if user location is available
  const distance = userLocation && store.latitude && store.longitude
    ? geolocationService.calculateDistance(
      userLocation.latitude,
      userLocation.longitude,
      store.latitude,
      store.longitude
    )
    : null;

  const handleCardClick = () => {
    if (onClick) {
      onClick(store);
    }
  };

  const handleGetDirections = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (store.latitude && store.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`;
      window.open(url, '_blank');
    }
  };

  const handleCall = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (store.phone) {
      window.location.href = `tel:${store.phone}`;
    }
  };

  const formatDistance = (distanceInMeters: number): string => {
    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)} m`;
    } else {
      return `${(distanceInMeters / 1000).toFixed(1)} km`;
    }
  };

  const cardActions = (
    <>
      {store.latitude && store.longitude && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleGetDirections}
          className="flex-1"
        >
          <Navigation className="h-4 w-4 mr-2" />
          {t('card.directions')}
        </Button>
      )}
      {store.phone && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleCall}
          className="flex-1"
        >
          <Phone className="h-4 w-4 mr-2" />
          {t('card.call')}
        </Button>
      )}
    </>
  );

  return (
    <BaseCard
      className={className}
      onClick={handleCardClick}
      variant="interactive"
      isFavorite={isFavorite}
      onFavoriteToggle={toggleFavorite}
      actions={cardActions}
    >
      {/* Store header */}
      <div className="mb-3">
        <h3 className="font-semibold text-gray-900 text-base mb-1">
          {store.name}
        </h3>

        {store.chain && (
          <p className="text-sm text-primary-600 font-medium">
            {store.chain}
          </p>
        )}
      </div>

      {/* Store details */}
      <div className="space-y-2 text-sm text-gray-600">
        {/* Address */}
        {store.address && (
          <div className="flex items-start">
            <MapPin className="h-4 w-4 mr-2 mt-0.5 text-gray-400 flex-shrink-0" />
            <span className="leading-tight">
              {store.address}
              {store.city && `, ${store.city}`}
            </span>
          </div>
        )}

        {/* Distance */}
        {distance !== null && (
          <div className="flex items-center">
            <MapPin className="h-4 w-4 mr-2 text-gray-400" />
            <span className="text-green-600 font-medium">
              {t('card.distance').replace('{distance}', formatDistance(distance))}
            </span>
          </div>
        )}

        {/* Store info */}
        {store.chain_code && (
          <div className="text-xs text-gray-500">
            {t('card.storeCode').replace('{code}', store.chain_code)}
          </div>
        )}
      </div>
    </BaseCard>
  );
};