
import React from 'react';
import { useLanguage } from '../../contexts/LanguageContext';

export const LanguageSelectionPopup: React.FC = () => {
    const { language, setLanguage, t } = useLanguage();

    // If language is already set, do not show the popup
    if (language) {
        return null;
    }

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-in fade-in duration-300">
            <div className="w-full max-w-md bg-white rounded-2xl shadow-2xl overflow-hidden transform transition-all animate-in zoom-in-95 duration-300">
                <div className="p-8 text-center">
                    <div className="mb-6 flex justify-center">
                        <div className="p-3 bg-primary-50 rounded-full">
                            <svg
                                xmlns="http://www.w3.org/2000/svg"
                                width="32"
                                height="32"
                                viewBox="0 0 24 24"
                                fill="none"
                                stroke="currentColor"
                                strokeWidth="2"
                                strokeLinecap="round"
                                strokeLinejoin="round"
                                className="text-primary-600"
                            >
                                <circle cx="12" cy="12" r="10"></circle>
                                <line x1="2" y1="12" x2="22" y2="12"></line>
                                <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"></path>
                            </svg>
                        </div>
                    </div>

                    <h2 className="text-2xl font-bold text-gray-900 mb-2">
                        {t('popup.title')}
                    </h2>
                    <p className="text-gray-500 mb-8">
                        Please select your preferred language
                    </p>

                    <div className="space-y-3">
                        <button
                            onClick={() => setLanguage('en')}
                            className="w-full py-3.5 px-4 bg-primary-600 hover:bg-primary-700 text-white font-semibold rounded-xl transition-all duration-200 shadow-lg hover:shadow-primary-500/30 flex items-center justify-center gap-2 group"
                        >
                            <span>{t('popup.english')}</span>
                            <span className="text-primary-200 text-sm font-normal group-hover:text-white transition-colors">(Default)</span>
                        </button>

                        <button
                            onClick={() => setLanguage('hr')}
                            className="w-full py-3.5 px-4 bg-white border-2 border-gray-100 hover:border-gray-200 hover:bg-gray-50 text-gray-700 font-semibold rounded-xl transition-all duration-200 flex items-center justify-center"
                        >
                            {t('popup.croatian')}
                        </button>
                    </div>
                </div>

                <div className="bg-gray-50 px-8 py-4 text-center text-xs text-gray-400">
                    This setting will be saved for your next visit
                </div>
            </div>
        </div>
    );
};
