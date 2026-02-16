// Router configuration for the application

import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { AppLayout } from '../components/layout/AppLayout';
import { HomePage } from '../pages/HomePage';
import { ProductsPage } from '../pages/ProductsPage';
import { CompareProductPage } from '../pages/CompareProductPage';
import { StoresPage } from '../pages/StoresPage';
import { ChainsPage } from '../pages/ChainsPage';
import { ArchivesPage } from '../pages/ArchivesPage';
import { FavoritesPage } from '../pages/FavoritesPage';
import { SettingsPage } from '../pages/SettingsPage';
import { NotFoundPage } from '../pages/NotFoundPage';
import { PrivacyPolicyPage } from '../pages/PrivacyPolicyPage';
import { TermsOfServicePage } from '../pages/TermsOfServicePage';
import { ContactPage } from '../pages/ContactPage';
import { ChainDetails } from '../components/chain/ChainDetails';
import { MobileOptimizationDemo } from '../components/common/MobileOptimizationDemo';

// Create router with all routes
const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout><HomePage /></AppLayout>,
    errorElement: <AppLayout><NotFoundPage /></AppLayout>,
  },
  {
    path: "/products",
    element: <AppLayout><ProductsPage /></AppLayout>,
  },
  {
    path: "/products/compare",
    element: <AppLayout showBreadcrumbs={false}><CompareProductPage /></AppLayout>,
  },
  {
    path: "/stores",
    element: <AppLayout><StoresPage /></AppLayout>,
  },
  {
    path: "/chains",
    element: <AppLayout><ChainsPage /></AppLayout>,
  },
  {
    path: "/chains/:chainCode",
    element: <AppLayout showBreadcrumbs={false}><ChainDetails /></AppLayout>,
  },
  {
    path: "/chains/:chainCode/stores",
    element: <AppLayout showBreadcrumbs={false}><ChainDetails /></AppLayout>,
  },
  {
    path: "/archives",
    element: <AppLayout><ArchivesPage /></AppLayout>,
  },
  {
    path: "/favorites",
    element: <AppLayout><FavoritesPage /></AppLayout>,
  },
  {
    path: "/settings",
    element: <AppLayout><SettingsPage /></AppLayout>,
  },
  {
    path: "/mobile-demo",
    element: <AppLayout><MobileOptimizationDemo /></AppLayout>,
  },
  {
    path: "/privacy",
    element: <AppLayout><PrivacyPolicyPage /></AppLayout>,
  },
  {
    path: "/terms",
    element: <AppLayout><TermsOfServicePage /></AppLayout>,
  },
  {
    path: "/contact",
    element: <AppLayout><ContactPage /></AppLayout>,
  },
  {
    path: "*",
    element: <AppLayout><NotFoundPage /></AppLayout>,
  },
]);

// Router provider component
export function AppRouter() {
  return <RouterProvider router={router} />
}
