import React from 'react';
import { useLanguage } from '../contexts/LanguageContext';

export const ContactPage: React.FC = () => {
  const { t } = useLanguage();

  return (
    <div className="max-w-3xl mx-auto px-4 py-10 text-gray-800">
      <header className="mb-8">
        <p className="text-sm uppercase tracking-wide text-primary-600">{t('contact.support')}</p>
        <h1 className="text-3xl font-bold mb-2">{t('contact.title')}</h1>
        <p className="text-gray-600">
          {t('contact.subtitle')}
        </p>
      </header>

      <section className="space-y-6 leading-relaxed">
        <div>
          <h2 className="text-xl font-semibold mb-2">{t('contact.email.title')}</h2>
          <p>
            {t('contact.email.general')} <a className="text-primary-600 hover:underline" href="mailto:kolak@karlok.eu">kolak@karlok.eu</a>
            <br />{t('contact.email.support')} <a className="text-primary-600 hover:underline" href="mailto:kolak@karlok.eu">kolak@karlok.eu</a>
          </p>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">{t('contact.hours.title')}</h2>
          <p>{t('contact.hours.text')}</p>
        </div>
        <div>
          <h2 className="text-xl font-semibold mb-2">{t('contact.company.title')}</h2>
          <p>
            Cijene d.o.o.<br />Savska cesta 32<br />10000 Zagreb, Croatia
          </p>
        </div>
      </section>
    </div>
  );
};
