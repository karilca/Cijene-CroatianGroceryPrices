// Base service class with common functionality for all API services

import { PAGINATION } from '../constants';
import type { ServiceMethodOptions } from '../types';

export abstract class BaseService {
  /**
   * Handle service errors consistently across all services
   */
  protected handleServiceError(error: any, method: string, serviceName: string): Error {
    if (error.name === 'ApiError') {
      return error;
    }
    
    console.error(`${serviceName}.${method} error:`, error);
    
    if (error.response) {
      return new Error(`API Error: ${error.response.status} - ${error.response.data?.message || 'Unknown error'}`);
    }
    
    if (error.request) {
      return new Error('Network error: Unable to reach the server');
    }
    
    return new Error(`Service error in ${method}: ${error.message}`);
  }

  /**
   * Validate common search parameters
   */
  protected validateBaseSearchParams(params: { query?: string; page?: number; per_page?: number }): void {
    if (params.query && params.query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }
    
    if (params.page && params.page < 1) {
      throw new Error('Page number must be greater than 0');
    }
    
    if (params.per_page && (params.per_page < 1 || params.per_page > PAGINATION.MAX_PER_PAGE)) {
      throw new Error(`Per page must be between 1 and ${PAGINATION.MAX_PER_PAGE}`);
    }
  }

  /**
   * Validate date format (YYYY-MM-DD)
   */
  protected validateDateFormat(date: string): void {
    const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
    if (!dateRegex.test(date)) {
      throw new Error('Date must be in YYYY-MM-DD format');
    }
    
    const parsedDate = new Date(date);
    if (isNaN(parsedDate.getTime())) {
      throw new Error('Invalid date provided');
    }
  }

  /**
   * Build request config with timeout if provided
   */
  protected buildRequestConfig(options?: ServiceMethodOptions) {
    return options?.timeout ? { timeout: options.timeout } : undefined;
  }
}