// 404 Not Found page component

import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../contexts/LanguageContext';

export const NotFoundPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="max-w-2xl mx-auto text-center py-16">
      <div className="text-9xl font-bold text-gray-300 mb-4">404</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('notFound.title')}</h1>
      <p className="text-gray-600 mb-8">
        {t('notFound.message')}
      </p>

      <div className="space-x-4">
        <Link
          to="/"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-primary-600 hover:bg-primary-700"
        >
          {t('notFound.goHome')}
        </Link>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-md text-gray-700 bg-white hover:bg-gray-50"
        >
          {t('notFound.goBack')}
        </button>
      </div>

      <div className="mt-12 grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/products" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <div className="text-2xl mb-2">🛒</div>
          <h3 className="font-semibold mb-2">{t('notFound.products.title')}</h3>
          <p className="text-gray-600 text-sm">{t('notFound.products.text')}</p>
        </Link>

        <Link to="/stores" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <div className="text-2xl mb-2">🏪</div>
          <h3 className="font-semibold mb-2">{t('notFound.stores.title')}</h3>
          <p className="text-gray-600 text-sm">{t('notFound.stores.text')}</p>
        </Link>

        <Link to="/chains" className="bg-white p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow">
          <div className="text-2xl mb-2">🏢</div>
          <h3 className="font-semibold mb-2">{t('notFound.chains.title')}</h3>
          <p className="text-gray-600 text-sm">{t('notFound.chains.text')}</p>
        </Link>
      </div>
    </div>
  );
};
