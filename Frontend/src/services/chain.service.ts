// Chain service for chain data management

import { apiClient, RequestValidator } from './api-client';
import { BaseService } from './base.service';
import { ENDPOINTS } from '../constants';
import type { ChainListResponse, Chain, ServiceMethodOptions, ChainStatsResponse } from '../types';

export class ChainService extends BaseService {
  /**
   * Get all available chains with stats
   * Merges data from /v1/chains/ (codes) and /v1/chain-stats/ (metadata)
   */
  async getChains(options?: ServiceMethodOptions): Promise<ChainListResponse> {
    try {
      const config = this.buildRequestConfig(options);

      // Parallel fetch of chains list and stats to build rich objects
      const [chainsResponse, statsResponse] = await Promise.all([
        apiClient.get<{ chains: string[] }>(`${ENDPOINTS.CHAINS}/`, config),
        apiClient.get<ChainStatsResponse>(`${ENDPOINTS.CHAIN_STATS}/`, config)
      ]);

      const chainCodes = chainsResponse.chains;
      const statsMap = new Map(statsResponse.chain_stats.map(s => [s.chain_code, s]));

      const chains: Chain[] = chainCodes.map(code => {
        const stats = statsMap.get(code);
        // Format name: KONZUM -> Konzum
        const name = code.charAt(0).toUpperCase() + code.slice(1).toLowerCase();

        return {
          code: code,
          name: name,
          stores_count: stats?.store_count || 0,
          products_count: stats?.price_count || 0,
          last_updated: stats?.created_at || new Date().toISOString()
        };
      });

      return { chains };
    } catch (error) {
      throw this.handleServiceError(error, 'getChains', 'ChainService');
    }
  }

  /**
   * Get chain by code
   * Polyfilled by fetching all chains and finding the matching one
   */
  async getChainByCode(code: string, options?: ServiceMethodOptions): Promise<Chain> {
    RequestValidator.validateRequired(code, 'code');
    this.validateChainCode(code);

    try {
      // Since /v1/chains/{code} might not exist/be documented, we use the list+stats method
      const response = await this.getChains(options);
      const chain = response.chains.find(c => c.code.toLowerCase() === code.toLowerCase());

      if (!chain) {
        throw new Error(`Chain not found: ${code}`);
      }

      return chain;
    } catch (error) {
      throw this.handleServiceError(error, 'getChainByCode', 'ChainService');
    }
  }

  /**
   * Get chain statistics
   */
  async getChainStats(code: string, options?: ServiceMethodOptions): Promise<{
    stores_count: number;
    products_count: number;
    last_updated: string;
  }> {
    try {
      const chain = await this.getChainByCode(code, options);
      return {
        stores_count: chain.stores_count,
        products_count: chain.products_count,
        last_updated: chain.last_updated
      };
    } catch (error) {
      throw this.handleServiceError(error, 'getChainStats', 'ChainService');
    }
  }

  /**
   * Get all chain codes
   */
  async getChainCodes(options?: ServiceMethodOptions): Promise<string[]> {
    try {
      const response = await this.getChains(options);
      return response.chains.map(chain => chain.code);
    } catch (error) {
      throw this.handleServiceError(error, 'getChainCodes', 'ChainService');
    }
  }

  /**
   * Get chain names mapped to codes
   */
  async getChainMap(options?: ServiceMethodOptions): Promise<Record<string, string>> {
    try {
      const response = await this.getChains(options);
      return response.chains.reduce((map, chain) => {
        map[chain.code] = chain.name;
        return map;
      }, {} as Record<string, string>);
    } catch (error) {
      throw this.handleServiceError(error, 'getChainMap', 'ChainService');
    }
  }

  /**
   * Search chains by name
   */
  async searchChains(query: string, options?: ServiceMethodOptions): Promise<Chain[]> {
    RequestValidator.validateRequired(query, 'query');

    if (query.trim().length === 0) {
      throw new Error('Search query cannot be empty');
    }

    try {
      const response = await this.getChains(options);
      const searchTerm = query.toLowerCase().trim();
      return response.chains.filter(chain =>
        chain.name.toLowerCase().includes(searchTerm) ||
        chain.code.toLowerCase().includes(searchTerm)
      );
    } catch (error) {
      throw this.handleServiceError(error, 'searchChains', 'ChainService');
    }
  }

  /**
   * Get chains sorted by store count
   */
  async getChainsByStoreCount(descending: boolean = true, options?: ServiceMethodOptions): Promise<Chain[]> {
    try {
      const response = await this.getChains(options);
      return response.chains.sort((a, b) => {
        return descending ? b.stores_count - a.stores_count : a.stores_count - b.stores_count;
      });
    } catch (error) {
      throw this.handleServiceError(error, 'getChainsByStoreCount', 'ChainService');
    }
  }

  /**
   * Get chains sorted by product count
   */
  async getChainsByProductCount(descending: boolean = true, options?: ServiceMethodOptions): Promise<Chain[]> {
    try {
      const response = await this.getChains(options);
      return response.chains.sort((a, b) => {
        return descending ? b.products_count - a.products_count : a.products_count - b.products_count;
      });
    } catch (error) {
      throw this.handleServiceError(error, 'getChainsByProductCount', 'ChainService');
    }
  }

  /**
   * Get chains with recent updates
   */
  async getRecentlyUpdatedChains(daysBack: number = 7, options?: ServiceMethodOptions): Promise<Chain[]> {
    RequestValidator.validatePositiveNumber(daysBack, 'daysBack');

    try {
      const response = await this.getChains(options);
      const cutoffDate = new Date();
      cutoffDate.setDate(cutoffDate.getDate() - daysBack);

      return response.chains.filter(chain => {
        const lastUpdated = new Date(chain.last_updated);
        return lastUpdated >= cutoffDate;
      }).sort((a, b) => new Date(b.last_updated).getTime() - new Date(a.last_updated).getTime());
    } catch (error) {
      throw this.handleServiceError(error, 'getRecentlyUpdatedChains', 'ChainService');
    }
  }

  /**
   * Validate chain code format
   */
  private validateChainCode(code: string): void {
    // Chain codes are typically short strings (2-10 characters)
    if (code.length < 2 || code.length > 10) {
      throw new Error('Chain code must be between 2 and 10 characters');
    }

    // Allow alphanumeric characters, hyphens, and underscores
    const codeRegex = /^[A-Za-z0-9_-]+$/;
    if (!codeRegex.test(code)) {
      throw new Error('Chain code can only contain letters, numbers, hyphens, and underscores');
    }
  }
}

export const chainService = new ChainService();
