// Compare Products Page - side-by-side product comparison

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ChevronLeft, Scale, Trash2, Package, Barcode, AlertCircle, Plus } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { useCompareActions } from '../stores/appStore';
import { useProductPrices } from '../hooks/useApiQueries';
import { useLanguage } from '../contexts/LanguageContext';
import type { Product } from '../types';

export const CompareProductPage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  const { products, removeProduct, clear } = useCompareActions();

  const handleBack = () => {
    if (window.history.length > 1) {
      navigate(-1);
    } else {
      navigate('/products');
    }
  };

  const handleRemove = (productId: string) => {
    removeProduct(productId);
  };

  // If no products selected, show empty state
  if (products.length === 0) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('common.back')}
        </Button>

        <Card className="p-8">
          <div className="text-center">
            <Scale className="w-16 h-16 text-gray-400 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t('compare.noProducts')}
            </h2>
            <p className="text-gray-600 mb-6">
              {t('compare.noProductsDescription')}
            </p>
            <Button onClick={() => navigate('/products')}>
              {t('compare.browseProducts')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  // If only one product, prompt to add more
  if (products.length === 1) {
    return (
      <div className="max-w-6xl mx-auto space-y-6">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('common.back')}
        </Button>

        <Card className="p-8">
          <div className="text-center">
            <AlertCircle className="w-16 h-16 text-yellow-500 mx-auto mb-4" />
            <h2 className="text-xl font-semibold text-gray-900 mb-2">
              {t('compare.needMore')}
            </h2>
            <p className="text-gray-600 mb-4">
              {t('compare.needMoreDescription')}
            </p>
            <div className="bg-gray-50 p-4 rounded-lg mb-6 max-w-sm mx-auto">
              <p className="font-medium text-gray-900">{products[0].name}</p>
              {products[0].ean && (
                <p className="text-sm text-gray-500 font-mono">{products[0].ean}</p>
              )}
            </div>
            <Button onClick={() => navigate('/products')}>
              <Plus className="w-4 h-4 mr-2" />
              {t('compare.addMore')}
            </Button>
          </div>
        </Card>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <Button
          variant="ghost"
          onClick={handleBack}
          className="flex items-center gap-2"
        >
          <ChevronLeft className="w-4 h-4" />
          {t('common.back')}
        </Button>

        <Button
          variant="outline"
          onClick={clear}
          className="text-red-600 hover:bg-red-50"
        >
          <Trash2 className="w-4 h-4 mr-2" />
          {t('compare.clearAll')}
        </Button>
      </div>

      {/* Page Title */}
      <div className="text-center py-4">
        <h1 className="text-2xl font-bold text-gray-900 flex items-center justify-center gap-3">
          <Scale className="w-7 h-7 text-primary-600" />
          {t('compare.title')}
        </h1>
        <p className="text-gray-600 mt-1">
          {t('compare.subtitle')}
        </p>
      </div>

      {/* Comparison Table */}
      <div className="overflow-x-auto">
        <div className="inline-flex gap-4 min-w-full pb-4">
          {products.map((product: Product) => (
            <ProductCompareCard
              key={product.ean || product.id}
              product={product}
              onRemove={() => handleRemove(product.ean || product.id || '')}
            />
          ))}

          {/* Add more button if less than 4 products */}
          {products.length < 4 && (
            <Card className="min-w-[280px] p-6 flex flex-col items-center justify-center border-dashed border-2 border-gray-300 bg-gray-50 hover:bg-gray-100 cursor-pointer transition-colors"
              onClick={() => navigate('/products')}
            >
              <Plus className="w-12 h-12 text-gray-400 mb-3" />
              <p className="text-gray-600 font-medium">{t('compare.addProduct')}</p>
              <p className="text-sm text-gray-500">{t('compare.maxProducts')}</p>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

// Individual product comparison card
interface ProductCompareCardProps {
  product: Product;
  onRemove: () => void;
}

const ProductCompareCard: React.FC<ProductCompareCardProps> = ({ product, onRemove }) => {
  const { t } = useLanguage();

  // Fetch prices for this product
  const {
    data: priceData,
    isLoading: pricesLoading
  } = useProductPrices(
    { eans: product.ean || product.id || '' },
    product,
    { enabled: !!(product.ean || product.id) }
  );

  const formatPrice = (price: number) => `€${price.toFixed(2)}`;

  return (
    <Card className="min-w-[280px] max-w-[320px] flex-shrink-0">
      {/* Remove button */}
      <div className="flex justify-end p-2 border-b">
        <button
          onClick={onRemove}
          className="p-1.5 text-gray-400 hover:text-red-600 hover:bg-red-50 rounded-full transition-colors"
        >
          <Trash2 className="w-4 h-4" />
        </button>
      </div>

      {/* Product info */}
      <div className="p-4 space-y-4">
        <div>
          <h3 className="font-semibold text-gray-900 text-lg leading-tight line-clamp-2 mb-2">
            {product.name || t('common.unknownProduct')}
          </h3>

          {product.brand && (
            <p className="text-sm text-gray-600 mb-2">
              {product.brand}
            </p>
          )}

          <div className="space-y-1 text-sm text-gray-500">
            {product.ean && (
              <div className="flex items-center gap-2">
                <Barcode className="w-4 h-4" />
                <span className="font-mono">{product.ean}</span>
              </div>
            )}

            {(product.quantity || product.unit) && (
              <div className="flex items-center gap-2">
                <Package className="w-4 h-4" />
                <span>
                  {product.quantity && product.unit
                    ? `${product.quantity} ${product.unit}`
                    : product.quantity || product.unit
                  }
                </span>
              </div>
            )}

            {product.category && (
              <div className="px-2 py-1 bg-gray-100 rounded text-gray-700 inline-block mt-2">
                {product.category}
              </div>
            )}
          </div>
        </div>

        {/* Price info */}
        <div className="border-t pt-4">
          <h4 className="font-medium text-gray-700 mb-3">{t('compare.priceInfo')}</h4>

          {pricesLoading && (
            <div className="flex items-center gap-2 text-gray-500">
              <LoadingSpinner size="sm" />
              <span className="text-sm">{t('common.loading')}</span>
            </div>
          )}

          {priceData && !pricesLoading && (
            <div className="space-y-2">
              <PriceRow
                label={t('compare.minPrice')}
                value={formatPrice(priceData.min_price)}
                highlight="green"
              />
              <PriceRow
                label={t('compare.avgPrice')}
                value={formatPrice(priceData.avg_price)}
              />
              <PriceRow
                label={t('compare.maxPrice')}
                value={formatPrice(priceData.max_price)}
                highlight="red"
              />
              <div className="text-sm text-gray-500 mt-2">
                {t('compare.availableAt').replace('{count}', priceData.chains.length.toString())}
              </div>
            </div>
          )}

          {!priceData && !pricesLoading && (
            <p className="text-sm text-gray-500">{t('compare.noPriceData')}</p>
          )}
        </div>
      </div>
    </Card>
  );
};

// Price row component
interface PriceRowProps {
  label: string;
  value: string;
  highlight?: 'green' | 'red';
}

const PriceRow: React.FC<PriceRowProps> = ({ label, value, highlight }) => {
  const valueClass = highlight === 'green'
    ? 'text-green-600 font-bold'
    : highlight === 'red'
      ? 'text-red-600 font-bold'
      : 'text-gray-900';

  return (
    <div className="flex justify-between items-center">
      <span className="text-sm text-gray-600">{label}</span>
      <span className={`text-lg ${valueClass}`}>{value}</span>
    </div>
  );
};
