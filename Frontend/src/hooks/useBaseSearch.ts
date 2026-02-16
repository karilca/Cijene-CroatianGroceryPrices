// Generic search hook for common search functionality

import { useState, useRef, useCallback, useEffect } from 'react';

export interface BaseSearchOptions<TParams, TItem> {
  suggestions?: TItem[];
  suggestionsLoading?: boolean;
  searchHistory: string[];
  addToHistory: (query: string) => void;
  onSearch: (params: TParams) => void;
  buildSearchParams: (query: string, additionalData?: any) => TParams;
  validateSearch?: (query: string, additionalData?: any) => boolean;
}

export function useBaseSearch<TParams, TItem>({
  suggestions = [],
  suggestionsLoading = false,
  searchHistory,
  addToHistory,
  onSearch,
  buildSearchParams,
  validateSearch
}: BaseSearchOptions<TParams, TItem>) {
  const [query, setQuery] = useState('');
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [showFilters, setShowFilters] = useState(false);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const suggestionRef = useRef<HTMLDivElement>(null);

  // Handle search submission
  const handleSearch = useCallback((searchQuery?: string, additionalData?: any) => {
    const finalQuery = searchQuery || query;

    // If validateSearch is provided, use it as the primary validation
    if (validateSearch) {
      if (!validateSearch(finalQuery, additionalData)) {
        return;
      }
    } else {
      // Fallback to checking if query is not empty
      if (!finalQuery.trim()) return;
    }

    const searchParams = buildSearchParams(finalQuery.trim(), additionalData);

    // Only add to history if there is a text query
    if (finalQuery.trim()) {
      addToHistory(finalQuery.trim());
    }

    onSearch(searchParams);
    setShowSuggestions(false);
  }, [query, buildSearchParams, addToHistory, onSearch, validateSearch]);

  // Handle input change
  const handleInputChange = useCallback((value: string) => {
    setQuery(value);
    setShowSuggestions(value.length >= 2);
  }, []);

  // Handle suggestion selection
  const handleSuggestionSelect = useCallback((suggestion: string) => {
    setQuery(suggestion);
    setShowSuggestions(false);
    searchInputRef.current?.focus();
    handleSearch(suggestion);
  }, [handleSearch]);

  // Handle history item selection
  const handleHistorySelect = useCallback((historyItem: string) => {
    setQuery(historyItem);
    setShowSuggestions(false);
    searchInputRef.current?.focus();
    handleSearch(historyItem);
  }, [handleSearch]);

  // Handle clicks outside to close suggestions
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
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const toggleFilters = useCallback(() => {
    setShowFilters(!showFilters);
  }, [showFilters]);

  const clearSearch = useCallback(() => {
    setQuery('');
    setShowSuggestions(false);
    searchInputRef.current?.focus();
  }, []);

  return {
    // State
    query,
    showSuggestions,
    showFilters,

    // Refs
    searchInputRef,
    suggestionRef,

    // Data
    suggestions,
    suggestionsLoading,
    searchHistory,

    // Actions
    handleSearch,
    handleInputChange,
    handleSuggestionSelect,
    handleHistorySelect,
    toggleFilters,
    clearSearch,
    setShowSuggestions,
    setShowFilters
  };
}