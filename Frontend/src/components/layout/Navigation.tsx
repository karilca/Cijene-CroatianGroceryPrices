// src/components/layout/Navigation.tsx

import React, { useState } from 'react';
import { NavLink } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';
import { useAuth } from '../../hooks/useAuth';
import { useCartStore } from '../../stores/cartStore';

export const Navigation: React.FC = () => {
  const { t } = useLanguage();
  const { isAdmin } = useAuth();
  const loadCart = useCartStore((state) => state.loadCart);
  const isInitialized = useCartStore((state) => state.isInitialized);
  const itemCount = useCartStore((state) => state.itemCount);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  React.useEffect(() => {
    if (!isInitialized) {
      void loadCart();
    }
  }, [isInitialized, loadCart]);

  const toggleMobileMenu = () => {
    setIsMobileMenuOpen(!isMobileMenuOpen);
  };

  // Dinamička lista linkova koja uključuje Admin Dashboard samo za admine
  const navLinks = [
    { to: '/', label: t('nav.home') },
    { to: '/products', label: t('nav.products') },
    { to: '/stores', label: t('nav.stores') },
    { to: '/chains', label: t('nav.chains') },
    { to: '/archives', label: t('nav.archives') },
    { to: '/favorites', label: t('nav.favorites') },
    { to: '/cart', label: t('nav.cart') },
    ...(isAdmin ? [{ to: '/admin', label: t('nav.admin') }] : []),
  ];

  const navLinkClass = ({ isActive }: { isActive: boolean }) =>
    `text-gray-700 hover:text-primary-600 font-medium transition-colors flex items-center h-full ${
      isActive ? 'text-primary-600 border-b-2 border-primary-600' : ''
    }`;

  return (
    <nav className="bg-white border-b">
      <div className="container mx-auto px-4">
        {/* Desktop Navigation */}
        <div className="hidden md:flex items-center space-x-8 h-12">
          {navLinks.map((link) => (
            <NavLink key={link.to} to={link.to as string} className={navLinkClass}>
              {link.label}
              {link.to === '/cart' && itemCount > 0 && (
                <span className="ml-2 inline-flex min-w-[1.35rem] items-center justify-center rounded-full bg-primary-600 px-1.5 py-0.5 text-xs font-bold text-white">
                  {itemCount}
                </span>
              )}
            </NavLink>
          ))}
        </div>

        {/* Mobile Navigation Toggle */}
        <div className="md:hidden flex items-center justify-between h-12">
          <button
            onClick={toggleMobileMenu}
            className="inline-flex items-center justify-center p-2 rounded-md text-gray-700 hover:text-primary-600 hover:bg-gray-100 focus:outline-none"
            aria-expanded={isMobileMenuOpen}
          >
            <span className="sr-only">Open main menu</span>
            {!isMobileMenuOpen ? (
              <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 12h16M4 18h16" />
              </svg>
            ) : (
              <svg className="block h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
              </svg>
            )}
          </button>
        </div>

        {/* Mobile Menu Content */}
        {isMobileMenuOpen && (
          <div className="md:hidden">
            <div className="px-2 pt-2 pb-3 space-y-1 bg-white border-t shadow-lg">
              {navLinks.map((link) => (
                <NavLink
                  key={link.to}
                  to={link.to as string}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                    }`
                  }
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  <span>{link.label}</span>
                  {link.to === '/cart' && itemCount > 0 && (
                    <span className="ml-2 inline-flex min-w-[1.35rem] items-center justify-center rounded-full bg-primary-600 px-1.5 py-0.5 text-xs font-bold text-white">
                      {itemCount}
                    </span>
                  )}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};