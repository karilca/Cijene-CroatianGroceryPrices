import React, { useCallback, useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { User, Trash2, Edit3 } from 'lucide-react';
import { supabase } from '../lib/supabase';
import { apiUrl } from '../config/api';
import { useLanguage } from '../contexts/LanguageContext';
import { useAuth } from '../hooks/useAuth';
import { useNotifications } from '../components/common/NotificationContext';
import { LoadingSpinner } from '../components/common/LoadingSpinner';
import { ErrorMessage } from '../components/common/ErrorMessage';
import { Card } from '../components/ui/Card';
import { Button } from '../components/ui/Button';
import { createLocalizedApiErrorFromPayload, resolveApiErrorMessage } from '../utils/apiErrors';

// --- INTERFACES ---
interface Role {
  id: number;
  name: string;
}

interface UserData {
  id: number;
  name: string;
  email: string | null;
  is_active: boolean;
  role_id: number;
  role_name: string;
  supabase_uid: string;
  created_at: string;
  deleted_at: string | null;
}

interface AuditLogEntry {
  id: number;
  actor_email: string | null;
  target_email: string | null;
  action: string;
  created_at: string;
}

interface AuditLogsResponse {
  items: AuditLogEntry[];
  total_count: number;
  limit: number;
  offset: number;
  order: 'asc' | 'desc';
}

interface AdminUsersResponse {
  items: UserData[];
  total_count: number;
  limit: number;
  offset: number;
  order: 'asc' | 'desc';
}

interface BulkOperationResponse {
  total_requested: number;
  successful: number;
  failed: number;
  failures: Array<{ user_id: string; error: string }>;
}

interface AuditActionsResponse {
  items: string[];
}

const AdminDashboard: React.FC = () => {
  const { t } = useLanguage();
  const { user: currentUser } = useAuth();
  const { notifyError, notifySuccess } = useNotifications();
  const [users, setUsers] = useState<UserData[]>([]);
  const [roles, setRoles] = useState<Role[]>([]);
  const [userTotalCount, setUserTotalCount] = useState(0);
  const [userSearchInput, setUserSearchInput] = useState('');
  const [userSearchQuery, setUserSearchQuery] = useState('');
  const [userPage, setUserPage] = useState(1);
  const [selectedUserIds, setSelectedUserIds] = useState<Set<string>>(new Set());
  const [bulkRoleId, setBulkRoleId] = useState<number | ''>('');
  const [isBulkDeactivateConfirmOpen, setIsBulkDeactivateConfirmOpen] = useState(false);
  const [isBulkDeactivating, setIsBulkDeactivating] = useState(false);
  const [isBulkUpdatingRole, setIsBulkUpdatingRole] = useState(false);
  const [auditLogs, setAuditLogs] = useState<AuditLogEntry[]>([]);
  const [auditTotalCount, setAuditTotalCount] = useState(0);
  const [auditActionOptions, setAuditActionOptions] = useState<string[]>([]);
  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditActorFilter, setAuditActorFilter] = useState('');
  const [auditTargetFilter, setAuditTargetFilter] = useState('');
  const [auditFromDate, setAuditFromDate] = useState('');
  const [auditToDate, setAuditToDate] = useState('');
  const [auditOrder, setAuditOrder] = useState<'asc' | 'desc'>('desc');
  const [auditPage, setAuditPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [editingUser, setEditingUser] = useState<UserData | null>(null);
  const [editingUserInitiallyActive, setEditingUserInitiallyActive] = useState<boolean | null>(null);
  const [pageError, setPageError] = useState<string | null>(null);
  const [pendingDeleteUser, setPendingDeleteUser] = useState<UserData | null>(null);
  const [deleteConfirmEmail, setDeleteConfirmEmail] = useState('');
  const [pendingDeactivateUser, setPendingDeactivateUser] = useState<UserData | null>(null);
  const [deactivateConfirmEmail, setDeactivateConfirmEmail] = useState('');
  const [isDeleting, setIsDeleting] = useState(false);
  const [isUpdating, setIsUpdating] = useState(false);

  const userPageSize = 10;
  const auditPageSize = 10;

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

  const fetchData = useCallback(async () => {
    try {
      setLoading(true);
      setPageError(null);
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) {
        throw new Error(t('admin.usersLoadFailed'));
      }

      const headers = { 'Authorization': `Bearer ${session?.access_token}` };

      const params = new URLSearchParams({
        limit: String(userPageSize),
        offset: String((userPage - 1) * userPageSize),
        order: 'desc',
        sort_by: 'created_at',
      });
      if (userSearchQuery) {
        params.set('q', userSearchQuery);
      }

      const [uRes, rRes] = await Promise.all([
        fetch(apiUrl(`/v1/admin/users?${params.toString()}`), { headers }),
        fetch(apiUrl('/v1/admin/roles'), { headers }),
      ]);

      if (uRes.ok && rRes.ok) {
        const usersData = await uRes.json() as AdminUsersResponse;
        const rolesData = await rRes.json() as Role[];
        const nextPageCount = Math.max(1, Math.ceil(usersData.total_count / userPageSize));
        if (userPage > nextPageCount) {
          setUserPage(nextPageCount);
        }

        setUsers(usersData.items);
        setUserTotalCount(usersData.total_count);
        setRoles(rolesData);
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
  }, [notifyError, t, userPage, userPageSize, userSearchQuery]);

  useEffect(() => { void fetchData(); }, [fetchData]);

  const fetchAuditActionOptions = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const res = await fetch(apiUrl('/v1/admin/audit-actions'), {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        throw new Error(t('admin.audit.loadFailed'));
      }

      const data = await res.json() as AuditActionsResponse;
      setAuditActionOptions(data.items);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('admin.audit.loadFailed');
      notifyError(message, t('common.error'));
    }
  }, [notifyError, t]);

  const fetchAuditLogs = useCallback(async () => {
    try {
      const { data: { session } } = await supabase.auth.getSession();
      if (!session) return;

      const params = new URLSearchParams({
        limit: String(auditPageSize),
        offset: String((auditPage - 1) * auditPageSize),
      });
      if (auditActionFilter) params.set('action', auditActionFilter);
      if (auditActorFilter.trim()) params.set('actor_email', auditActorFilter.trim());
      if (auditTargetFilter.trim()) params.set('target_email', auditTargetFilter.trim());
      if (auditFromDate) params.set('from_date', auditFromDate);
      if (auditToDate) params.set('to_date', auditToDate);
      params.set('order', auditOrder);

      const res = await fetch(apiUrl(`/v1/admin/audit-logs?${params.toString()}`), {
        headers: { 'Authorization': `Bearer ${session.access_token}` },
      });
      if (!res.ok) {
        throw new Error(t('admin.audit.loadFailed'));
      }

      const data = await res.json() as AuditLogsResponse;
      setAuditLogs(data.items);
      setAuditTotalCount(data.total_count);
    } catch (err) {
      const message = err instanceof Error ? err.message : t('admin.audit.loadFailed');
      notifyError(message, t('common.error'));
    }
  }, [
    auditActionFilter,
    auditActorFilter,
    auditPage,
    auditPageSize,
    auditOrder,
    auditTargetFilter,
    auditFromDate,
    auditToDate,
    notifyError,
    t,
  ]);

  useEffect(() => { void fetchAuditLogs(); }, [fetchAuditLogs]);
  useEffect(() => { void fetchAuditActionOptions(); }, [fetchAuditActionOptions]);

  const submitUpdate = async (userToUpdate: UserData) => {
    try {
      setIsUpdating(true);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(apiUrl(`/v1/admin/users/${userToUpdate.supabase_uid}`), {
        method: 'PUT',
        headers: { 
          'Authorization': `Bearer ${session?.access_token}`, 
          'Content-Type': 'application/json' 
        },
        body: JSON.stringify({
          is_active: userToUpdate.is_active,
          role_id: userToUpdate.role_id
        })
      });

      if (res.ok) {
        setEditingUser(null);
        setEditingUserInitiallyActive(null);
        setPendingDeactivateUser(null);
        setDeactivateConfirmEmail('');
        notifySuccess(t('admin.updateSuccess'));
        await Promise.all([fetchData(), fetchAuditLogs()]);
      } else {
        const data = await res.json().catch(() => null);
        throw createLocalizedApiErrorFromPayload(data, t('admin.updateFailed'));
      }
    } catch (err) {
      const message = resolveApiErrorMessage(err, t, 'admin.updateFailed');
      notifyError(message, t('common.error'));
    } finally {
      setIsUpdating(false);
    }
  };

  const handleUpdate = async () => {
    if (!editingUser) return;

    const shouldRequireDeactivateConfirmation =
      editingUserInitiallyActive === true && editingUser.is_active === false;

    if (shouldRequireDeactivateConfirmation) {
      setPendingDeactivateUser(editingUser);
      setDeactivateConfirmEmail('');
      return;
    }

    await submitUpdate(editingUser);
  };

  const runBulkDeactivate = async () => {
    const targetUserIds = Array.from(selectedUserIds).filter((userId) => userId !== currentUser?.id);
    if (targetUserIds.length === 0) {
      notifyError(t('admin.bulk.selfActionError'), t('common.error'));
      return;
    }

    try {
      setIsBulkDeactivating(true);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(apiUrl('/v1/admin/users/bulk-deactivate'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_ids: targetUserIds,
          reason: 'Bulk deactivate through admin dashboard',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw createLocalizedApiErrorFromPayload(data, t('admin.bulk.failedDeactivate'));
      }

      const data = await res.json() as BulkOperationResponse;
      if (data.failed > 0) {
        notifyError(
          t('admin.bulk.partialResult')
            .replace('{success}', String(data.successful))
            .replace('{failed}', String(data.failed)),
          t('common.error'),
        );
      } else {
        notifySuccess(t('admin.bulk.deactivateSuccess').replace('{count}', String(data.successful)));
      }

      setSelectedUserIds(new Set());
      await Promise.all([fetchData(), fetchAuditLogs()]);
    } catch (err) {
      const message = resolveApiErrorMessage(err, t, 'admin.bulk.failedDeactivate');
      notifyError(message, t('common.error'));
    } finally {
      setIsBulkDeactivating(false);
    }
  };

  const runBulkRoleUpdate = async () => {
    if (bulkRoleId === '') {
      notifyError(t('admin.bulk.roleRequired'), t('common.error'));
      return;
    }

    const targetUserIds = Array.from(selectedUserIds).filter((userId) => userId !== currentUser?.id);
    if (targetUserIds.length === 0) {
      notifyError(t('admin.bulk.selfActionError'), t('common.error'));
      return;
    }

    try {
      setIsBulkUpdatingRole(true);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(apiUrl('/v1/admin/users/bulk-update-role'), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          user_ids: targetUserIds,
          role_id: bulkRoleId,
          reason: 'Bulk role update through admin dashboard',
        }),
      });

      if (!res.ok) {
        const data = await res.json().catch(() => null);
        throw createLocalizedApiErrorFromPayload(data, t('admin.bulk.failedRoleUpdate'));
      }

      const data = await res.json() as BulkOperationResponse;
      if (data.failed > 0) {
        notifyError(
          t('admin.bulk.partialResult')
            .replace('{success}', String(data.successful))
            .replace('{failed}', String(data.failed)),
          t('common.error'),
        );
      } else {
        notifySuccess(t('admin.bulk.roleUpdateSuccess').replace('{count}', String(data.successful)));
      }

      setSelectedUserIds(new Set());
      setBulkRoleId('');
      await Promise.all([fetchData(), fetchAuditLogs()]);
    } catch (err) {
      const message = resolveApiErrorMessage(err, t, 'admin.bulk.failedRoleUpdate');
      notifyError(message, t('common.error'));
    } finally {
      setIsBulkUpdatingRole(false);
    }
  };

  const handleDelete = async () => {
    if (!pendingDeleteUser) return;

    try {
      setIsDeleting(true);
      const { data: { session } } = await supabase.auth.getSession();
      const res = await fetch(apiUrl(`/v1/admin/users/${pendingDeleteUser.supabase_uid}/hard-delete`), {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${session?.access_token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          confirm_email: deleteConfirmEmail,
          reason: 'Hard delete through admin dashboard',
        }),
      });
      if (res.ok) {
        notifySuccess(t('admin.deleteSuccess'));
        await Promise.all([fetchData(), fetchAuditLogs()]);
      } else {
        const data = await res.json().catch(() => null);
        throw createLocalizedApiErrorFromPayload(data, t('admin.deleteFailed'));
      }
    } catch (err) {
      const message = resolveApiErrorMessage(err, t, 'admin.deleteFailed');
      notifyError(message, t('common.error'));
    } finally {
      setIsDeleting(false);
      setPendingDeleteUser(null);
      setDeleteConfirmEmail('');
    }
  };

  const normalizedTargetEmail = pendingDeleteUser?.email?.trim().toLowerCase() || '';
  const isDeleteEmailMatch =
    normalizedTargetEmail.length > 0
    && deleteConfirmEmail.trim().toLowerCase() === normalizedTargetEmail;

  const normalizedDeactivateTargetEmail = pendingDeactivateUser?.email?.trim().toLowerCase() || '';
  const isDeactivateEmailMatch =
    normalizedDeactivateTargetEmail.length > 0
    && deactivateConfirmEmail.trim().toLowerCase() === normalizedDeactivateTargetEmail;

  const selectableUsers = users.filter((user) => user.supabase_uid !== currentUser?.id);
  const bulkDeactivationTargetCount = Array.from(selectedUserIds).filter((userId) => userId !== currentUser?.id).length;
  const allSelectableUsersSelected =
    selectableUsers.length > 0
    && selectableUsers.every((user) => selectedUserIds.has(user.supabase_uid));
  const selectedCount = selectedUserIds.size;
  const userPageCount = Math.max(1, Math.ceil(userTotalCount / userPageSize));
  const userRangeStart = userTotalCount === 0 ? 0 : (userPage - 1) * userPageSize + 1;
  const userRangeEnd = Math.min(userTotalCount, userPage * userPageSize);
  const auditPageCount = Math.max(1, Math.ceil(auditTotalCount / auditPageSize));

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
            {t('admin.userCount').replace('{count}', userTotalCount.toString())}
          </div>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-3 md:grid-cols-[2fr_1fr] md:items-center">
          <input
            value={userSearchInput}
            onChange={(e) => setUserSearchInput(e.target.value)}
            placeholder={t('admin.users.search.placeholder')}
            className="w-full rounded-md border border-gray-200 p-2 text-sm outline-none focus:border-primary-600"
          />
          <p className="text-xs text-gray-500 md:text-right">
            {t('admin.users.paginate.showing')
              .replace('{from}', String(userRangeStart))
              .replace('{to}', String(userRangeEnd))
              .replace('{total}', String(userTotalCount))}
          </p>
        </div>

        {selectedCount > 0 && (
          <div className="mb-4 rounded-lg border border-primary-100 bg-primary-50 p-3">
            <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
              <p className="text-sm font-semibold text-primary-800">
                {t('admin.bulk.selected').replace('{count}', String(selectedCount))}
              </p>
              <div className="flex flex-wrap gap-2">
                <select
                  value={bulkRoleId}
                  onChange={(e) => setBulkRoleId(e.target.value ? Number(e.target.value) : '')}
                  className="rounded-md border border-primary-200 bg-white p-2 text-sm"
                >
                  <option value="">{t('admin.bulk.roleSelect')}</option>
                  {roles.map((role) => (
                    <option key={role.id} value={role.id}>{role.name}</option>
                  ))}
                </select>
                <Button
                  size="sm"
                  variant="outline"
                  onClick={() => void runBulkRoleUpdate()}
                  isLoading={isBulkUpdatingRole}
                  disabled={isBulkUpdatingRole || isBulkDeactivating || bulkRoleId === ''}
                >
                  {t('admin.bulk.applyRole')}
                </Button>
                <Button
                  size="sm"
                  variant="danger"
                  onClick={() => setIsBulkDeactivateConfirmOpen(true)}
                  isLoading={isBulkDeactivating}
                  disabled={isBulkUpdatingRole || isBulkDeactivating}
                >
                  {t('admin.bulk.deactivate')}
                </Button>
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => setSelectedUserIds(new Set())}
                  disabled={isBulkUpdatingRole || isBulkDeactivating}
                >
                  {t('admin.bulk.clearSelection')}
                </Button>
              </div>
            </div>
          </div>
        )}

        <div className="mb-3 flex items-center justify-between">
          <label className="inline-flex items-center gap-2 text-xs font-semibold text-gray-600">
            <input
              type="checkbox"
              checked={allSelectableUsersSelected}
              onChange={() => {
                if (allSelectableUsersSelected) {
                  setSelectedUserIds(new Set());
                } else {
                  setSelectedUserIds(new Set(selectableUsers.map((user) => user.supabase_uid)));
                }
              }}
              className="h-4 w-4 rounded border-gray-300 text-primary-600"
            />
            {t('admin.bulk.selectAllOnPage')}
          </label>
          {currentUser?.id && (
            <span className="text-xs text-gray-500">{t('admin.bulk.selfActionHint')}</span>
          )}
        </div>

        {users.length === 0 ? (
          <Card className="p-5 text-sm text-gray-500">{t('admin.users.search.noResults')}</Card>
        ) : (
          <div className="grid grid-cols-1 gap-4">
            {users.map((user) => {
              const isSelf = user.supabase_uid === currentUser?.id;
              const isChecked = selectedUserIds.has(user.supabase_uid);

              return (
                <Card key={user.supabase_uid} className="p-5 hover:shadow-md transition-shadow">
                  <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
                    <div className="flex items-center gap-4">
                      <input
                        type="checkbox"
                        checked={isChecked}
                        disabled={isSelf}
                        onChange={() => {
                          setSelectedUserIds((prev) => {
                            const next = new Set(prev);
                            if (next.has(user.supabase_uid)) {
                              next.delete(user.supabase_uid);
                            } else {
                              next.add(user.supabase_uid);
                            }
                            return next;
                          });
                        }}
                        aria-label={t('admin.bulk.selectUser').replace('{email}', user.email || '-')}
                        className="h-4 w-4 rounded border-gray-300 text-primary-600"
                      />
                      <div className="relative">
                        <div className="w-12 h-12 bg-gray-50 rounded-full flex items-center justify-center border border-gray-100">
                          <User size={20} className="text-gray-400" />
                        </div>
                        <div className={`absolute -top-1 -right-1 w-4 h-4 rounded-full border-2 border-white ${user.is_active ? 'bg-emerald-500' : 'bg-red-500'}`} />
                      </div>
                      <div>
                        <h3 className="font-bold text-gray-900">{user.name}</h3>
                        <p className="text-xs text-gray-500">{user.email || '-'}</p>
                        <p className="text-xs text-gray-400 font-mono uppercase tracking-tighter">{t('admin.uid')}: {user.supabase_uid.slice(0, 12)}...</p>
                        {isSelf && (
                          <p className="text-[11px] font-semibold text-amber-600">{t('admin.bulk.selfRowHint')}</p>
                        )}
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
                          aria-label={t('admin.edit.title')}
                          onClick={() => {
                            setEditingUser(user);
                            setEditingUserInitiallyActive(user.is_active);
                          }}
                          className="w-10 h-10 !p-0 rounded-full border border-gray-200 text-gray-400 hover:border-primary-600 hover:text-primary-600"
                        >
                          <Edit3 size={18} />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          aria-label={t('admin.confirmDeleteTitle')}
                          onClick={() => {
                            setPendingDeleteUser(user);
                            setDeleteConfirmEmail('');
                          }}
                          className="w-10 h-10 !p-0 rounded-full border border-gray-200 text-gray-400 hover:bg-red-50 hover:text-red-600"
                        >
                          <Trash2 size={18} />
                        </Button>
                      </div>
                    </div>
                  </div>
                </Card>
              );
            })}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {t('admin.users.paginate.showing')
              .replace('{from}', String(userRangeStart))
              .replace('{to}', String(userRangeEnd))
              .replace('{total}', String(userTotalCount))}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={userPage <= 1}
              onClick={() => setUserPage((prev) => Math.max(1, prev - 1))}
            >
              {t('common.previous')}
            </Button>
            <span className="text-xs text-gray-600">
              {t('common.page')} {userPage} {t('common.of')} {userPageCount}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={userPage >= userPageCount}
              onClick={() => setUserPage((prev) => Math.min(userPageCount, prev + 1))}
            >
              {t('common.next')}
            </Button>
          </div>
        </div>
      </div>

      {editingUser && createPortal(
        <div className="app-modal-overlay bg-black/20" style={{ zIndex: 9999 }}>
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
                onClick={() => {
                  setEditingUser(null);
                  setEditingUserInitiallyActive(null);
                }}
                disabled={isUpdating}
                className="flex-1 text-sm font-bold text-gray-500 hover:text-gray-800"
              >
                {t('admin.cancel')}
              </Button>
              <Button
                onClick={() => void handleUpdate()}
                isLoading={isUpdating}
                className="flex-1 text-sm font-bold shadow-lg shadow-primary-100"
              >
                {t('admin.save')}
              </Button>
            </div>
          </div>
        </div>, document.body
      )}

      {pendingDeleteUser && createPortal(
        <div className="app-modal-overlay bg-black/20" style={{ zIndex: 9999 }}>
          <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white shadow-2xl overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900">{t('admin.confirmDeleteTitle')}</h2>
              <p className="mt-2 text-sm text-gray-600">{t('admin.deleteConfirm')}</p>
              <p className="mt-3 text-sm font-semibold text-gray-800">
                {t('admin.deleteConfirmInstruction').replace('{email}', pendingDeleteUser.email || '-')}
              </p>

              <label className="mt-4 block text-xs font-bold uppercase text-gray-500 tracking-wide">
                {t('admin.confirmEmailLabel')}
              </label>
              <input
                type="email"
                value={deleteConfirmEmail}
                onChange={(e) => setDeleteConfirmEmail(e.target.value)}
                placeholder={t('admin.confirmEmailPlaceholder')}
                className="mt-2 w-full rounded-md border border-gray-200 p-2 text-sm outline-none focus:border-primary-600"
              />
              {deleteConfirmEmail.length > 0 && !isDeleteEmailMatch && (
                <p className="mt-2 text-xs text-red-600">{t('admin.confirmEmailMismatch')}</p>
              )}
            </div>
            <div className="flex gap-2 border-t border-gray-100 bg-gray-50 p-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setPendingDeleteUser(null);
                  setDeleteConfirmEmail('');
                }}
                disabled={isDeleting}
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => void handleDelete()}
                isLoading={isDeleting}
                disabled={!isDeleteEmailMatch || isDeleting}
                className="flex-1"
              >
                {t('common.confirm')}
              </Button>
            </div>
          </div>
        </div>, document.body
      )}

      {pendingDeactivateUser && createPortal(
        <div className="app-modal-overlay bg-black/20" style={{ zIndex: 9999 }}>
          <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white shadow-2xl overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900">{t('admin.confirmDeactivateTitle')}</h2>
              <p className="mt-2 text-sm text-gray-600">{t('admin.deactivateConfirm')}</p>
              <p className="mt-3 text-sm font-semibold text-gray-800">
                {t('admin.deactivateConfirmInstruction').replace('{email}', pendingDeactivateUser.email || '-')}
              </p>

              <label className="mt-4 block text-xs font-bold uppercase text-gray-500 tracking-wide">
                {t('admin.confirmEmailLabel')}
              </label>
              <input
                type="email"
                value={deactivateConfirmEmail}
                onChange={(e) => setDeactivateConfirmEmail(e.target.value)}
                placeholder={t('admin.confirmEmailPlaceholder')}
                className="mt-2 w-full rounded-md border border-gray-200 p-2 text-sm outline-none focus:border-primary-600"
              />
              {deactivateConfirmEmail.length > 0 && !isDeactivateEmailMatch && (
                <p className="mt-2 text-xs text-red-600">{t('admin.confirmEmailMismatch')}</p>
              )}
            </div>
            <div className="flex gap-2 border-t border-gray-100 bg-gray-50 p-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => {
                  setPendingDeactivateUser(null);
                  setDeactivateConfirmEmail('');
                }}
                disabled={isUpdating}
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  if (!pendingDeactivateUser) return;
                  void submitUpdate(pendingDeactivateUser);
                }}
                isLoading={isUpdating}
                disabled={!isDeactivateEmailMatch || isUpdating}
                className="flex-1"
              >
                {t('common.confirm')}
              </Button>
            </div>
          </div>
        </div>, document.body
      )}

      {isBulkDeactivateConfirmOpen && createPortal(
        <div className="app-modal-overlay bg-black/20" style={{ zIndex: 9999 }}>
          <div className="w-full max-w-md rounded-xl border border-gray-100 bg-white shadow-2xl overflow-hidden">
            <div className="p-6">
              <h2 className="text-lg font-bold text-gray-900">{t('admin.bulk.confirmDeactivateTitle')}</h2>
              <p className="mt-2 text-sm text-gray-600">
                {t('admin.bulk.confirmDeactivateMessage').replace('{count}', String(bulkDeactivationTargetCount))}
              </p>
            </div>
            <div className="flex gap-2 border-t border-gray-100 bg-gray-50 p-4">
              <Button
                type="button"
                variant="ghost"
                onClick={() => setIsBulkDeactivateConfirmOpen(false)}
                disabled={isBulkDeactivating}
                className="flex-1"
              >
                {t('common.cancel')}
              </Button>
              <Button
                type="button"
                variant="danger"
                onClick={() => {
                  setIsBulkDeactivateConfirmOpen(false);
                  void runBulkDeactivate();
                }}
                isLoading={isBulkDeactivating}
                disabled={isBulkDeactivating || bulkDeactivationTargetCount === 0}
                className="flex-1"
              >
                {t('common.confirm')}
              </Button>
            </div>
          </div>
        </div>, document.body
      )}

      <div className="rounded-xl border border-gray-100 bg-white p-5">
        <div className="mb-4 flex items-center justify-between">
          <h2 className="text-lg font-bold text-gray-900">{t('admin.audit.title')}</h2>
          <Button
            variant="outline"
            size="sm"
            onClick={() => {
              void Promise.all([fetchAuditLogs(), fetchAuditActionOptions()]);
            }}
          >
            {t('admin.audit.refresh')}
          </Button>
        </div>

        <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-3">
          <select
            value={auditActionFilter}
            onChange={(e) => {
              setAuditActionFilter(e.target.value);
              setAuditPage(1);
            }}
            className="rounded-md border border-gray-200 p-2 text-sm"
          >
            <option value="">{t('admin.audit.filter.allActions')}</option>
            {auditActionOptions.map((action) => (
              <option key={action} value={action}>{action}</option>
            ))}
          </select>
          <input
            value={auditActorFilter}
            onChange={(e) => {
              setAuditActorFilter(e.target.value);
              setAuditPage(1);
            }}
            placeholder={t('admin.audit.filter.actorEmail')}
            className="rounded-md border border-gray-200 p-2 text-sm"
          />
          <input
            value={auditTargetFilter}
            onChange={(e) => {
              setAuditTargetFilter(e.target.value);
              setAuditPage(1);
            }}
            placeholder={t('admin.audit.filter.targetEmail')}
            className="rounded-md border border-gray-200 p-2 text-sm"
          />
        </div>

        <div className="mb-4 grid grid-cols-1 gap-2 md:grid-cols-3">
          <input
            type="date"
            value={auditFromDate}
            onChange={(e) => {
              setAuditFromDate(e.target.value);
              setAuditPage(1);
            }}
            className="rounded-md border border-gray-200 p-2 text-sm"
          />
          <input
            type="date"
            value={auditToDate}
            onChange={(e) => {
              setAuditToDate(e.target.value);
              setAuditPage(1);
            }}
            className="rounded-md border border-gray-200 p-2 text-sm"
          />
          <select
            value={auditOrder}
            onChange={(e) => {
              setAuditOrder(e.target.value as 'asc' | 'desc');
              setAuditPage(1);
            }}
            className="rounded-md border border-gray-200 p-2 text-sm"
          >
            <option value="desc">{t('admin.audit.filter.orderNewest')}</option>
            <option value="asc">{t('admin.audit.filter.orderOldest')}</option>
          </select>
        </div>

        {auditLogs.length === 0 ? (
          <p className="text-sm text-gray-500">{t('admin.audit.empty')}</p>
        ) : (
          <div className="space-y-2">
            {auditLogs.map((log) => (
              <div key={log.id} className="rounded-md border border-gray-100 p-3 text-sm">
                <p className="font-semibold text-gray-800">{log.action}</p>
                <p className="text-xs text-gray-600">
                  {t('admin.audit.actor').replace('{email}', log.actor_email || '-')}
                </p>
                <p className="text-xs text-gray-600">
                  {t('admin.audit.target').replace('{email}', log.target_email || '-')}
                </p>
                <p className="text-xs text-gray-500">{new Date(log.created_at).toLocaleString()}</p>
              </div>
            ))}
          </div>
        )}

        <div className="mt-4 flex items-center justify-between">
          <p className="text-xs text-gray-500">
            {t('admin.audit.total').replace('{count}', String(auditTotalCount))}
          </p>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="outline"
              disabled={auditPage <= 1}
              onClick={() => setAuditPage((prev) => Math.max(1, prev - 1))}
            >
              {t('common.previous')}
            </Button>
            <span className="text-xs text-gray-600">
              {t('common.page')} {auditPage} {t('common.of')} {auditPageCount}
            </span>
            <Button
              size="sm"
              variant="outline"
              disabled={auditPage >= auditPageCount}
              onClick={() => setAuditPage((prev) => Math.min(auditPageCount, prev + 1))}
            >
              {t('common.next')}
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDashboard;