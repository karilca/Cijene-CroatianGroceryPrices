// src/components/layout/Navigation.tsx

import React, { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { Shield } from 'lucide-react'; // Dodana ikona za Admina
import { useLanguage } from '../../contexts/LanguageContext';
import { supabase } from '../../lib/supabase';
import { getCartCount } from '../../api/cart';

export const Navigation: React.FC = () => {
  const { t } = useLanguage();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [cartCount, setCartCount] = useState(0);
  const [isAdmin, setIsAdmin] = useState(false); // Stanje za provjeru admin ovlasti

  // Funkcija za osvježavanje broja stavki u košarici
  const refreshCount = async () => {
    const count = await getCartCount(supabase);
    setCartCount(count);
  };

  useEffect(() => {
    refreshCount();

    // Funkcija za provjeru admin statusa preko Supabase-a
    const checkAdminStatus = async () => {
  const { data: { session } } = await supabase.auth.getSession();
  if (!session) return;
  
  try {
    const res = await fetch('http://localhost:8080/v1/admin/users', {
      headers: { 'Authorization': `Bearer ${session.access_token}` }
    });
    if (res.ok) setIsAdmin(true);
  } catch {
    setIsAdmin(false);
  }
};

    checkAdminStatus();

    // Slušaj promjene u košarici
    window.addEventListener('cart-updated', refreshCount);

    return () => {
      window.removeEventListener('cart-updated', refreshCount);
    };
  }, []);

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
    // Ako je korisnik admin, umetni Admin link u polje
    ...(isAdmin ? [{ 
      to: '/admin', 
      label: (
        <span className="flex items-center gap-1">
          <Shield size={14} className="text-red-600" />
          Admin
        </span>
      ) 
    }] : []),
    { 
      to: '/cart', 
      label: (
        <span className="flex items-center gap-1">
          Košarica 
          {cartCount > 0 && (
            <span className="bg-red-500 text-white text-[10px] px-1.5 py-0.5 rounded-full font-bold">
              {cartCount}
            </span>
          )}
        </span>
      )
    },
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
            <NavLink key={typeof link.to === 'string' ? link.to : Math.random()} to={link.to as string} className={navLinkClass}>
              {link.label}
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
                  key={typeof link.to === 'string' ? link.to : Math.random()}
                  to={link.to as string}
                  className={({ isActive }) =>
                    `block px-3 py-2 rounded-md text-base font-medium transition-colors ${
                      isActive ? 'text-primary-600 bg-primary-50' : 'text-gray-700 hover:text-primary-600 hover:bg-gray-50'
                    }`
                  }
                  onClick={() => setIsMobileMenuOpen(false)}
                >
                  {link.label}
                </NavLink>
              ))}
            </div>
          </div>
        )}
      </div>
    </nav>
  );
};