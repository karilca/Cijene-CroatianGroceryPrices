// Store details component for displaying comprehensive store information

import React from 'react';
import { MapPin, Phone, Clock, Navigation, Heart, ChevronLeft } from 'lucide-react';
import { useStoreFavorite } from '../../hooks/useFavorite';
import { geolocationService } from '../../services/geolocation.service';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Store } from '../../types';

export interface StoreDetailsProps {
  store: Store;
  userLocation?: { latitude: number; longitude: number } | null;
  onBack?: () => void;
  className?: string;
}

export const StoreDetails: React.FC<StoreDetailsProps> = ({
  store,
  userLocation,
  onBack,
  className = '',
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

  const handleFavoriteToggle = () => {
    toggleFavorite();
  };

  const handleGetDirections = () => {
    if (store.latitude && store.longitude) {
      const url = `https://www.google.com/maps/dir/?api=1&destination=${store.latitude},${store.longitude}`;
      window.open(url, '_blank');
    }
  };

  const formatDistance = (distanceInMeters: number): string => {
    if (distanceInMeters < 1000) {
      return `${Math.round(distanceInMeters)} m`;
    } else {
      return `${(distanceInMeters / 1000).toFixed(1)} km`;
    }
  };

  const formatCoordinates = (lat: number, lon: number): string => {
    return geolocationService.formatCoordinates(lat, lon, 4);
  };

  return (
    <div className={`bg-white rounded-lg shadow-lg ${className}`}>
      {/* Header */}
      <div className="p-4 sm:p-6 border-b border-gray-200">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="flex items-start gap-3">
            {onBack && (
              <button
                onClick={onBack}
                className="p-2 rounded-lg hover:bg-gray-100 transition-colors mt-0.5"
              >
                <ChevronLeft className="h-5 w-5" />
              </button>
            )}
            <div className="min-w-0">
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 break-words">{store.name}</h1>
              {store.chain && (
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-100 text-primary-800">
                    {store.chain}
                  </span>
                  <span className="text-xs text-gray-500">
                    Code: {store.chain_code}
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex flex-wrap gap-2 w-full sm:w-auto">
            <button
              onClick={handleFavoriteToggle}
              className={`flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 rounded-lg transition-colors text-sm font-medium ${isFavorite
                ? 'bg-red-100 text-red-600 hover:bg-red-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
                }`}
            >
              <Heart className={`h-4 w-4 ${isFavorite ? 'fill-current' : ''}`} />
              <span className="whitespace-nowrap">{isFavorite ? t('storeDetails.favorited') : t('storeDetails.addToFavorites')}</span>
            </button>

            {store.latitude && store.longitude && (
              <button
                onClick={handleGetDirections}
                className="flex-1 sm:flex-none flex items-center justify-center gap-2 px-3 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors text-sm font-medium"
              >
                <Navigation className="h-4 w-4" />
                <span className="whitespace-nowrap">{t('storeDetails.getDirections')}</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Content */}
      <div className="p-6">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
          {/* Location Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('storeDetails.locationInfo')}</h2>
            <div className="space-y-4">
              {/* Address */}
              {store.address && (
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                    <MapPin className="h-5 w-5 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500 block uppercase tracking-wider mb-0.5">{t('storeDetails.address')}</div>
                    <div className="text-gray-900 font-medium break-words">{store.address}</div>
                    {store.city && (
                      <div className="text-gray-600 text-sm">{store.city}</div>
                    )}
                  </div>
                </div>
              )}

              {/* Distance */}
              {distance !== null && (
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                    <Navigation className="h-5 w-5 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500 block uppercase tracking-wider mb-0.5">{t('storeDetails.distance')}</div>
                    <div className="text-green-600 font-bold">{t('storeDetails.fromYourLocation').replace('{distance}', formatDistance(distance))}</div>
                  </div>
                </div>
              )}

              {/* Coordinates */}
              {store.latitude && store.longitude && (
                <div className="flex items-start gap-3 min-w-0">
                  <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                    <MapPin className="h-5 w-5 text-gray-500" />
                  </div>
                  <div className="min-w-0">
                    <div className="text-xs text-gray-500 block uppercase tracking-wider mb-0.5">{t('storeDetails.coordinates')}</div>
                    <div className="text-gray-600 font-mono text-sm break-all">
                      {formatCoordinates(store.latitude, store.longitude)}
                    </div>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Contact Information */}
          <div>
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('storeDetails.contactInfo')}</h2>
            <div className="space-y-4">
              {/* Phone */}
              {store.phone && (
                <div className="flex items-start gap-3">
                  <Phone className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">{t('storeDetails.phone')}</div>
                    <a
                      href={`tel:${store.phone}`}
                      className="text-primary-600 hover:text-primary-700 transition-colors"
                    >
                      {store.phone}
                    </a>
                  </div>
                </div>
              )}

              {/* Store Type */}
              {store.store_type && (
                <div className="flex items-start gap-3">
                  <div className="h-5 w-5 mt-0.5 flex-shrink-0" />
                  <div>
                    <div className="text-sm font-medium text-gray-700">{t('storeDetails.storeType')}</div>
                    <div className="text-gray-600">{store.store_type}</div>
                  </div>
                </div>
              )}

              {/* Operating Hours Placeholder */}
              <div className="flex items-start gap-3">
                <Clock className="h-5 w-5 text-gray-400 mt-0.5 flex-shrink-0" />
                <div>
                  <div className="text-sm font-medium text-gray-700">{t('storeDetails.operatingHours')}</div>
                  <div className="text-gray-500 text-sm">
                    {t('storeDetails.hoursNotAvailable')}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Store Statistics */}
        <div className="mt-8 pt-8 border-t border-gray-200">
          <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('storeDetails.storeInfo')}</h2>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-900">{store.chain_code}</div>
              <div className="text-sm text-gray-600">{t('storeDetails.chainCode')}</div>
            </div>

            <div className="bg-gray-50 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-gray-900">
                {store.id || store.code || `${store.chain_code}-${store.address}`}
              </div>
              <div className="text-sm text-gray-600">{t('storeDetails.storeId')}</div>
            </div>

            {distance !== null && (
              <div className="bg-primary-50 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-primary-900">{formatDistance(distance)}</div>
                <div className="text-sm text-primary-600">{t('storeDetails.distance')}</div>
              </div>
            )}

            {store.store_type && (
              <div className="bg-green-50 p-4 rounded-lg text-center">
                <div className="text-lg font-bold text-green-900">{store.store_type}</div>
                <div className="text-sm text-green-600">{t('chainDetails.type')}</div>
              </div>
            )}
          </div>
        </div>

        {/* Map Section Placeholder */}
        {store.latitude && store.longitude && (
          <div className="mt-8 pt-8 border-t border-gray-200">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">{t('storeDetails.locationOnMap')}</h2>
            <div className="bg-gray-100 rounded-lg p-8 text-center">
              <MapPin className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <p className="text-gray-600 mb-4">
                {t('storeDetails.mapPlaceholder')}
              </p>
              <button
                onClick={handleGetDirections}
                className="inline-flex items-center gap-2 px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700 transition-colors"
              >
                <Navigation className="h-4 w-4" />
                {t('storeDetails.openInGoogleMaps')}
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default StoreDetails;
