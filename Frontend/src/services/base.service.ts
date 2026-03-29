// Base service class with common functionality for all API services

import { PAGINATION } from '../constants';
import type { ServiceMethodOptions } from '../types';
import { LocalizedApiError } from '../utils/apiErrors';

interface ServiceErrorLike {
  name?: string;
  message?: string;
  response?: {
    status?: number;
    data?: {
      message?: string;
    };
  };
  request?: unknown;
}

export abstract class BaseService {
  /**
   * Handle service errors consistently across all services
   */
  protected handleServiceError(error: unknown, method: string, serviceName: string): Error {
    const serviceError = error as ServiceErrorLike;

    if (serviceError.name === 'ApiError') {
      return serviceError as Error;
    }
    
    console.error(`${serviceName}.${method} error:`, serviceError);
    
    if (serviceError.response) {
      return new LocalizedApiError('API_GENERIC', serviceError.response.data?.message || 'Service request failed.');
    }
    
    if (serviceError.request) {
      return new LocalizedApiError('NETWORK_UNAVAILABLE', 'Network error: Unable to reach the server.');
    }
    
    return new LocalizedApiError('SERVICE_GENERIC', serviceError.message || `Service error in ${serviceName}.${method}.`);
  }

  /**
   * Validate common search parameters
   */
  protected validateBaseSearchParams(params: { query?: string; page?: number; per_page?: number }): void {
    if (params.query && params.query.trim().length === 0) {
      throw new LocalizedApiError('VALIDATION_SEARCH_QUERY_EMPTY', 'Search query cannot be empty.');
    }
    
    if (params.page && params.page < 1) {
      throw new LocalizedApiError('VALIDATION_PAGE_NUMBER_INVALID', 'Page number must be greater than 0.');
    }
    
    if (params.per_page && (params.per_page < 1 || params.per_page > PAGINATION.MAX_PER_PAGE)) {
      throw new LocalizedApiError(
        'VALIDATION_PER_PAGE_RANGE',
        `Per page must be between 1 and ${PAGINATION.MAX_PER_PAGE}.`,
      );
    }
  }

  /**
   * Validate date format (YYYY-MM-DD)
   */
  protected validateDateFormat(date: string): void {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new LocalizedApiError('VALIDATION_DATE_FORMAT_INVALID', 'Date must be in YYYY-MM-DD format.');
    }
    
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new LocalizedApiError('VALIDATION_DATE_INVALID', 'Invalid date provided.');
    }
  }

  /**
   * Build request config with timeout if provided
   */
  protected buildRequestConfig(options?: ServiceMethodOptions) {
    if (!options?.timeout && !options?.abortSignal) {
      return undefined;
    }

    return {
      ...(options?.timeout ? { timeout: options.timeout } : {}),
      ...(options?.abortSignal ? { signal: options.abortSignal } : {}),
    };
  }
}