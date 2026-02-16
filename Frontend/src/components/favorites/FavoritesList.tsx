// Reusable favorites list component for displaying saved products and stores

import React from 'react';
import { Link } from 'react-router-dom';
import { Package, MapPin, Store, Trash2, ExternalLink } from 'lucide-react';
import { Card } from '../ui/Card';
import { useLanguage } from '../../contexts/LanguageContext';
import type { Product, Store as StoreType } from '../../types';

interface FavoritesListProps {
  type: 'products' | 'stores';
  items: Product[] | StoreType[];
  onRemoveItem: (id: string) => void;
  className?: string;
}

interface FavoriteItemProps {
  item: Product | StoreType;
  type: 'products' | 'stores';
  onRemove: (id: string) => void;
}

const FavoriteItem: React.FC<FavoriteItemProps> = ({ item, type, onRemove }) => {
  const { t } = useLanguage();

  const formatProductIdentifier = (product: Product) => {
    if (product.ean) return `EAN: ${product.ean}`;
    if (product.id) return `ID: ${product.id}`;
    return t('common.noId');
  };

  const formatDistance = (distance?: number): string => {
    if (!distance) return '';
    if (distance < 1000) {
      return `${Math.round(distance)} m`;
    } else {
      return `${(distance / 1000).toFixed(1)} km`;
    }
  };

  if (type === 'products') {
    const product = item as Product;
    return (
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <h3 className="font-semibold text-gray-900 text-sm leading-tight line-clamp-2 mb-1">
              {product.name || t('common.unknownProduct')}
            </h3>

            {product.brand && (
              <p className="text-xs text-gray-600 mb-2">
                {product.brand}
              </p>
            )}

            <div className="space-y-1">
              {(product.quantity || product.unit) && (
                <div className="flex items-center gap-2 text-xs text-gray-600">
                  <Package className="w-3 h-3" />
                  <span>
                    {product.quantity && product.unit
                      ? `${product.quantity} ${product.unit}`
                      : product.quantity || product.unit}
                  </span>
                </div>
              )}

              <div className="flex items-center gap-2 text-xs text-gray-500">
                <span>{formatProductIdentifier(product)}</span>
              </div>

              {product.chain && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-100 text-primary-800">
                  {product.chain}
                </span>
              )}
            </div>
          </div>

          <div className="flex flex-col gap-2 ml-4">
            <button
              onClick={() => onRemove(product.ean || product.id || '')}
              className="text-red-500 hover:text-red-600 h-8 w-8 flex items-center justify-center rounded-md hover:bg-red-50 transition-colors"
              title={t('favoritesList.removeFromFavorites')}
            >
              <Trash2 className="w-[18px] h-[18px]" />
            </button>

            <Link
              to={product.ean
                ? `/products?ean=${encodeURIComponent(product.ean)}`
                : `/products?q=${encodeURIComponent(product.name || '')}`
              }
              className="text-primary-500 hover:text-primary-600 h-8 w-8 flex items-center justify-center rounded-md hover:bg-primary-50 transition-colors"
              title={t('favoritesList.viewProductDetails')}
            >
              <ExternalLink className="w-[18px] h-[18px]" />
            </Link>
          </div>
        </div>
      </Card>
    );
  } else {
    const store = item as StoreType;
    return (
      <Card className="p-4 hover:shadow-md transition-shadow">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center gap-2 mb-2">
              <h3 className="font-semibold text-gray-900 truncate">
                {store.name}
              </h3>
              {store.chain && (
                <span className="inline-flex items-center px-2 py-1 rounded-md text-xs font-medium bg-primary-100 text-primary-800">
                  {store.chain}
                </span>
              )}
            </div>

            {store.address && (
              <div className="flex items-start gap-2 mb-2">
                <MapPin className="h-4 w-4 text-gray-400 mt-0.5 flex-shrink-0" />
                <div className="text-sm text-gray-600">
                  <div>{store.address}</div>
                  {store.city && <div>{store.city}</div>}
                </div>
              </div>
            )}

            {(store as any).distance && (
              <div className="text-xs text-gray-500 mb-2">
                {t('favoritesList.distance').replace('{distance}', formatDistance((store as any).distance))}
              </div>
            )}

            {store.phone && (
              <div className="text-xs text-gray-500">
                {store.phone}
              </div>
            )}
          </div>

          <div className="flex flex-col gap-2 ml-4">
            <button
              onClick={() => onRemove(store.id || store.code || `${store.chain_code}-${store.address}`)}
              className="text-red-500 hover:text-red-600 h-8 w-8 flex items-center justify-center rounded-md hover:bg-red-50 transition-colors"
              title={t('favoritesList.removeFromFavorites')}
            >
              <Trash2 className="w-[18px] h-[18px]" />
            </button>

            <Link
              to={`/stores?id=${encodeURIComponent(store.id || store.code || '')}`}
              className="text-primary-500 hover:text-primary-600 h-8 w-8 flex items-center justify-center rounded-md hover:bg-primary-50 transition-colors"
              title={t('favoritesList.viewStoreDetails')}
            >
              <ExternalLink className="w-[18px] h-[18px]" />
            </Link>
          </div>
        </div>
      </Card>
    );
  }
};

export const FavoritesList: React.FC<FavoritesListProps> = ({
  type,
  items,
  onRemoveItem,
  className = ''
}) => {
  const { t } = useLanguage();

  if (items.length === 0) {
    return (
      <div className={`text-center py-12 ${className}`}>
        {/* Emojis removed */}
        <h3 className="text-lg font-medium text-gray-900 mb-2">
          {type === 'products' ? t('favoritesList.noProductsYet') : t('favoritesList.noStoresYet')}
        </h3>
        <p className="text-gray-600 mb-6">
          {type === 'products'
            ? t('favoritesList.productsEmptyText')
            : t('favoritesList.storesEmptyText')
          }
        </p>
        <Link
          to={type === 'products' ? '/products' : '/stores'}
          className="inline-flex items-center gap-2 bg-primary-600 text-white px-6 py-3 rounded-lg hover:bg-primary-700 transition-colors"
        >
          {type === 'products' ? <Package className="w-4 h-4" /> : <Store className="w-4 h-4" />}
          {type === 'products' ? t('favoritesList.browseProducts') : t('favoritesList.browseStores')}
        </Link>
      </div>
    );
  }

  return (
    <div className={`space-y-4 ${className}`}>
      <div className="flex justify-between items-center">
        <h2 className="text-xl font-semibold">
          {type === 'products' ? t('favoritesList.favoriteProducts') : t('favoritesList.favoriteStores')}
        </h2>
        <div className="flex items-center gap-4">
          <span className="text-sm text-gray-600">
            {type === 'products'
              ? t('favoritesList.productsSaved').replace('{count}', String(items.length))
              : t('favoritesList.storesSaved').replace('{count}', String(items.length))
            }
          </span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {items.map((item, index) => (
          <FavoriteItem
            key={type === 'products'
              ? (item as Product).ean || (item as Product).id || index
              : (item as StoreType).id || (item as StoreType).code || `${(item as StoreType).chain_code}-${(item as StoreType).address}` || index}
            item={item}
            type={type}
            onRemove={onRemoveItem}
          />
        ))}
      </div>
    </div>
  );
};
