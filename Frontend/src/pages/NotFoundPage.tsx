// 404 Not Found page component

import React from 'react';
import { Link } from 'react-router-dom';
import { Home, ArrowLeft, ShoppingBag, Store, Building2 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';

export const NotFoundPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="max-w-2xl mx-auto text-center py-16 px-4">
      <div className="text-9xl font-bold text-gray-200 mb-4 select-none">404</div>
      <h1 className="text-3xl font-bold text-gray-900 mb-4">{t('notFound.title')}</h1>
      <p className="text-gray-600 mb-8 max-w-md mx-auto">
        {t('notFound.message')}
      </p>

      <div className="flex flex-col sm:flex-row items-center justify-center gap-4 mb-12">
        <Link
          to="/"
          className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-lg text-white bg-primary-600 hover:bg-primary-700 transition-colors shadow-sm w-full sm:w-auto justify-center"
        >
          <Home className="w-5 h-5 mr-2" />
          {t('notFound.goHome')}
        </Link>
        <button
          onClick={() => window.history.back()}
          className="inline-flex items-center px-6 py-3 border border-gray-300 text-base font-medium rounded-lg text-gray-700 bg-white hover:bg-gray-50 transition-colors shadow-sm w-full sm:w-auto justify-center"
        >
          <ArrowLeft className="w-5 h-5 mr-2" />
          {t('notFound.goBack')}
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/products" className="group bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 flex flex-col items-center">
          <div className="w-12 h-12 bg-primary-50 text-primary-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <ShoppingBag className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">{t('notFound.products.title')}</h3>
          <p className="text-gray-500 text-sm">{t('notFound.products.text')}</p>
        </Link>

        <Link to="/stores" className="group bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 flex flex-col items-center">
          <div className="w-12 h-12 bg-green-50 text-green-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Store className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">{t('notFound.stores.title')}</h3>
          <p className="text-gray-500 text-sm">{t('notFound.stores.text')}</p>
        </Link>

        <Link to="/chains" className="group bg-white p-6 rounded-xl shadow-md hover:shadow-lg transition-all border border-gray-100 flex flex-col items-center">
          <div className="w-12 h-12 bg-purple-50 text-purple-600 rounded-lg flex items-center justify-center mb-4 group-hover:scale-110 transition-transform">
            <Building2 className="w-6 h-6" />
          </div>
          <h3 className="font-semibold text-gray-900 mb-2">{t('notFound.chains.title')}</h3>
          <p className="text-gray-500 text-sm">{t('notFound.chains.text')}</p>
        </Link>
      </div>
    </div>
  );
};
