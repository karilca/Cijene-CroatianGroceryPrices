import { useEffect, useRef, useState } from 'react';
import { LogOut, Settings, UserCircle2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../contexts/LanguageContext';

export const ProfileMenu = () => {
  const { user, signOut, signingOut } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();

  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState('');

  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) {
        setIsOpen(false);
      }
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsOpen(false);
      }
    };

    window.addEventListener('mousedown', handleClickOutside);
    window.addEventListener('keydown', handleEscape);

    return () => {
      window.removeEventListener('mousedown', handleClickOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  if (!user) {
    return null;
  }

  const handleSignOut = async () => {
    setError('');

    try {
      await signOut();
      setIsOpen(false);
      navigate('/', { replace: true });
    } catch (signOutError: unknown) {
      setError(signOutError instanceof Error ? signOutError.message : t('auth.genericError'));
    }
  };

  return (
    <div ref={containerRef} className="relative">
      <button
        type="button"
        onClick={() => setIsOpen((prev) => !prev)}
        className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-gray-200 bg-white text-gray-600 shadow-sm hover:bg-gray-50 hover:text-primary-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
        aria-label={t('auth.accountMenu')}
        aria-haspopup="menu"
        aria-expanded={isOpen}
      >
        <UserCircle2 className="h-5 w-5" />
      </button>

      {isOpen && (
        <div
          role="menu"
          className="absolute right-0 mt-2 w-64 rounded-lg border border-gray-100 bg-white p-2 shadow-xl"
        >
          <div className="px-2 py-2 border-b border-gray-100 mb-1">
            <p className="text-[11px] uppercase tracking-wider text-gray-400 font-semibold">{t('auth.loggedInAs')}</p>
            <p className="text-sm font-medium text-gray-700 truncate">{user.email}</p>
          </div>

          <button
            type="button"
            role="menuitem"
            onClick={() => {
              setIsOpen(false);
              navigate('/settings');
            }}
            className="w-full inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-primary-700"
          >
            <Settings className="h-4 w-4" />
            {t('auth.settings')}
          </button>

          <button
            type="button"
            role="menuitem"
            onClick={handleSignOut}
            disabled={signingOut}
            className="w-full inline-flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 hover:text-red-600 disabled:opacity-60 disabled:cursor-not-allowed"
          >
            <LogOut className="h-4 w-4" />
            {signingOut ? t('auth.signingOut') : t('auth.signout')}
          </button>

          {error && (
            <p className="mt-2 px-3 text-xs text-red-600">{error}</p>
          )}
        </div>
      )}
    </div>
  );
};
