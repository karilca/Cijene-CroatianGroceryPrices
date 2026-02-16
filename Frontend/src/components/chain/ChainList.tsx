// Chain list component with grid/list view toggle

import React, { useState } from 'react';
import { ChainCard } from './ChainCard';
import { ChainSearch } from './ChainSearch';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Chain } from '../../types';

interface ChainListProps {
  chains: Chain[];
  isLoading?: boolean;
  error?: string | null;
  showSearch?: boolean;
  showViewToggle?: boolean;
}

type ViewMode = 'grid' | 'list';

export const ChainList: React.FC<ChainListProps> = ({
  chains,
  isLoading = false,
  error = null,
  showSearch = true,
  showViewToggle = true,
}) => {
  const { t } = useLanguage();
  const [filteredChains, setFilteredChains] = useState<Chain[]>(chains);
  const [viewMode, setViewMode] = useState<ViewMode>('grid');

  // Update filtered chains when chains prop changes
  React.useEffect(() => {
    setFilteredChains(chains);
  }, [chains]);

  if (isLoading) {
    return (
      <div className="flex justify-center py-8">
        <div className="text-center">
          <LoadingSpinner size="lg" />
          <p className="text-gray-600 mt-4">{t('chainList.loadingChains')}</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <ErrorMessage
        message={error}
        onRetry={() => window.location.reload()}
      />
    );
  }

  if (chains.length === 0) {
    return (
      <div className="bg-white p-8 rounded-lg shadow-md text-center">
        <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('chainList.noChains')}</h3>
        <p className="text-gray-600">
          {t('chainList.noChainsText')}
        </p>
      </div>
    );
  }

  return (
    <div>
      {/* Search Component */}
      {showSearch && (
        <ChainSearch
          chains={chains}
          onFilter={setFilteredChains}
        />
      )}

      {/* Header with View Toggle */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">{t('chainList.title')}</h2>
          <p className="text-gray-600 mt-1">
            {t('chainList.available').replace('{count}', filteredChains.length.toString())}
          </p>
        </div>

        {/* View Mode Toggle */}
        {showViewToggle && (
          <div className="flex items-center mt-4 sm:mt-0">
            <span className="text-sm text-gray-600 mr-3">{t('chainList.view')}</span>
            <div className="flex bg-gray-100 rounded-lg p-1">
              <button
                onClick={() => setViewMode('grid')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${viewMode === 'grid'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <svg className="h-4 w-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path d="M5 3a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2V5a2 2 0 00-2-2H5zM5 11a2 2 0 00-2 2v2a2 2 0 002 2h2a2 2 0 002-2v-2a2 2 0 00-2-2H5zM11 5a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2V5zM11 13a2 2 0 012-2h2a2 2 0 012 2v2a2 2 0 01-2 2h-2a2 2 0 01-2-2v-2z" />
                </svg>
                {t('chainList.grid')}
              </button>
              <button
                onClick={() => setViewMode('list')}
                className={`px-3 py-1 rounded-md text-sm font-medium transition-colors ${viewMode === 'list'
                    ? 'bg-white text-gray-900 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900'
                  }`}
              >
                <svg className="h-4 w-4 inline mr-1" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M3 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm0 4a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1z" clipRule="evenodd" />
                </svg>
                {t('chainList.list')}
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Chains Display */}
      {filteredChains.length === 0 ? (
        <div className="bg-white p-8 rounded-lg shadow-md text-center">
          <h3 className="text-lg font-semibold text-gray-900 mb-2">{t('chainList.noMatch')}</h3>
          <p className="text-gray-600">
            {t('chainList.noMatchText')}
          </p>
        </div>
      ) : (
        <div className={
          viewMode === 'grid'
            ? 'grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6'
            : 'space-y-4'
        }>
          {filteredChains.map((chain) => (
            <div key={chain.code} className={viewMode === 'list' ? 'max-w-none' : ''}>
              <ChainCard
                chain={chain}
                showStoreCount={true}
                showProductCount={true}
                showLastUpdated={true}
              />
            </div>
          ))}
        </div>
      )}

      {/* Statistics Summary */}
      {filteredChains.length > 0 && (
        <div className="mt-8 bg-gray-50 p-6 rounded-lg">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('chainList.summaryStats')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center">
              <p className="text-2xl font-bold text-primary-600">
                {filteredChains.reduce((sum, chain) => sum + chain.stores_count, 0).toLocaleString('hr-HR')}
              </p>
              <p className="text-sm text-gray-600">{t('chainList.totalStores')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-green-600">
                {filteredChains.reduce((sum, chain) => sum + chain.products_count, 0).toLocaleString('hr-HR')}
              </p>
              <p className="text-sm text-gray-600">{t('chainList.totalProducts')}</p>
            </div>
            <div className="text-center">
              <p className="text-2xl font-bold text-purple-600">
                {Math.round(filteredChains.reduce((sum, chain) => sum + chain.stores_count, 0) / filteredChains.length)}
              </p>
              <p className="text-sm text-gray-600">{t('chainList.avgStores')}</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
