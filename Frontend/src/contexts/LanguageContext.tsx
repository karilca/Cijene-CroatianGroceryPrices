import { createContext, useContext } from 'react';
import type { Language, TranslationKey } from '../utils/translations';

interface LanguageContextType {
    language: Language | null;
    setLanguage: (lang: Language) => void;
    t: (key: TranslationKey) => string;
}

export const LanguageContext = createContext<LanguageContextType | undefined>(undefined);

export const LANGUAGE_KEY = 'app_language';

export const useLanguage = () => {
    const context = useContext(LanguageContext);
    if (context === undefined) {
        throw new Error('useLanguage must be used within a LanguageProvider');
    }
    return context;
};
