// Settings page component for user preferences

import React, { useState } from 'react';
import { Globe, CheckCircle } from 'lucide-react';
import { Card } from '../components/ui/Card';
import { useLanguage } from '../contexts/LanguageContext';

export const SettingsPage: React.FC = () => {
  const [showSuccess] = useState(false);
  const { t } = useLanguage();

  // Simple render without ProtectedRoute
  return (
    <div className="max-w-4xl mx-auto">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-3xl font-bold text-gray-900 mb-2">{t('settings.title')}</h1>
          <p className="text-gray-600">
            {t('settings.subtitle')}
          </p>
        </div>

        {showSuccess && (
          <div className="flex items-center gap-2 bg-green-100 text-green-800 px-4 py-2 rounded-lg">
            <CheckCircle className="w-5 h-5" />
            <span>{t('settings.saved')}</span>
          </div>
        )}
      </div>

      <div className="space-y-6">
        {/* Simple placeholder for settings content */}
        <Card className="p-6">
          <div className="flex items-center mb-4">
            <div className="flex items-center justify-center w-10 h-10 bg-primary-100 rounded-lg mr-3">
              <Globe className="w-5 h-5 text-primary-600" />
            </div>
            <div>
              <h2 className="text-xl font-semibold text-gray-900">{t('settings.title')}</h2>
              <p className="text-sm text-gray-600">{t('settings.manage')}</p>
            </div>
          </div>

          <div className="mt-4">
            <p className="text-gray-600">{t('settings.noAuth')}</p>
          </div>
        </Card>
      </div>
    </div>
  );
};