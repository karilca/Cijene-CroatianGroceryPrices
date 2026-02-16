// Breadcrumb navigation component

import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { useLanguage } from '../../contexts/LanguageContext';

export interface BreadcrumbItem {
  label: string;
  path?: string;
}

export interface BreadcrumbProps {
  items?: BreadcrumbItem[];
  className?: string;
}

export const Breadcrumb: React.FC<BreadcrumbProps> = ({
  items,
  className = '',
}) => {
  const location = useLocation();
  const { t } = useLanguage();

  // Auto-generate breadcrumbs from current path if items not provided
  const breadcrumbItems = items || generateBreadcrumbsFromPath(location.pathname, t as (key: string) => string);

  if (breadcrumbItems.length <= 1) {
    return null; // Don't show breadcrumbs for single-level pages
  }

  return (
    <nav className={`flex ${className}`} aria-label="Breadcrumb">
      <ol className="inline-flex items-center space-x-1 md:space-x-3">
        {breadcrumbItems.map((item, index) => {
          const isLast = index === breadcrumbItems.length - 1;

          return (
            <li key={index} className="inline-flex items-center">
              {index > 0 && (
                <svg
                  className="w-3 h-3 text-gray-400 mx-1"
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path
                    fillRule="evenodd"
                    d="M7.293 14.707a1 1 0 010-1.414L10.586 10 7.293 6.707a1 1 0 011.414-1.414l4 4a1 1 0 010 1.414l-4 4a1 1 0 01-1.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}

              {isLast ? (
                <span className="text-sm font-medium text-gray-500 md:text-base">
                  {item.label}
                </span>
              ) : (
                <Link
                  to={item.path || '/'}
                  className="text-sm font-medium text-gray-700 hover:text-primary-600 md:text-base transition-colors"
                >
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
};

// Helper function to generate breadcrumbs from current path
const generateBreadcrumbsFromPath = (pathname: string, t: (key: string) => string): BreadcrumbItem[] => {
  const pathSegments = pathname.split('/').filter(Boolean);

  // Map path segments to translation keys
  const pathToTranslationKey: Record<string, string> = {
    'products': 'nav.products',
    'stores': 'nav.stores',
    'chains': 'nav.chains',
    'archives': 'nav.archives',
    'favorites': 'nav.favorites',
    'settings': 'auth.settings',
    'privacy': 'footer.legal.privacy',
    'terms': 'footer.legal.terms',
    'contact': 'footer.legal.contact',
  };

  const breadcrumbs: BreadcrumbItem[] = [
    { label: t('nav.home'), path: '/' }
  ];

  let currentPath = '';

  pathSegments.forEach((segment) => {
    currentPath += `/${segment}`;

    // Use translation if available, otherwise convert path segment to readable label
    const translationKey = pathToTranslationKey[segment.toLowerCase()];
    const label = translationKey
      ? t(translationKey)
      : segment
        .split('-')
        .map(word => word.charAt(0).toUpperCase() + word.slice(1))
        .join(' ');

    breadcrumbs.push({
      label,
      path: currentPath
    });
  });

  return breadcrumbs;
};
