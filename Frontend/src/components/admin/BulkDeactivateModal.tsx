import React from 'react';
import { createPortal } from 'react-dom';
import { Button } from '../ui/Button';
import { useLanguage } from '../../contexts/LanguageContext';

interface BulkDeactivateModalProps {
  isOpen: boolean;
  count: number;
  onClose: () => void;
  onConfirm: () => void;
  isDeactivating: boolean;
}

export const BulkDeactivateModal: React.FC<BulkDeactivateModalProps> = ({ isOpen, count, onClose, onConfirm, isDeactivating }) => {
  const { t } = useLanguage();

  if (!isOpen) return null;

  return createPortal(
    <div className="app-modal-overlay bg-black/20" style={{ zIndex: 9999 }}>
      <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white shadow-2xl overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900">{t('admin.bulk.confirmDeactivateTitle')}</h2>
          <p className="mt-2 text-sm text-gray-600">
            {t('admin.bulk.confirmDeactivateMessage').replace('{count}', String(count))}
          </p>
        </div>
        <div className="flex gap-2 border-t border-gray-100 bg-gray-50 p-4">
          <Button
            type="button"
            variant="ghost"
            onClick={onClose}
            disabled={isDeactivating}
            className="flex-1"
          >
            {t('common.cancel')}
          </Button>
          <Button
            type="button"
            variant="danger"
            onClick={onConfirm}
            isLoading={isDeactivating}
            disabled={isDeactivating || count === 0}
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
