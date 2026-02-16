// Main application layout component

import React from 'react';
import { Header } from './Header';
import { Navigation } from './Navigation';
import { Footer } from './Footer';
import { Breadcrumb } from '../ui/Breadcrumb';
import { OfflineIndicator } from '../common/OfflineIndicator';

interface AppLayoutProps {
  children: React.ReactNode;
  showBreadcrumbs?: boolean;
}

export const AppLayout: React.FC<AppLayoutProps> = ({ 
  children, 
  showBreadcrumbs = true 
}) => {
  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <OfflineIndicator />
      <Header />
      <Navigation />
      <main className="flex-1 container mx-auto px-4 py-6">
        {showBreadcrumbs && (
          <div className="mb-4">
            <Breadcrumb />
          </div>
        )}
        {children}
      </main>
      <Footer />
    </div>
  );
};
