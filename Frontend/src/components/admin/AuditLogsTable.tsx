import React, { useState } from 'react';
import { useLanguage } from '../../contexts/LanguageContext';
import { Button } from '../ui/Button';
import { useAuditLogs, useAuditActions } from '../../hooks/useAdmin';
import { LoadingSpinner } from '../common/LoadingSpinner';
import { ErrorMessage } from '../common/ErrorMessage';

const auditPageSize = 10;

export const AuditLogsTable: React.FC = () => {
  const { t } = useLanguage();

  const [auditActionFilter, setAuditActionFilter] = useState('');
  const [auditActorFilter, setAuditActorFilter] = useState('');
  const [auditTargetFilter, setAuditTargetFilter] = useState('');
  const [auditFromDate, setAuditFromDate] = useState('');
  const [auditToDate, setAuditToDate] = useState('');
  const [auditOrder, setAuditOrder] = useState<'asc' | 'desc'>('desc');
  const [auditPage, setAuditPage] = useState(1);

  const { data: actionOptions } = useAuditActions();

  const params = {
    limit: auditPageSize,
    offset: (auditPage - 1) * auditPageSize,
    order: auditOrder,
    ...(auditActionFilter ? { action: auditActionFilter } : {}),
    ...(auditActorFilter ? { actor_email: auditActorFilter } : {}),
    ...(auditTargetFilter ? { target_email: auditTargetFilter } : {}),
    ...(auditFromDate ? { from_date: auditFromDate } : {}),
    ...(auditToDate ? { to_date: auditToDate } : {}),
  };

  const { data, isLoading, error, refetch } = useAuditLogs(params);

  const auditLogs = data?.items || [];
  const auditTotalCount = data?.total_count || 0;
  const auditPageCount = Math.max(1, Math.ceil(auditTotalCount / auditPageSize));

  return (
    <div className="rounded-xl border border-gray-100 bg-white p-5">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-lg font-bold text-gray-900">{t('admin.audit.title')}</h2>
        <Button
          variant="outline"
          size="sm"
          onClick={() => void refetch()}
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
          {actionOptions?.items?.map((action) => (
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

      {isLoading ? (
        <LoadingSpinner />
      ) : error ? (
        <ErrorMessage message={error instanceof Error ? error.message : String(error)} />
      ) : auditLogs.length === 0 ? (
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
  );
};
