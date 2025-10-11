import React, { useEffect, useState } from 'react';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { supabase } from '../../utils/supabase';
import Gl2DetailsDrawer from './Gl2DetailsDrawer';

const Gl2JournalsPage: React.FC = () => {
  const { READ_MODE } = useFeatureFlags();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [drawerOpen, setDrawerOpen] = useState(false);

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

  const exportCsv = () => {
    const headers = READ_MODE === 'gl2_collapsed'
      ? ['number','posting_date','total_debits','total_credits','debit_account_code','credit_account_code','status']
      : ['number','posting_date','debit_account_code','credit_account_code','amount','status'];
    const csv = [headers.join(',')].concat(
      rows.map((r:any)=> headers.map(h=> (r[h] ?? '')).join(','))
    ).join('\n');
    const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'gl2_journals.csv'; document.body.appendChild(a); a.click(); document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleMode = () => {
    try {
      // Toggle between legacy and gl2_single_line for quick testing
      const cur = (window as any).__READ_MODE_OVERRIDE;
      (window as any).__READ_MODE_OVERRIDE = cur === 'gl2_single_line' ? 'legacy' : 'gl2_single_line';
      // simple reload of list
      setLoading(true);
      setError(null);
      setRows([]);
      // trigger useEffect by faking READ_MODE change (no direct dependency), quick reload via rerun of fetch
      (async () => {
        const r1 = await supabase
          .from('public.v_gl2_journals_single_line_all')
          .select('journal_id, number, doc_date, posting_date, debit_account_code, credit_account_code, amount, status')
          .order('posting_date', { ascending: false })
          .limit(100);
        if (!r1.error && (r1.data?.length ?? 0) > 0) { setRows(r1.data ?? []); setLoading(false); return; }
        const r2 = await supabase
          .from('public.v_gl2_journals_collapsed')
          .select('journal_id, number, doc_date, posting_date, total_debits, total_credits, debit_account_code, credit_account_code, status')
          .order('posting_date', { ascending: false })
          .limit(100);
        setLoading(false);
        if (r2.error) { setRows([]); setError(r2.error.message || 'فشل تحميل قيود اليومية'); }
        else { setRows(r2.data ?? []); }
      })();
    } catch {}
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>قيود اليومية (GL2)</h2>
      <div style={{ fontSize: 12, color: '#9aa' }}>تعرض الصفحة القيود ذات سطرين (مدين/دائن) من GL2. إذا لم تتوفر، يتم عرض ملخص القيود متعددة الأسطر.</div>
      <div style={{ marginBottom: 8 }}>وضع القراءة: <strong>{READ_MODE}</strong></div>
      <div style={{ display:'flex', gap:8, marginBottom:8 }}>
        <button onClick={exportCsv}>تصدير CSV</button>
        <button onClick={toggleMode}>تبديل وضع GL2/Legacy</button>
      </div>
      {loading && <div>جاري التحميل…</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}

      {/* Table banner */}
      <div style={{ background:'#0b6', color:'#fff', padding:6, borderRadius:6, marginBottom:8 }}>GL2 mode (pilot)</div>

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
              <tr key={r.journal_id} style={{ cursor:'pointer' }} onClick={()=>{ setSelected(r.journal_id); setDrawerOpen(true); }}>
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
              <tr key={r.journal_id} style={{ cursor:'pointer' }} onClick={()=>{ setSelected(r.journal_id); setDrawerOpen(true); }}>
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
      <Gl2DetailsDrawer open={drawerOpen} journalId={selected} onClose={()=>setDrawerOpen(false)} onChanged={()=>{ setDrawerOpen(false); /* trigger refresh */ }} />
    </div>
  );
};

export default Gl2JournalsPage;