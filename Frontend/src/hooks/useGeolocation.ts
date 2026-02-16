// Custom hook for geolocation functionality

import { useState, useEffect, useCallback } from 'react';
import { geolocationService } from '../services/geolocation.service';
import type { GeolocationPosition, GeolocationError } from '../services/geolocation.service';
import { useAppStore } from '../stores/appStore';

export interface UseGeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
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

  const setDefaultLocation = useAppStore((state) => state.setDefaultLocation);

  const getCurrentPosition = useCallback(async () => {
    if (!state.supported) {
      setState(prev => ({
        ...prev,
        error: { code: 0, message: 'Geolocation is not supported by this browser' }
      }));
      return;
    }

    setState(prev => ({ ...prev, loading: true, error: null }));

    try {
      const position = await geolocationService.getCurrentPosition({
        enableHighAccuracy: options.enableHighAccuracy,
        timeout: options.timeout,
        maximumAge: options.maximumAge,
      });

      setState(prev => ({
        ...prev,
        position,
        loading: false,
        error: null,
      }));

      // Update app store with location
      setDefaultLocation({
        latitude: position.latitude,
        longitude: position.longitude,
        city: null, // Will be geocoded separately if needed
        country: 'HR',
      });

      return position;
    } catch (error) {
      const geoError = error as GeolocationError;
      setState(prev => ({
        ...prev,
        position: null,
        loading: false,
        error: geoError,
      }));
      throw geoError;
    }
  }, [options, state.supported, setDefaultLocation]);

  const clearError = useCallback(() => {
    setState(prev => ({ ...prev, error: null }));
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

    let watchId: number;

    const handleSuccess = (position: GeolocationPosition) => {
      setState(prev => ({
        ...prev,
        position,
        error: null,
      }));

      setDefaultLocation({
        latitude: position.latitude,
        longitude: position.longitude,
        city: null,
        country: 'HR',
      });
    };

    const handleError = (error: GeolocationError) => {
      setState(prev => ({
        ...prev,
        error,
      }));
    };

    watchId = geolocationService.watchPosition(
      handleSuccess,
      handleError,
      {
        enableHighAccuracy: options.enableHighAccuracy,
        timeout: options.timeout,
        maximumAge: options.maximumAge,
      }
    );

    return () => {
      if (watchId) {
        geolocationService.clearWatch(watchId);
      }
    };
  }, [options.watchPosition, options.enableHighAccuracy, options.timeout, options.maximumAge, state.supported, setDefaultLocation]);

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
    getLastKnownPosition: geolocationService.getLastKnownPosition,
    calculateDistance: geolocationService.calculateDistance,
    isWithinRadius: geolocationService.isWithinRadius,
    formatCoordinates: geolocationService.formatCoordinates,
  };
}

export default useGeolocation;
