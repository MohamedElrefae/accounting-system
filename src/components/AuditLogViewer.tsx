import React, { useState, useEffect } from 'react';
import { supabase } from '../utils/supabase';
import './AuditLogViewer.css';

// Arabic translations
const AUDIT_TEXTS = {
  auditLogs: { en: 'Audit Logs', ar: 'سجلات التدقيق' },
  exportJSON: { en: 'Export JSON', ar: 'تصدير JSON' },
  exportCSV: { en: 'Export CSV', ar: 'تصدير CSV' },
  action: { en: 'Action', ar: 'الإجراء' },
  table: { en: 'Table', ar: 'الجدول' },
  recordId: { en: 'Record ID', ar: 'معرف السجل' },
  timestamp: { en: 'Timestamp', ar: 'الوقت' },
  details: { en: 'Details', ar: 'التفاصيل' },
  allActions: { en: 'All Actions', ar: 'جميع الإجراءات' },
  allTables: { en: 'All Tables', ar: 'جميع الجداول' },
  searchRecordId: { en: 'Search record ID...', ar: 'ابحث عن معرف السجل...' },
  fromDate: { en: 'From Date', ar: 'من التاريخ' },
  toDate: { en: 'To Date', ar: 'إلى التاريخ' },
  clearFilters: { en: 'Clear Filters', ar: 'مسح المرشحات' },
  totalRecords: { en: 'Total Records', ar: 'إجمالي السجلات' },
  pageOf: { en: 'Page', ar: 'الصفحة' },
  of: { en: 'of', ar: 'من' },
  previous: { en: 'Previous', ar: 'السابق' },
  next: { en: 'Next', ar: 'التالي' },
  oldValues: { en: 'Old Values', ar: 'القيم السابقة' },
  newValues: { en: 'New Values', ar: 'القيم الجديدة' },
  ipAddress: { en: 'IP Address', ar: 'عنوان IP' },
  roleAssigned: { en: 'Role Assigned', ar: 'تم تعيين الدور' },
  roleRevoked: { en: 'Role Revoked', ar: 'تم إلغاء الدور' },
  permissionAssigned: { en: 'Permission Assigned', ar: 'تم تعيين الإذن' },
  permissionRevoked: { en: 'Permission Revoked', ar: 'تم إلغاء الإذن' },
  directPermissionAssigned: { en: 'Direct Permission Assigned', ar: 'تم تعيين إذن مباشر' },
  directPermissionRevoked: { en: 'Direct Permission Revoked', ar: 'تم إلغاء إذن مباشر' },
  userRoles: { en: 'User Roles', ar: 'أدوار المستخدم' },
  rolePermissions: { en: 'Role Permissions', ar: 'أذونات الدور' },
  userPermissions: { en: 'User Permissions', ar: 'أذونات المستخدم' },
  loading: { en: 'Loading...', ar: 'جاري التحميل...' },
} as const;

interface AuditLog {
  id: bigint;
  user_id: string;
  org_id: string;
  action: string;
  table_name: string;
  record_id: string;
  old_values: Record<string, any> | null;
  new_values: Record<string, any> | null;
  ip_address: string | null;
  user_agent: string | null;
  created_at: string;
}

interface FilterOptions {
  action: string;
  table_name: string;
  user_id: string;
  date_from: string;
  date_to: string;
  search_record_id: string;
}

const t = (key: keyof typeof AUDIT_TEXTS, lang: 'ar' | 'en' = 'ar') => AUDIT_TEXTS[key][lang];

