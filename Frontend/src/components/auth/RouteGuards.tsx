import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../contexts/LanguageContext';

interface GuardProps {
  children: ReactNode;
}

const LoadingFallback = ({ text }: { text: string }) => (
  <div className="p-8 text-center text-gray-500">{text}</div>
);

export const RequireAuth: React.FC<GuardProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (loading) {
    return <LoadingFallback text={t('auth.checkLogin')} />;
  }

  if (!user) {
    const redirectTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/?auth=signin&redirect=${encodeURIComponent(redirectTo)}`} replace />;
  }

  return <>{children}</>;
};

export const RequireAdmin: React.FC<GuardProps> = ({ children }) => {
  const { user, loading, isAdmin, adminLoading } = useAuth();
  const { t } = useLanguage();
  const location = useLocation();

  if (!user) {
    const redirectTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/?auth=signin&redirect=${encodeURIComponent(redirectTo)}`} replace />;
  }

  if (loading || (adminLoading && !isAdmin)) {
    return <LoadingFallback text={t('auth.checkAdmin')} />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};