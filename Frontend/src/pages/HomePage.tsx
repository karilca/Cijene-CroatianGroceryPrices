// Homepage component

import React from 'react';
import { useNavigate } from 'react-router-dom';


import { useLanguage } from '../contexts/LanguageContext';

export const HomePage: React.FC = () => {
  const navigate = useNavigate();
  const { t } = useLanguage();
  return (
    <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
      {/* Hero Section */}
      <div className="text-center py-8 sm:py-12 lg:py-16">
        <h1 className="text-2xl sm:text-3xl md:text-4xl lg:text-5xl font-bold text-gray-900 mb-4 leading-tight">
          {t('home.hero.title')}
        </h1>
        <p className="text-base sm:text-lg md:text-xl text-gray-600 mb-6 sm:mb-8 max-w-3xl mx-auto">
          {t('home.hero.subtitle')}
        </p>

        {/* Search Bar */}
        <div className="max-w-2xl mx-auto mb-6 sm:mb-8 px-4 sm:px-0">
          <div className="relative">
            <input
              type="text"
              placeholder={t('search.placeholder')}
              className="w-full px-4 sm:px-6 py-3 sm:py-4 text-base sm:text-lg border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-primary-500 focus:border-transparent pr-20 sm:pr-24"
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  const query = (e.target as HTMLInputElement).value;
                  if (query.trim()) {
                    navigate(`/products?q=${encodeURIComponent(query.trim())}`);
                  }
                }
              }}
            />
            <button
              className="absolute right-2 top-1/2 transform -translate-y-1/2 bg-primary-600 text-white px-3 sm:px-6 py-2 rounded-lg hover:bg-primary-700 touch-manipulation transition-colors duration-200 text-sm sm:text-base"
              onClick={(e) => {
                const input = e.currentTarget.previousElementSibling as HTMLInputElement;
                if (input.value.trim()) {
                  navigate(`/products?q=${encodeURIComponent(input.value.trim())}`);
                }
              }}
            >
              {t('search.button')}
            </button>
          </div>
        </div>

        {/* Quick Stats */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 mb-8 sm:mb-12">
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
            <h3 className="text-xl sm:text-2xl font-bold text-primary-600 mb-2">10,000+</h3>
            <p className="text-sm sm:text-base text-gray-600">{t('home.stats.products')}</p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
            <h3 className="text-xl sm:text-2xl font-bold text-green-600 mb-2">500+</h3>
            <p className="text-sm sm:text-base text-gray-600">{t('home.stats.stores')}</p>
          </div>
          <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200 sm:col-span-2 lg:col-span-1">
            <h3 className="text-xl sm:text-2xl font-bold text-purple-600 mb-2">10+</h3>
            <p className="text-sm sm:text-base text-gray-600">{t('home.stats.chains')}</p>
          </div>
        </div>
      </div>

      {/* Features Section */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 sm:gap-8 mb-8 sm:mb-12">
        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
          <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">{t('home.features.comparison.title')}</h3>
          <p className="text-sm sm:text-base text-gray-600">
            {t('home.features.comparison.text')}
          </p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
          <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">{t('home.features.locator.title')}</h3>
          <p className="text-sm sm:text-base text-gray-600">
            {t('home.features.locator.text')}
          </p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
          <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">{t('home.features.history.title')}</h3>
          <p className="text-sm sm:text-base text-gray-600">
            {t('home.features.history.text')}
          </p>
        </div>

        <div className="bg-white p-4 sm:p-6 rounded-lg shadow-md hover:shadow-lg transition-shadow duration-200">
          <h3 className="text-lg sm:text-xl font-semibold mb-3 sm:mb-4">{t('home.features.mobile.title')}</h3>
          <p className="text-sm sm:text-base text-gray-600">
            {t('home.features.mobile.text')}
          </p>
        </div>
      </div>

      {/* Example Usage */}
      <div className="bg-primary-50 p-8 rounded-lg mb-12">
        <h3 className="text-2xl font-semibold mb-4">{t('home.usage.title')}</h3>
        <div className="space-y-4">
          <div className="flex items-start">
            <div className="bg-primary-600 text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 mt-1">1</div>
            <div>
              <h4 className="font-semibold">{t('home.usage.step1.title')}</h4>
              <p className="text-gray-600">{t('home.usage.step1.text')}</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="bg-primary-600 text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 mt-1">2</div>
            <div>
              <h4 className="font-semibold">{t('home.usage.step2.title')}</h4>
              <p className="text-gray-600">{t('home.usage.step2.text')}</p>
            </div>
          </div>
          <div className="flex items-start">
            <div className="bg-primary-600 text-white rounded-full w-8 h-8 flex items-center justify-center mr-4 mt-1">3</div>
            <div>
              <h4 className="font-semibold">{t('home.usage.step3.title')}</h4>
              <p className="text-gray-600">{t('home.usage.step3.text')}</p>
            </div>
          </div>
        </div>
      </div>


    </div>
  );
};
