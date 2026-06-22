import { useEffect, useMemo, useState } from 'react';
import { Globe, KeyRound, Trash2, UserRound, Palette, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../components/common/NotificationContext';
import { supabase } from '../lib/supabase';
import { deleteOwnAccount, getUserProfile, updateUserProfile } from '../api/profile';
import { resolveApiErrorMessage } from '../utils/apiErrors';
import { useAppStore } from '../stores/appStore';

export const SettingsPage = () => {
  const navigate = useNavigate();
  const { language, setLanguage, t } = useLanguage();
  const { user, signOut } = useAuth();
  const { notifyError, notifySuccess } = useNotifications();
  const theme = useAppStore((state) => state.theme);
  const setTheme = useAppStore((state) => state.setTheme);

  const [loading, setLoading] = useState(true);
  const [profileEmail, setProfileEmail] = useState('');
  const [profileName, setProfileName] = useState('');
  const [connectionId, setConnectionId] = useState('');
  const [isSavingName, setIsSavingName] = useState(false);

  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isChangingPassword, setIsChangingPassword] = useState(false);

  const [confirmEmail, setConfirmEmail] = useState('');
  const [deleteReason, setDeleteReason] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);

  const resolvedEmail = useMemo(() => profileEmail || user?.email || '', [profileEmail, user?.email]);

  const themeOptions = useMemo(() => [
    {
      id: 'system' as const,
      name: language === 'hr' ? 'Sustav (automatski)' : 'System Default',
      primaryColor: '#6b7280',
      bgColor: '#f3f4f6',
      cardColor: '#ffffff',
    },
    {
      id: 'light' as const,
      name: language === 'hr' ? 'Svijetla (Crvena)' : 'Light (Red)',
      primaryColor: '#ef4444',
      bgColor: '#f9fafb',
      cardColor: '#ffffff',
    },
    {
      id: 'dark' as const,
      name: language === 'hr' ? 'Tamna (Sleek)' : 'Dark (Sleek)',
      primaryColor: '#f87171',
      bgColor: '#080d1a',
      cardColor: '#111827',
    },
    {
      id: 'emerald' as const,
      name: language === 'hr' ? 'Eko Zelena' : 'Emerald Eco',
      primaryColor: '#10b981',
      bgColor: '#f4fbf7',
      cardColor: '#ffffff',
    },
    {
      id: 'amber' as const,
      name: language === 'hr' ? 'Topla Jantarna' : 'Warm Honey',
      primaryColor: '#f59e0b',
      bgColor: '#faf8f5',
      cardColor: '#ffffff',
    },
    {
      id: 'ocean' as const,
      name: language === 'hr' ? 'Oceansko Plava' : 'Ocean Blue',
      primaryColor: '#0ea5e9',
      bgColor: '#f0f4f8',
      cardColor: '#ffffff',
    },
  ], [language]);

  useEffect(() => {
    const loadProfile = async () => {
      setLoading(true);
      try {
        const profile = await getUserProfile(supabase);
        setProfileEmail(profile.email || user?.email || '');
        setProfileName(profile.name || '');
        setConnectionId(profile.connection_id || '');
      } catch {
        setProfileEmail(user?.email || '');
        setProfileName('');
        setConnectionId('');
        notifyError(t('settings.profileLoadFailed'), t('common.error'));
      } finally {
        setLoading(false);
      }
    };

    void loadProfile();
  }, [notifyError, t, user?.email]);

  const saveName = async () => {
    const cleanedName = profileName.trim();

    if (cleanedName.length < 2) {
      notifyError(t('settings.nameTooShort'), t('common.error'));
      return;
    }

    if (cleanedName.length > 80) {
      notifyError(t('settings.nameTooLong'), t('common.error'));
      return;
    }

    try {
      setIsSavingName(true);
      await updateUserProfile(supabase, cleanedName, connectionId.trim() || undefined);
      await supabase.auth.updateUser({
        data: {
          full_name: cleanedName,
        },
      });
      notifySuccess(t('settings.nameSaved'));
    } catch (error: unknown) {
      notifyError(resolveApiErrorMessage(error, t, 'settings.nameSaveFailed'), t('common.error'));
    } finally {
      setIsSavingName(false);
    }
  };

  const changePassword = async () => {
    if (newPassword.length < 8) {
      notifyError(t('settings.passwordTooShort'), t('common.error'));
      return;
    }

    if (newPassword !== confirmPassword) {
      notifyError(t('settings.passwordMismatch'), t('common.error'));
      return;
    }

    try {
      setIsChangingPassword(true);
      const { error } = await supabase.auth.updateUser({
        password: newPassword,
      });
      if (error) {
        throw error;
      }

      setNewPassword('');
      setConfirmPassword('');
      notifySuccess(t('settings.passwordSaved'));
    } catch (error: unknown) {
      notifyError(resolveApiErrorMessage(error, t, 'settings.passwordSaveFailed'), t('common.error'));
    } finally {
      setIsChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (!resolvedEmail) {
      notifyError(t('settings.profileLoadFailed'), t('common.error'));
      return;
    }

    if (confirmEmail.trim().toLowerCase() !== resolvedEmail.trim().toLowerCase()) {
      notifyError(t('settings.deleteEmailMismatch'), t('common.error'));
      return;
    }

    try {
      setIsDeleting(true);
      await deleteOwnAccount(supabase, confirmEmail, deleteReason.trim() || undefined);
      await signOut();
      notifySuccess(t('settings.deleteSuccess'));
      navigate('/', { replace: true });
    } catch (error: unknown) {
      notifyError(resolveApiErrorMessage(error, t, 'settings.deleteFailed'), t('common.error'));
    } finally {
      setIsDeleting(false);
    }
  };

  if (loading) {
    return <div className="py-8 text-gray-500">{t('common.loading')}</div>;
  }

  return (
    <div className="max-w-4xl mx-auto space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('settings.title')}</h1>
        <p className="text-gray-600">{t('settings.subtitle')}</p>
      </div>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <UserRound className="w-5 h-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">{t('settings.profileTitle')}</h2>
        </div>
        <p className="text-sm text-gray-500 mb-4">{resolvedEmail}</p>
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('settings.nameLabel')}</label>
          <input
            type="text"
            value={profileName}
            onChange={(event) => setProfileName(event.target.value)}
            minLength={2}
            maxLength={80}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-colors"
          />

          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide mt-4">{t('settings.connectionId')}</label>
          <input
            type="text"
            value={connectionId}
            onChange={(event) => setConnectionId(event.target.value)}
            placeholder={t('settings.connectionIdPlaceholder')}
            maxLength={255}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-colors"
          />

          <Button onClick={() => void saveName()} isLoading={isSavingName}>{t('settings.saveName')}</Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <KeyRound className="w-5 h-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">{t('settings.passwordTitle')}</h2>
        </div>
        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('settings.newPasswordLabel')}</label>
          <input
            type="password"
            value={newPassword}
            onChange={(event) => setNewPassword(event.target.value)}
            minLength={8}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-colors"
          />

          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('settings.confirmPasswordLabel')}</label>
          <input
            type="password"
            value={confirmPassword}
            onChange={(event) => setConfirmPassword(event.target.value)}
            minLength={8}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-primary-500 focus:ring-2 focus:ring-primary-100 transition-colors"
          />

          <Button onClick={() => void changePassword()} isLoading={isChangingPassword}>{t('settings.savePassword')}</Button>
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Palette className="w-5 h-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">{language === 'hr' ? 'Vizualna Tema' : 'Visual Theme'}</h2>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {themeOptions.map((opt) => (
            <button
              key={opt.id}
              onClick={() => setTheme(opt.id)}
              className={`flex flex-col items-start p-4 rounded-xl border text-left transition-all duration-200 ${
                theme === opt.id
                  ? 'border-primary-500 ring-2 ring-primary-100 bg-primary-500/5'
                  : 'border-gray-200 hover:border-primary-300 hover:bg-gray-50/50'
              }`}
            >
              <div className="flex items-center justify-between w-full mb-3">
                <span className="font-semibold text-sm text-gray-800">{opt.name}</span>
                {theme === opt.id && (
                  <Check className="w-4.5 h-4.5 text-primary-600 shrink-0" />
                )}
              </div>
              <div className="flex gap-2.5 mt-auto">
                <div className="flex flex-col items-center">
                  <span className="w-5 h-5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: opt.primaryColor }} />
                  <span className="text-[10px] text-gray-400 mt-0.5">Accent</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="w-5 h-5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: opt.bgColor }} />
                  <span className="text-[10px] text-gray-400 mt-0.5">Bg</span>
                </div>
                <div className="flex flex-col items-center">
                  <span className="w-5 h-5 rounded-full border border-black/10 shadow-sm" style={{ backgroundColor: opt.cardColor }} />
                  <span className="text-[10px] text-gray-400 mt-0.5">Card</span>
                </div>
              </div>
            </button>
          ))}
        </div>
      </Card>

      <Card className="p-6">
        <div className="flex items-center gap-3 mb-4">
          <Globe className="w-5 h-5 text-primary-600" />
          <h2 className="text-xl font-semibold text-gray-900">{t('settings.languageTitle')}</h2>
        </div>
        <div className="flex flex-wrap gap-3">
          <Button
            variant={language === 'hr' ? 'primary' : 'outline'}
            onClick={() => setLanguage('hr')}
          >
            Hrvatski
          </Button>
          <Button
            variant={language === 'en' ? 'primary' : 'outline'}
            onClick={() => setLanguage('en')}
          >
            English
          </Button>
        </div>
      </Card>

      <Card className="p-6 border-red-200">
        <div className="flex items-center gap-3 mb-4">
          <Trash2 className="w-5 h-5 text-red-600" />
          <h2 className="text-xl font-semibold text-red-700">{t('settings.deleteTitle')}</h2>
        </div>
        <p className="text-sm text-gray-600 mb-4">{t('settings.deleteWarning')}</p>

        <div className="space-y-3">
          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('settings.deleteConfirmEmailLabel')}</label>
          <input
            type="email"
            value={confirmEmail}
            onChange={(event) => setConfirmEmail(event.target.value)}
            placeholder={resolvedEmail}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-colors"
          />

          <label className="text-xs font-semibold text-gray-500 uppercase tracking-wide">{t('settings.deleteReasonLabel')}</label>
          <textarea
            value={deleteReason}
            onChange={(event) => setDeleteReason(event.target.value)}
            rows={3}
            className="w-full border border-gray-200 rounded-lg px-3 py-2.5 text-sm text-gray-800 placeholder-gray-300 focus:outline-none focus:border-red-500 focus:ring-2 focus:ring-red-100 transition-colors"
          />

          <Button variant="danger" onClick={() => void handleDeleteAccount()} isLoading={isDeleting}>
            {t('settings.deleteAction')}
          </Button>
        </div>
      </Card>
    </div>
  );
};