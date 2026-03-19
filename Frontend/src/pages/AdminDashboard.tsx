import React, { useCallback, useEffect, useState } from 'react';
import { User, Trash2, Edit3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { apiUrl } from '../config/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotifications } from '../components/common/NotificationContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { ConfirmDialog } from '../components/common/ConfirmDialog';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

// --- INTERFACES ---
interface Role {
  id: number;
  name: string;
}

interface UserData {
  id: number;
  name: string;
  is_active: boolean;
  role_id: number;
  role_name: string;
  supabase_uid: string;
  created_at: string;
}

const AdminDashboard: React.FC = () => {
  const { t } = useLanguage();
  const { notifyError, notifySuccess } = useNotifications();
  const [users, setUsers] = useState<UserData[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pendingDeleteUserId, setPendingDeleteUserId] = useState<string | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setPageError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error(t('admin.usersLoadFailed'));
      }

      const headers = { 'Authorization': `Bearer ${session?.access_token}` };

      const [uRes, rRes] = await Promise.all([
        fetch(apiUrl('/v1/admin/users'), { headers }),
        fetch(apiUrl('/v1/admin/roles'), { headers })
      ]);

      if (uRes.ok && rRes.ok) {
        setUsers(await uRes.json());
        setRoles(await rRes.json());
      } else {
        throw new Error(t('admin.usersLoadFailed'));
      }
    } catch (err) {
      const message = err instanceof Error ? err.message : t('admin.usersLoadFailed');
      setPageError(message);
      notifyError(message, t('common.error'));
    } finally {
      setLoading(false);
    }
  }, [notifyError, t]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const handleUpdate = async () => {
    if (!editingUser) return;
    try {
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(apiUrl(`/v1/admin/users/${editingUser.supabase_uid}`), {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          is_active: editingUser.is_active,
          role_id: editingUser.role_id
        })
      });

      if (res.ok) {
        setEditingUser(null);
        notifySuccess(t('admin.updateSuccess'));
        await fetchData();
      } else {
        throw new Error(t('admin.updateFailed'));
      }
    } catch {
      notifyError(t('admin.updateFailed'), t('common.error'));
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteUserId) return;

    try {
      setIsDeleting(true);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(apiUrl(`/v1/admin/users/${pendingDeleteUserId}`), {
        method: 'DELETE',
        headers: { 'Authorization': `Bearer ${session?.access_token}` }
      });
      if (res.ok) {
        notifySuccess(t('admin.deleteSuccess'));
        await fetchData();
      } else {
        throw new Error(t('admin.deleteFailed'));
      }
    } catch {
      notifyError(t('admin.deleteFailed'), t('common.error'));
    } finally {
      setIsDeleting(false);
      setPendingDeleteUserId(null);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <LoadingSpinner size="lg" />
        <span className="ml-3 text-gray-600">{t('admin.loading')}</span>
      </div>
    );
  }

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-20 text-gray-800">
      {pageError && (
        <ErrorMessage
          title={t('common.error')}
          message={pageError}
          onRetry={() => void fetchData()}
        />
      )}

      <div>
        <div className="flex flex-col gap-4 sm:flex-row sm:justify-between sm:items-end mb-8 border-b border-gray-100 pb-4">
          <div>
            <h1 className="text-2xl font-bold text-gray-900">{t('admin.title')}</h1>
            <p className="text-gray-500 text-sm mt-1">{t('admin.subtitle')}</p>
          </div>
          <div className="bg-primary-600 text-white px-3 py-1 rounded-full text-xs font-bold">
            {t('admin.userCount').replace('{count}', users.length.toString())}
          </div>
        </div>

        <div className="grid grid-cols-1 gap-4">
          {users.map((user) => (
            <Card key={user.supabase_uid} className="p-5 hover:shadow-md transition-shadow">
              <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
              <div className="flex items-center gap-4">
                <div className="relative">
                  <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                    <User size={20} className="text-gray-400" />
                  </div>
                  <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${user.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                </div>
                <div>
                  <h3 className="font-bold text-gray-900">{user.name}</h3>
                  <p className="text-xs text-gray-400 font-mono uppercase tracking-tighter">{t('admin.uid')}: {user.supabase_uid.slice(0, 12)}...</p>
                </div>
              </div>

              <div className="flex items-center justify-between md:justify-end gap-4 md:gap-8">
                <div className="text-left md:text-center">
                  <p className="text-[10px] uppercase font-bold text-gray-400 mb-1 tracking-widest">{t('admin.role')}</p>
                  <span className={`text-xs font-bold px-2 py-1 rounded ${user.role_name === 'ADMIN' ? 'bg-black text-white' : 'bg-gray-100 text-gray-600'}`}>
                    {user.role_name}
                  </span>
                </div>

                <div className="flex gap-2">
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setEditingUser(user)}
                    className="w-10 h-10 !p-0 rounded-full border border-gray-200 text-gray-400 hover:border-primary-600 hover:text-primary-600"
                  >
                    <Edit3 size={18} />
                  </Button>
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => setPendingDeleteUserId(user.supabase_uid)}
                    className="w-10 h-10 !p-0 rounded-full border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-600"
                  >
                    <Trash2 size={18} />
                  </Button>
                </div>
              </div>
              </div>
            </Card>
          ))}
        </div>
      </div>

      {editingUser && (
        <div className="fixed inset-0 bg-black/20 backdrop-blur-sm flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl w-full max-w-sm border border-gray-100 overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-bold mb-1">{t('admin.edit.title')}</h2>
              <p className="text-sm text-gray-500 mb-6">{editingUser.name}</p>

              <div className="space-y-6">
                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-2 tracking-widest">{t('admin.accountStatus')}</label>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingUser({...editingUser, is_active: true})}
                      className={`flex-1 ${editingUser.is_active ? '!bg-green-600 !border-green-600 !text-white hover:!bg-green-700' : '!text-gray-700'}`}
                    >
                      {t('admin.status.active')}
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setEditingUser({...editingUser, is_active: false})}
                      className={`flex-1 ${!editingUser.is_active ? '!bg-red-600 !border-red-600 !text-white hover:!bg-red-700' : '!text-gray-700'}`}
                    >
                      {t('admin.status.blocked')}
                    </Button>
                  </div>
                </div>

                <div>
                  <label className="text-[10px] uppercase font-bold text-gray-400 block mb-2 tracking-widest">{t('admin.assignedRole')}</label>
                  <select 
                    value={editingUser.role_id}
                    onChange={(e) => setEditingUser({...editingUser, role_id: parseInt(e.target.value)})}
                    className="w-full border border-gray-200 rounded-md p-2 text-sm focus:border-primary-600 outline-none transition-colors"
                  >
                    {roles.map(r => <option key={r.id} value={r.id}>{r.name}</option>)}
                  </select>
                </div>
              </div>
            </div>

            <div className="p-4 bg-gray-50 flex gap-2">
              <Button
                variant="ghost"
                onClick={() => setEditingUser(null)}
                className="flex-1 text-sm font-bold text-gray-500 hover:text-gray-800"
              >
                {t('admin.cancel')}
              </Button>
              <Button
                onClick={handleUpdate}
                className="flex-1 text-sm font-bold shadow-lg shadow-primary-100"
              >
                {t('admin.save')}
              </Button>
            </div>
          </div>
        </div>
      )}

      <ConfirmDialog
        isOpen={pendingDeleteUserId !== null}
        title={t('admin.confirmDeleteTitle')}
        message={t('admin.deleteConfirm')}
        confirmLabel={t('common.confirm')}
        cancelLabel={t('common.cancel')}
        onConfirm={() => void handleDelete()}
        onCancel={() => setPendingDeleteUserId(null)}
        isLoading={isDeleting}
      />
    </div>
  );
};

export default AdminDashboard;