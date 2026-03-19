import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { AuthContext } from './auth-context';
import { getFavoriteProducts, getFavoriteStores } from '../api/favorites';
import { useAppStore } from '../stores/appStore';
import { apiUrl } from '../config/api';

const adminCacheKey = (uid: string) => `admin-status:${uid}`;

const readCachedAdminStatus = (uid: string): boolean | null => {
  if (typeof window === 'undefined') return null;

  const value = window.localStorage.getItem(adminCacheKey(uid));
  if (value === null) return null;
  return value === 'true';
};

const writeCachedAdminStatus = (uid: string, isAdmin: boolean) => {
  if (typeof window === 'undefined') return;
  window.localStorage.setItem(adminCacheKey(uid), String(isAdmin));
};

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [adminLoading, setAdminLoading] = useState(true);
  const setFavoriteProducts = useAppStore((state) => state.setFavoriteProducts);
  const setFavoriteStores = useAppStore((state) => state.setFavoriteStores);
  const clearFavorites = useAppStore((state) => state.clearFavorites);

  useEffect(() => {
    const syncFavorites = async (currentSession: Session | null) => {
      if (!currentSession) {
        clearFavorites();
        return;
      }

      try {
        const [products, stores] = await Promise.all([
          getFavoriteProducts(supabase),
          getFavoriteStores(supabase),
        ]);
        setFavoriteProducts(products);
        setFavoriteStores(stores);
      } catch {
        clearFavorites();
      }
    };

    const hydrateAdminStatus = (currentSession: Session | null) => {
      if (!currentSession?.user?.id) {
        setIsAdmin(false);
        setAdminLoading(false);
        return;
      }

      const cached = readCachedAdminStatus(currentSession.user.id);
      setIsAdmin(cached === true);
      setAdminLoading(false);
    };

    const checkAdminStatus = async (currentSession: Session | null) => {
      if (!currentSession?.access_token || !currentSession.user?.id) {
        setIsAdmin(false);
        setAdminLoading(false);
        return;
      }

      setAdminLoading(true);
      try {
        const response = await fetch(apiUrl('/v1/admin/users'), {
          headers: {
            Authorization: `Bearer ${currentSession.access_token}`,
          },
        });
        setIsAdmin(response.ok);
        writeCachedAdminStatus(currentSession.user.id, response.ok);
      } catch {
        // Keep the last known state on network errors to avoid UI flicker.
      } finally {
        setAdminLoading(false);
      }
    };

    // 1. Inicijalna provjera sesije pri prvom učitavanju
    const initializeAuth = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      hydrateAdminStatus(currentSession);
      await syncFavorites(currentSession);
      setLoading(false);
      void checkAdminStatus(currentSession);
    };

    initializeAuth();

    // 2. SLUŠALICA ZA DOGAĐAJE (Login/Logout detekcija u realnom vremenu)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      hydrateAdminStatus(currentSession);
      void syncFavorites(currentSession).finally(() => setLoading(false));
      void checkAdminStatus(currentSession);
    });

    // Cleanup funkcija da ne curi memorija
    return () => {
      subscription.unsubscribe();
    };
  }, [clearFavorites, setFavoriteProducts, setFavoriteStores]);

  return (
    <AuthContext.Provider value={{ user, session, loading, isAdmin, adminLoading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};