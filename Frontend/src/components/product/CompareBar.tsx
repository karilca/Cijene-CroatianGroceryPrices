// Compare Floating Action Bar - shows selected products for comparison

import React from 'react';
import { useNavigate } from 'react-router-dom';
import { X, Scale, Trash2 } from 'lucide-react';
import { Button } from '../ui/Button';
import { useCompareActions } from '../../stores/appStore';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Product } from '../../types';

const MAX_COMPARE_PRODUCTS = 4;

export const CompareBar: React.FC = () => {
  const { products, removeProduct, clear } = useCompareActions();
  const navigate = useNavigate();
  const { t } = useLanguage();

  if (products.length === 0) {
    return null;
  }

  const handleCompare = () => {
    navigate('/products/compare');
  };

  const handleRemove = (e: React.MouseEvent, productId: string) => {
    e.stopPropagation();
    removeProduct(productId);
  };

  return (
    <div className="fixed bottom-4 left-1/2 transform -translate-x-1/2 z-50 w-full max-w-2xl px-4">
      <div className="bg-white rounded-xl shadow-2xl border border-gray-200 p-4">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <Scale className="w-5 h-5 text-primary-600" />
            <span className="font-semibold text-gray-900">
              {t('compare.selected')} ({products.length}/{MAX_COMPARE_PRODUCTS})
            </span>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={clear}
            className="text-gray-500 hover:text-red-600"
          >
            <Trash2 className="w-4 h-4 mr-1" />
            {t('compare.clearAll')}
          </Button>
        </div>

        {/* Product chips */}
        <div className="flex flex-wrap gap-2 mb-3">
          {products.map((product: Product) => {
            const productId = product.ean || product.id || '';
            return (
              <div
                key={productId}
                className="flex items-center gap-2 bg-primary-50 text-primary-800 px-3 py-1.5 rounded-full text-sm"
              >
                <span className="max-w-[150px] truncate">{product.name}</span>
                <button
                  onClick={(e) => handleRemove(e, productId)}
                  className="hover:bg-primary-200 rounded-full p-0.5 transition-colors"
                >
                  <X className="w-3.5 h-3.5" />
                </button>
              </div>
            );
          })}
        </div>

        {/* Compare button */}
        <Button
          onClick={handleCompare}
          disabled={products.length < 2}
          className="w-full"
        >
          <Scale className="w-4 h-4 mr-2" />
          {products.length < 2
            ? t('compare.selectAtLeast')
            : t('compare.compareNow')
          }
        </Button>
      </div>
    </div>
  );
};
