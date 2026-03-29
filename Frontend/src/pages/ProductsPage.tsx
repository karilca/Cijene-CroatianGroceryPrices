// Products page component

import React, { useState } from 'react';
import { useSearchParams } from 'react-router-dom';
import { ProductSearch, ProductCard, ProductDetails } from '../components/product';
import { CompareBar } from '../components/product/CompareBar';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { resolveApiErrorMessage } from '../utils/apiErrors';

import { useProductSearch } from '../hooks/useApiQueries';
import type { ProductSearchRequest, Product } from '../types';
import { useLanguage } from '../contexts/LanguageContext';
import { PAGINATION } from '../constants';

export const ProductsPage: React.FC = () => {
  const [searchParams, setSearchParams] = useState<ProductSearchRequest>({});
  const [selectedProduct, setSelectedProduct] = useState<Product | null>(null);
  const [viewMode, setViewMode] = useState<'search' | 'details'>('search');
  const [urlSearchParams] = useSearchParams();

  // Initialize/update search params from URL
  React.useEffect(() => {
    const query = urlSearchParams.get('q');
    const ean = urlSearchParams.get('ean');
    const chainCode = urlSearchParams.get('chain_code');
    const city = urlSearchParams.get('city');

    if (query || ean || chainCode || city) {
      setSearchParams({
        query: query || undefined,
        ean: ean || undefined,
        chain_code: chainCode || undefined,
        city: city || undefined,
        page: PAGINATION.DEFAULT_PAGE,
        per_page: PAGINATION.DEFAULT_PRODUCTS_PER_PAGE,
      });
    }
  }, [urlSearchParams]);

  // Search results
  const {
    data: searchResults,
    isLoading: searchLoading,
    error: searchError
  } = useProductSearch(searchParams, {
    enabled: !!(searchParams.query || searchParams.ean || searchParams.chain_code)
  });

  const { t } = useLanguage();

  const handleSearch = (params: ProductSearchRequest) => {
    setSearchParams({
      ...params,
      page: PAGINATION.DEFAULT_PAGE,
      per_page: params.per_page || PAGINATION.DEFAULT_PRODUCTS_PER_PAGE,
    });
    setSelectedProduct(null);
    setViewMode('search');
  };

  const handlePageChange = (page: number) => {
    setSearchParams(prev => ({ ...prev, page }));
  };

  const handleProductSelect = (product: Product) => {
    setSelectedProduct(product);
    setViewMode('details');
  };

  const handleBackToSearch = () => {
    setSelectedProduct(null);
    setViewMode('search');
  };

  const selectedChains = searchParams.chains?.length
    ? searchParams.chains
    : searchParams.chain_code
      ? [searchParams.chain_code]
      : undefined;

  const hasSearched = !!(searchParams.query || searchParams.ean || searchParams.chain_code);
  const totalCount = searchResults?.total_count || 0;
  const currentPage = searchResults?.page || searchParams.page || PAGINATION.DEFAULT_PAGE;
  const perPage = searchResults?.per_page || searchParams.per_page || PAGINATION.DEFAULT_PRODUCTS_PER_PAGE;
  const totalPages = Math.ceil(totalCount / perPage);

  if (viewMode === 'details' && selectedProduct) {
    return (
      <div className="max-w-6xl mx-auto">
        <ProductDetails
          product={selectedProduct}
          onBack={handleBackToSearch}
          city={searchParams.city}
          chains={selectedChains}
        />
        <CompareBar />
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-8 pb-32">
      {/* Page Header */}
      <div className="text-center">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('products.title')}</h1>
        <p className="text-gray-600 text-lg max-w-2xl mx-auto">
          {t('products.subtitle')}
        </p>
      </div>

      {/* Search Component */}
      <ProductSearch
        onSearch={handleSearch}
        isLoading={searchLoading}
        className="max-w-4xl mx-auto"
      />

      {/* Search Results */}
      {hasSearched && (
        <div>
          <div className="flex items-center justify-between mb-6">
            <h2 className="text-xl font-semibold">
              {t('products.results')}
            </h2>
            {!searchLoading && searchResults && (
              <p className="text-sm text-gray-600">
                {totalCount > 0
                  ? `${totalCount} ${t('products.results').toLowerCase()}`
                  : t('products.noResults')}
              </p>
            )}
          </div>

          {searchLoading && (
            <div className="flex items-center justify-center py-12">
              <LoadingSpinner size="lg" />
              <span className="ml-3 text-gray-600">{t('products.searching')}</span>
            </div>
          )}

          {searchError && (
            <ErrorMessage
              title={t('products.error.title')}
              message={resolveApiErrorMessage(searchError, t, 'products.error.message')}
              onRetry={() => handleSearch(searchParams)}
            />
          )}

          {searchResults && !searchLoading && (
            <>
              {searchResults.products.length > 0 ? (
                <>
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                    {searchResults.products.map((product, index) => (
                      <ProductCard
                        key={product.ean || product.id || index}
                        product={product}
                        onViewDetails={handleProductSelect}
                        showPricing={true}
                      />
                    ))}
                  </div>

                  {totalPages > 1 && (
                    <div className="mt-6 pt-6 border-t border-gray-200">
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
              ) : (
                <div className="text-center py-12">
                  <p className="text-gray-600 text-lg mb-4">{t('products.noResults')}</p>
                  <p className="text-gray-500">{t('products.tryAdjusting')}</p>
                </div>
              )}
            </>
          )}
        </div>
      )}

      {/* Compare floating bar */}
      <CompareBar />
    </div>
  );
};
