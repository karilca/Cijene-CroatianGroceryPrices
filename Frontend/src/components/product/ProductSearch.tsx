import React, { useState, useCallback } from 'react';
import { Barcode, Camera } from 'lucide-react';
import { BaseSearchComponent } from '../common/BaseSearchComponent';
import { useBaseSearch } from '../../hooks/useBaseSearch';
import { useProductSuggestions, useChains } from '../../hooks/useApiQueries';
import { useAppStore } from '../../stores/appStore';
import { useLanguage } from '../../contexts/LanguageContext';
import { BarcodeScanner } from '../common/BarcodeScanner';
import type { ProductSearchRequest } from '../../types';

interface ProductSearchProps {
  onSearch: (params: ProductSearchRequest) => void;
  isLoading?: boolean;
  className?: string;
}

interface SearchFilters {
  chains: string[];
  priceRange: {
    min: number | null;
    max: number | null;
  };
  city: string;
}

export const ProductSearch: React.FC<ProductSearchProps> = ({
  onSearch,
  isLoading = false,
  className = ''
}) => {
  const { t } = useLanguage();
  const [ean, setEan] = useState('');
  const [showScanner, setShowScanner] = useState(false);
  const [filters, setFilters] = useState<SearchFilters>({
    chains: [],
    priceRange: { min: null, max: null },
    city: ''
  });

  // Get search history and preferred chains from store
  const searchHistory = useAppStore((state) => state.searchHistory.products);
  const addProductSearch = useAppStore((state) => state.addProductSearch);
  const preferredChains = useAppStore((state) => state.preferredChains);

  // Fetch available chains
  const { data: chainsData, isLoading: chainsLoading } = useChains();

  // Normalize chains data to handle both string[] (API docs) and Chain[] (Mock data)
  const availableChains = React.useMemo(() => {
    if (!chainsData?.chains) return [];
    return (chainsData.chains as Array<string | { code: string; name: string }>).map((c) => {
      if (typeof c === 'string') {
        return { code: c, name: c.charAt(0).toUpperCase() + c.slice(1).toLowerCase() };
      }
      return { code: c.code, name: c.name };
    });
  }, [chainsData]);

  // Handle scanned code
  const handleScan = useCallback((code: string) => {
    setEan(code);
    setShowScanner(false);
  }, []);

  // Base search functionality
  const {
    query,
    showSuggestions,
    showFilters,
    searchInputRef,
    suggestionRef,
    handleInputChange,
    handleSuggestionSelect,
    handleHistorySelect,
    clearSearch,
    toggleFilters,
    setShowSuggestions,
    handleSearch
  } = useBaseSearch<ProductSearchRequest, string>({
    suggestions: [],
    suggestionsLoading: false,
    searchHistory,
    addToHistory: addProductSearch,
    onSearch,
    buildSearchParams: useCallback((queryText: string) => {
      const searchParams: ProductSearchRequest = {};

      if (queryText.trim()) {
        searchParams.query = queryText.trim();
      }

      if (ean.trim()) {
        searchParams.ean = ean.trim();
      }

      // Apply filters
      if (filters.chains.length > 0) {
        searchParams.chains = filters.chains;
      } else if (preferredChains.length > 0) {
        searchParams.chains = preferredChains;
      }

      if (filters.city.trim()) {
        searchParams.city = filters.city.trim();
      }

      return searchParams;
    }, [ean, filters, preferredChains]),
    validateSearch: useCallback((queryText: string) => {
      return !!(queryText.trim() || ean.trim());
    }, [ean])
  });

  // Get suggestions for current query
  const { data: suggestions, isLoading: suggestionsLoading } = useProductSuggestions(
    query || '',
    8,
    { enabled: (query?.length ?? 0) >= 2 && showSuggestions }
  );

  // Handle EAN input change
  const handleEanChange = useCallback((value: string) => {
    setEan(value);
  }, []);

  // Handle chain toggle
  const handleChainToggle = useCallback((chain: string) => {
    setFilters(prev => {
      const currentChains = prev.chains;
      const newChains = currentChains.includes(chain)
        ? currentChains.filter(c => c !== chain)
        : [...currentChains, chain];
      return { ...prev, chains: newChains };
    });
  }, []);

  // Validate EAN format
  const isValidEan = useCallback((code: string) => {
    return /^\d{8,14}$/.test(code);
  }, []);

  // Clear all filters
  const clearFilters = useCallback(() => {
    setFilters({
      chains: [],
      priceRange: { min: null, max: null },
      city: ''
    });
  }, []);

  // EAN input component
  const eanInput = (
    <div className="flex-1">
      <div className="relative group">
        <Barcode className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
        <input
          type="text"
          value={ean}
          onChange={(e) => handleEanChange(e.target.value)}
          placeholder={t('productSearch.eanPlaceholder')}
          className={`w-full pl-10 pr-12 py-3 border rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent ${ean && !isValidEan(ean) ? 'border-red-300' : 'border-gray-300'
            }`}
        />

        {/* Scanner Button */}
        <button
          onClick={() => setShowScanner(true)}
          className="absolute right-2 top-1/2 transform -translate-y-1/2 p-1.5 text-gray-500 hover:text-primary-600 hover:bg-gray-100 rounded-md transition-colors"
          title="Scan Barcode"
          type="button"
        >
          <Camera className="h-5 w-5" />
        </button>
      </div>
      {ean && !isValidEan(ean) && (
        <p className="text-sm text-red-600 mt-1">{t('productSearch.eanError')}</p>
      )}

      {/* Scanner Overlay */}
      {showScanner && (
        <BarcodeScanner
          onScan={handleScan}
          onClose={() => setShowScanner(false)}
        />
      )}
    </div>
  );

  // Filter content for the base component
  const filtersContent = (
    <div className="space-y-4">
      {/* Chain selection */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('productSearch.retailChains')}
        </label>
        {chainsLoading ? (
          <div className="text-sm text-gray-500 animate-pulse">{t('productSearch.loadingChains')}</div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
            {availableChains.map((chain) => (
              <label key={chain.code} className="flex items-center space-x-2 cursor-pointer p-1 rounded hover:bg-gray-50">
                <input
                  type="checkbox"
                  checked={filters.chains.includes(chain.code)}
                  onChange={() => handleChainToggle(chain.code)}
                  className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
                />
                <span className="text-sm text-gray-700 capitalize">{chain.name}</span>
              </label>
            ))}
          </div>
        )}
        {preferredChains.length > 0 && filters.chains.length === 0 && (
          <p className="text-xs text-gray-500 mt-2">
            {t('productSearch.usingPreferred').replace('{chains}', preferredChains.join(', '))}
          </p>
        )}
      </div>

      {/* City Filter */}
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          {t('productSearch.city')}
        </label>
        <input
          type="text"
          value={filters.city}
          onChange={(e) => setFilters(prev => ({ ...prev, city: e.target.value }))}
          placeholder={t('productSearch.cityPlaceholder')}
          className="w-full px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500"
        />
      </div>



      {/* Clear filters button */}
      <button
        onClick={clearFilters}
        className="text-sm text-primary-600 hover:text-primary-800"
      >
        {t('productSearch.clearFilters')}
      </button>
    </div>
  );

  return (
    <BaseSearchComponent
      query={query}
      showSuggestions={showSuggestions}
      showFilters={showFilters}
      suggestions={suggestions?.map(p => p.name) || []}
      suggestionsLoading={suggestionsLoading}
      searchHistory={searchHistory}
      searchInputRef={searchInputRef}
      suggestionRef={suggestionRef}
      placeholder={t('productSearch.placeholder')}
      className={className}
      isLoading={isLoading}

      onInputChange={handleInputChange}
      onSearch={() => {
        handleSearch();
        // Reset EAN after search to allow new searches
        setEan('');
      }}
      onSuggestionSelect={handleSuggestionSelect}
      onHistorySelect={handleHistorySelect}
      onClearSearch={clearSearch}
      onToggleFilters={toggleFilters}
      onFocusSearch={() => setShowSuggestions(true)}

      additionalInputs={eanInput}
      filtersContent={filtersContent}
    />
  );
};