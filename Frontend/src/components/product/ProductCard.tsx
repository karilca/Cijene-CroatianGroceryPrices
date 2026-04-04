import React from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, Scale, ShoppingCart } from 'lucide-react';
import { BaseCard } from '../common/BaseCard';
import { Button } from '../ui/Button';
import { useProductFavorite } from '../../hooks/useFavorite';
import { useCompareActions } from '../../stores/appStore';
import { useCartStore } from '../../stores/cartStore';
import type { Product } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';
import { useNotifications } from '../common/NotificationContext';
import { useAuth } from '../../hooks/useAuth';

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
  const addItem = useCartStore((state) => state.addItem);
  const { notifyError, notifySuccess } = useNotifications();
  const { t } = useLanguage();
  const { session } = useAuth();
  const navigate = useNavigate();

  const formatProductBarcode = () => {
    if (product.ean) return product.ean;
    if (product.id) return product.id;
    return t('common.noId');
  };

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

    if (!session) {
      navigate('/auth');
      return;
    }

    const targetId = String(product.ean || product.id || '');

    if (!targetId) return;

    try {
      await addItem(targetId, 1);
      notifySuccess(t('cart.itemAdded'));
    } catch {
      notifyError(t('cart.addFailed'), t('common.error'));
    }
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

  const isTwoCols = Boolean(onViewDetails);

  const cardActions = (
    <div className={`grid gap-2 w-full ${isTwoCols ? 'grid-cols-2' : 'grid-cols-1'}`}>
      {onViewDetails && (
        <Button
          variant="outline"
          size="sm"
          onClick={handleViewDetails}
          className="w-full px-2"
        >
          <Eye className="h-4 w-4 shrink-0 mr-1.5" />
          <span className="whitespace-normal leading-tight text-center sm:text-sm text-xs">{t('common.details')}</span>
        </Button>
      )}
      <Button
        variant={isInCompareList ? "primary" : "outline"}
        size="sm"
        onClick={handleCompareToggle}
        disabled={!isInCompareList && !canAddToCompare}
        className="w-full px-2"
      >
        <Scale className="h-4 w-4 shrink-0 mr-1.5" />
        <span className="whitespace-normal leading-tight text-center sm:text-sm text-xs">{isInCompareList ? t('compare.removeFromCompare') : t('compare.addToCompare')}</span>
      </Button>

      <Button
        variant="primary"
        size="sm"
        onClick={handleAddToCart}
        className={`${isTwoCols ? 'col-span-2' : 'col-span-1'} w-full`}
      >
        <ShoppingCart className="h-4 w-4 shrink-0 mr-2" />
        {t('cart.addButton')}
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
        {(product.ean || product.id || product.brand) && (
          <div className="text-xs text-gray-500 space-y-1">
            {(product.ean || product.id) && (
              <div>
                <span className="font-medium text-gray-700">{t('product.barcodeLabel')}</span>{' '}
                <span className="font-mono">{formatProductBarcode()}</span>
              </div>
            )}
            {product.brand && (
              <div>
                <span className="font-medium text-gray-700">{t('product.brandLabel')}</span>{' '}
                <span>{product.brand}</span>
              </div>
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