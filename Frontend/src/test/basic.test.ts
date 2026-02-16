import { describe, it, expect, vi } from 'vitest'

// Simple unit tests for utility functions and basic functionality
describe('Basic Application Tests', () => {
  describe('Utility Functions', () => {
    it('should validate EAN codes', () => {
      const isValidEAN = (ean: string) => /^\d{8,14}$/.test(ean)
      
      expect(isValidEAN('3838921300008')).toBe(true)
      expect(isValidEAN('123')).toBe(false)
      expect(isValidEAN('abcd')).toBe(false)
      expect(isValidEAN('')).toBe(false)
    })

    it('should calculate distance between coordinates', () => {
      const calculateDistance = (lat1: number, lon1: number, lat2: number, lon2: number) => {
        const R = 6371 // Earth's radius in km
        const dLat = (lat2 - lat1) * Math.PI / 180
        const dLon = (lon2 - lon1) * Math.PI / 180
        const a = Math.sin(dLat/2) * Math.sin(dLat/2) +
                  Math.cos(lat1 * Math.PI / 180) * Math.cos(lat2 * Math.PI / 180) *
                  Math.sin(dLon/2) * Math.sin(dLon/2)
        const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
        return R * c
      }

      const distance = calculateDistance(45.8150, 15.9819, 45.8050, 15.9719)
      expect(distance).toBeGreaterThan(0)
      expect(distance).toBeLessThan(2) // Should be less than 2km
      
      // Same coordinates should return 0
      expect(calculateDistance(45.8150, 15.9819, 45.8150, 15.9819)).toBe(0)
    })

    it('should debounce function calls', async () => {
      const mockFn = vi.fn()
      
      const debounce = (func: Function, delay: number) => {
        let timeoutId: NodeJS.Timeout
        return (...args: any[]) => {
          clearTimeout(timeoutId)
          timeoutId = setTimeout(() => func.apply(null, args), delay)
        }
      }

      const debouncedFn = debounce(mockFn, 100)
      
      // Call multiple times quickly
      debouncedFn('test1')
      debouncedFn('test2')
      debouncedFn('test3')
      
      // Should not be called immediately
      expect(mockFn).not.toHaveBeenCalled()
      
      // Wait for debounce delay
      await new Promise(resolve => setTimeout(resolve, 150))
      
      // Should be called only once with the last argument
      expect(mockFn).toHaveBeenCalledTimes(1)
      expect(mockFn).toHaveBeenCalledWith('test3')
    })
  })

  describe('Data Validation', () => {
    it('should validate search parameters', () => {
      const validateSearchParams = (params: { query?: string, minLength?: number }) => {
        const minLength = params.minLength || 2
        if (!params.query || params.query.trim().length < minLength) {
          throw new Error(`Query must be at least ${minLength} characters`)
        }
        return true
      }

      expect(() => validateSearchParams({ query: 'ab' })).not.toThrow()
      expect(() => validateSearchParams({ query: 'a' })).toThrow()
      expect(() => validateSearchParams({ query: '' })).toThrow()
      expect(() => validateSearchParams({})).toThrow()
    })

    it('should validate coordinates', () => {
      const validateCoordinates = (lat: number, lon: number) => {
        if (lat < -90 || lat > 90) {
          throw new Error('Invalid latitude')
        }
        if (lon < -180 || lon > 180) {
          throw new Error('Invalid longitude')
        }
        return true
      }

      expect(() => validateCoordinates(45.8150, 15.9819)).not.toThrow()
      expect(() => validateCoordinates(91, 15.9819)).toThrow()
      expect(() => validateCoordinates(45.8150, 181)).toThrow()
      expect(() => validateCoordinates(-91, 15.9819)).toThrow()
    })
  })

  describe('Local Storage Utilities', () => {
    it('should handle local storage operations', () => {
      const mockStorage = {
        data: {} as Record<string, string>,
        getItem: vi.fn((key: string) => mockStorage.data[key] || null),
        setItem: vi.fn((key: string, value: string) => {
          mockStorage.data[key] = value
        }),
        removeItem: vi.fn((key: string) => {
          delete mockStorage.data[key]
        }),
        clear: vi.fn(() => {
          mockStorage.data = {}
        })
      }

      // Test setting and getting items
      mockStorage.setItem('test-key', 'test-value')
      expect(mockStorage.getItem('test-key')).toBe('test-value')
      
      // Test removing items
      mockStorage.removeItem('test-key')
      expect(mockStorage.getItem('test-key')).toBeNull()
      
      // Test clearing storage
      mockStorage.setItem('key1', 'value1')
      mockStorage.setItem('key2', 'value2')
      mockStorage.clear()
      expect(mockStorage.getItem('key1')).toBeNull()
      expect(mockStorage.getItem('key2')).toBeNull()
    })
  })

  describe('Error Handling', () => {
    it('should handle API errors gracefully', () => {
      const handleApiError = (error: any) => {
        if (error.response) {
          // Server responded with error status
          return {
            type: 'API_ERROR',
            status: error.response.status,
            message: error.response.data?.message || 'Server error'
          }
        } else if (error.request) {
          // Network error
          return {
            type: 'NETWORK_ERROR',
            message: 'Network error. Please check your connection.'
          }
        } else {
          // Other error
          return {
            type: 'UNKNOWN_ERROR',
            message: error.message || 'An unknown error occurred'
          }
        }
      }

      // Test different error types
      const apiError = { response: { status: 404, data: { message: 'Not found' } } }
      const networkError = { request: {} }
      const unknownError = { message: 'Something went wrong' }

      expect(handleApiError(apiError)).toEqual({
        type: 'API_ERROR',
        status: 404,
        message: 'Not found'
      })

      expect(handleApiError(networkError)).toEqual({
        type: 'NETWORK_ERROR',
        message: 'Network error. Please check your connection.'
      })

      expect(handleApiError(unknownError)).toEqual({
        type: 'UNKNOWN_ERROR',
        message: 'Something went wrong'
      })
    })
  })
})