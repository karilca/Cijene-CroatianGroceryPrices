// Footer component

import React from 'react';
import { Link } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';

export const Footer: React.FC = () => {
  const { t } = useLanguage();
  return (
    <footer className="bg-gray-800 text-white py-8">
      <div className="container mx-auto px-4">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {/* About */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.about.title')}</h3>
            <p className="text-gray-300">
              {t('footer.about.text')}
            </p>
          </div>

          {/* Quick Links */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.quickLinks.title')}</h3>
            <ul className="space-y-2 text-gray-300">
              <li><Link to="/products" className="hover:text-white">{t('nav.products')}</Link></li>
              <li><Link to="/stores" className="hover:text-white">{t('nav.stores')}</Link></li>
              <li><Link to="/chains" className="hover:text-white">{t('nav.chains')}</Link></li>
              <li><Link to="/archives" className="hover:text-white">{t('nav.archives')}</Link></li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="text-lg font-semibold mb-4">{t('footer.legal.title')}</h3>
            <ul className="space-y-2 text-gray-300">
              <li><Link to="/privacy" className="hover:text-white">{t('footer.legal.privacy')}</Link></li>
              <li><Link to="/terms" className="hover:text-white">{t('footer.legal.terms')}</Link></li>
              <li><Link to="/contact" className="hover:text-white">{t('footer.legal.contact')}</Link></li>
            </ul>
          </div>
        </div>

        <div className="border-t border-gray-600 mt-8 pt-6 text-center text-gray-400">
          <p>&copy; {t('footer.copyright')}</p>
        </div>
      </div>
    </footer>
  );
};
