import { useState, useEffect, type ReactNode, Suspense } from 'react';
import type { Language, TranslationKey } from '../utils/translations';
import { LanguageContext, LANGUAGE_KEY } from './LanguageContext';
import { useTranslation, I18nextProvider } from 'react-i18next';
import i18n from '../utils/i18n';

// Inner component to actually provide the context, uses `useTranslation` hook
const InnerProvider = ({ children }: { children: ReactNode }) => {
  const { t: i18nT, i18n: i18nInstance } = useTranslation();
  // We initialize to null if nothing in local storage so that we can show the popup.
  const [language, setLanguageState] = useState<Language | null>(null);

  useEffect(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY) as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'hr')) {
      i18nInstance.changeLanguage(savedLanguage);
      setLanguageState(savedLanguage);
    }
  }, [i18nInstance]);

  const setLanguage = (lang: Language) => {
    i18nInstance.changeLanguage(lang);
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);
  };

  const t = (key: TranslationKey): string => {
    return i18nT(key) as string;
  };

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  return (
    <Suspense fallback={null}>
      <I18nextProvider i18n={i18n}>
        <InnerProvider>{children}</InnerProvider>
      </I18nextProvider>
    </Suspense>
  );
};
