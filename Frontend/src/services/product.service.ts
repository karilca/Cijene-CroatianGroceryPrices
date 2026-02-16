// Product service for product search and retrieval

import { apiClient, RequestValidator } from './api-client';
import { BaseService } from './base.service';
import { URLParamsBuilder } from '../utils/urlParams';
import { ENDPOINTS, PAGINATION } from '../constants';
import type {
  ProductSearchResponse,
  ProductSearchRequest,
  Product,
  PriceComparison,
  PriceRequest,
  StorePricesResponse,

  Price,
  ServiceMethodOptions
} from '../types';

export class ProductService extends BaseService {
  /**
   * Search for products with validation
   */
  async searchProducts(
    params: ProductSearchRequest,
    options?: ServiceMethodOptions
  ): Promise<ProductSearchResponse> {
    // Validate input parameters
    this.validateSearchParams(params);

    const urlParams = new URLParamsBuilder();

    // Map query or EAN to 'q' parameter
    if (params.query) {
      urlParams.add('q', params.query.trim());
    } else if (params.ean) {
      RequestValidator.validateEAN(params.ean);
      urlParams.add('q', params.ean);
    }

    // Map chain_code and chains to 'chains' parameter
    const chains = [...(params.chains || [])];
    if (params.chain_code) {
      chains.push(params.chain_code);
    }
    urlParams.addArray('chains', chains);

    urlParams.add('date', params.date ? (this.validateDateFormat(params.date), params.date) : undefined)
      .addPagination(params.page, params.per_page, PAGINATION.MAX_PER_PAGE);

    const url = `${ENDPOINTS.PRODUCTS}/?${urlParams.toString()}`;

    try {
      const config = this.buildRequestConfig(options);
      return await apiClient.get<ProductSearchResponse>(url, config);
    } catch (error) {
      throw this.handleServiceError(error, 'searchProducts', 'ProductService');
    }
  }

  /**
   * Get product by ID with validation
   */
  async getProductById(id: string, options?: ServiceMethodOptions): Promise<Product> {
    RequestValidator.validateRequired(id, 'id');

    try {
      const config = this.buildRequestConfig(options);
      return await apiClient.get<Product>(`${ENDPOINTS.PRODUCTS}/${encodeURIComponent(id)}/`, config);
    } catch (error) {
      throw this.handleServiceError(error, 'getProductById', 'ProductService');
    }
  }

  /**
   * Get product by EAN barcode
   */
  async getProductByEAN(ean: string, options?: ServiceMethodOptions): Promise<Product> {
    RequestValidator.validateRequired(ean, 'ean');
    RequestValidator.validateEAN(ean);

    try {
      // Use getProductById which calls /v1/products/{ean}
      return await this.getProductById(ean, options);
    } catch (error) {
      throw this.handleServiceError(error, 'getProductByEAN', 'ProductService');
    }
  }

  /**
   * Get product by chain code
   */
  async getProductByChainCode(chainCode: string, options?: ServiceMethodOptions): Promise<Product> {
    RequestValidator.validateRequired(chainCode, 'chainCode');

    try {
      const response = await this.searchProducts({ chain_code: chainCode }, options);
      if (response.products.length === 0) {
        throw new Error(`Product with chain code ${chainCode} not found`);
      }
      return response.products[0];
    } catch (error) {
      throw this.handleServiceError(error, 'getProductByChainCode', 'ProductService');
    }
  }

  /**
   * Get price comparison for a product
   */
  /**
   * Get price comparison for a product
   */
  async getProductPrices(
    params: PriceRequest,
    product: Product,
    options?: ServiceMethodOptions
  ): Promise<PriceComparison> {
    RequestValidator.validateRequired(params.eans, 'eans');

    const searchParams = new URLSearchParams();

    searchParams.append('eans', params.eans);
    if (params.chains) {
      if (Array.isArray(params.chains)) {
        searchParams.append('chains', params.chains.join(','));
      } else {
        searchParams.append('chains', params.chains);
      }
    }
    if (params.city) searchParams.append('city', params.city);
    if (params.address) searchParams.append('address', params.address);
    if (params.lat) searchParams.append('lat', params.lat.toString());
    if (params.lon) searchParams.append('lon', params.lon.toString());
    if (params.d) searchParams.append('d', params.d.toString());

    const url = `${ENDPOINTS.PRICES}/?${searchParams.toString()}`;

    try {
      const config = options?.timeout ? { timeout: options.timeout } : undefined;
      const response = await apiClient.get<StorePricesResponse>(url, config);

      // Transform API response to PriceComparison
      const prices: Price[] = response.store_prices.map(sp => {
        const priceVal = sp.regular_price ? parseFloat(sp.regular_price) : 0;
        const specialPriceVal = sp.special_price ? parseFloat(sp.special_price) : undefined;

        return {
          product_id: sp.ean, // Using EAN as product_id since that's what we have
          store_id: sp.store.code,
          chain: sp.chain,
          price: priceVal,
          special_price: specialPriceVal,
          currency: 'EUR', // Assuming EUR
          date: sp.price_date,
          unit: sp.unit_price ? 'unit' : undefined, // Simplified
          store_address: sp.store.address,
          store_city: sp.store.city,
        };
      });

      // Calculate stats
      let min_price = 0;
      let max_price = 0;
      let avg_price = 0;
      const chains = new Set<string>();

      if (prices.length > 0) {
        const validPrices = prices.map(p => p.special_price || p.price).filter(p => p > 0);

        if (validPrices.length > 0) {
          min_price = Math.min(...validPrices);
          max_price = Math.max(...validPrices);
          avg_price = validPrices.reduce((a, b) => a + b, 0) / validPrices.length;
        }

        prices.forEach(p => chains.add(p.chain));
      }

      return {
        product,
        prices,
        min_price,
        max_price,
        avg_price,
        chains: Array.from(chains)
      };

    } catch (error) {
      throw this.handleServiceError(error, 'getProductPrices', 'ProductService');
    }
  }

  /**
   * Get product suggestions for autocomplete
   */
  async getProductSuggestions(
    query: string,
    limit: number = 5,
    options?: ServiceMethodOptions
  ): Promise<Product[]> {
    RequestValidator.validateRequired(query, 'query');
    RequestValidator.validatePositiveNumber(limit, 'limit');

    try {
      const response = await this.searchProducts({
        query: query.trim(),
        per_page: Math.min(limit, 20),
        page: 1
      }, options);
      return response.products;
    } catch (error) {
      throw this.handleServiceError(error, 'getProductSuggestions', 'ProductService');
    }
  }

  /**
   * Get popular products
   */
  async getPopularProducts(limit: number = 10, options?: ServiceMethodOptions): Promise<Product[]> {
    RequestValidator.validatePositiveNumber(limit, 'limit');

    try {
      const response = await this.searchProducts({
        per_page: Math.min(limit, 50),
        page: 1
      }, options);
      return response.products;
    } catch (error) {
      throw this.handleServiceError(error, 'getPopularProducts', 'ProductService');
    }
  }

  /**
   * Validate search parameters
   */
  private validateSearchParams(params: ProductSearchRequest): void {
    this.validateBaseSearchParams(params);

    if (params.ean && params.ean.trim().length === 0) {
      throw new Error('EAN cannot be empty');
    }
  }

}

export const productService = new ProductService();