export const AuditLogViewer: React.FC<{ orgId: string }> = ({ orgId }) => {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filters, setFilters] = useState<FilterOptions>({
    action: '',
    table_name: '',
    user_id: '',
    date_from: '',
    date_to: '',
    search_record_id: '',
  });
  const [expandedLog, setExpandedLog] = useState<bigint | null>(null);
  const [totalCount, setTotalCount] = useState(0);
  const [page, setPage] = useState(1);
  const pageSize = 20;

  useEffect(() => {
    fetchLogs();
  }, [orgId, page, filters]);

  const fetchLogs = async () => {
    setLoading(true);
    setError(null);
    try {
      let query = supabase
        .from('audit_logs')
        .select('*', { count: 'exact' })
        .eq('org_id', orgId)
        .order('created_at', { ascending: false });

      if (filters.action) {
        query = query.eq('action', filters.action);
      }
      if (filters.table_name) {
        query = query.eq('table_name', filters.table_name);
      }
      if (filters.search_record_id) {
        query = query.ilike('record_id', `%${filters.search_record_id}%`);
      }
      if (filters.date_from) {
        query = query.gte('created_at', filters.date_from);
      }
      if (filters.date_to) {
        query = query.lte('created_at', filters.date_to);
      }

      const offset = (page - 1) * pageSize;
      const { data, count, error } = await query.range(offset, offset + pageSize - 1);

      if (error) throw error;

      setLogs(data || []);
      setTotalCount(count || 0);
    } catch (error) {
      console.error('Error fetching audit logs:', error);
      setError(error instanceof Error ? error.message : 'Failed to load audit logs');
    } finally {
      setLoading(false);
    }
  };

  const handleExport = (format: 'json' | 'csv') => {
    if (format === 'json') {
      const dataStr = JSON.stringify(logs, null, 2);
      const dataBlob = new Blob([dataStr], { type: 'application/json' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString()}.json`;
      link.click();
    } else {
      const csv = [
        ['ID', 'User', 'Action', 'Table', 'Record ID', 'Timestamp'],
        ...logs.map(log => [
          log.id,
          log.user_id,
          log.action,
          log.table_name,
          log.record_id,
          log.created_at
        ])
      ].map(row => row.map(cell => `"${cell}"`).join(',')).join('\n');

      const dataBlob = new Blob([csv], { type: 'text/csv' });
      const url = URL.createObjectURL(dataBlob);
      const link = document.createElement('a');
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString()}.csv`;
      link.click();
    }
  };

  const handleClearFilters = () => {
    setFilters({
      action: '',
      table_name: '',
      user_id: '',
      date_from: '',
      date_to: '',
      search_record_id: '',
    });
    setPage(1);
  };

  const totalPages = Math.ceil(totalCount / pageSize);

  return (
    <div className="audit-log-viewer">
      <div className="audit-filters">
        <div className="filter-row">
          <select
            value={filters.action}
            onChange={(e) => {
              setFilters({ ...filters, action: e.target.value });
              setPage(1);
            }}
            className="filter-select"
          >
            <option value="">{t('allActions')}</option>
            <option value="role_assigned">{t('roleAssigned')}</option>
            <option value="role_revoked">{t('roleRevoked')}</option>
            <option value="permission_assigned">{t('permissionAssigned')}</option>
            <option value="permission_revoked">{t('permissionRevoked')}</option>
          </select>

          <select
            value={filters.table_name}
            onChange={(e) => {
              setFilters({ ...filters, table_name: e.target.value });
              setPage(1);
            }}
            className="filter-select"
          >
            <option value="">{t('allTables')}</option>
            <option value="user_roles">{t('userRoles')}</option>
            <option value="role_permissions">{t('rolePermissions')}</option>
            <option value="user_permissions">{t('userPermissions')}</option>
          </select>

          <input
            type="text"
            placeholder={t('searchRecordId')}
            value={filters.search_record_id}
            onChange={(e) => {
              setFilters({ ...filters, search_record_id: e.target.value });
              setPage(1);
            }}
            className="filter-input"
          />

          <input
            type="date"
            value={filters.date_from}
            onChange={(e) => {
              setFilters({ ...filters, date_from: e.target.value });
              setPage(1);
            }}
            className="filter-input"
          />

          <input
            type="date"
            value={filters.date_to}
            onChange={(e) => {
              setFilters({ ...filters, date_to: e.target.value });
              setPage(1);
            }}
            className="filter-input"
          />

          <button onClick={handleClearFilters} className="filter-button">
            {t('clearFilters')}
          </button>
        </div>

        <div className="filter-actions">
          <button onClick={() => handleExport('json')} className="export-button">
            {t('exportJSON')}
          </button>
          <button onClick={() => handleExport('csv')} className="export-button">
            {t('exportCSV')}
          </button>
        </div>
      </div>

      {loading && <div className="audit-loading">{t('loading')}</div>}

      {error && (
        <div style={{ padding: '1.5rem', color: '#d32f2f', backgroundColor: '#ffebee', borderRadius: '4px', margin: '1rem' }}>
          <strong>Error:</strong> {error}
        </div>
      )}

      {!loading && !error && logs.length === 0 && (
        <div style={{ padding: '2rem', textAlign: 'center', color: '#999' }}>
          <p>لا توجد سجلات تدقيق متاحة</p>
          <p style={{ fontSize: '0.9rem' }}>No audit logs available</p>
        </div>
      )}

      {!loading && (
        <>
          <div className="audit-table-container">
            <table className="audit-table">
              <thead>
                <tr>
                  <th>{t('action')}</th>
                  <th>{t('table')}</th>
                  <th>{t('recordId')}</th>
                  <th>{t('timestamp')}</th>
                  <th>{t('details')}</th>
                </tr>
              </thead>
              <tbody>
                {logs.map((log) => (
                  <React.Fragment key={log.id}>
                    <tr
                      className="audit-row"
                      onClick={() =>
                        setExpandedLog(expandedLog === log.id ? null : log.id)
                      }
                    >
                      <td>{log.action}</td>
                      <td>{log.table_name}</td>
                      <td>{log.record_id}</td>
                      <td>{new Date(log.created_at).toLocaleString()}</td>
                      <td className="details-cell">
                        {expandedLog === log.id ? '▼' : '▶'}
                      </td>
                    </tr>
                    {expandedLog === log.id && (
                      <tr className="audit-details">
                        <td colSpan={5}>
                          <div className="details-content">
                            {log.old_values && (
                              <div className="details-section">
                                <h4>{t('oldValues')}</h4>
                                <pre>{JSON.stringify(log.old_values, null, 2)}</pre>
                              </div>
                            )}
                            {log.new_values && (
                              <div className="details-section">
                                <h4>{t('newValues')}</h4>
                                <pre>{JSON.stringify(log.new_values, null, 2)}</pre>
                              </div>
                            )}
                            {log.ip_address && (
                              <div className="details-section">
                                <h4>{t('ipAddress')}</h4>
                                <p>{log.ip_address}</p>
                              </div>
                            )}
                          </div>
                        </td>
                      </tr>
                    )}
                  </React.Fragment>
                ))}
              </tbody>
            </table>
          </div>

          <div className="audit-pagination">
            <span>
              {t('totalRecords')}: {totalCount}
            </span>
            <div className="pagination-controls">
              <button
                onClick={() => setPage(Math.max(1, page - 1))}
                disabled={page === 1}
                className="pagination-button"
              >
                {t('previous')}
              </button>
              <span>
                {t('pageOf')} {page} {t('of')} {totalPages}
              </span>
              <button
                onClick={() => setPage(Math.min(totalPages, page + 1))}
                disabled={page === totalPages}
                className="pagination-button"
              >
                {t('next')}
              </button>
            </div>
          </div>
        </>
      )}
    </div>
  );
};
