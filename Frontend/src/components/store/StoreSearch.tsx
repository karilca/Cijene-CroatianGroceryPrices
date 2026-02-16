// Store search component with location and text filters

import React, { useState, useCallback, useRef, useEffect } from 'react';
import { MapPin, Search, Crosshair, Filter, History } from 'lucide-react';
import { useStoreSuggestions, useChains } from '../../hooks/useApiQueries';
import { useGeolocation } from '../../hooks/useGeolocation';
import { useAppStore } from '../../stores/appStore';
import { useLanguage } from '../../contexts/LanguageContext';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';
import type { StoreSearchRequest, Store } from '../../types';

export interface StoreSearchProps {
  onSearch: (params: StoreSearchRequest) => void;
  className?: string;
}

export const StoreSearch: React.FC<StoreSearchProps> = ({ onSearch, className = '' }) => {
  const { t } = useLanguage();
  const [query, setQuery] = useState('');
  const [city, setCity] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);
  const [radius, setRadius] = useState(5000); // 5km default
  const [selectedChains, setSelectedChains] = useState<string[]>([]);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // Get search history and preferred chains from store
  const searchHistory = useAppStore((state) => state.searchHistory.stores);
  const addStoreSearch = useAppStore((state) => state.addStoreSearch);
  const preferredChains = useAppStore((state) => state.preferredChains);
  const defaultLocation = useAppStore((state) => state.defaultLocation);
  const searchRadius = useAppStore((state) => state.searchRadius);

  // Initialize radius from user preferences
  useEffect(() => {
    setRadius(searchRadius);
  }, [searchRadius]);

  // Initialize selected chains from user preferences
  useEffect(() => {
    setSelectedChains(preferredChains);
  }, [preferredChains]);

  // Geolocation hook
  const {
    position,
    loading: geoLoading,
    error: geoError,
    getCurrentPosition,
    clearError: clearGeoError
  } = useGeolocation();

  // Get chains for filter
  const { data: chainsResponse } = useChains();
  const chains = chainsResponse?.chains || [];

  // Get suggestions for current query
  const { data: suggestions = [], isLoading: suggestionsLoading } = useStoreSuggestions(
    query || '',
    8,
    { enabled: (query?.length ?? 0) >= 2 && showSuggestions }
  );

  // Handle search submission
  const handleSearch = useCallback((searchQuery?: string, searchCity?: string, forcePosition?: { latitude: number; longitude: number }) => {
    const finalQuery = searchQuery || query;
    const finalCity = searchCity || city;
    const finalPosition = forcePosition || position;

    if (!finalQuery.trim() && !finalCity.trim() && !finalPosition && !defaultLocation.latitude) return;

    const searchParams: StoreSearchRequest = {};

    if (finalQuery.trim()) {
      searchParams.query = finalQuery.trim();
      addStoreSearch(finalQuery.trim());
    }

    if (finalCity.trim()) {
      searchParams.city = finalCity.trim();
      addStoreSearch(finalCity.trim());
    }

    // Use current position or default location
    if (finalPosition) {
      searchParams.latitude = finalPosition.latitude;
      searchParams.longitude = finalPosition.longitude;
    } else if (defaultLocation.latitude && defaultLocation.longitude) {
      searchParams.latitude = defaultLocation.latitude;
      searchParams.longitude = defaultLocation.longitude;
    }

    if (searchParams.latitude && searchParams.longitude) {
      searchParams.radius = radius;
    }

    // Apply chain filters
    if (selectedChains.length > 0) {
      searchParams.chain_codes = selectedChains;
    }

    // Clear suggestions
    setShowSuggestions(false);

    onSearch(searchParams);
  }, [query, city, position, defaultLocation, radius, selectedChains, addStoreSearch, onSearch]);

  // Handle input changes
  const handleQueryChange = useCallback((value: string) => {
    setQuery(value);
    setShowSuggestions(true);
  }, []);

  const handleCityChange = useCallback((value: string) => {
    setCity(value);
  }, []);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((store: Store) => {
    const parts: string[] = [];

    if (store.name) {
      parts.push(store.name);
    } else if (store.chain) {
      parts.push(store.chain);
    }

    if (store.address) {
      parts.push(store.address);
    }

    const searchQuery = parts.join(', ');
    setQuery(searchQuery);
    setShowSuggestions(false);
    handleSearch(searchQuery);
  }, [handleSearch]);

  // Handle history selection
  const handleHistorySelect = useCallback((historyItem: string) => {
    if (historyItem.includes(',') || historyItem.toLowerCase().includes('city') || historyItem.toLowerCase().includes('grad')) {
      setCity(historyItem);
    } else {
      setQuery(historyItem);
    }
    setShowSuggestions(false);
    handleSearch(historyItem);
  }, [handleSearch]);

  // Get current location
  const handleGetLocation = useCallback(async () => {
    if (geoError) {
      clearGeoError();
    }
    try {
      const pos = await getCurrentPosition();
      if (pos) {
        handleSearch(undefined, undefined, pos);
      }
    } catch (error) {
      console.error('Failed to get location:', error);
    }
  }, [getCurrentPosition, geoError, clearGeoError, handleSearch]);

  // Handle key press
  const handleKeyPress = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      handleSearch();
    }
  }, [handleSearch]);

  // Handle chain filter toggle
  const handleChainToggle = useCallback((chainCode: string) => {
    setSelectedChains(prev =>
      prev.includes(chainCode)
        ? prev.filter(code => code !== chainCode)
        : [...prev, chainCode]
    );
  }, []);

  // Clear all filters
  const handleClearFilters = useCallback(() => {
    setSelectedChains([]);
  }, []);

  // Close suggestions when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        suggestionRef.current &&
        !suggestionRef.current.contains(event.target as Node) &&
        searchInputRef.current &&
        !searchInputRef.current.contains(event.target as Node)
      ) {
        setShowSuggestions(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
    };
  }, []);

  return (
    <div className={`space-y-4 ${className}`}>
      {/* Search Inputs */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {/* Text Search */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('storeSearch.searchStores')}
          </label>
          <div className="relative">
            <input
              ref={searchInputRef}
              type="text"
              value={query}
              onChange={(e) => handleQueryChange(e.target.value)}
              onKeyPress={handleKeyPress}
              onFocus={() => setShowSuggestions(true)}
              placeholder={t('storeSearch.placeholder')}
              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />

            {/* Suggestions Dropdown */}
            {showSuggestions && ((query?.length ?? 0) >= 2 || searchHistory.length > 0) && (
              <div
                ref={suggestionRef}
                className="absolute z-50 w-full mt-1 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-y-auto"
              >
                {/* Loading State */}
                {suggestionsLoading && (
                  <div className="px-3 py-2 text-center">
                    <LoadingSpinner size="sm" />
                  </div>
                )}

                {/* Suggestions */}
                {!suggestionsLoading && (query?.length ?? 0) >= 2 && suggestions.length > 0 && (
                  <>
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b flex items-center gap-1">
                      <MapPin className="w-3 h-3" />
                      {t('storeSearch.storeSuggestions')}
                    </div>
                    {suggestions.map((store, index) => (
                      <button
                        key={`suggestion-${index}`}
                        onClick={() => handleSuggestionSelect(store)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="font-medium text-sm">{store.name}</div>
                        <div className="text-xs text-gray-500">{store.address}, {store.city}</div>
                      </button>
                    ))}
                  </>
                )}

                {/* Search History */}
                {!suggestionsLoading && (query?.length ?? 0) < 2 && searchHistory.length > 0 && (
                  <>
                    <div className="px-3 py-2 text-xs font-medium text-gray-500 bg-gray-50 border-b flex items-center gap-1">
                      <History className="w-3 h-3" />
                      {t('storeSearch.recentSearches')}
                    </div>
                    {searchHistory.slice(0, 5).map((item, index) => (
                      <button
                        key={`history-${index}`}
                        onClick={() => handleHistorySelect(item)}
                        className="w-full px-3 py-2 text-left hover:bg-gray-50 border-b border-gray-100 last:border-b-0"
                      >
                        <div className="text-sm text-gray-700">{item}</div>
                      </button>
                    ))}
                  </>
                )}

                {/* No results */}
                {!suggestionsLoading && (query?.length ?? 0) >= 2 && suggestions.length === 0 && (
                  <div className="px-3 py-2 text-center text-gray-500 text-sm">
                    {t('storeSearch.noSuggestions')}
                  </div>
                )}
              </div>
            )}
          </div>
        </div>

        {/* City Search */}
        <div className="relative">
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('storeSearch.city')}
          </label>
          <div className="relative">
            <input
              type="text"
              value={city}
              onChange={(e) => handleCityChange(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder={t('storeSearch.cityPlaceholder')}
              className="w-full px-4 py-3 pl-10 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
            />
            <MapPin className="absolute left-3 top-1/2 transform -translate-y-1/2 h-5 w-5 text-gray-400" />
          </div>
        </div>
      </div>

      {/* Location and Filters Row */}
      <div className="flex flex-wrap gap-4 items-end">
        {/* Location Button */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('storeSearch.location')}
          </label>
          <button
            onClick={handleGetLocation}
            disabled={geoLoading}
            className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent disabled:opacity-50 disabled:cursor-not-allowed"
          >
            {geoLoading ? (
              <LoadingSpinner size="sm" />
            ) : (
              <Crosshair className="h-5 w-5" />
            )}
            {t('storeSearch.useMyLocation')}
          </button>
        </div>

        {/* Radius Selector */}
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-2">
            {t('storeSearch.searchRadius')}
          </label>
          <select
            value={radius}
            onChange={(e) => setRadius(Number(e.target.value))}
            className="px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <option value={1000}>1 km</option>
            <option value={2000}>2 km</option>
            <option value={5000}>5 km</option>
            <option value={10000}>10 km</option>
            <option value={25000}>25 km</option>
            <option value={50000}>50 km</option>
          </select>
        </div>

        {/* Filters Toggle */}
        <div>
          <button
            onClick={() => setShowFilters(!showFilters)}
            className="flex items-center gap-2 px-4 py-3 border border-gray-300 rounded-lg hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          >
            <Filter className="h-5 w-5" />
            {t('storeSearch.filters')}
            {selectedChains.length > 0 && (
              <span className="bg-primary-100 text-primary-800 text-xs font-medium px-2 py-1 rounded-full">
                {selectedChains.length}
              </span>
            )}
          </button>
        </div>

        {/* Search Button */}
        <button
          onClick={() => handleSearch()}
          className="px-6 py-3 bg-primary-600 text-white rounded-lg hover:bg-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500 focus:ring-offset-2"
        >
          {t('storeSearch.searchButton')}
        </button>
      </div>

      {/* Chain Filters */}
      {showFilters && (
        <div className="bg-gray-50 p-4 rounded-lg border">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-700">{t('storeSearch.filterByChain')}</h3>
            {selectedChains.length > 0 && (
              <button
                onClick={handleClearFilters}
                className="text-sm text-primary-600 hover:text-primary-700"
              >
                {t('storeSearch.clearAllFilters')}
              </button>
            )}
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {chains.map((chain) => (
              <label
                key={chain.code}
                className="flex items-center space-x-2 cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedChains.includes(chain.code)}
                  onChange={() => handleChainToggle(chain.code)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700">{chain.name}</span>
              </label>
            ))}
          </div>
        </div>
      )}

      {/* Location Status */}
      {position && (
        <div className="flex items-center gap-2 text-sm text-green-600">
          <MapPin className="h-4 w-4" />
          {t('storeSearch.locationDetected')}: {position.latitude.toFixed(6)}, {position.longitude.toFixed(6)}
        </div>
      )}

      {/* Geolocation Error */}
      {geoError && (
        <ErrorMessage
          message={geoError.message}
          onRetry={clearGeoError}
        />
      )}
    </div>
  );
};

export default StoreSearch;
