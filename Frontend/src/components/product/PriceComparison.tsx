import React, { useState } from 'react';
import { TrendingDown, TrendingUp, Star, MapPin, Calendar, Filter, ArrowUpDown } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';
import type { PriceComparison as PriceComparisonType, Price } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface PriceComparisonProps {
  priceComparison: PriceComparisonType | undefined;
  isLoading?: boolean;
  error?: Error | null;
  onDateChange?: (date: string) => void;
  selectedDate?: string;
  className?: string;
}

type SortOption = 'price-asc' | 'price-desc' | 'chain' | 'date';

export const PriceComparison: React.FC<PriceComparisonProps> = ({
  priceComparison,
  isLoading = false,
  error = null,
  onDateChange,
  selectedDate = '',
  className = ''
}) => {
  const { t } = useLanguage();
  const [sortBy, setSortBy] = useState<SortOption>('price-asc');
  const [filterChains, setFilterChains] = useState<string[]>([]);
  const [showSpecialOnly, setShowSpecialOnly] = useState(false);

  const formatPrice = (price: number | string) => {
    const numPrice = typeof price === 'string' ? parseFloat(price) : price;
    return `€${numPrice.toFixed(2)}`;
  };

  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-GB');
    } catch {
      return dateString;
    }
  };

  const getSortedAndFilteredPrices = (prices: Price[]) => {
    let filtered = [...prices];

    // Filter by chains
    if (filterChains.length > 0) {
      filtered = filtered.filter(price => filterChains.includes(price.chain));
    }

    // Filter by special prices only
    if (showSpecialOnly) {
      filtered = filtered.filter(price => price.special_price);
    }

    // Sort
    filtered.sort((a, b) => {
      switch (sortBy) {
        case 'price-asc':
          const priceA = a.special_price || a.price;
          const priceB = b.special_price || b.price;
          return priceA - priceB;
        case 'price-desc':
          const priceA2 = a.special_price || a.price;
          const priceB2 = b.special_price || b.price;
          return priceB2 - priceA2;
        case 'chain':
          return a.chain.localeCompare(b.chain);
        case 'date':
          return new Date(b.date).getTime() - new Date(a.date).getTime();
        default:
          return 0;
      }
    });

    return filtered;
  };

  const getBestPrice = (prices: Price[]) => {
    if (!prices.length) return null;
    return prices.reduce((best, current) => {
      const currentPrice = current.special_price || current.price;
      const bestPrice = best.special_price || best.price;
      return currentPrice < bestPrice ? current : best;
    });
  };

  const getWorstPrice = (prices: Price[]) => {
    if (!prices.length) return null;
    return prices.reduce((worst, current) => {
      const currentPrice = current.special_price || current.price;
      const worstPrice = worst.special_price || worst.price;
      return currentPrice > worstPrice ? current : worst;
    });
  };

  const getUniqueChains = (prices: Price[]) => {
    return Array.from(new Set(prices.map(price => price.chain))).sort();
  };

  const handleChainFilter = (chain: string) => {
    setFilterChains(prev =>
      prev.includes(chain)
        ? prev.filter(c => c !== chain)
        : [...prev, chain]
    );
  };

  const clearFilters = () => {
    setFilterChains([]);
    setShowSpecialOnly(false);
  };

  if (isLoading) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="flex items-center justify-center py-8">
          <LoadingSpinner size="lg" />
          <span className="ml-3 text-gray-600">{t('priceComparison.loading')}</span>
        </div>
      </Card>
    );
  }

  if (error) {
    return (
      <Card className={`p-6 ${className}`}>
        <ErrorMessage
          title={t('priceComparison.error')}
          message={error.message || t('priceComparison.loadFailed')}
          onRetry={() => window.location.reload()}
        />
      </Card>
    );
  }

  if (!priceComparison) {
    return (
      <Card className={`p-6 ${className}`}>
        <div className="text-center py-8">
          <p className="text-gray-600">{t('priceComparison.noData')}</p>
        </div>
      </Card>
    );
  }

  const sortedPrices = getSortedAndFilteredPrices(priceComparison.prices);
  const uniqueChains = getUniqueChains(priceComparison.prices);
  const bestPrice = getBestPrice(sortedPrices);
  const worstPrice = getWorstPrice(sortedPrices);

  const hasActiveFilters = filterChains.length > 0 || showSpecialOnly;

  return (
    <Card className={`p-6 ${className}`}>
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">{t('priceComparison.title')}</h2>
          <p className="text-sm text-gray-600 mt-1">
            {t('priceComparison.found').replace('{count}', sortedPrices.length.toString())}
            {priceComparison.prices.length !== sortedPrices.length &&
              ` ${t('priceComparison.filtered').replace('{count}', (priceComparison.prices.length - sortedPrices.length).toString())}`
            }
          </p>
        </div>

        {/* Date selector */}
        {onDateChange && (
          <div className="flex items-center gap-2">
            <Calendar className="w-4 h-4 text-gray-400" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => onDateChange(e.target.value)}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:ring-2 focus:ring-primary-500"
            />
          </div>
        )}
      </div>

      {/* Price Summary */}
      {sortedPrices.length > 0 && (
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg mb-6">
          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
              <TrendingDown className="w-5 h-5" />
              <span className="font-medium">{t('priceComparison.bestPrice')}</span>
            </div>
            <p className="text-2xl font-bold text-green-600">
              {formatPrice(priceComparison.min_price)}
            </p>
            {bestPrice && (
              <p className="text-sm text-gray-600 mt-1">
                {t('priceComparison.atChain').replace('{chain}', bestPrice.chain)}
              </p>
            )}
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-primary-600 mb-1">
              <Star className="w-5 h-5" />
              <span className="font-medium">{t('priceComparison.average')}</span>
            </div>
            <p className="text-2xl font-bold text-primary-600">
              {formatPrice(priceComparison.avg_price)}
            </p>
            <p className="text-sm text-gray-600 mt-1">
              {t('priceComparison.acrossChains').replace('{count}', uniqueChains.length.toString())}
            </p>
          </div>

          <div className="text-center">
            <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
              <TrendingUp className="w-5 h-5" />
              <span className="font-medium">{t('priceComparison.highest')}</span>
            </div>
            <p className="text-2xl font-bold text-red-600">
              {formatPrice(priceComparison.max_price)}
            </p>
            {worstPrice && (
              <p className="text-sm text-gray-600 mt-1">
                {t('priceComparison.atChain').replace('{chain}', worstPrice.chain)}
              </p>
            )}
          </div>
        </div>
      )}

      {/* Filters and Sorting */}
      <div className="flex flex-wrap items-center gap-3 mb-4 p-4 bg-white border border-gray-200 rounded-lg">
        {/* Sort options */}
        <div className="flex items-center gap-2">
          <ArrowUpDown className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">{t('common.sortBy')}</span>
          <select
            value={sortBy}
            onChange={(e) => setSortBy(e.target.value as SortOption)}
            className="px-2 py-1 text-sm border border-gray-300 rounded focus:outline-none focus:ring-2 focus:ring-primary-500"
          >
            <option value="price-asc">{t('sort.priceLowHigh')}</option>
            <option value="price-desc">{t('sort.priceHighLow')}</option>
            <option value="chain">{t('sort.chainName')}</option>
            <option value="date">{t('sort.dateNewest')}</option>
          </select>
        </div>

        {/* Chain filters */}
        <div className="flex items-center gap-2">
          <Filter className="w-4 h-4 text-gray-400" />
          <span className="text-sm font-medium text-gray-700">{t('common.chains')}</span>
          <div className="flex flex-wrap gap-1">
            {uniqueChains.map(chain => (
              <button
                key={chain}
                onClick={() => handleChainFilter(chain)}
                className={`px-2 py-1 text-xs border rounded-full transition-colors ${filterChains.includes(chain)
                  ? 'bg-primary-100 border-primary-300 text-primary-800'
                  : 'bg-gray-100 border-gray-300 text-gray-700 hover:bg-gray-200'
                  }`}
              >
                {chain}
              </button>
            ))}
          </div>
        </div>

        {/* Special offers filter */}
        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={showSpecialOnly}
            onChange={(e) => setShowSpecialOnly(e.target.checked)}
            className="rounded border-gray-300 text-primary-600 focus:ring-primary-500"
          />
          <span className="text-sm text-gray-700">{t('filter.specialOnly')}</span>
        </label>

        {/* Clear filters */}
        {hasActiveFilters && (
          <Button
            variant="ghost"
            size="sm"
            onClick={clearFilters}
            className="text-gray-500 hover:text-gray-700"
          >
            {t('filter.clear')}
          </Button>
        )}
      </div>

      {/* Price List */}
      {sortedPrices.length > 0 ? (
        <div className="space-y-3">
          {sortedPrices.map((price, index) => {
            const isCurrentBest = bestPrice?.store_id === price.store_id;
            const isCurrentWorst = worstPrice?.store_id === price.store_id;
            const finalPrice = price.special_price || price.price;

            return (
              <div
                key={`${price.store_id}-${index}`}
                className={`p-4 border rounded-lg transition-colors ${isCurrentBest ? 'border-green-200 bg-green-50' :
                  isCurrentWorst ? 'border-red-200 bg-red-50' :
                    'border-gray-200 bg-white hover:bg-gray-50'
                  }`}
              >
                <div className="flex items-center justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="font-semibold text-lg">{price.chain}</h3>
                      <div className="flex gap-2">
                        {isCurrentBest && (
                          <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full font-medium">
                            {t('priceComparison.bestPrice')}
                          </span>
                        )}
                        {price.special_price && (
                          <span className="px-2 py-1 bg-orange-100 text-orange-800 text-xs rounded-full font-medium">
                            {t('product.specialOffer')}
                          </span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-4 text-sm text-gray-600">
                      <div className="flex items-center gap-1">
                        <MapPin className="w-4 h-4" />
                        <span>{t('store.id').replace('{id}', price.store_id.toString())}</span>
                      </div>
                      <div className="flex items-center gap-1">
                        <Calendar className="w-4 h-4" />
                        <span>{formatDate(price.date)}</span>
                      </div>
                      {price.currency && (
                        <span className="px-2 py-1 bg-gray-100 text-gray-700 rounded text-xs">
                          {price.currency}
                        </span>
                      )}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="flex items-center gap-3">
                      {price.special_price && (
                        <div className="text-right">
                          <div className="text-sm text-gray-500 line-through">
                            {t('product.regularPrice').replace('{price}', formatPrice(price.price))}
                          </div>
                        </div>
                      )}
                      <div className="text-right">
                        <div className={`text-2xl font-bold ${isCurrentBest ? 'text-green-600' :
                          isCurrentWorst ? 'text-red-600' : 'text-gray-900'
                          }`}>
                          {formatPrice(finalPrice)}
                        </div>
                        {price.unit && (
                          <div className="text-sm text-gray-500">
                            {t('product.perUnit').replace('{unit}', price.unit)}
                          </div>
                        )}
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-600">
            {hasActiveFilters
              ? t('priceComparison.noMatch')
              : t('priceComparison.noData')
            }
          </p>
          {hasActiveFilters && (
            <Button
              variant="outline"
              size="sm"
              onClick={clearFilters}
              className="mt-2"
            >
              {t('filter.clearToSee')}
            </Button>
          )}
        </div>
      )}
    </Card>
  );
};
