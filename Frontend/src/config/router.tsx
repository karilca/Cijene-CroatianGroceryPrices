// src/config/router.tsx
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
import { CartPage } from '../pages/CartPage'; 
import { AuthPage } from '../pages/AuthPage';
import { RequireAdmin, RequireAuth } from '../components/auth/RouteGuards';

// UVOZ NOVE ADMIN STRANICE
import AdminDashboard from '../pages/AdminDashboard'; 

const router = createBrowserRouter([
  {
    path: "/",
    element: <AppLayout><HomePage /></AppLayout>,
    errorElement: <AppLayout><NotFoundPage /></AppLayout>,
  },
  {
    path: "/products",
    element: <RequireAuth><AppLayout><ProductsPage /></AppLayout></RequireAuth>,
  },
  {
    path: "/products/compare",
    element: <RequireAuth><AppLayout showBreadcrumbs={false}><CompareProductPage /></AppLayout></RequireAuth>,
  },
  {
    path: "/stores",
    element: <RequireAuth><AppLayout><StoresPage /></AppLayout></RequireAuth>,
  },
  {
    path: "/chains",
    element: <RequireAuth><AppLayout><ChainsPage /></AppLayout></RequireAuth>,
  },
  {
    path: "/chains/:chainCode",
    element: <RequireAuth><AppLayout showBreadcrumbs={false}><ChainDetails /></AppLayout></RequireAuth>,
  },
  {
    path: "/chains/:chainCode/stores",
    element: <RequireAuth><AppLayout showBreadcrumbs={false}><ChainDetails /></AppLayout></RequireAuth>,
  },
  {
    path: "/archives",
    element: <AppLayout><ArchivesPage /></AppLayout>,
  },
  {
    path: "/favorites",
    element: <RequireAuth><AppLayout><FavoritesPage /></AppLayout></RequireAuth>,
  },
  {
    path: "/cart",
    element: <RequireAuth><AppLayout><CartPage /></AppLayout></RequireAuth>,
  },
  // NOVA RUTA ZA ADMIN DASHBOARD
  {
    path: "/admin",
    element: <RequireAdmin><AppLayout><AdminDashboard /></AppLayout></RequireAdmin>,
  },
  {
    path: "/settings",
    element: <RequireAuth><AppLayout><SettingsPage /></AppLayout></RequireAuth>,
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
    path: "/auth",
    element: <AuthPage />,
  },
  {
    path: "*",
    element: <RequireAuth><AppLayout><NotFoundPage /></AppLayout></RequireAuth>,
  },
]);

export function AppRouter() {
  return <RouterProvider router={router} />;
}