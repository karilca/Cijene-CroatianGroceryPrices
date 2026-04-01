// Base API client with Axios configuration

import axios from 'axios';
import type { AxiosInstance, AxiosRequestConfig, AxiosResponse } from 'axios';
import { API_CONFIG } from '../constants';
import { GlobalErrorHandler } from '../utils/errorHandling';
import { supabase } from '../lib/supabase';

const DEACTIVATED_ACCOUNT_MESSAGES = [
  'Račun je deaktiviran.',
  'Account is deactivated.',
];

const asNonEmptyString = (value: unknown): string | null => {
  if (typeof value !== 'string') {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
};

const asRecord = (value: unknown): Record<string, unknown> | null => {
  if (typeof value === 'object' && value !== null) {
    return value as Record<string, unknown>;
  }
  return null;
};

const getApiErrorCode = (payload: unknown, fallbackCode: string): string => {
  const root = asRecord(payload);
  if (!root) {
    return fallbackCode;
  }

  const detailObject = asRecord(root.detail);
  return (
    asNonEmptyString(root.detail_code) ||
    asNonEmptyString(root.code) ||
    (detailObject ? asNonEmptyString(detailObject.detail_code) : null) ||
    fallbackCode
  );
};

const getApiErrorMessage = (payload: unknown, fallbackMessage: string): string => {
  const root = asRecord(payload);
  if (!root) {
    return fallbackMessage;
  }

  const detailObject = asRecord(root.detail);
  return (
    asNonEmptyString(root.message) ||
    asNonEmptyString(root.detail) ||
    (detailObject ? asNonEmptyString(detailObject.detail) : null) ||
    fallbackMessage
  );
};

const isDeactivatedAccountError = (payload: unknown): boolean => {
  if (!payload || typeof payload !== 'object') return false;

  const data = payload as { detail?: unknown; message?: unknown };
  const detailObject = asRecord(data.detail);
  const detail = typeof data.detail === 'string' ? data.detail : '';
  const nestedDetail = detailObject && typeof detailObject.detail === 'string' ? detailObject.detail : '';
  const message = typeof data.message === 'string' ? data.message : '';
  const detailCode = detailObject && typeof detailObject.detail_code === 'string' ? detailObject.detail_code : '';
  const combined = `${detail} ${message} ${nestedDetail}`.toLowerCase();

  if (detailCode === 'AUTH_ACCOUNT_DISABLED') {
    return true;
  }

  return DEACTIVATED_ACCOUNT_MESSAGES.some((candidate) =>
    combined.includes(candidate.toLowerCase())
  );
};

export class ApiClient {
  private client: AxiosInstance;
  private retryCount = 0;
  private manualAuthToken: string | null = null;

  constructor(baseURL: string = API_CONFIG.BASE_URL) {
    this.client = axios.create({
      baseURL,
      timeout: API_CONFIG.TIMEOUT,
      headers: {
        'Content-Type': 'application/json',
        'Accept': 'application/json',
      },
    });

    this.setupInterceptors();
  }

  private setupInterceptors(): void {
    // Request interceptor
    this.client.interceptors.request.use(
      async (config) => {
        // Prefer current Supabase session token for authenticated requests.
        const {
          data: { session },
        } = await supabase.auth.getSession();

        const token =
          session?.access_token ||
          this.manualAuthToken ||
          import.meta.env.VITE_API_TOKEN ||
          null;

        if (token) {
          config.headers = config.headers || {};
          config.headers.Authorization = `Bearer ${token}`;
        }

        // Add any auth headers, logging, etc.
        console.log(`API Request: ${config.method?.toUpperCase()} ${config.url}`);
        return config;
      },
      (error) => {
        console.error('Request error:', error);
        return Promise.reject(error);
      }
    );

    // Response interceptor
    this.client.interceptors.response.use(
      (response) => {
        console.log(`API Response: ${response.status} ${response.config.url}`);
        return response;
      },
      async (error) => {
        const originalRequest = error.config;

        // Handle network errors
        if (!error.response) {
          console.error('Network error:', error.message);

          let errorCode = 'NETWORK_UNAVAILABLE';

          if (error.code === 'ENOTFOUND' || error.message.includes('getaddrinfo')) {
            errorCode = 'DNS_ERROR';
          } else if (error.code === 'ECONNREFUSED') {
            errorCode = 'CONNECTION_REFUSED';
          } else if (error.code === 'TIMEOUT' || error.code === 'ECONNABORTED' || error.message.includes('timeout')) {
            errorCode = 'TIMEOUT_ERROR';
          }

          const networkError = new ApiError(errorCode, errorCode, {
            originalError: error.message,
            code: error.code
          });

          // Report to global error handler
          GlobalErrorHandler.getInstance().handleError(networkError);

          throw networkError;
        }

        // Handle specific HTTP errors
        const { status, data } = error.response;

        // Handle authentication errors
        if (status === 401) {
          const errorCode = getApiErrorCode(data, 'UNAUTHORIZED');
          const errorMessage = getApiErrorMessage(data, errorCode);
          console.warn('Authentication failed:', errorMessage);
          const apiError = new ApiError(
            errorMessage,
            errorCode,
            asRecord(data)?.details,
            status
          );

          throw apiError;
        }

        if (status === 403) {
          const errorCode = getApiErrorCode(data, 'FORBIDDEN');
          const errorMessage = getApiErrorMessage(data, errorCode);
          if (isDeactivatedAccountError(data)) {
            void supabase.auth.signOut();
          }
          console.warn('Access forbidden:', errorMessage);
          const apiError = new ApiError(
            errorMessage,
            errorCode,
            asRecord(data)?.details,
            status
          );

          throw apiError;
        }

        // Retry logic for 5xx errors
        if (status >= 500 && this.retryCount < API_CONFIG.RETRY_ATTEMPTS) {
          this.retryCount++;
          console.log(`Retrying request (${this.retryCount}/${API_CONFIG.RETRY_ATTEMPTS})...`);

          await this.delay(API_CONFIG.RETRY_DELAY * this.retryCount);
          return this.client(originalRequest);
        }

        // Reset retry count on success or different error
        this.retryCount = 0;

        // Transform error response
        const fallbackCode = status >= 500 ? 'API_GENERIC' : status.toString();
        const errorCode = getApiErrorCode(data, fallbackCode);
        const errorMessage = getApiErrorMessage(data, errorCode);
        const apiError = new ApiError(
          errorMessage,
          errorCode,
          asRecord(data)?.details,
          status
        );

        console.error('API Error:', apiError);

        // Report to global error handler
        GlobalErrorHandler.getInstance().handleError(apiError);

        throw apiError;
      }
    );
  }

  private delay(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  // HTTP methods
  async get<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.get(url, config);
    return response.data;
  }

  async post<T, TRequest = unknown>(url: string, data?: TRequest, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.post(url, data, config);
    return response.data;
  }

  async put<T, TRequest = unknown>(url: string, data?: TRequest, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.put(url, data, config);
    return response.data;
  }

  async delete<T>(url: string, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.delete(url, config);
    return response.data;
  }

  async patch<T, TRequest = unknown>(url: string, data?: TRequest, config?: AxiosRequestConfig): Promise<T> {
    const response: AxiosResponse<T> = await this.client.patch(url, data, config);
    return response.data;
  }

  // Set base URL
  setBaseURL(baseURL: string): void {
    this.client.defaults.baseURL = baseURL;
  }

  // Optionally set a manual bearer token override.
  setAuthToken(token: string): void {
    this.manualAuthToken = token;
    this.client.defaults.headers.common.Authorization = `Bearer ${token}`;
  }

  // Remove manual bearer token override.
  removeAuthToken(): void {
    this.manualAuthToken = null;
    delete this.client.defaults.headers.common.Authorization;
  }

  // Get client instance for advanced usage
  getClient(): AxiosInstance {
    return this.client;
  }

  // Health check endpoint
  async healthCheck(): Promise<{ status: string; timestamp: string }> {
    try {
      const response = await this.client.get('/health');
      return response.data;
    } catch {
      return {
        status: 'error',
        timestamp: new Date().toISOString()
      };
    }
  }

  // Get API version
  async getApiVersion(): Promise<string> {
    try {
      const response = await this.client.get('/version');
      return response.data.version || 'unknown';
    } catch {
      return 'unknown';
    }
  }

  // Cancel all pending requests
  cancelAllRequests(): void {
    // Note: This would require maintaining a list of AbortControllers
    // Implementation depends on specific requirements
    console.log('Cancelling all pending requests...');
  }

  // Get current configuration
  getConfig() {
    return {
      baseURL: this.client.defaults.baseURL,
      timeout: this.client.defaults.timeout,
      headers: this.client.defaults.headers
    };
  }

  // Update timeout
  setTimeout(timeout: number): void {
    this.client.defaults.timeout = timeout;
  }

  // Add custom header
  setHeader(key: string, value: string): void {
    this.client.defaults.headers.common[key] = value;
  }

  // Remove custom header
  removeHeader(key: string): void {
    delete this.client.defaults.headers.common[key];
  }

  // Set auth error handler (disabled - not needed with static token)
  setAuthErrorHandlers(): void {
    // No-op: Auth error handling disabled
    console.log('setAuthErrorHandler called but ignored - using static token');
  }

  // Remove auth error handler (disabled - not needed with static token)
  removeAuthErrorHandler(): void {
    // No-op: Auth error handling disabled
    console.log('removeAuthErrorHandler called but ignored - using static token');
  }
}

// Custom error class
export class ApiError extends Error {
  public message: string;
  public code: string;
  public details?: unknown;
  public status?: number;
  public timestamp: string;

  constructor(
    message: string,
    code: string,
    details?: unknown,
    status?: number
  ) {
    super(message);
    this.message = message;
    this.code = code;
    this.details = details;
    this.status = status;
    this.timestamp = new Date().toISOString();
    this.name = 'ApiError';
  }

  // Helper method to check if error is retryable
  isRetryable(): boolean {
    return this.status ? this.status >= 500 : false;
  }

  // Helper method to check if error is network related
  isNetworkError(): boolean {
    return this.code === 'NETWORK_ERROR' || !this.status;
  }

  // Convert to plain object for serialization
  toJSON() {
    return {
      name: this.name,
      message: this.message,
      code: this.code,
      status: this.status,
      details: this.details,
      timestamp: this.timestamp
    };
  }
}

// Request validation helper
export class RequestValidator {
  static validateRequired(value: unknown, fieldName: string): void {
    if (value === undefined || value === null || value === '') {
      throw new ApiError(
        `Field '${fieldName}' is required`,
        'VALIDATION_ERROR'
      );
    }
  }

  static validatePositiveNumber(value: number, fieldName: string): void {
    if (value <= 0) {
      throw new ApiError(
        `Field '${fieldName}' must be a positive number`,
        'VALIDATION_ERROR'
      );
    }
  }

  static validateEAN(ean: string): void {
    const eanRegex = /^\d{8,14}$/;
    if (!eanRegex.test(ean)) {
      throw new ApiError(
        'Invalid EAN format. Must be 8-14 digits.',
        'VALIDATION_ERROR'
      );
    }
  }

  static validateCoordinates(latitude: number, longitude: number): void {
    if (latitude < -90 || latitude > 90) {
      throw new ApiError(
        'Latitude must be between -90 and 90',
        'VALIDATION_ERROR'
      );
    }
    if (longitude < -180 || longitude > 180) {
      throw new ApiError(
        'Longitude must be between -180 and 180',
        'VALIDATION_ERROR'
      );
    }
  }
}

// Create default instance
export const apiClient = new ApiClient();
