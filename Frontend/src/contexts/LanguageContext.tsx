
import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import { translations } from '../utils/translations';
import type { Language, TranslationKey } from '../utils/translations';

interface LanguageContextType {
    language: Language | null;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey) => string;
}

const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

const LANGUAGE_KEY = 'app_language';

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
        const currentLang = language || 'en'; // Default to English if not set yet (though logic elsewhere might depend on null)
        return translations[currentLang][key] || key;
    };

    if (!isInitialized) {
        return null; // Or some loading state to prevent flash of wrong content
    }

    return (
        <LanguageContext.Provider value={{ language, setLanguage, t }}>
            {children}
        </LanguageContext.Provider>
    );
};

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
