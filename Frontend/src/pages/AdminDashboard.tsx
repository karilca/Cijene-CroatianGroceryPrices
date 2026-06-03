import React, { useEffect, useState } from 'react';
import { User, Trash2, Edit3 } from 'lucide-react';
import { useLanguage } from '../contexts/LanguageContext';
import { useNotifications } from '../components/common/NotificationContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';

import {
  useAdminUsers,
  useAdminRoles,
  useUpdateUser,
  useDeleteUser,
  useBulkDeactivateUsers,
  useBulkUpdateRole
} from '../hooks/useAdmin';
import type { UserData } from '../services/admin.service';

import {
  UserEditModal,
  UserDeleteModal,
  UserDeactivateModal,
  BulkDeactivateModal,
  AuditLogsTable
} from '../components/admin';

const AdminDashboard: React.FC = () => {
  const { t } = useLanguage();
  const { notifyError, notifySuccess } = useNotifications();

  const [userSearchInput, setUserSearchInput] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkRoleId, setBulkRoleId] = useState<number | ''>('');

  const [isBulkDeactivateConfirmOpen, setIsBulkDeactivateConfirmOpen] = useState(false);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<UserData | null>(null);
  const [pendingDeactivateUser, setPendingDeactivateUser] = useState<UserData | null>(null);

  const userPageSize = 10;

  useEffect(() => {
    const timer = window.setTimeout(() => {
      setUserPage(1);
      setUserSearchQuery(userSearchInput.trim());
    }, 350);
    return () => window.clearTimeout(timer);
  }, [userSearchInput]);

  useEffect(() => {
    setSelectedUserIds(new Set());
    setBulkRoleId('');
  }, [userPage, userSearchQuery]);

  const {
    data: usersData,
    isLoading: isLoadingUsers,
    error: usersError,
  } = useAdminUsers({
    limit: userPageSize,
    offset: (userPage - 1) * userPageSize,
    order: 'desc',
    sort_by: 'created_at',
    ...(userSearchQuery ? { q: userSearchQuery } : {}),
  });

  const { data: roles = [] } = useAdminRoles();

  const updateUser = useUpdateUser();
  const deleteUser = useDeleteUser();
  const bulkDeactivateUsers = useBulkDeactivateUsers();
  const bulkUpdateRole = useBulkUpdateRole();

  const users = usersData?.items || [];
  const userTotalCount = usersData?.total_count || 0;
  const pageCount = Math.max(1, Math.ceil(userTotalCount / userPageSize));

  const handleEditClick = (u: UserData) => setEditingUser({ ...u });

  const handleSaveUser = async (updatedUser: UserData) => {
    const original = users.find((u) => u.id === updatedUser.id);
    if (!original) return;

    if (original.is_active && !updatedUser.is_active) {
      setPendingDeactivateUser(updatedUser);
      setEditingUser(null);
      return;
    }

    try {
      await updateUser.mutateAsync({
        supabaseUid: updatedUser.supabase_uid,
        data: {
          name: updatedUser.name,
          is_active: updatedUser.is_active,
          role_id: updatedUser.role_id,
        },
      });
      notifySuccess(t('admin.updateSuccess'));
      setEditingUser(null);
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('admin.updateFailed');
      notifyError(msg, t('common.error'));
    }
  };

  const handleDeactivateConfirm = async () => {
    if (!pendingDeactivateUser) return;
    try {
      await updateUser.mutateAsync({
        supabaseUid: pendingDeactivateUser.supabase_uid,
        data: {
          name: pendingDeactivateUser.name,
          is_active: false,
          role_id: pendingDeactivateUser.role_id,
        },
      });
      notifySuccess(t('admin.updateSuccess'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('admin.updateFailed');
      notifyError(msg, t('common.error'));
    } finally {
      setPendingDeactivateUser(null);
    }
  };

  const handleDeleteClick = (u: UserData) => setPendingDeleteUser(u);

  const handleDeleteConfirm = async () => {
    if (!pendingDeleteUser) return;
    try {
      await deleteUser.mutateAsync({
        supabaseUid: pendingDeleteUser.supabase_uid,
        confirmEmail: pendingDeleteUser.email || '',
        reason: 'Hard delete via admin panel',
      });
      notifySuccess(t('admin.deleteSuccess'));
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('admin.deleteFailed');
      notifyError(msg, t('common.error'));
    } finally {
      setPendingDeleteUser(null);
    }
  };

  const toggleSelectUser = (uid: string) => {
    const newSet = new Set(selectedUserIds);
    if (newSet.has(uid)) newSet.delete(uid);
    else newSet.add(uid);
    setSelectedUserIds(newSet);
  };

  const toggleSelectAll = () => {
    if (selectedUserIds.size === users.length && users.length > 0) {
      setSelectedUserIds(new Set());
    } else {
      setSelectedUserIds(new Set(users.map((u) => u.supabase_uid)));
    }
  };

  const runBulkUpdateRole = async () => {
    if (selectedUserIds.size === 0 || !bulkRoleId) return;
    try {
      const res = await bulkUpdateRole.mutateAsync({ userIds: Array.from(selectedUserIds), roleId: Number(bulkRoleId) });
      notifySuccess(t('admin.bulk.roleUpdateSuccess').replace('{count}', String(res.successful)));
      if (res.failed > 0) {
        notifyError(t('admin.bulk.partialResult').replace('{failed}', String(res.failed)), t('common.error'));
      }
      setSelectedUserIds(new Set());
      setBulkRoleId('');
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('admin.bulk.failedRoleUpdate');
      notifyError(msg, t('common.error'));
    }
  };

  const runBulkDeactivate = async () => {
    if (selectedUserIds.size === 0) return;
    try {
      const res = await bulkDeactivateUsers.mutateAsync(Array.from(selectedUserIds));
      notifySuccess(t('admin.bulk.deactivateSuccess').replace('{count}', String(res.successful)));
      if (res.failed > 0) {
        notifyError(t('admin.bulk.partialResult').replace('{failed}', String(res.failed)), t('common.error'));
      }
      setSelectedUserIds(new Set());
    } catch (err) {
      const msg = err instanceof Error ? err.message : t('admin.bulk.failedDeactivate');
      notifyError(msg, t('common.error'));
    }
  };

  if (isLoadingUsers && !users.length) {
    return <LoadingSpinner />;
  }

  return (
    <div className="mx-auto max-w-7xl p-4 md:p-6 lg:p-8 space-y-6">
      <div className="flex items-center gap-3 border-b border-gray-200 pb-4">
        <User className="h-8 w-8 text-primary-600" />
        <h1 className="text-2xl font-bold text-gray-900">{t('admin.title')}</h1>
      </div>

      {usersError && <ErrorMessage message={usersError instanceof Error ? usersError.message : String(usersError)} />}

      <Card>
        <div className="flex flex-col gap-4 border-b border-gray-100 p-4 md:flex-row md:items-center md:justify-between">
          <input
            type="text"
            placeholder={t('admin.users.search.placeholder')}
            value={userSearchInput}
            onChange={(e) => setUserSearchInput(e.target.value)}
            className="w-full rounded-md border border-gray-200 p-2 text-sm outline-none focus:border-primary-600 md:w-64"
          />
          <div className="flex flex-wrap items-center gap-2">
            <select
              value={bulkRoleId}
              onChange={(e) => setBulkRoleId(e.target.value ? Number(e.target.value) : '')}
              className="rounded-md border border-gray-200 p-2 text-sm outline-none focus:border-primary-600"
              disabled={selectedUserIds.size === 0 || bulkUpdateRole.isPending}
            >
              <option value="">{t('admin.bulk.roleSelect')}</option>
              {roles.map((r) => (
                <option key={r.id} value={r.id}>{r.name}</option>
              ))}
            </select>
            <Button
              variant="outline"
              size="sm"
              onClick={() => void runBulkUpdateRole()}
              isLoading={bulkUpdateRole.isPending}
              disabled={selectedUserIds.size === 0 || !bulkRoleId || bulkUpdateRole.isPending}
            >
              {t('admin.bulk.applyRole')}
            </Button>
            <Button
              variant="danger"
              size="sm"
              onClick={() => setIsBulkDeactivateConfirmOpen(true)}
              disabled={selectedUserIds.size === 0 || bulkDeactivateUsers.isPending}
            >
              {t('admin.bulk.deactivate')}
            </Button>
          </div>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-sm text-gray-600">
            <thead className="bg-gray-50 text-xs uppercase text-gray-500">
              <tr>
                <th className="px-4 py-3">
                  <input
                    type="checkbox"
                    checked={selectedUserIds.size === users.length && users.length > 0}
                    onChange={toggleSelectAll}
                  />
                </th>
                <th className="px-4 py-3">{t('auth.fullName')}</th>
                <th className="px-4 py-3">{t('auth.email')}</th>
                <th className="px-4 py-3">{t('admin.role')}</th>
                <th className="px-4 py-3">{t('admin.accountStatus')}</th>
                <th className="px-4 py-3">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100 bg-white">
              {users.map((u) => (
                <tr key={u.id} className="hover:bg-gray-50">
                  <td className="px-4 py-3">
                    <input
                      type="checkbox"
                      checked={selectedUserIds.has(u.supabase_uid)}
                      onChange={() => toggleSelectUser(u.supabase_uid)}
                    />
                  </td>
                  <td className="px-4 py-3 font-medium text-gray-900">{u.name}</td>
                  <td className="px-4 py-3">{u.email || '-'}</td>
                  <td className="px-4 py-3">
                    <span className="rounded-full bg-blue-100 px-2 py-1 text-xs font-semibold text-blue-800">
                      {u.role_name}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {u.is_active ? (
                      <span className="rounded-full bg-green-100 px-2 py-1 text-xs font-semibold text-green-800">
                        {t('admin.status.active')}
                      </span>
                    ) : (
                      <span className="rounded-full bg-gray-100 px-2 py-1 text-xs font-semibold text-gray-800">
                        {t('admin.status.blocked')}
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleEditClick(u)}
                        disabled={updateUser.isPending}
                        title={t('admin.edit.title')}
                      >
                        <Edit3 className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleDeleteClick(u)}
                        disabled={deleteUser.isPending}
                        title={t('admin.confirmDeleteTitle')}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                      </Button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between border-t border-gray-100 p-4">
          <p className="text-xs text-gray-500">
            {t('admin.userCount').replace('{count}', String(userTotalCount))}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={userPage <= 1}
              onClick={() => setUserPage((p) => Math.max(1, p - 1))}
            >
              {t('common.previous')}
            </Button>
            <span className="text-xs text-gray-600">
              {t('common.page')} {userPage} {t('common.of')} {pageCount}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={userPage >= pageCount}
              onClick={() => setUserPage((p) => Math.min(pageCount, p + 1))}
            >
              {t('common.next')}
            </Button>
          </div>
        </div>
      </Card>

      <AuditLogsTable />

      <UserEditModal
        user={editingUser}
        roles={roles}
        onClose={() => setEditingUser(null)}
        onSave={handleSaveUser}
        isUpdating={updateUser.isPending}
      />

      <UserDeleteModal
        user={pendingDeleteUser}
        onClose={() => setPendingDeleteUser(null)}
        onConfirm={handleDeleteConfirm}
        isDeleting={deleteUser.isPending}
      />

      <UserDeactivateModal
        user={pendingDeactivateUser}
        onClose={() => setPendingDeactivateUser(null)}
        onConfirm={handleDeactivateConfirm}
        isUpdating={updateUser.isPending}
      />

      <BulkDeactivateModal
        isOpen={isBulkDeactivateConfirmOpen}
        count={selectedUserIds.size}
        onClose={() => setIsBulkDeactivateConfirmOpen(false)}
        onConfirm={() => {
          setIsBulkDeactivateConfirmOpen(false);
          void runBulkDeactivate();
        }}
        isDeactivating={bulkDeactivateUsers.isPending}
      />
    </div>
  );
};

export default AdminDashboard;
