import { useEffect, useState, type ReactNode } from 'react';
import { Navigate, useLocation } from 'react-router-dom';

import { apiUrl } from '../../config/api';
import { useAuth } from '../../hooks/useAuth';
import { supabase } from '../../lib/supabase';

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
  const { user, loading } = useAuth();
  const [isAdmin, setIsAdmin] = useState<boolean | null>(null);

  useEffect(() => {
    let mounted = true;

    const checkAdmin = async () => {
      if (!user) {
        if (mounted) setIsAdmin(false);
        return;
      }

      try {
        const { data: { session } } = await supabase.auth.getSession();
        if (!session?.access_token) {
          if (mounted) setIsAdmin(false);
          return;
        }

        const response = await fetch(apiUrl('/v1/admin/users'), {
          headers: {
            Authorization: `Bearer ${session.access_token}`,
          },
        });

        if (mounted) {
          setIsAdmin(response.ok);
        }
      } catch {
        if (mounted) {
          setIsAdmin(false);
        }
      }
    };

    setIsAdmin(null);
    checkAdmin();

    return () => {
      mounted = false;
    };
  }, [user]);

  if (loading || isAdmin === null) {
    return <LoadingFallback text="Provjera administratorskih ovlasti..." />;
  }

  if (!user) {
    return <Navigate to="/auth" replace />;
  }

  if (!isAdmin) {
    return <Navigate to="/" replace />;
  }

  return <>{children}</>;
};