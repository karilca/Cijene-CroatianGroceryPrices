// Geolocation service for browser location API integration
//
// Two-phase strategy for near-instant location:
//   Phase 1 – ask browser for ANY cached position (maximumAge: Infinity).
//             If the browser / OS has a position from any source (Google Maps,
//             another tab, cell-tower, …) it is returned in < 50 ms.
//   Phase 2 – if no cache exists, do a normal fresh request with a generous
//             timeout so the device can acquire a GPS fix.
//
// This mirrors how production apps like Google Maps achieve "instant" location.

import { LOCATION, STORAGE_KEYS } from '../constants';

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

export const GEOLOCATION_ERROR_TOKENS = {
  NOT_SUPPORTED: 'GEOLOCATION_NOT_SUPPORTED',
  PERMISSION_DENIED: 'GEOLOCATION_PERMISSION_DENIED',
  UNAVAILABLE: 'GEOLOCATION_UNAVAILABLE',
  TIMEOUT: 'GEOLOCATION_TIMEOUT',
  PERMISSIONS_API_UNSUPPORTED: 'GEOLOCATION_PERMISSIONS_API_UNSUPPORTED',
  UNKNOWN: 'GEOLOCATION_UNKNOWN_ERROR',
} as const;

export type GeolocationErrorToken =
  (typeof GEOLOCATION_ERROR_TOKENS)[keyof typeof GEOLOCATION_ERROR_TOKENS];

const GEOLOCATION_CACHE_MAX_AGE_MS = 3 * 60 * 1000;
const GEOLOCATION_FAST_TIMEOUT_MS = 1000;
const GEOLOCATION_FRESH_TIMEOUT_MS = 6000;

export class GeolocationService {
  private static instance: GeolocationService;
  private lastKnownPosition: GeolocationPosition | null = null;
  private refreshPromise: Promise<GeolocationPosition> | null = null;

  private constructor() {
    this.lastKnownPosition = this.loadLastKnownPosition();
  }

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

  // ── Internal helper: single raw browser call ──────────────────────────
  private requestPosition(opts: PositionOptions): Promise<GeolocationPosition> {
    return new Promise((resolve, reject) => {
      navigator.geolocation.getCurrentPosition(
        (pos) => {
          const geoPos: GeolocationPosition = {
            latitude: pos.coords.latitude,
            longitude: pos.coords.longitude,
            accuracy: pos.coords.accuracy,
            timestamp: pos.timestamp,
          };
          this.setLastKnownPosition(geoPos);
          resolve(geoPos);
        },
        (err) => {
          reject({ code: err.code, message: this.getErrorMessage(err.code) } as GeolocationError);
        },
        opts,
      );
    });
  }

  /**
   * Get current position – two-phase for speed.
   *
    * 1. Try browser-cached position (maximumAge ≈ 3 min, timeout 1 s).
   *    ➜ Returns in < 50 ms when the browser has a cached fix.
    * 2. If phase 1 fails, do a fresh request (timeout 6 s).
   *
   * Callers can still pass custom options; they feed into phase 2.
   */
  async getCurrentPosition(options?: GeolocationOptions): Promise<GeolocationPosition> {
    if (!this.isSupported()) {
      throw {
        code: 0,
        message: this.getErrorMessage(0),
      } as GeolocationError;
    }

    // ── Phase 1: instant browser-cached position ────────────────────────
    try {
      const cached = await this.requestPosition({
        enableHighAccuracy: false,
        timeout: GEOLOCATION_FAST_TIMEOUT_MS,
        maximumAge: GEOLOCATION_CACHE_MAX_AGE_MS,
      });
      // Kick off a silent background refresh so the NEXT call is fresh
      this.refreshInBackground(options);
      return cached;
    } catch {
      // No usable browser cache – fall through to phase 2
    }

    // ── Phase 2: fresh position with generous timeout ───────────────────
    const freshOpts: PositionOptions = {
      enableHighAccuracy: options?.enableHighAccuracy ?? false,
      timeout: options?.timeout ?? GEOLOCATION_FRESH_TIMEOUT_MS,
      maximumAge: 0, // force fresh
    };

    return this.requestPosition(freshOpts);
  }

  /**
   * Silently refresh position in the background so next access is fast.
   * Errors are swallowed – this is best-effort.
   */
  private refreshInBackground(options?: GeolocationOptions): void {
    if (this.refreshPromise) return; // already refreshing

    this.refreshPromise = this.requestPosition({
      enableHighAccuracy: options?.enableHighAccuracy ?? false,
      timeout: options?.timeout ?? GEOLOCATION_FRESH_TIMEOUT_MS,
      maximumAge: 0,
    })
      .catch(() => this.lastKnownPosition!) // swallow error
      .finally(() => { this.refreshPromise = null; });
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
        message: this.getErrorMessage(0),
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
        
        this.setLastKnownPosition(geoPosition);
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
    if (this.lastKnownPosition) {
      return this.lastKnownPosition;
    }

    this.lastKnownPosition = this.loadLastKnownPosition();
    return this.lastKnownPosition;
  }

  private setLastKnownPosition(position: GeolocationPosition): void {
    this.lastKnownPosition = position;

    try {
      localStorage.setItem(STORAGE_KEYS.LAST_LOCATION, JSON.stringify(position));
    } catch {
      // no-op when storage is unavailable
    }
  }

  private loadLastKnownPosition(): GeolocationPosition | null {
    try {
      const cached = localStorage.getItem(STORAGE_KEYS.LAST_LOCATION);
      if (!cached) {
        return null;
      }

      const parsed = JSON.parse(cached) as GeolocationPosition;
      if (
        typeof parsed?.latitude === 'number' &&
        typeof parsed?.longitude === 'number' &&
        typeof parsed?.accuracy === 'number' &&
        typeof parsed?.timestamp === 'number'
      ) {
        return parsed;
      }

      return null;
    } catch {
      return null;
    }
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
  private getErrorMessage(code: number): GeolocationErrorToken {
    switch (code) {
      case 0:
        return GEOLOCATION_ERROR_TOKENS.NOT_SUPPORTED;
      case 1:
        return GEOLOCATION_ERROR_TOKENS.PERMISSION_DENIED;
      case 2:
        return GEOLOCATION_ERROR_TOKENS.UNAVAILABLE;
      case 3:
        return GEOLOCATION_ERROR_TOKENS.TIMEOUT;
      case 4:
        return GEOLOCATION_ERROR_TOKENS.PERMISSIONS_API_UNSUPPORTED;
      default:
        return GEOLOCATION_ERROR_TOKENS.UNKNOWN;
    }
  }

  /**
   * Get current permission state for geolocation
   */
  async getPermissionState(): Promise<PermissionState> {
    if (!('permissions' in navigator)) {
      throw {
        code: 4,
        message: this.getErrorMessage(4),
      } as GeolocationError;
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
