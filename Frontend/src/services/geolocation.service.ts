// Geolocation service for browser location API integration

import { LOCATION } from '../constants';

export interface GeolocationPosition {
  latitude: number;
  longitude: number;
  accuracy: number;
  timestamp: number;
}

export interface GeolocationError {
  code: number;
  message: string;
}

export interface GeolocationOptions {
  enableHighAccuracy?: boolean;
  timeout?: number;
  maximumAge?: number;
}

export class GeolocationService {
  private static instance: GeolocationService;
  private lastKnownPosition: GeolocationPosition | null = null;

  private constructor() {}

  static getInstance(): GeolocationService {
    if (!GeolocationService.instance) {
      GeolocationService.instance = new GeolocationService();
    }
    return GeolocationService.instance;
  }

  /**
   * Check if geolocation is supported
   */
  isSupported(): boolean {
    return 'geolocation' in navigator;
  }

  /**
   * Get current position
   */
  async getCurrentPosition(options?: GeolocationOptions): Promise<GeolocationPosition> {
    if (!this.isSupported()) {
      throw new Error('Geolocation is not supported by this browser');
    }

    const defaultOptions: GeolocationOptions = {
      enableHighAccuracy: true,
      timeout: LOCATION.GEOLOCATION_TIMEOUT,
      maximumAge: 5 * 60 * 1000, // 5 minutes
      ...options,
    };

    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const geoPosition: GeolocationPosition = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
            accuracy: position.coords.accuracy,
            timestamp: position.timestamp,
          };
          
          this.lastKnownPosition = geoPosition;
          resolve(geoPosition);
        },
        (error) => {
          const geoError: GeolocationError = {
            code: error.code,
            message: this.getErrorMessage(error.code),
          };
          reject(geoError);
        },
        defaultOptions
      );
    });
  }

  /**
   * Watch position changes
   */
  watchPosition(
    onSuccess: (position: GeolocationPosition) => void,
    onError: (error: GeolocationError) => void,
    options?: GeolocationOptions
  ): number {
    if (!this.isSupported()) {
      onError({
        code: 0,
        message: 'Geolocation is not supported by this browser',
      });
      return 0;
    }

    const defaultOptions: GeolocationOptions = {
      enableHighAccuracy: false,
      timeout: LOCATION.GEOLOCATION_TIMEOUT,
      maximumAge: 10 * 60 * 1000, // 10 minutes for watch
      ...options,
    };

    return navigator.geolocation.watchPosition(
      (position) => {
        const geoPosition: GeolocationPosition = {
          latitude: position.coords.latitude,
          longitude: position.coords.longitude,
          accuracy: position.coords.accuracy,
          timestamp: position.timestamp,
        };
        
        this.lastKnownPosition = geoPosition;
        onSuccess(geoPosition);
      },
      (error) => {
        const geoError: GeolocationError = {
          code: error.code,
          message: this.getErrorMessage(error.code),
        };
        onError(geoError);
      },
      defaultOptions
    );
  }

  /**
   * Clear watch
   */
  clearWatch(watchId: number): void {
    if (this.isSupported()) {
      navigator.geolocation.clearWatch(watchId);
    }
  }

  /**
   * Get last known position
   */
  getLastKnownPosition(): GeolocationPosition | null {
    return this.lastKnownPosition;
  }

  /**
   * Calculate distance between two points in meters
   */
  calculateDistance(
    lat1: number,
    lon1: number,
    lat2: number,
    lon2: number
  ): number {
    const R = 6371e3; // Earth's radius in meters
    const φ1 = (lat1 * Math.PI) / 180;
    const φ2 = (lat2 * Math.PI) / 180;
    const Δφ = ((lat2 - lat1) * Math.PI) / 180;
    const Δλ = ((lon2 - lon1) * Math.PI) / 180;

    const a =
      Math.sin(Δφ / 2) * Math.sin(Δφ / 2) +
      Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) * Math.sin(Δλ / 2);
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));

    return R * c;
  }

  /**
   * Check if position is within radius
   */
  isWithinRadius(
    centerLat: number,
    centerLon: number,
    pointLat: number,
    pointLon: number,
    radiusMeters: number
  ): boolean {
    const distance = this.calculateDistance(centerLat, centerLon, pointLat, pointLon);
    return distance <= radiusMeters;
  }

  /**
   * Get user-friendly error message
   */
  private getErrorMessage(code: number): string {
    switch (code) {
      case 1:
        return 'Location access denied. Please enable location services.';
      case 2:
        return 'Location unavailable. Please check your GPS or network connection.';
      case 3:
        return 'Location request timed out. Please try again.';
      default:
        return 'An unknown geolocation error occurred.';
    }
  }

  /**
   * Get current permission state for geolocation
   */
  async getPermissionState(): Promise<PermissionState> {
    if (!('permissions' in navigator)) {
      throw new Error('Permissions API not supported');
    }

    const permission = await navigator.permissions.query({ name: 'geolocation' });
    return permission.state;
  }

  /**
   * Format coordinates for display
   */
  formatCoordinates(latitude: number, longitude: number, precision: number = 6): string {
    const lat = latitude.toFixed(precision);
    const lon = longitude.toFixed(precision);
    const latDir = latitude >= 0 ? 'N' : 'S';
    const lonDir = longitude >= 0 ? 'E' : 'W';
    return `${Math.abs(parseFloat(lat))}°${latDir}, ${Math.abs(parseFloat(lon))}°${lonDir}`;
  }
}

// Export singleton instance
export const geolocationService = GeolocationService.getInstance();
