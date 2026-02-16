// Chain card component for displaying individual chain information

import React from 'react';
import { Link } from 'react-router-dom';
import { Card } from '../ui/Card';
import { Button } from '../ui/Button';
import type { Chain } from '../../types';
import { useLanguage } from '../../contexts/LanguageContext';

interface ChainCardProps {
  chain: Chain;
  showStoreCount?: boolean;
  showProductCount?: boolean;
  showLastUpdated?: boolean;
}

export const ChainCard: React.FC<ChainCardProps> = ({
  chain,
  showStoreCount = true,
  showProductCount = true,
  showLastUpdated = true,
}) => {
  const { t } = useLanguage();

  const formatLastUpdated = (dateString: string) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('hr-HR', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const formatNumber = (num: number | undefined) => {
    return (num || 0).toLocaleString('hr-HR');
  };

  return (
    <Card className="p-6 hover:shadow-lg transition-shadow duration-200">
      <div className="flex flex-col h-full">
        <div className="flex-1">
          <h3 className="text-xl font-semibold text-gray-900 mb-2">
            {chain.name}
          </h3>

          <p className="text-sm text-gray-500 mb-4">
            {t('card.chainCode').replace('{code}', chain.code?.toUpperCase() || 'N/A')}
          </p>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
            {showStoreCount && (
              <div className="bg-primary-50 p-3 rounded-lg">
                <p className="text-2xl font-bold text-primary-600">
                  {formatNumber(chain.stores_count)}
                </p>
                <p className="text-sm text-primary-700">{t('card.stores')}</p>
              </div>
            )}

            {showProductCount && (
              <div className="bg-green-50 p-3 rounded-lg">
                <p className="text-2xl font-bold text-green-600">
                  {formatNumber(chain.products_count)}
                </p>
                <p className="text-sm text-green-700">{t('card.products')}</p>
              </div>
            )}
          </div>

          {showLastUpdated && (
            <div className="mb-4">
              <p className="text-sm text-gray-600">
                {t('card.lastUpdated').replace('{date}', formatLastUpdated(chain.last_updated))}
              </p>
            </div>
          )}
        </div>

        <div className="mt-4">
          <Link to={chain.code ? `/chains/${chain.code}` : '#'}>
            <Button
              className="w-full"
              variant="primary"
              disabled={!chain.code}
            >
              {t('card.viewDetails')}
            </Button>
          </Link>
        </div>
      </div>
    </Card>
  );
};
