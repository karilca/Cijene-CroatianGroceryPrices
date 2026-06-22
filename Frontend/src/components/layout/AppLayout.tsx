// Main application layout component

import React, { Suspense } from 'react';
import { Header } from './Header';
import { Navigation } from './Navigation';
import { Footer } from './Footer';
import { Breadcrumb } from '../ui/Breadcrumb';
import { OfflineIndicator } from '../common/OfflineIndicator';
import { LoadingSpinner } from '../common/LoadingSpinner';

interface AppLayoutProps {
  children: React.ReactNode;
  showBreadcrumbs?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  showBreadcrumbs = true 
}) => {
  return (
    <div className="min-h-screen bg-gray-50 text-gray-900 flex flex-col transition-colors duration-300">
      <OfflineIndicator />
      <Header />
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-6 animate-page-in">
        {showBreadcrumbs && (
          <div className="mb-4">
            <Breadcrumb />
          </div>
        )}
        <Suspense fallback={
          <div className="flex h-64 items-center justify-center">
            <LoadingSpinner size="lg" />
          </div>
        }>
          {children}
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};
