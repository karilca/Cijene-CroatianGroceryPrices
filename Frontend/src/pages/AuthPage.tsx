import React, { useEffect, useState } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { useAuth } from '../hooks/useAuth';

export const AuthPage = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect') || '/products';
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isSignUp, setIsSignUp] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (user) {
      navigate(redirectTarget, { replace: true });
    }
  }, [user, navigate, redirectTarget]);

  if (user) {
    return null;
  }

  const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      if (isSignUp) {
        const { data, error } = await supabase.auth.signUp({ email, password });
        if (error) throw error;
        if (data.user) {
          alert('Registracija uspješna! Možete se prijaviti.');
          setIsSignUp(false);
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate(redirectTarget, { replace: true });
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Greška pri autentifikaciji');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4">
      <div className="w-full max-w-sm">

        {/* Logo */}
        <div className="flex justify-center mb-8">
          <div className="flex flex-col items-center gap-2">
            <div className="w-10 h-10 bg-red-600 rounded-sm flex items-center justify-center">
              <span className="text-white font-black text-lg leading-none">C</span>
            </div>
            <span className="text-xs font-bold text-gray-400 tracking-widest uppercase">Cijene</span>
          </div>
        </div>

        {/* Card */}
        <div className="bg-white border border-gray-100 rounded-xl shadow-sm overflow-hidden">

          {/* Tab toggle */}
          <div className="flex border-b border-gray-100">
            <button
              onClick={() => { setIsSignUp(false); setError(''); }}
              className={`flex-1 py-4 text-sm font-bold transition-colors ${
                !isSignUp
                  ? 'text-red-600 border-b-2 border-red-600 bg-white'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Prijava
            </button>
            <button
              onClick={() => { setIsSignUp(true); setError(''); }}
              className={`flex-1 py-4 text-sm font-bold transition-colors ${
                isSignUp
                  ? 'text-red-600 border-b-2 border-red-600 bg-white'
                  : 'text-gray-400 hover:text-gray-600'
              }`}
            >
              Registracija
            </button>
          </div>

          {/* Form */}
          <div className="p-6">
            <h1 className="text-xl font-bold text-gray-900 mb-1">
              {isSignUp ? 'Stvori račun' : 'Dobrodošli nazad'}
            </h1>
            <p className="text-sm text-gray-400 mb-6">
              {isSignUp
                ? 'Pridružite se i pratite cijene namirnica'
                : 'Prijavite se za pristup košarici i omiljenim'}
            </p>

            <form onSubmit={handleAuth} className="space-y-4">
              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1.5 tracking-widest">
                  Email adresa
                </label>
                <input
                  type="email"
                  placeholder="vas@email.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-red-400 transition-colors"
                />
              </div>

              <div>
                <label className="text-[10px] uppercase font-bold text-gray-400 block mb-1.5 tracking-widest">
                  Lozinka
                </label>
                <input
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-red-400 transition-colors"
                />
              </div>

              {error && (
                <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                  <p className="text-xs text-red-600 font-medium">{error}</p>
                </div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-red-600 hover:bg-red-700 disabled:bg-red-300 text-white font-bold py-3 rounded-lg text-sm transition-colors shadow-lg shadow-red-100 mt-2"
              >
                {loading ? 'Učitavanje...' : isSignUp ? 'Stvori račun' : 'Prijavi se'}
              </button>
            </form>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-6">
          Usporedba cijena namirnica u svim većim hrvatskim trgovačkim lancima.
        </p>
      </div>
    </div>
  );
};