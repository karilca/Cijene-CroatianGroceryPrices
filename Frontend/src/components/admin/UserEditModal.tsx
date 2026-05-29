import React, { useState, useEffect } from 'react';
import { createPortal } from 'react-dom';
import type { UserData, Role } from '../../services/admin.service';
import { Button } from '../ui/Button';
import { useLanguage } from '../../contexts/LanguageContext';

interface UserEditModalProps {
  user: UserData | null;
  roles: Role[];
  onClose: () => void;
  onSave: (user: UserData) => void;
  isUpdating: boolean;
}

export const UserEditModal: React.FC<UserEditModalProps> = ({ user, roles, onClose, onSave, isUpdating }) => {
  const { t } = useLanguage();

  const [name, setName] = useState('');
  const [roleId, setRoleId] = useState(0);
  const [isActive, setIsActive] = useState(true);

  useEffect(() => {
    if (user) {
      setName(user.name);
      setRoleId(user.role_id);
      setIsActive(user.is_active);
    }
  }, [user]);

  if (!user) return null;

  return createPortal(
    <div className="app-modal-overlay bg-black/20" style={{ zIndex: 9999 }}>
      <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white shadow-2xl overflow-hidden">
        <div className="p-6">
          <h2 className="text-lg font-bold text-gray-900">{t('admin.edit.title')}</h2>
          <div className="mt-4 space-y-4">
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 tracking-wide">
                {t('auth.fullName')}
              </label>
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm outline-none focus:border-primary-600"
              />
            </div>
            <div>
              <label className="block text-xs font-bold uppercase text-gray-500 tracking-wide">
                {t('admin.role')}
              </label>
              <select
                value={roleId}
                onChange={(e) => setRoleId(parseInt(e.target.value, 10))}
                className="mt-1 w-full rounded-md border border-gray-200 p-2 text-sm outline-none focus:border-primary-600"
              >
                {roles.map((r) => (
                  <option key={r.id} value={r.id}>{r.name}</option>
                ))}
              </select>
            </div>
            <div className="flex items-center mt-2">
              <input
                type="checkbox"
                id="edit-is-active"
                checked={isActive}
                onChange={(e) => setIsActive(e.target.checked)}
                className="mr-2"
              />
              <label htmlFor="edit-is-active" className="text-sm text-gray-700">
                {t('admin.status.active')}
              </label>
            </div>
          </div>
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
            onClick={() => onSave({ ...user, name, role_id: roleId, is_active: isActive })}
            isLoading={isUpdating}
            disabled={isUpdating || !name.trim()}
            className="flex-1"
          >
            {t('admin.save')}
          </Button>
        </div>
      </div>
    </div>,
    document.body
  );
};
