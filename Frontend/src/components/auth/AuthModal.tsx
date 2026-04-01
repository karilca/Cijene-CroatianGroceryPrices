import { useEffect, useRef, useState, type FormEvent, type KeyboardEvent as ReactKeyboardEvent } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

import { supabase } from '../../lib/supabase';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/Button';

interface AuthModalProps {
  isOpen: boolean;
  onClose: () => void;
  initialMode?: 'signin' | 'signup';
  onAuthenticated?: () => void | Promise<void>;
  closeOnOverlayClick?: boolean;
}

const getLocalizedAuthError = (error: unknown, fallback: string, invalidCredentials: string): string => {
  if (error instanceof Error) {
    const normalizedMessage = error.message.trim().toLowerCase();
    if (normalizedMessage === 'invalid login credentials') {
      return invalidCredentials;
    }

    return error.message;
  }

  return fallback;
};

export const AuthModal = ({
  isOpen,
  onClose,
  initialMode = 'signin',
  onAuthenticated,
  closeOnOverlayClick = true,
}: AuthModalProps) => {
  const { t } = useLanguage();
  const [mode, setMode] = useState<'signin' | 'signup'>(initialMode);
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [info, setInfo] = useState('');

  const panelRef = useRef<HTMLDivElement>(null);
  const firstInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (!isOpen) return;
    setMode(initialMode);
    setFullName('');
    setEmail('');
    setPassword('');
    setError('');
    setInfo('');
  }, [isOpen, initialMode]);

  useEffect(() => {
    if (!isOpen) return;

    firstInputRef.current?.focus();

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        onClose();
      }
    };

    window.addEventListener('keydown', handleEscape);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleEscape);
    };
  }, [isOpen, onClose]);

  if (!isOpen) {
    return null;
  }

  const handleAuth = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setLoading(true);
    setError('');
    setInfo('');

    try {
      if (mode === 'signup') {
        const cleanedFullName = fullName.trim();
        if (cleanedFullName.length < 2) {
          throw new Error(t('auth.nameTooShort'));
        }

        const { data, error: signUpError } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: {
              full_name: cleanedFullName,
            },
          },
        });
        if (signUpError) throw signUpError;

        if (data.user) {
          setInfo(t('auth.registrationSuccess'));
          setMode('signin');
        }
      } else {
        const { error: signInError } = await supabase.auth.signInWithPassword({ email, password });
        if (signInError) throw signInError;

        if (onAuthenticated) {
          await onAuthenticated();
        } else {
          onClose();
        }
      }
    } catch (authError: unknown) {
      setError(getLocalizedAuthError(authError, t('auth.genericError'), t('auth.invalidCredentials')));
    } finally {
      setLoading(false);
    }
  };

  const handlePanelKeyDown = (event: ReactKeyboardEvent<HTMLDivElement>) => {
    if (event.key !== 'Tab') return;

    const focusableElements = panelRef.current?.querySelectorAll<HTMLElement>(
      'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
    );

    if (!focusableElements || focusableElements.length === 0) return;

    const firstElement = focusableElements[0];
    const lastElement = focusableElements[focusableElements.length - 1];

    if (event.shiftKey && document.activeElement === firstElement) {
      event.preventDefault();
      lastElement.focus();
      return;
    }

    if (!event.shiftKey && document.activeElement === lastElement) {
      event.preventDefault();
      firstElement.focus();
    }
  };

  const switchMode = (nextMode: 'signin' | 'signup') => {
    setMode(nextMode);
    setError('');
    setInfo('');
  };

  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div
      className="app-modal-overlay bg-black/30"
      style={{ zIndex: 9999 }}
      onClick={closeOnOverlayClick ? onClose : undefined}
      aria-hidden={false}
    >
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-label={mode === 'signup' ? t('auth.signup') : t('auth.signin')}
        onClick={(event) => event.stopPropagation()}
        onKeyDown={handlePanelKeyDown}
        className="w-full max-w-md rounded-xl border border-gray-100 bg-white shadow-2xl overflow-hidden"
      >
        <div className="flex items-center justify-between border-b border-gray-100 px-5 py-4">
          <h2 className="text-base font-semibold text-gray-900">
            {mode === 'signup' ? t('auth.signup') : t('auth.signin')}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="inline-flex h-9 w-9 items-center justify-center rounded-md text-gray-500 hover:bg-gray-100 hover:text-gray-700 focus:outline-none focus:ring-2 focus:ring-primary-500"
            aria-label={t('auth.close')}
          >
            <X className="h-4 w-4" />
          </button>
        </div>

        <div className="p-5">
          <div className="flex rounded-lg border border-gray-200 p-1 mb-5 bg-gray-50">
            <button
              type="button"
              onClick={() => switchMode('signin')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                mode === 'signin'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('auth.signin')}
            </button>
            <button
              type="button"
              onClick={() => switchMode('signup')}
              className={`flex-1 rounded-md px-3 py-2 text-sm font-semibold transition-colors ${
                mode === 'signup'
                  ? 'bg-white text-primary-700 shadow-sm'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {t('auth.signup')}
            </button>
          </div>

          <h3 className="text-xl font-bold text-gray-900">
            {mode === 'signup' ? t('auth.createAccountTitle') : t('auth.welcomeBack')}
          </h3>
          <p className="mt-1 text-sm text-gray-500">
            {mode === 'signup' ? t('auth.createAccountSubtitle') : t('auth.signinSubtitle')}
          </p>

          <form onSubmit={handleAuth} className="space-y-4 mt-5">
            {mode === 'signup' && (
              <div>
                <label className="text-xs font-semibold text-gray-500 block mb-1.5 uppercase tracking-wide">
                  {t('auth.fullName')}
                </label>
                <input
                  ref={firstInputRef}
                  type="text"
                  placeholder={t('auth.fullNamePlaceholder')}
                  value={fullName}
                  onChange={(event) => setFullName(event.target.value)}
                  required
                  minLength={2}
                  maxLength={80}
                  className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-colors"
                />
              </div>
            )}

            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5 uppercase tracking-wide">
                {t('auth.email')}
              </label>
              <input
                ref={mode === 'signup' ? undefined : firstInputRef}
                type="email"
                placeholder={t('auth.emailPlaceholder')}
                value={email}
                onChange={(event) => setEmail(event.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-colors"
              />
            </div>

            <div>
              <label className="text-xs font-semibold text-gray-500 block mb-1.5 uppercase tracking-wide">
                {t('auth.password')}
              </label>
              <input
                type="password"
                placeholder="********"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                required
                className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-colors"
              />
            </div>

            {error && (
              <div className="bg-red-50 border border-red-100 rounded-lg px-3 py-2.5">
                <p className="text-xs text-red-600 font-medium">{error}</p>
              </div>
            )}

            {info && (
              <div className="bg-green-50 border border-green-100 rounded-lg px-3 py-2.5">
                <p className="text-xs text-green-700 font-medium">{info}</p>
              </div>
            )}

            <Button type="submit" className="w-full" isLoading={loading}>
              {loading ? t('common.loading') : mode === 'signup' ? t('auth.signup') : t('auth.signin')}
            </Button>
          </form>
        </div>
      </div>
    </div>, document.body
  );
};
