import { type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';

interface GuardProps {
  children: ReactNode;
}

const LoadingFallback = ({ text }: { text: string }) => (
  <div className="p-8 text-center text-gray-500">{text}</div>
);

export const RequireAuth: React.FC<GuardProps> = ({ children }) => {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingFallback text="Provjera prijave..." />;
  }

  if (!user) {
    const redirectTo = `${location.pathname}${location.search}`;
    return <Navigate to={`/auth?redirect=${encodeURIComponent(redirectTo)}`} replace />;
  }

  return <>{children}</>;
};

export const RequireAdmin: React.FC<GuardProps> = ({ children }) => {
  const { user, loading, isAdmin, adminLoading } = useAuth();

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (loading || (adminLoading && !isAdmin)) {
    return <LoadingFallback text="Provjera administratorskih ovlasti..." />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};