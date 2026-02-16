// Stores page component

import React, { useState, useCallback } from 'react';
import { MapPin, Store as StoreIcon } from 'lucide-react';
import { useSearchParams } from 'react-router-dom';
import { StoreSearch } from '../components/store/StoreSearch';
import { StoreCard } from '../components/store/StoreCard';
import { StoreDetails } from '../components/store/StoreDetails';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { useStoreSearch } from '../hooks/useApiQueries';
import { useGeolocation } from '../hooks/useGeolocation';
import { useAppStore } from '../stores/appStore';
import type { StoreSearchRequest, Store } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { PAGINATION } from '../constants';

export const StoresPage: React.FC = () => {
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useState<StoreSearchRequest>({});
  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  // Get user location for distance calculations
  const { position } = useGeolocation();
  const [urlSearchParams, setUrlSearchParams] = useSearchParams();

  // Initialize from URL params
  React.useEffect(() => {
    const query = urlSearchParams.get('q');
    const cityParam = urlSearchParams.get('city');

    if (query || cityParam) {
      setSearchParams({
        query: query || undefined,
        city: cityParam || undefined
      });
    }
  }, [urlSearchParams]);

  // Get favorites to check if we can find the store locally
  const favoriteStores = useAppStore(state => state.favoriteStores);

  // Store search query
  const {
    data: searchResponse,
    isLoading: isSearchLoading,
    error: searchError,
    refetch
  } = useStoreSearch(searchParams, {
    enabled: !!(searchParams.query || searchParams.city || (searchParams.latitude && searchParams.longitude))
  });

  // Handle direct store navigation via URL ID
  const storeIdParam = urlSearchParams.get('id');

  // Consolidated effect to handle store selection from URL and state cleanup
  React.useEffect(() => {
    if (storeIdParam) {
      if (!selectedStore || (selectedStore.id || selectedStore.code || `${selectedStore.chain_code}-${selectedStore.address}`) !== storeIdParam) {
        // 1. Try to find in local favorites first
        const favorite = favoriteStores.find(s => (s.id || s.code || `${s.chain_code}-${s.address}`) === storeIdParam);
        if (favorite) {
          setSelectedStore(favorite);
          setShowDetails(true);
        } else if (searchResponse?.stores) {
          // 2. Try to find in search results
          const found = searchResponse.stores.find(s => (s.id || s.code || `${s.chain_code}-${s.address}`) === storeIdParam);
          if (found) {
            setSelectedStore(found);
            setShowDetails(true);
          } else if (!isSearchLoading && !searchParams.query) {
            // 3. Fallback: trigger search if not found and not loading
            setSearchParams(prev => ({ ...prev, query: storeIdParam }));
          }
        } else if (!isSearchLoading && !searchParams.query) {
          // Fallback: trigger search if no data and not loading
          setSearchParams(prev => ({ ...prev, query: storeIdParam }));
        }
      }
    } else if (showDetails) {
      // Cleanup state when ID is removed from URL (e.g., clicking Back)
      setShowDetails(false);
      setSelectedStore(null);
    }
  }, [storeIdParam, favoriteStores, searchResponse, isSearchLoading, searchParams.query, selectedStore, showDetails]);

  const isLoading = isSearchLoading;
  const error = searchError;

  const stores = searchResponse?.stores || [];
  const totalCount = searchResponse?.total_count || stores.length || 0;
  const currentPage = searchResponse?.page || 1;
  const perPage = searchResponse?.per_page || PAGINATION.DEFAULT_PER_PAGE;
  const totalPages = Math.ceil(totalCount / perPage);

  // Handle search
  const handleSearch = useCallback((params: StoreSearchRequest) => {
    setSearchParams(params);
    setShowDetails(false);
    setSelectedStore(null);
  }, []);

  // Handle store selection
  const handleStoreClick = useCallback((store: Store) => {
    setSelectedStore(store);
    setShowDetails(true);

    // Update URL with store ID for deep linking
    const storeId = store.id || store.code || `${store.chain_code}-${store.address}`;
    if (storeId) {
      setUrlSearchParams(prev => {
        prev.set('id', storeId);
        return prev;
      });
    }
  }, [setUrlSearchParams]);

  // Handle back from details
  const handleBackFromDetails = useCallback(() => {
    // Only update URL. The centralized useEffect will handle state cleanup.
    setUrlSearchParams(prev => {
      prev.delete('id');
      return prev;
    });
  }, [setUrlSearchParams]);

  // Handle pagination
  const handlePageChange = useCallback((page: number) => {
    setSearchParams(prev => ({ ...prev, page }));
  }, []);

  // Show store details if selected
  if (showDetails && selectedStore) {
    return (
      <div className="max-w-6xl mx-auto">
        <StoreDetails
          store={selectedStore}
          userLocation={position}
          onBack={handleBackFromDetails}
        />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-3 mb-4">
          <StoreIcon className="h-8 w-8 text-primary-600" />
          <h1 className="text-3xl font-bold text-gray-900">{t('stores.title')}</h1>
        </div>
        <p className="text-gray-600">
          {t('stores.subtitle')}
        </p>
      </div>

      {/* Search Interface */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-8">
        <StoreSearch onSearch={handleSearch} />
      </div>

      {/* Search Results */}
      {(searchParams.query || searchParams.city || (searchParams.latitude && searchParams.longitude)) && (
        <div className="bg-white rounded-lg shadow-md">
          {/* Results Header */}
          <div className="p-6 border-b border-gray-200">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-xl font-semibold text-gray-900">{t('stores.results.title')}</h2>
                {!isLoading && (
                  <p className="text-gray-600 mt-1">
                    {totalCount > 0 ? (
                      <>
                        {t('stores.results.found').replace('{count}', totalCount.toString())}
                        {searchParams.query && t('stores.results.forQuery').replace('{query}', searchParams.query)}
                        {searchParams.city && t('stores.results.inCity').replace('{city}', searchParams.city)}
                        {position && searchParams.latitude && t('stores.results.withinRadius').replace('{radius}', ((searchParams.radius || 5000) / 1000).toString())}
                      </>
                    ) : (
                      <>
                        {t('stores.results.none')}
                        {searchParams.query && t('stores.results.forQuery').replace('{query}', searchParams.query)}
                        {searchParams.city && t('stores.results.inCity').replace('{city}', searchParams.city)}
                      </>
                    )}
                  </p>
                )}
              </div>

              {/* Location indicator */}
              {position && searchParams.latitude && (
                <div className="flex items-center gap-2 text-sm text-green-600">
                  <MapPin className="h-4 w-4" />
                  {t('stores.usingLocation')}
                </div>
              )}
            </div>
          </div>

          {/* Loading State */}
          {isLoading && (
            <div className="p-12 text-center">
              <LoadingSpinner size="lg" />
              <p className="text-gray-600 mt-4">{t('stores.searching')}</p>
            </div>
          )}

          {/* Error State */}
          {error && (
            <div className="p-6">
              <ErrorMessage
                message={error instanceof Error ? error.message : t('stores.error')}
                onRetry={refetch}
              />
            </div>
          )}

          {/* Results */}
          {!isLoading && !error && stores.length > 0 && (
            <>
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {stores.map((store) => (
                    <StoreCard
                      key={`${store.chain_code}-${store.id || store.code || store.address}`}
                      store={store}
                      userLocation={position}
                      onClick={handleStoreClick}
                      className="h-full"
                    />
                  ))}
                </div>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div className="p-6 border-t border-gray-200">
                  <div className="flex items-center justify-between">
                    <div className="text-sm text-gray-600">
                      {t('common.page')} {currentPage} {t('common.of')} {totalPages}
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handlePageChange(currentPage - 1)}
                        disabled={currentPage === 1}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('common.previous')}
                      </button>
                      <button
                        onClick={() => handlePageChange(currentPage + 1)}
                        disabled={currentPage === totalPages}
                        className="px-4 py-2 border border-gray-300 rounded-lg hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {t('common.next')}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}

          {/* No Results */}
          {!isLoading && !error && stores.length === 0 && (searchParams.query || searchParams.city || searchParams.latitude) && (
            <div className="p-12 text-center">
              <StoreIcon className="h-12 w-12 text-gray-400 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">{t('stores.results.none')}</h3>
              <p className="text-gray-600 mb-4">
                {t('products.tryAdjusting')}
              </p>
              <button
                onClick={() => setSearchParams({})}
                className="px-4 py-2 bg-primary-600 text-white rounded-lg hover:bg-primary-700"
              >
                {t('stores.clearSearch')}
              </button>
            </div>
          )}
        </div>
      )}

      {/* Welcome State (No search performed) */}
      {!(searchParams.query || searchParams.city || searchParams.latitude) && (
        <div className="bg-white rounded-lg shadow-md p-12 text-center">
          <StoreIcon className="h-16 w-16 text-primary-600 mx-auto mb-6" />
          <h2 className="text-2xl font-semibold text-gray-900 mb-4">{t('stores.welcome.title')}</h2>
          <p className="text-gray-600 mb-8 max-w-2xl mx-auto">
            {t('stores.welcome.text')}
          </p>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-3xl mx-auto">
            <div className="p-4 border border-gray-200 rounded-lg">
              <MapPin className="h-8 w-8 text-primary-600 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900 mb-2">{t('stores.features.location.title')}</h3>
              <p className="text-sm text-gray-600">{t('stores.features.location.text')}</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <StoreIcon className="h-8 w-8 text-primary-600 mx-auto mb-3" />
              <h3 className="font-medium text-gray-900 mb-2">{t('stores.features.info.title')}</h3>
              <p className="text-sm text-gray-600">{t('stores.features.info.text')}</p>
            </div>
            <div className="p-4 border border-gray-200 rounded-lg">
              <div className="h-8 w-8 bg-primary-600 rounded-full mx-auto mb-3 flex items-center justify-center">
                <span className="text-white text-sm font-bold">★</span>
              </div>
              <h3 className="font-medium text-gray-900 mb-2">{t('stores.features.favorites.title')}</h3>
              <p className="text-sm text-gray-600">{t('stores.features.favorites.text')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
