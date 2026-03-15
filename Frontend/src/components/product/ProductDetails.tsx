import React from 'react';
import { Heart, Package, Barcode, MapPin, TrendingDown, TrendingUp, Star, ChevronLeft, ShoppingCart } from 'lucide-react';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';
import { useProductFavorite } from '../../hooks/useFavorite';
import { useProductPrices } from '../../hooks/useApiQueries';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Product, Price } from '../../types';

// DODANO: Importi za košaricu
import { supabase } from '../../lib/supabase';
import { addToCart } from '../../api/cart';

interface ProductDetailsProps {
  product: Product;
  onBack?: () => void;
  className?: string;
  city?: string;
  chains?: string[];
}

export const ProductDetails: React.FC<ProductDetailsProps> = ({
  product,
  onBack,
  className = '',
  city,
  chains
}) => {
  const { isFavorite, toggleFavorite } = useProductFavorite(product);
  const { t } = useLanguage();
  const imageBaseUrl = import.meta.env.VITE_IMAGE_BASE_URL;
  const imageUrl = product.ean ? `${imageBaseUrl}${product.ean}.png` : null;

  const {
    data: priceComparison,
    isLoading: pricesLoading,
    error: pricesError
  } = useProductPrices(
    {
      eans: product.ean || product.id || '',
      city: city,
      chains: chains
    },
    product,
    { enabled: !!(product.ean || product.id) }
  );

  const handleFavoriteToggle = () => {
    toggleFavorite();
  };

  // DODANO: Funkcija za dodavanje
  const handleAddToCart = async () => {
    const targetId = product.id || product.ean || '';
    await addToCart(supabase, String(targetId), 1);
  };

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

  return (
    <div className={`space-y-6 ${className}`}>
      <div className="flex items-start gap-4">
        {onBack && (
          <Button
            variant="ghost"
            size="sm"
            onClick={onBack}
            className="mt-1"
          >
            <ChevronLeft className="w-4 h-4" />
          </Button>
        )}

        <div className="flex-1">
          <div className="flex items-start justify-between">
            <div>
              <h1 className="text-xl sm:text-2xl font-bold text-gray-900 mb-2 break-words">
                {product.name || t('common.unknownProduct')}
              </h1>
              {product.brand && (
                <p className="text-lg text-gray-600 mb-2">
                  {t('common.by')} {product.brand}
                </p>
              )}
            </div>

            <Button
              variant="ghost"
              onClick={handleFavoriteToggle}
              className={`p-2 ${isFavorite
                ? 'text-red-500 hover:text-red-600'
                : 'text-gray-400 hover:text-red-500'
                }`}
            >
              <Heart className={`w-6 h-6 ${isFavorite ? 'fill-current' : ''}`} />
            </Button>
          </div>
        </div>
      </div>

      <Card className="p-4 sm:p-6">
        <div className="flex justify-between items-center mb-4">
            <h2 className="text-lg font-semibold">{t('productDetails.productInfo')}</h2>
            
            {/* DODANO: Gumb za košaricu u zaglavlju info kartice */}
            <Button 
                onClick={handleAddToCart}
                variant="primary"
                className="flex items-center gap-2"
            >
                <ShoppingCart className="w-4 h-4" />
                Dodaj u košaricu
            </Button>
        </div>
        
        <div className="flex flex-col md:flex-row gap-6">
          {imageUrl && (
            <div className="flex-shrink-0 w-full md:w-1/3 flex justify-center items-start">
              <img 
                src={imageUrl} 
                alt={product.name} 
                className="max-w-full h-auto rounded-lg shadow-sm object-contain max-h-[300px]"
                onError={(e) => {
                  (e.target as HTMLImageElement).style.display = 'none';
                }}
              />
            </div>
          )}
          
          <div className={`grid grid-cols-1 ${imageUrl ? 'md:grid-cols-1 lg:grid-cols-2' : 'md:grid-cols-2'} gap-6 flex-grow`}>
            <div className="space-y-4">
            {product.ean && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                  <Barcode className="w-5 h-5 text-gray-500" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs text-gray-500 block uppercase tracking-wider">{t('productDetails.eanCode')}</span>
                  <p className="font-mono font-medium truncate">{product.ean}</p>
                </div>
              </div>
            )}

            {(product.quantity || product.unit) && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0">
                  <Package className="w-5 h-5 text-gray-500" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs text-gray-500 block uppercase tracking-wider">{t('productDetails.size')}</span>
                  <p className="font-medium truncate">
                    {product.quantity && product.unit
                      ? `${product.quantity} ${product.unit}`
                      : product.quantity || product.unit
                    }
                  </p>
                </div>
              </div>
            )}

            {product.category && (
              <div className="flex items-center gap-3">
                <div className="p-2 bg-gray-100 rounded-lg flex-shrink-0 opacity-0">
                  <Package className="w-5 h-5" />
                </div>
                <div className="min-w-0">
                  <span className="text-xs text-gray-500 block uppercase tracking-wider">{t('productDetails.category')}</span>
                  <p className="font-medium truncate">{product.category}</p>
                </div>
              </div>
            )}
          </div>

          <div className="space-y-4">
            {product.chain && (
              <div>
                <span className="text-xs text-gray-500 block uppercase tracking-wider mb-1">{t('productDetails.availableAt')}</span>
                <div className="mt-1">
                  <span className="inline-block px-3 py-1 bg-primary-100 text-primary-800 rounded-full text-sm font-semibold">
                    {product.chain}
                  </span>
                </div>
              </div>
            )}

            {product.chain_code && (
              <div>
                <span className="text-xs text-gray-500 block uppercase tracking-wider mb-1">{t('productDetails.chainCode')}</span>
                <p className="font-mono font-medium break-all">{product.chain_code}</p>
              </div>
            )}
          </div>
        </div>
      </div>

        {product.description && (
          <div className="mt-6 pt-6 border-t border-gray-100">
            <h3 className="font-semibold text-gray-900 mb-2">{t('productDetails.description')}</h3>
            <p className="text-gray-600 leading-relaxed break-words">{product.description}</p>
          </div>
        )}
      </Card>

      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-lg font-semibold">{t('productDetails.priceComparison')}</h2>
        </div>

        {pricesLoading && (
          <div className="flex items-center justify-center py-8">
            <LoadingSpinner size="lg" />
            <span className="ml-3 text-gray-600">{t('productDetails.loadingPrices')}</span>
          </div>
        )}

        {pricesError && (
          <ErrorMessage
            title={t('productDetails.priceLoadingError')}
            message={pricesError instanceof Error ? pricesError.message : 'Failed to load price comparison data'}
            onRetry={() => window.location.reload()}
          />
        )}

        {priceComparison && !pricesLoading && (
          <div className="space-y-4">
            {priceComparison.prices.length > 0 && (
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 p-4 bg-gray-50 rounded-lg">
                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-green-600 mb-1">
                    <TrendingDown className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('productDetails.bestPrice')}</span>
                  </div>
                  <p className="text-xl font-bold text-green-600">
                    {formatPrice(priceComparison.min_price)}
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-amber-600 mb-1">
                    <Star className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('productDetails.average')}</span>
                  </div>
                  <p className="text-xl font-bold text-amber-600">
                    {formatPrice(priceComparison.avg_price)}
                  </p>
                </div>

                <div className="text-center">
                  <div className="flex items-center justify-center gap-1 text-red-600 mb-1">
                    <TrendingUp className="w-4 h-4" />
                    <span className="text-sm font-medium">{t('productDetails.highest')}</span>
                  </div>
                  <p className="text-xl font-bold text-red-600">
                    {formatPrice(priceComparison.max_price)}
                  </p>
                </div>
              </div>
            )}

            {priceComparison.prices.length > 0 ? (
              <div className="space-y-2">
                <h3 className="font-medium text-gray-900">{t('productDetails.storesAndPrices')}</h3>
                <div className="space-y-2">
                  {priceComparison.prices
                    .sort((a, b) => {
                      const priceA = a.special_price || a.price;
                      const priceB = b.special_price || b.price;
                      return priceA - priceB;
                    })
                    .map((price, index) => {
                      const isCurrentBest = getBestPrice(priceComparison.prices)?.store_id === price.store_id;
                      const isCurrentWorst = getWorstPrice(priceComparison.prices)?.store_id === price.store_id;
                      const finalPrice = price.special_price || price.price;

                      return (
                        <div
                          key={index}
                          className={`p-3 border rounded-lg ${isCurrentBest ? 'border-green-200 bg-green-50' :
                            isCurrentWorst ? 'border-red-200 bg-red-50' :
                              'border-gray-200 bg-white'
                            }`}
                        >
                          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
                            <div className="flex-1 min-w-0">
                              <div className="flex flex-wrap items-center gap-2 mb-1">
                                <span className="font-semibold text-gray-900 truncate">{price.chain}</span>
                                {isCurrentBest && (
                                  <span className="px-2 py-0.5 bg-green-100 text-green-800 text-xs rounded-full font-medium whitespace-nowrap">
                                    {t('productDetails.bestPrice')}
                                  </span>
                                )}
                                {price.special_price && (
                                  <span className="px-2 py-0.5 bg-orange-100 text-orange-800 text-xs rounded-full font-medium whitespace-nowrap">
                                    {t('productDetails.specialOffer')}
                                  </span>
                                )}
                              </div>
                              <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-500">
                                <div className="flex items-center gap-1">
                                  <MapPin className="w-3 h-3 flex-shrink-0" />
                                  <span className="break-words whitespace-normal font-medium">
                                    {price.store_address ? (
                                      <>
                                        {price.store_address}
                                        {price.store_city && `, ${price.store_city}`}
                                      </>
                                    ) : (
                                      t('productDetails.storeId').replace('{id}', price.store_id)
                                    )}
                                  </span>
                                </div>
                                <span className="hidden xs:inline text-gray-300">•</span>
                                <span>{formatDate(price.date)}</span>
                              </div>
                            </div>

                            <div className="flex items-center sm:flex-col sm:items-end justify-between sm:justify-start gap-2 pt-2 sm:pt-0 border-t sm:border-0 border-gray-100">
                              <div className="flex flex-wrap items-baseline gap-2">
                                {price.special_price && (
                                  <span className="text-sm text-gray-400 line-through">
                                    {formatPrice(price.price)}
                                  </span>
                                )}
                                <span className={`text-lg font-bold ${isCurrentBest ? 'text-green-600' :
                                  isCurrentWorst ? 'text-red-600' : 'text-gray-900'
                                  }`}>
                                  {formatPrice(finalPrice)}
                                </span>
                              </div>
                              {price.unit && (
                                <div className="text-xs text-gray-500 italic">
                                  {t('productDetails.per').replace('{unit}', price.unit)}
                                </div>
                              )}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                </div>
              </div>
            ) : (
              <div className="text-center py-8">
                <p className="text-gray-600">{t('productDetails.noData')}</p>
                <p className="text-sm text-gray-500 mt-1">
                  {t('productDetails.tryDifferentDate')}
                </p>
              </div>
            )}
          </div>
        )}
      </Card>
    </div>
  );
};