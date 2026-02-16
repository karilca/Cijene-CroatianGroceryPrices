// Base search component with common UI structure

import React from 'react';
import { Search, Filter, X, History } from 'lucide-react';
import { Button } from '../ui/Button';
import { Card } from '../ui/Card';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { useLanguage } from '../../contexts/LanguageContext';

export interface BaseSearchProps {
  query: string;
  showSuggestions: boolean;
  showFilters: boolean;
  suggestions: string[];
  suggestionsLoading: boolean;
  searchHistory: string[];
  searchInputRef: React.RefObject<HTMLInputElement | null>;
  suggestionRef: React.RefObject<HTMLDivElement | null>;
  placeholder?: string;
  className?: string;
  isLoading?: boolean;

  // Event handlers
  onInputChange: (value: string) => void;
  onSearch: (query?: string) => void;
  onSuggestionSelect: (suggestion: string) => void;
  onHistorySelect: (historyItem: string) => void;
  onClearSearch: () => void;
  onToggleFilters: () => void;
  onFocusSearch: () => void;

  // Custom content
  additionalInputs?: React.ReactNode;
  filtersContent?: React.ReactNode;
  searchActions?: React.ReactNode;
}

export const BaseSearchComponent: React.FC<BaseSearchProps> = ({
  query,
  showSuggestions,
  showFilters,
  suggestions,
  suggestionsLoading,
  searchHistory,
  searchInputRef,
  suggestionRef,
  placeholder = "Search...",
  className = '',
  isLoading = false,

  onInputChange,
  onSearch,
  onSuggestionSelect,
  onHistorySelect,
  onClearSearch,
  onToggleFilters,
  onFocusSearch,

  additionalInputs,
  filtersContent,
  searchActions
}) => {
  const { t } = useLanguage();
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      onSearch();
    }
    if (e.key === 'Escape') {
      onClearSearch();
    }
  };

  return (
    <div className={`relative ${className}`}>
      <Card className="p-6">
        {/* Main search input */}
        <div className="flex gap-4 mb-4">
          <div className="flex-1 relative">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-5 w-5" />
              <input
                ref={searchInputRef}
                type="text"
                value={query}
                onChange={(e) => onInputChange(e.target.value)}
                onKeyDown={handleKeyDown}
                onFocus={onFocusSearch}
                placeholder={placeholder}
                className="w-full pl-10 pr-10 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary-500 focus:border-transparent"
              />
              {query && (
                <button
                  onClick={onClearSearch}
                  className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
                >
                  <X className="h-5 w-5" />
                </button>
              )}
            </div>

            {/* Suggestions dropdown */}
            {showSuggestions && ((query?.length ?? 0) >= 2 || searchHistory.length > 0) && (
              <div
                ref={suggestionRef}
                className="absolute top-full left-0 right-0 bg-white border border-gray-200 rounded-lg shadow-lg z-50 mt-1 max-h-80 overflow-y-auto"
              >
                {/* Current suggestions */}
                {(query?.length ?? 0) >= 2 && (
                  <>
                    {suggestionsLoading && (
                      <div className="p-4 text-center">
                        <LoadingSpinner size="sm" />
                      </div>
                    )}

                    {!suggestionsLoading && suggestions.length > 0 && (
                      <div className="p-2">
                        <div className="text-xs font-medium text-gray-500 px-2 py-1 uppercase tracking-wide">
                          {t('search.suggestions')}
                        </div>
                        {suggestions.slice(0, 8).map((suggestion, index) => (
                          <button
                            key={index}
                            onClick={() => onSuggestionSelect(suggestion)}
                            className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                          >
                            <Search className="inline h-4 w-4 mr-2 text-gray-400" />
                            {suggestion}
                          </button>
                        ))}
                      </div>
                    )}
                  </>
                )}

                {/* Search history */}
                {searchHistory.length > 0 && (query?.length ?? 0) < 2 && (
                  <div className="p-2 border-t border-gray-100">
                    <div className="text-xs font-medium text-gray-500 px-2 py-1 uppercase tracking-wide">
                      {t('search.recentSearches')}
                    </div>
                    {searchHistory.slice(0, 5).map((item, index) => (
                      <button
                        key={index}
                        onClick={() => onHistorySelect(item)}
                        className="w-full text-left px-3 py-2 hover:bg-gray-100 rounded text-sm"
                      >
                        <History className="inline h-4 w-4 mr-2 text-gray-400" />
                        {item}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
          </div>

          {/* Additional inputs (e.g., EAN for products, city for stores) */}
          {additionalInputs}
        </div>

        {/* Search actions */}
        <div className="flex flex-wrap gap-2 justify-between items-center">
          <div className="flex gap-2">
            <Button
              onClick={() => onSearch()}
              disabled={isLoading}
              className="bg-primary-600 hover:bg-primary-700 text-white"
            >
              {isLoading ? <LoadingSpinner size="sm" /> : <Search className="h-4 w-4 mr-2" />}
              {t('search.button')}
            </Button>

            {searchActions}
          </div>

          <Button
            variant="outline"
            onClick={onToggleFilters}
            className={showFilters ? 'bg-primary-50 text-primary-700' : ''}
          >
            <Filter className="h-4 w-4 mr-2" />
            {t('search.filters')}
          </Button>
        </div>

        {/* Filters section */}
        {showFilters && filtersContent && (
          <div className="mt-4 pt-4 border-t border-gray-200">
            {filtersContent}
          </div>
        )}
      </Card>
    </div>
  );
};