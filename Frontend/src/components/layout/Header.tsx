// Header component with logo

import { useEffect, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';

import { useAuth } from '../../hooks/useAuth';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/Button';
import { AuthModal } from '../auth/AuthModal';
import { ProfileMenu } from '../auth/ProfileMenu';

export function Header() {
  const { user } = useAuth();
  const { t } = useLanguage();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const redirectTarget = searchParams.get('redirect');
  const [isAuthModalOpen, setIsAuthModalOpen] = useState(false);
  const [authMode, setAuthMode] = useState<'signin' | 'signup'>('signin');

  const openAuthModal = (mode: 'signin' | 'signup') => {
    setAuthMode(mode);
    setIsAuthModalOpen(true);
  };

  const closeAuthModal = () => {
    setIsAuthModalOpen(false);

    const nextParams = new URLSearchParams(searchParams);
    nextParams.delete('auth');
    nextParams.delete('mode');
    nextParams.delete('redirect');

    const queryString = nextParams.toString();
    navigate(queryString ? `/?${queryString}` : '/', { replace: true });
  };

  const handleAuthenticated = () => {
    setIsAuthModalOpen(false);
    navigate(redirectTarget || '/', { replace: true });
  };

  useEffect(() => {
    if (user) {
      return;
    }

    const authParam = searchParams.get('auth');
    const modeParam = searchParams.get('mode');

    if (authParam !== 'signin' && authParam !== 'signup') {
      return;
    }

    setAuthMode(modeParam === 'signup' || authParam === 'signup' ? 'signup' : 'signin');
    setIsAuthModalOpen(true);
  }, [searchParams, user]);

  return (
    <header className="bg-white shadow-sm border-b relative z-30">
      <div className="container mx-auto px-4">
        <div className="flex items-center justify-between h-16">
          {/* Logo */}
          <Link to="/" className="flex items-center flex-shrink-0">
            <img src="/logo.svg" alt="Cijene" className="h-12 md:h-16 lg:h-20 object-contain" />
            <span className="sr-only">Cijene</span>
          </Link>

          <div className="flex items-center gap-2">
            {!user ? (
              <>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => openAuthModal('signin')}
                >
                  {t('auth.signin')}
                </Button>
                <Button
                  type="button"
                  size="sm"
                  onClick={() => openAuthModal('signup')}
                >
                  {t('auth.signup')}
                </Button>
              </>
            ) : (
              <ProfileMenu />
            )}
          </div>
        </div>
      </div>

      <AuthModal
        isOpen={isAuthModalOpen}
        initialMode={authMode}
        onAuthenticated={handleAuthenticated}
        onClose={closeAuthModal}
      />
    </header>
  );
}
