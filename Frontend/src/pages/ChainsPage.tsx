// Chains page component

import React from 'react';
import { ChainList } from '../components/chain/ChainList';
import { useChains } from '../hooks/useApiQueries';
import { useLanguage } from '../contexts/LanguageContext';

export const ChainsPage: React.FC = () => {
  const { t } = useLanguage();
  const { data: chainsResponse, isLoading, error } = useChains();

  const chains = chainsResponse?.chains || [];

  return (
    <div className="max-w-7xl mx-auto">
      <div className="mb-8">
        <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('chains.title')}</h1>
        <p className="text-gray-600">
          {t('chains.subtitle')}
        </p>
      </div>

      <ChainList
        chains={chains}
        isLoading={isLoading}
        error={error?.message || null}
        showSearch={true}
        showViewToggle={true}
      />
    </div>
  );
};
