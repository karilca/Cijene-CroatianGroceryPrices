// Chain details component with store listings

import React, { useState, useCallback, useMemo, useEffect } from 'react';
import { Link, useParams, useSearchParams } from 'react-router-dom';
import { useChain, useStoresByChain } from '../../hooks/useApiQueries';
import { StoreCard } from '../store/StoreCard';
import { StoreDetails } from '../store/StoreDetails';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';
import { Button } from '../ui/Button';
import { Breadcrumb } from '../ui/Breadcrumb';
import { useLanguage } from '../../contexts/LanguageContext';
import { useGeolocation } from '../../hooks/useGeolocation';
import type { Store } from '../../types';

interface ChainDetailsProps {
  chainCode?: string;
}

export const ChainDetails: React.FC<ChainDetailsProps> = ({ chainCode: propChainCode }) => {
  const { chainCode: paramChainCode } = useParams<{ chainCode: string }>();
  const chainCode = propChainCode || paramChainCode;
  const { t } = useLanguage();
  const [searchParams, setSearchParams] = useSearchParams();
  const { position } = useGeolocation();

  const [selectedStore, setSelectedStore] = useState<Store | null>(null);
  const [showDetails, setShowDetails] = useState(false);

  const [storeFilters, setStoreFilters] = useState({
    city: '',
    store_type: '',
    sortBy: 'city' as 'city' | 'address' | 'store_type',
  });

  const {
    data: chain,
    isLoading: isChainLoading,
    error: chainError,
  } = useChain(chainCode || '', { enabled: !!chainCode });

  const {
    data: stores,
    isLoading: isStoresLoading,
    error: storesError,
  } = useStoresByChain(chainCode || '', { enabled: !!chainCode });

  // Handle store selection from URL param
  useEffect(() => {
    const storeId = searchParams.get('id');
    if (storeId) {
      if (stores && !selectedStore) {
        const found = stores.find(s => (s.id || s.code || `${s.chain_code}-${s.address}`) === storeId);
        if (found) {
          setSelectedStore(found);
          setShowDetails(true);
        }
      }
    } else if (showDetails) {
      setShowDetails(false);
      setSelectedStore(null);
    }
  }, [searchParams, stores, selectedStore, showDetails]);

  // Filter and sort stores
  const filteredStores = useMemo(() => {
    if (!stores) return [];

    const filtered = stores.filter((store: Store) => {
      const cityMatch = !storeFilters.city ||
        (store.city && store.city.toLowerCase().includes(storeFilters.city.toLowerCase()));
      const typeMatch = !storeFilters.store_type || store.store_type === storeFilters.store_type;
      return cityMatch && typeMatch;
    });

    // Sort stores
    filtered.sort((a: Store, b: Store) => {
      let aValue = '', bValue = '';

      switch (storeFilters.sortBy) {
        case 'city':
          aValue = a.city || '';
          bValue = b.city || '';
          break;
        case 'address':
          aValue = a.address || '';
          bValue = b.address || '';
          break;
        case 'store_type':
          aValue = a.store_type || '';
          bValue = b.store_type || '';
          break;
      }

      return aValue.localeCompare(bValue);
    });

    return filtered;
  }, [stores, storeFilters]);

  // Get unique cities and types for filters
  const uniqueCities = useMemo(() => {
    if (!stores) return [];
    return [...new Set(stores.filter((s: Store) => s.city).map((s: Store) => s.city!))].sort();
  }, [stores]);

  const uniqueTypes = useMemo(() => {
    if (!stores) return [];
    return [...new Set(stores.filter((s: Store) => s.store_type).map((s: Store) => s.store_type!))].sort();
  }, [stores]);

  // Handle store click
  const handleStoreClick = useCallback((store: Store) => {
    setSelectedStore(store);
    setShowDetails(true);

    // Update URL with store ID for deep linking
    const storeId = store.id || store.code || `${store.chain_code}-${store.address}`;
    if (storeId) {
      setSearchParams(prev => {
        prev.set('id', storeId);
        return prev;
      });
    }
  }, [setSearchParams]);

  // Handle back from details
  const handleBackFromDetails = useCallback(() => {
    // Remove store ID from URL
    setSearchParams(prev => {
      prev.delete('id');
      return prev;
    });
  }, [setSearchParams]);

  if (!chainCode) {
    return (
      <ErrorMessage message="Chain code is required" />
    );
  }

  if (isChainLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">{t('chainDetails.loading')}</p>
        </div>
      </div>
    );
  }

  if (chainError || !chain) {
    return (
      <ErrorMessage
        message={chainError?.message || t('chainDetails.failedToLoadChain')}
        onRetry={() => window.location.reload()}
      />
    );
  }

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('hr-HR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
    });
  };

  const breadcrumbItems = [
    { label: t('nav.home'), path: '/' },
    { label: t('nav.chains'), path: '/chains' },
    { label: chain.name, path: `/chains/${chain.code}` },
  ];

  if (showDetails && selectedStore) {
    return (
      <div className="max-w-7xl mx-auto">
        <Breadcrumb items={breadcrumbItems} className="mb-6" />
        <StoreDetails
          store={selectedStore}
          userLocation={position}
          onBack={handleBackFromDetails}
        />
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {/* Breadcrumb */}
      <Breadcrumb items={breadcrumbItems} className="mb-6" />

      {/* Chain Header */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <div className="flex flex-col">
          <div className="mb-4">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">{chain.name}</h1>
            <p className="text-lg text-gray-600">
              Chain Code: <span className="font-mono font-semibold">{chain.code.toUpperCase()}</span>
            </p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mb-6">
            <div className="bg-primary-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-primary-600">
                {chain.stores_count.toLocaleString('hr-HR')}
              </p>
              <p className="text-sm text-primary-700">{t('chainDetails.stores')}</p>
            </div>

            <div className="bg-green-50 p-4 rounded-lg text-center">
              <p className="text-2xl font-bold text-green-600">
                {chain.products_count.toLocaleString('hr-HR')}
              </p>
              <p className="text-sm text-green-700">{t('chainDetails.products')}</p>
            </div>

            <div className="bg-purple-50 p-4 rounded-lg text-center">
              <p className="text-sm font-semibold text-purple-600">{t('chainDetails.lastUpdated')}</p>
              <p className="text-xs text-purple-700">
                {formatLastUpdated(chain.last_updated)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <Link to="/stores">
              <Button variant="primary">
                {t('chainDetails.searchStores')}
              </Button>
            </Link>
            <Link to="/products">
              <Button variant="outline">
                {t('chainDetails.browseProducts')}
              </Button>
            </Link>
          </div>
        </div>
      </div>

      {/* Store Filters */}
      <div className="bg-white p-6 rounded-lg shadow-md mb-6">
        <h2 className="text-xl font-semibold mb-4">{t('chainDetails.filterStores')}</h2>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('chainDetails.city')}
            </label>
            <select
              value={storeFilters.city}
              onChange={(e) => setStoreFilters(prev => ({ ...prev, city: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">{t('chainDetails.allCities')}</option>
              {uniqueCities.map((city: string) => (
                <option key={city} value={city}>{city}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('chainDetails.storeType')}
            </label>
            <select
              value={storeFilters.store_type}
              onChange={(e) => setStoreFilters(prev => ({ ...prev, store_type: e.target.value }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="">{t('chainDetails.allTypes')}</option>
              {uniqueTypes.map((type: string) => (
                <option key={type} value={type}>{type}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              {t('chainDetails.sortBy')}
            </label>
            <select
              value={storeFilters.sortBy}
              onChange={(e) => setStoreFilters(prev => ({
                ...prev,
                sortBy: e.target.value as 'city' | 'address' | 'store_type'
              }))}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
            >
              <option value="city">{t('chainDetails.city')}</option>
              <option value="address">{t('chainDetails.address')}</option>
              <option value="type">{t('chainDetails.type')}</option>
            </select>
          </div>
        </div>

        <div className="flex items-center justify-between text-sm text-gray-600 mt-4">
          <span>
            {t('chainDetails.showing').replace('{count}', String(filteredStores.length)).replace('{total}', String(stores?.length || 0))}
          </span>
          {(storeFilters.city || storeFilters.store_type) && (
            <button
              onClick={() => setStoreFilters({ city: '', store_type: '', sortBy: 'city' })}
              className="text-primary-600 hover:text-primary-700 font-medium"
            >
              {t('chainDetails.clearFilters')}
            </button>
          )}
        </div>
      </div>

      {/* Stores List */}
      <div>
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-900">{t('chainDetails.storeLocations')}</h2>
        </div>

        {isStoresLoading ? (
          <div className="flex justify-center py-8">
            <div className="text-center">
              <LoadingSpinner size="lg" />
              <p className="text-gray-600 mt-4">{t('chainDetails.loadingStores')}</p>
            </div>
          </div>
        ) : storesError ? (
          <ErrorMessage
            message={storesError.message || t('chainDetails.failedToLoadStores')}
            onRetry={() => window.location.reload()}
          />
        ) : filteredStores.length === 0 ? (
          <div className="bg-white p-8 rounded-lg shadow-md text-center">
            <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('chainDetails.noStoresFound')}</h3>
            <p className="text-gray-600">
              {!stores || stores.length === 0
                ? t('chainDetails.noStoresAvailable').replace('{chain}', chain.name)
                : t('chainDetails.noStoresMatch')
              }
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {filteredStores.map((store: Store) => (
              <StoreCard
                key={`${store.chain_code}-${store.id || store.code || store.address}`}
                store={store}
                userLocation={position}
                onClick={handleStoreClick}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
