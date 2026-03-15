import React from 'react';
import { Eye, Scale, Package, ShoppingCart } from 'lucide-react';
import { BaseCard } from '../common/BaseCard';
import { Button } from '../ui/Button';
import { useProductFavorite } from '../../hooks/useFavorite';
import { useCompareActions } from '../../stores/appStore';
import type { Product } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

// DODANO: Importi za košaricu
import { supabase } from '../../lib/supabase';
import { addToCart } from '../../api/cart';

interface ProductCardProps {
  product: Product;
  onViewDetails?: (product: Product) => void;
  showPricing?: boolean;
  className?: string;
}

export const ProductCard: React.FC<ProductCardProps> = ({
  product,
  onViewDetails,
  showPricing = true,
  className = ''
}) => {
  const { isFavorite, toggleFavorite } = useProductFavorite(product);
  const { products: compareProducts, addProduct: addToCompare, removeProduct: removeFromCompare, isInCompare } = useCompareActions();
  const { t } = useLanguage();

  const productId = product.ean || product.id || '';
  const isInCompareList = isInCompare(productId);
  const canAddToCompare = compareProducts.length < 4;

  const handleViewDetails = () => {
    onViewDetails?.(product);
  };

  const handleCompareToggle = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (isInCompareList) {
      removeFromCompare(productId);
    } else if (canAddToCompare) {
      addToCompare(product);
    }
  };

 const handleAddToCart = async (e: React.MouseEvent) => {
    e.stopPropagation();
    // Forsiramo pretvorbu u string koristeći String()
    const targetId = String(product.ean || product.id || ''); 
    
    if (!targetId) return;

    await addToCart(supabase, targetId, 1);
  };

  const getPricingInfo = () => {
    if (!showPricing || !product.chain_code) return null;

    return {
      hasPrice: true,
      minPrice: null,
      maxPrice: null,
      chainCount: 1
    };
  };

  const pricingInfo = getPricingInfo();

  const cardActions = (
    <div className="flex flex-col w-full gap-2"> {/* Kolona umjesto reda sprečava širenje */}
      <div className="flex w-full gap-2">
        {onViewDetails && (
          <Button
            variant="outline"
            size="sm"
            onClick={handleViewDetails}
            className="flex-1"
          >
            <Eye className="h-4 w-4 mr-2" />
            {t('common.details')}
          </Button>
        )}
        <Button
          variant={isInCompareList ? "primary" : "outline"}
          size="sm"
          onClick={handleCompareToggle}
          disabled={!isInCompareList && !canAddToCompare}
          className={`flex-1 ${isInCompareList ? 'bg-primary-600 text-white' : ''}`}
        >
          <Scale className="h-4 w-4 mr-2" />
          {isInCompareList ? 'Remove' : 'Add to Compare'}
        </Button>
      </div>

      {/* Gumb za dodavanje ide u novi red ispod, tako ne kvari dizajn */}
      <Button
        variant="primary"
        size="sm"
        onClick={handleAddToCart}
        className="w-full bg-red-600 hover:bg-red-700 text-white font-bold"
      >
        <ShoppingCart className="h-4 w-4 mr-2" />
        Dodaj
      </Button>
    </div>
  );

  return (
    <BaseCard
      className={className}
      onClick={() => onViewDetails?.(product)}
      variant="interactive"
      isFavorite={isFavorite}
      onFavoriteToggle={toggleFavorite}
      actions={cardActions}
    >
      <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 mb-1">
        {product.name || t('common.unknownProduct')}
      </h3>

      <div className="space-y-2">
        {product.ean && (
          <div className="flex items-center text-xs text-gray-500">
            <Package className="h-3 w-3 mr-1" />
            <span className="font-mono mr-2">{product.ean}</span>
            {product.brand && (
              <span className="font-medium text-gray-600 bg-gray-100 px-1.5 py-0.5 rounded">
                {product.brand}
              </span>
            )}
          </div>
        )}

        {product.chain_code && (
          <div className="text-xs text-gray-500">
            {t('product.chain')} {product.chain_code}
          </div>
        )}

        {pricingInfo && (
          <div className="bg-green-50 p-2 rounded text-xs">
            <div className="text-green-700 font-medium">
              {t('product.priceAvailable')}
            </div>
            <div className="text-green-600">
              {t('product.fromChains').replace('{count}', pricingInfo.chainCount.toString())}
            </div>
          </div>
        )}
      </div>
    </BaseCard>
  );
};