// Archive service for ZIP file listings

import { apiClient, RequestValidator } from './api-client';
import { BaseService } from './base.service';
import { ENDPOINTS } from '../constants';
import type { ArchiveListResponse, ServiceMethodOptions } from '../types';

export class ArchiveService extends BaseService {
  /**
   * Get list of available ZIP archives
   */
  async getArchives(options?: ServiceMethodOptions): Promise<ArchiveListResponse> {
    try {
      const config = this.buildRequestConfig(options);
      return await apiClient.get<ArchiveListResponse>(ENDPOINTS.ARCHIVES, config);
    } catch (error) {
      throw this.handleServiceError(error, 'getArchives', 'ArchiveService');
    }
  }

  /**
   * Get archive by date
   */
  async getArchiveByDate(date: string, options?: ServiceMethodOptions): Promise<string> {
    RequestValidator.validateRequired(date, 'date');
    this.validateDateFormat(date);
    
    try {
      const config = options?.timeout ? { timeout: options.timeout } : undefined;
      return await apiClient.get<string>(`${ENDPOINTS.ARCHIVES}/${encodeURIComponent(date)}`, config);
    } catch (error) {
      throw this.handleServiceError(error, 'getArchiveByDate', 'ArchiveService');
    }
  }

  /**
   * Download archive file
   */
  async downloadArchive(date: string, options?: ServiceMethodOptions): Promise<Blob> {
    RequestValidator.validateRequired(date, 'date');
    this.validateDateFormat(date);
    
    try {
      const config = {
        responseType: 'blob' as const,
        timeout: options?.timeout || 30000, // Longer timeout for downloads
      };
      return await apiClient.get<Blob>(`/v0/archive/${encodeURIComponent(date)}.zip`, config);
    } catch (error) {
      throw this.handleServiceError(error, 'downloadArchive', 'ArchiveService');
    }
  }

  /**
   * Get archive metadata by date
   */
  async getArchiveMetadata(date: string, options?: ServiceMethodOptions): Promise<{
    date: string;
    size: number;
    url: string;
    updated: string;
  }> {
    try {
      const archives = await this.getArchives(options);
      const archive = archives.archives.find(a => a.date === date);
      
      if (!archive) {
        throw new Error(`Archive for date ${date} not found`);
      }
      
      return archive;
    } catch (error) {
      throw this.handleServiceError(error, 'getArchiveMetadata', 'ArchiveService');
    }
  }

  /**
   * Get available archive dates
   */
  async getAvailableDates(options?: ServiceMethodOptions): Promise<string[]> {
    try {
      const archives = await this.getArchives(options);
      return archives.archives.map(archive => archive.date).sort();
    } catch (error) {
      throw this.handleServiceError(error, 'getAvailableDates', 'ArchiveService');
    }
  }

  /**
   * Get latest archive
   */
  async getLatestArchive(options?: ServiceMethodOptions): Promise<{
    date: string;
    size: number;
    url: string;
    updated: string;
  }> {
    try {
      const archives = await this.getArchives(options);
      
      if (archives.archives.length === 0) {
        throw new Error('No archives available');
      }
      
      // Sort by date descending and return the latest
      const sortedArchives = archives.archives.sort((a, b) => 
        new Date(b.date).getTime() - new Date(a.date).getTime()
      );
      
      return sortedArchives[0];
    } catch (error) {
      throw this.handleServiceError(error, 'getLatestArchive', 'ArchiveService');
    }
  }

}

export const archiveService = new ArchiveService();
