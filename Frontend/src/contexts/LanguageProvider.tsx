import { useState, useEffect, type ReactNode } from 'react';
import { translations } from '../utils/translations';
import type { Language, TranslationKey } from '../utils/translations';
import { LanguageContext, LANGUAGE_KEY } from './LanguageContext';

export const LanguageProvider = ({ children }: { children: ReactNode }) => {
  const [language, setLanguageState] = useState<Language | null>(null);
  const [isInitialized, setIsInitialized] = useState(false);

  useEffect(() => {
    const savedLanguage = localStorage.getItem(LANGUAGE_KEY) as Language;
    if (savedLanguage && (savedLanguage === 'en' || savedLanguage === 'hr')) {
      setLanguageState(savedLanguage);
    }
    setIsInitialized(true);
  }, []);

  const setLanguage = (lang: Language) => {
    setLanguageState(lang);
    localStorage.setItem(LANGUAGE_KEY, lang);
  };

  const t = (key: TranslationKey): string => {
    const currentLang = language || 'en';
    return translations[currentLang][key] || key;
  };

  if (!isInitialized) {
    return null;
  }

  return (
    <LanguageContext.Provider value={{ language, setLanguage, t }}>
      {children}
    </LanguageContext.Provider>
  );
};
