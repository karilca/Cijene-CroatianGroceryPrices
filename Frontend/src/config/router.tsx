import { lazy, Suspense } from 'react';
// src/config/router.tsx
import { createBrowserRouter, RouterProvider } from 'react-router-dom';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { AppLayout } from '../components/layout/AppLayout';
const HomePage = lazy(() => import('../pages/HomePage').then(module => ({ default: module.HomePage })));
const ProductsPage = lazy(() => import('../pages/ProductsPage').then(module => ({ default: module.ProductsPage })));
const CompareProductPage = lazy(() => import('../pages/CompareProductPage').then(module => ({ default: module.CompareProductPage })));
const StoresPage = lazy(() => import('../pages/StoresPage').then(module => ({ default: module.StoresPage })));
const ChainsPage = lazy(() => import('../pages/ChainsPage').then(module => ({ default: module.ChainsPage })));
const ArchivesPage = lazy(() => import('../pages/ArchivesPage').then(module => ({ default: module.ArchivesPage })));
const FavoritesPage = lazy(() => import('../pages/FavoritesPage').then(module => ({ default: module.FavoritesPage })));
const SettingsPage = lazy(() => import('../pages/SettingsPage').then(module => ({ default: module.SettingsPage })));
const NotFoundPage = lazy(() => import('../pages/NotFoundPage').then(module => ({ default: module.NotFoundPage })));
const PrivacyPolicyPage = lazy(() => import('../pages/PrivacyPolicyPage').then(module => ({ default: module.PrivacyPolicyPage })));
const TermsOfServicePage = lazy(() => import('../pages/TermsOfServicePage').then(module => ({ default: module.TermsOfServicePage })));
const ContactPage = lazy(() => import('../pages/ContactPage').then(module => ({ default: module.ContactPage })));
const ChainDetails = lazy(() => import('../components/chain/ChainDetails').then(module => ({ default: module.ChainDetails })));
const CartPage = lazy(() => import('../pages/CartPage').then(module => ({ default: module.CartPage })));
const AuthPage = lazy(() => import('../pages/AuthPage').then(module => ({ default: module.AuthPage })));
import { RequireAdmin, RequireAuth } from '../components/auth/RouteGuards';

// UVOZ NOVE ADMIN STRANICE
const AdminDashboard = lazy(() => import('../pages/AdminDashboard'));
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
    element: (
      <Suspense fallback={
        <div className="flex h-screen w-screen items-center justify-center bg-gray-50">
          <LoadingSpinner size="lg" />
        </div>
      }>
        <AuthPage />
      </Suspense>
    ),
  },
  {
    path: "*",
    element: <AppLayout><NotFoundPage /></AppLayout>,
  },
]);

export function AppRouter() {
  return (
    <RouterProvider router={router} />
  );
}