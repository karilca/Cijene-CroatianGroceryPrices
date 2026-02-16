// Chain search component with filtering capabilities

import React, { useState, useMemo } from 'react';
import type { Chain } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface ChainSearchProps {
  chains: Chain[];
  onFilter: (filteredChains: Chain[]) => void;
  placeholder?: string;
}

interface ChainFilters {
  query: string;
  sortBy: 'name' | 'stores_count' | 'products_count' | 'last_updated';
  sortOrder: 'asc' | 'desc';
  minStores: number;
  minProducts: number;
}

export const ChainSearch: React.FC<ChainSearchProps> = ({
  chains,
  onFilter,
  placeholder,
}) => {
  const { t } = useLanguage();
  const [filters, setFilters] = useState<ChainFilters>({
    query: '',
    sortBy: 'name',
    sortOrder: 'asc',
    minStores: 0,
    minProducts: 0,
  });

  const [showAdvancedFilters, setShowAdvancedFilters] = useState(false);

  const filteredAndSortedChains = useMemo(() => {
    let filtered = chains.filter(chain => {
      const queryMatch = !filters.query ||
        (chain.name && chain.name.toLowerCase().includes(filters.query.toLowerCase())) ||
        (chain.code && chain.code.toLowerCase().includes(filters.query.toLowerCase()));

      const storesCount = chain.stores_count || 0;
      const productsCount = chain.products_count || 0;

      const storesMatch = storesCount >= filters.minStores;
      const productsMatch = productsCount >= filters.minProducts;

      return queryMatch && storesMatch && productsMatch;
    });

    // Sort chains
    filtered.sort((a, b) => {
      let aValue, bValue;

      switch (filters.sortBy) {
        case 'name':
          aValue = (a.name || '').toLowerCase();
          bValue = (b.name || '').toLowerCase();
          break;
        case 'stores_count':
          aValue = a.stores_count || 0;
          bValue = b.stores_count || 0;
          break;
        case 'products_count':
          aValue = a.products_count || 0;
          bValue = b.products_count || 0;
          break;
        case 'last_updated':
          aValue = a.last_updated ? new Date(a.last_updated).getTime() : 0;
          bValue = b.last_updated ? new Date(b.last_updated).getTime() : 0;
          break;
        default:
          return 0;
      }

      if (aValue < bValue) return filters.sortOrder === 'asc' ? -1 : 1;
      if (aValue > bValue) return filters.sortOrder === 'asc' ? 1 : -1;
      return 0;
    });

    return filtered;
  }, [chains, filters]);

  // Update parent when filtered chains change
  React.useEffect(() => {
    onFilter(filteredAndSortedChains);
  }, [filteredAndSortedChains, onFilter]);

  const handleQueryChange = (query: string) => {
    setFilters(prev => ({ ...prev, query }));
  };

  const handleFilterChange = (
    key: keyof ChainFilters,
    value: string | number | ChainFilters['sortBy'] | ChainFilters['sortOrder']
  ) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const clearFilters = () => {
    setFilters({
      query: '',
      sortBy: 'name',
      sortOrder: 'asc',
      minStores: 0,
      minProducts: 0,
    });
  };

  const hasActiveFilters = filters.query || filters.minStores > 0 || filters.minProducts > 0 ||
    filters.sortBy !== 'name' || filters.sortOrder !== 'asc';

  return (
    <div className="bg-white p-6 rounded-lg shadow-md mb-6">
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between mb-4">
        <h2 className="text-xl font-semibold mb-4 lg:mb-0">{t('chainSearch.title')}</h2>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setShowAdvancedFilters(!showAdvancedFilters)}
            className="text-primary-600 hover:text-primary-700 text-sm font-medium"
          >
            {showAdvancedFilters ? t('chainSearch.hideAdvancedFilters') : t('chainSearch.showAdvancedFilters')}
          </button>
          {hasActiveFilters && (
            <button
              onClick={clearFilters}
              className="text-red-600 hover:text-red-700 text-sm font-medium"
            >
              {t('chainSearch.clearAll')}
            </button>
          )}
        </div>
      </div>

      {/* Search Input */}
      <div className="mb-4">
        <div className="relative">
          <input
            type="text"
            value={filters.query}
            onChange={(e) => handleQueryChange(e.target.value)}
            placeholder={placeholder || t('chainSearch.placeholder')}
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent"
          />
          <div className="absolute inset-y-0 right-0 flex items-center pr-3">
            <svg className="h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
            </svg>
          </div>
        </div>
      </div>

      {/* Quick Sort Options */}
      <div className="flex flex-wrap gap-2 mb-4">
        <select
          value={filters.sortBy}
          onChange={(e) => handleFilterChange('sortBy', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="name">{t('chainSearch.sortByName')}</option>
          <option value="stores_count">{t('chainSearch.sortByStoreCount')}</option>
          <option value="products_count">{t('chainSearch.sortByProductCount')}</option>
          <option value="last_updated">{t('chainSearch.sortByLastUpdated')}</option>
        </select>

        <select
          value={filters.sortOrder}
          onChange={(e) => handleFilterChange('sortOrder', e.target.value)}
          className="px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
        >
          <option value="asc">{t('chainSearch.ascending')}</option>
          <option value="desc">{t('chainSearch.descending')}</option>
        </select>
      </div>

      {/* Advanced Filters */}
      {showAdvancedFilters && (
        <div className="border-t pt-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('chainSearch.minStores')}
              </label>
              <input
                type="number"
                min="0"
                value={filters.minStores}
                onChange={(e) => handleFilterChange('minStores', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">
                {t('chainSearch.minProducts')}
              </label>
              <input
                type="number"
                min="0"
                value={filters.minProducts}
                onChange={(e) => handleFilterChange('minProducts', parseInt(e.target.value) || 0)}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-primary-500"
              />
            </div>
          </div>
        </div>
      )}

      {/* Results Summary */}
      <div className="flex items-center justify-between text-sm text-gray-600 mt-4 pt-4 border-t">
        <span>
          {t('chainSearch.showing').replace('{filtered}', filteredAndSortedChains.length.toString()).replace('{total}', chains.length.toString())}
        </span>
        {hasActiveFilters && (
          <span className="text-primary-600">
            {t('chainSearch.filtersActive')}
          </span>
        )}
      </div>
    </div>
  );
};
