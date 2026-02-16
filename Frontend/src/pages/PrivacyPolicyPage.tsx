import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export const PrivacyPolicyPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="max-w-4xl mx-auto px-4 py-10 text-gray-800">
      <header className="mb-8">
        <p className="text-sm uppercase tracking-wide text-primary-600">{t('privacy.legal')}</p>
        <h1 className="text-3xl font-bold mb-2">{t('privacy.title')}</h1>
        <p className="text-gray-600">{t('privacy.lastUpdated').replace('{date}', 'November 22, 2025')}</p>
      </header>

      <section className="space-y-6 leading-relaxed">
        <p>
          {t('privacy.text1')}
        </p>
        <p>
          {t('privacy.text2')}
        </p>
        <p>
          {t('privacy.text3').replace('{email}', 'kolak@karlok.eu')}
        </p>
        <p>
          {t('privacy.text4')}
        </p>
      </section>
    </div>
  );
};
