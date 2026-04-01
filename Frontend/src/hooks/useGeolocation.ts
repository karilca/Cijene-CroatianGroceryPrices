// Custom hook for geolocation functionality
//
// Position starts as null and is only populated when getCurrentPosition()
// is explicitly called (e.g. user clicks "Use my location").
// The two-phase geolocation service ensures a near-instant response.

import { useState, useEffect, useCallback } from 'react';
import { geolocationService } from '../services/geolocation.service';
import type { GeolocationPosition, GeolocationError } from '../services/geolocation.service';
import { useAppStore } from '../stores/appStore';
import { useLanguage } from '../contexts/LanguageContext';
import type { TranslationKey } from '../utils/translations';

export interface UseGeolocationOptions {
  watchPosition?: boolean;
  requestOnMount?: boolean;
}

export interface UseGeolocationState {
  position: GeolocationPosition | null;
  error: GeolocationError | null;
  loading: boolean;
  supported: boolean;
}

export function useGeolocation(options: UseGeolocationOptions = {}) {
  const [state, setState] = useState<UseGeolocationState>({
    position: null,
    error: null,
    loading: false,
    supported: geolocationService.isSupported(),
  });

  const setDefaultLocation = useAppStore((s) => s.setDefaultLocation);
  const { t } = useLanguage();

  const getLocalizedErrorMessage = useCallback((code: number, fallback?: string): string => {
    const messageKeyMap: Record<number, TranslationKey> = {
      0: 'errors.geolocation.notSupported',
      1: 'errors.geolocation.permissionDenied',
      2: 'errors.geolocation.unavailable',
      3: 'errors.geolocation.timeout',
      4: 'errors.geolocation.permissionsApiUnsupported',
    };

    const translationKey = messageKeyMap[code] ?? 'errors.geolocation.unknown';
    const translated = t(translationKey);

    if (translated !== translationKey) {
      return translated;
    }

    return fallback || t('errors.geolocation.unknown');
  }, [t]);

  const getCurrentPosition = useCallback(async () => {
    if (!state.supported) {
      setState((prev) => ({
        ...prev,
        error: { code: 0, message: getLocalizedErrorMessage(0) },
      }));
      return;
    }

    setState((prev) => ({ ...prev, loading: true, error: null }));

    try {
      // The service handles the two-phase fast lookup internally
      const position = await geolocationService.getCurrentPosition();

      setState((prev) => ({
        ...prev,
        position,
        loading: false,
        error: null,
      }));

      setDefaultLocation({
        latitude: position.latitude,
        longitude: position.longitude,
        city: null,
        country: 'HR',
      });

      return position;
    } catch (error) {
      const geoError = error as GeolocationError;

      // If the fresh request failed but we have a cached position,
      // use it silently instead of showing an error to the user.
      const fallback = geolocationService.getLastKnownPosition();
      if (fallback) {
        setState((prev) => ({
          ...prev,
          position: fallback,
          loading: false,
          error: null,
        }));
        return fallback;
      }

      setState((prev) => ({
        ...prev,
        loading: false,
        error: {
          ...geoError,
          message: getLocalizedErrorMessage(geoError.code, geoError.message),
        },
      }));
      throw {
        ...geoError,
        message: getLocalizedErrorMessage(geoError.code, geoError.message),
      } as GeolocationError;
    }
  }, [state.supported, setDefaultLocation, getLocalizedErrorMessage]);

  const clearError = useCallback(() => {
    setState((prev) => ({ ...prev, error: null }));
  }, []);

  const resetState = useCallback(() => {
    setState({
      position: null,
      error: null,
      loading: false,
      supported: geolocationService.isSupported(),
    });
  }, []);

  // Watch position if requested
  useEffect(() => {
    if (!options.watchPosition || !state.supported) return;

    const handleSuccess = (position: GeolocationPosition) => {
      setState((prev) => ({ ...prev, position, error: null }));
      setDefaultLocation({
        latitude: position.latitude,
        longitude: position.longitude,
        city: null,
        country: 'HR',
      });
    };

    const handleError = (error: GeolocationError) => {
      setState((prev) => ({
        ...prev,
        error: {
          ...error,
          message: getLocalizedErrorMessage(error.code, error.message),
        },
      }));
    };

    const watchId = geolocationService.watchPosition(handleSuccess, handleError);

    return () => {
      if (watchId) {
        geolocationService.clearWatch(watchId);
      }
    };
  }, [options.watchPosition, state.supported, setDefaultLocation, getLocalizedErrorMessage]);

  // Request position on mount if requested
  useEffect(() => {
    if (options.requestOnMount) {
      getCurrentPosition();
    }
  }, [options.requestOnMount, getCurrentPosition]);

  return {
    ...state,
    getCurrentPosition,
    clearError,
    resetState,
    getLastKnownPosition: geolocationService.getLastKnownPosition.bind(geolocationService),
    calculateDistance: geolocationService.calculateDistance.bind(geolocationService),
    isWithinRadius: geolocationService.isWithinRadius.bind(geolocationService),
    formatCoordinates: geolocationService.formatCoordinates.bind(geolocationService),
  };
}

export default useGeolocation;
