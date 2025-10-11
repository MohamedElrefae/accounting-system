import React, { useEffect, useState } from 'react';
import { listJournalsUnified } from '@/services/transactions';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';

const Gl2JournalsPage: React.FC = () => {
  const { READ_MODE } = useFeatureFlags();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      const { data, error } = await listJournalsUnified({ limit: 100 });
      setLoading(false);
      if (error) {
        setRows([]);
        setError(error.message || 'فشل تحميل قيود اليومية');
      } else {
        setRows(data ?? []);
      }
    })();
  }, [READ_MODE]);

  return (
    <div style={{ padding: 16 }}>
      <h2>قيود اليومية (GL2)</h2>
      <div style={{ marginBottom: 8 }}>وضع القراءة: <strong>{READ_MODE}</strong></div>
      {loading && <div>جاري التحميل…</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}

      {READ_MODE === 'gl2_collapsed' ? (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>الرقم</th>
              <th>تاريخ الترحيل</th>
              <th>إجمالي مدين</th>
              <th>إجمالي دائن</th>
              <th>مدين (أساسي)</th>
              <th>دائن (أساسي)</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.journal_id}>
                <td>{r.number}</td>
                <td>{r.posting_date}</td>
                <td>{r.total_debits}</td>
                <td>{r.total_credits}</td>
                <td>{r.debit_account_code || '—'}</td>
                <td>{r.credit_account_code || '—'}</td>
                <td>{r.status}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={7} style={{ textAlign: 'center', color: '#777' }}>لا توجد قيود</td></tr>
            )}
          </tbody>
        </table>
      ) : (
        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
          <thead>
            <tr>
              <th>الرقم</th>
              <th>تاريخ الترحيل</th>
              <th>مدين</th>
              <th>دائن</th>
              <th>المبلغ</th>
              <th>الحالة</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r: any) => (
              <tr key={r.journal_id}>
                <td>{r.number}</td>
                <td>{r.posting_date}</td>
                <td>{r.debit_account_code}</td>
                <td>{r.credit_account_code}</td>
                <td>{r.amount ?? r.total_debits ?? '—'}</td>
                <td>{r.status}</td>
              </tr>
            ))}
            {!loading && rows.length === 0 && (
              <tr><td colSpan={6} style={{ textAlign: 'center', color: '#777' }}>لا توجد قيود</td></tr>
            )}
          </tbody>
        </table>
      )}
    </div>
  );
};

export default Gl2JournalsPage;