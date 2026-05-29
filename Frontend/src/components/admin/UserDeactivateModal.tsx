import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import type { UserData } from '../../services/admin.service';
import { Button } from '../ui/Button';
import { useLanguage } from '../../contexts/LanguageContext';

interface UserDeactivateModalProps {
  user: UserData | null;
  onClose: () => void;
  onConfirm: () => void;
  isUpdating: boolean;
}

export const UserDeactivateModal: React.FC<UserDeactivateModalProps> = ({ user, onClose, onConfirm, isUpdating }) => {
  const { t } = useLanguage();
  const [confirmEmail, setConfirmEmail] = useState('');

  if (!user) return null;

  const isEmailMatch = confirmEmail === user.email;

  return createPortal(
    <div className="app-modal-overlay bg-black/20" style={{ zIndex: 9999 }}>
      <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white shadow-2xl overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900">{t('admin.confirmDeactivateTitle')}</h2>
          <p className="mt-2 text-sm text-gray-600">{t('admin.deactivateConfirm')}</p>
          <p className="mt-3 text-sm font-semibold text-gray-800">
            {t('admin.deactivateConfirmInstruction').replace('{email}', user.email || '-')}
          </p>

          <label className="mt-4 block text-xs font-bold uppercase text-gray-500 tracking-wide">
            {t('admin.confirmEmailLabel')}
          </label>
          <input
            type="email"
            value={confirmEmail}
            onChange={(e) => setConfirmEmail(e.target.value)}
            placeholder={t('admin.confirmEmailPlaceholder')}
            className="mt-2 w-full rounded-md border border-gray-200 p-2 text-sm outline-none focus:border-primary-600"
          />
          {confirmEmail.length > 0 && !isEmailMatch && (
            <p className="mt-2 text-xs text-red-600">{t('admin.confirmEmailMismatch')}</p>
          )}
        </div>
        <div className="flex gap-2 border-t border-gray-100 bg-gray-50 p-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isUpdating}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            isLoading={isUpdating}
            disabled={!isEmailMatch || isUpdating}
            className="flex-1"
          >
            {t('common.confirm')}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
