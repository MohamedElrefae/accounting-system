import React, { useEffect, useState } from 'react';
import { useFeatureFlags } from '@/hooks/useFeatureFlags';
import { supabase } from '@/utils/supabase';

const Gl2JournalsPage: React.FC = () => {
  const { READ_MODE } = useFeatureFlags();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      // Force GL2 fetch regardless of READ_MODE so this page always works
      // Try single-line posted first; if empty, fall back to collapsed
      const r1 = await supabase
.from('v_gl2_journals_single_line_all')
        .select('journal_id, number, doc_date, posting_date, debit_account_code, credit_account_code, amount, status')
        .order('posting_date', { ascending: false })
        .limit(100);

      if (r1.error) {
        // If permission error, surface it
        setError(r1.error.message || 'فشل تحميل قيود اليومية');
        setRows([]);
        setLoading(false);
        return;
      }

      const rows1 = r1.data ?? [];
      if (rows1.length > 0) {
        setRows(rows1);
        setLoading(false);
        return;
      }

      // Fallback to collapsed view
      const r2 = await supabase
.from('v_gl2_journals_collapsed')
        .select('journal_id, number, doc_date, posting_date, total_debits, total_credits, debit_account_code, credit_account_code, status')
        .order('posting_date', { ascending: false })
        .limit(100);

      setLoading(false);
      if (r2.error) {
        setRows([]);
        setError(r2.error.message || 'فشل تحميل قيود اليومية');
      } else {
        setRows(r2.data ?? []);
      }
    })();
  }, [READ_MODE]);

  return (
    <div style={{ padding: 16 }}>
<h2>قيود اليومية (GL2)</h2>
      <div style={{ fontSize: 12, color: '#9aa' }}>تعرض الصفحة القيود ذات سطرين (مدين/دائن) من GL2. إذا لم تتوفر، يتم عرض ملخص القيود متعددة الأسطر.</div>
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