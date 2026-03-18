import { useEffect, useState, type ReactNode } from 'react';
import { supabase } from '../lib/supabase';
import type { Session, User } from '@supabase/supabase-js';
import { AuthContext } from './auth-context';
import { getFavoriteProducts, getFavoriteStores } from '../api/favorites';
import { useAppStore } from '../stores/appStore';

export const AuthProvider = ({ children }: { children: ReactNode }) => {
  const [user, setUser] = useState<User | null>(null);
  const [session, setSession] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);
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

    // 1. Inicijalna provjera sesije pri prvom učitavanju
    const initializeAuth = async () => {
      const { data: { session: currentSession } } = await supabase.auth.getSession();
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      await syncFavorites(currentSession);
      setLoading(false);
    };

    initializeAuth();

    // 2. SLUŠALICA ZA DOGAĐAJE (Login/Logout detekcija u realnom vremenu)
    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, currentSession) => {
      setSession(currentSession);
      setUser(currentSession?.user ?? null);
      void syncFavorites(currentSession).finally(() => setLoading(false));
    });

    // Cleanup funkcija da ne curi memorija
    return () => {
      subscription.unsubscribe();
    };
  }, [clearFavorites, setFavoriteProducts, setFavoriteStores]);

  return (
    <AuthContext.Provider value={{ user, session, loading }}>
      {!loading && children}
    </AuthContext.Provider>
  );
};