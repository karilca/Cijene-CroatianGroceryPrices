// Store service for store search and location queries

import { apiClient, RequestValidator } from './api-client';
import { BaseService } from './base.service';
import { ENDPOINTS, PAGINATION, LOCATION } from '../constants';
import type {
  StoreSearchResponse,
  StoreSearchRequest,
  Store,
  ServiceMethodOptions
} from '../types';

export class StoreService extends BaseService {
  /**
   * Search for stores with validation
   */
  async searchStores(
    params: StoreSearchRequest,
    options?: ServiceMethodOptions
  ): Promise<StoreSearchResponse> {
    this.validateSearchParams(params);

    const searchParams = new URLSearchParams();

    if (params.query) {
      searchParams.append('address', params.query.trim());
    }
    if (params.city) {
      searchParams.append('city', params.city.trim());
    }
    if (params.chain_codes) {
      searchParams.append('chains', params.chain_codes.join(','));
    }

    if (params.latitude && params.longitude) {
      RequestValidator.validateCoordinates(params.latitude, params.longitude);
      searchParams.append('lat', params.latitude.toString());
      searchParams.append('lon', params.longitude.toString());
    }

    if (params.radius) {
      this.validateRadius(params.radius);
      // Convert meters to kilometers for the API
      searchParams.append('d', (params.radius / 1000).toString());
    }

    // Validate pagination parameters
    const page = params.page || PAGINATION.DEFAULT_PAGE;
    const perPage = Math.min(params.per_page || PAGINATION.DEFAULT_PER_PAGE, PAGINATION.MAX_PER_PAGE);

    searchParams.append('page', page.toString());
    searchParams.append('per_page', perPage.toString());

    const url = `${ENDPOINTS.STORES}/?${searchParams.toString()}`;

    try {
      const config = this.buildRequestConfig(options);
      return await apiClient.get<StoreSearchResponse>(url, config);
    } catch (error) {
      throw this.handleServiceError(error, 'searchStores', 'StoreService');
    }
  }

  /**
   * Get store by ID with validation
   */
  async getStoreById(id: string, options?: ServiceMethodOptions): Promise<Store> {
    RequestValidator.validateRequired(id, 'id');

    try {
      const config = options?.timeout ? { timeout: options.timeout } : undefined;
      return await apiClient.get<Store>(`${ENDPOINTS.STORES}/${encodeURIComponent(id)}/`, config);
    } catch (error) {
      throw this.handleServiceError(error, 'getStoreById', 'StoreService');
    }
  }

  /**
   * Find stores near location
   */
  async findNearbyStores(
    latitude: number,
    longitude: number,
    radius: number = 5000,
    chainCodes?: string[]
  ): Promise<Store[]> {
    const response = await this.searchStores({
      latitude,
      longitude,
      radius,
      chain_codes: chainCodes,
      per_page: 50
    });
    return response.stores;
  }

  /**
   * Find stores by city
   */
  async findStoresByCity(city: string, chainCodes?: string[]): Promise<Store[]> {
    const response = await this.searchStores({
      city,
      chain_codes: chainCodes,
      per_page: 50
    });
    return response.stores;
  }

  /**
   * Search stores by address
   */
  async searchStoresByAddress(address: string, chainCodes?: string[]): Promise<Store[]> {
    const response = await this.searchStores({
      query: address,
      chain_codes: chainCodes,
      per_page: 50
    });
    return response.stores;
  }

  /**
   * Get stores by chain
   */
  async getStoresByChain(chainCode: string): Promise<Store[]> {
    const response = await this.searchStores({
      chain_codes: [chainCode],
      per_page: 100
    });
    return response.stores;
  }

  /**
   * Get store suggestions for autocomplete
   */
  async getStoreSuggestions(query: string, limit: number = 5): Promise<Store[]> {
    RequestValidator.validateRequired(query, 'query');
    RequestValidator.validatePositiveNumber(limit, 'limit');

    const response = await this.searchStores({
      query: query.trim(),
      per_page: Math.min(limit, 20),
      page: 1
    });
    return response.stores;
  }

  /**
   * Validate search parameters
   */
  private validateSearchParams(params: StoreSearchRequest): void {
    this.validateBaseSearchParams(params);

    if (params.radius && (params.radius < LOCATION.MIN_RADIUS || params.radius > LOCATION.MAX_RADIUS)) {
      throw new Error(`Radius must be between ${LOCATION.MIN_RADIUS} and ${LOCATION.MAX_RADIUS} meters`);
    }
  }

  /**
   * Validate radius parameter
   */
  private validateRadius(radius: number): void {
    if (radius < LOCATION.MIN_RADIUS || radius > LOCATION.MAX_RADIUS) {
      throw new Error(`Radius must be between ${LOCATION.MIN_RADIUS} and ${LOCATION.MAX_RADIUS} meters`);
    }
  }
}

export const storeService = new StoreService();
