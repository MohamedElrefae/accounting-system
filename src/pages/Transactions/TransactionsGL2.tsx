import React, { useEffect, useMemo, useState } from 'react';
import ResizableTable from '../../components/Common/ResizableTable';
import { useFeatureFlags } from '../../hooks/useFeatureFlags';
import { supabase } from '../../utils/supabase';

// A GL2 clone of the legacy transactions list page (simplified):
// - Reuses the same table component and a similar column layout
// - Reads from public v_gl2_* wrapper views to avoid PostgREST schema issues
// - Shows both draft and posted when possible (single-line), and falls back to collapsed totals

const TransactionsGL2Page: React.FC = () => {
  const { READ_MODE } = useFeatureFlags();
  const [rows, setRows] = useState<any[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      setLoading(true);
      setError(null);
      // Try all-status two-line first
      const r1 = await supabase
        .from('v_gl2_journals_single_line_all')
        .select('journal_id, number, doc_date, posting_date, debit_account_code, credit_account_code, amount, status')
        .order('posting_date', { ascending: false })
        .limit(200);

      if (!r1.error && (r1.data?.length ?? 0) > 0) {
        setRows(r1.data ?? []);
        setLoading(false);
        return;
      }

      // Fallback to collapsed
      const r2 = await supabase
        .from('v_gl2_journals_collapsed')
        .select('journal_id, number, doc_date, posting_date, total_debits, total_credits, debit_account_code, credit_account_code, status')
        .order('posting_date', { ascending: false })
        .limit(200);

      if (r2.error) {
        setError(r2.error.message || 'فشل تحميل قيود GL2');
        setRows([]);
      } else {
        setRows(r2.data ?? []);
      }
      setLoading(false);
    })();
  }, [READ_MODE]);

  const data = useMemo(() => {
    return rows.map((r: any) => ({
      number: r.number,
      posting_date: r.posting_date,
      debit_label: r.debit_account_code ?? '—',
      credit_label: r.credit_account_code ?? '—',
      amount: r.amount ?? r.total_debits ?? 0,
      status: r.status,
    }));
  }, [rows]);

  const columns = useMemo(() => [
    { key: 'number', label: 'رقم القيد', width: 140 },
    { key: 'posting_date', label: 'تاريخ الترحيل', width: 160 },
    { key: 'debit_label', label: 'الحساب المدين', width: 220 },
    { key: 'credit_label', label: 'الحساب الدائن', width: 220 },
    { key: 'amount', label: 'المبلغ', width: 140 },
    { key: 'status', label: 'الحالة', width: 120 },
  ], []);

  return (
    <div style={{ padding: 16 }}>
      <h2>قيود اليومية (GL2 — نسخة مشابهة)</h2>
      <div style={{ fontSize: 12, color: '#9aa' }}>يتم عرض القيود ذات سطرين أولاً، وفي حال عدم توفرها يتم عرض ملخص القيود متعددة الأسطر.</div>
      {loading && <div>جاري التحميل…</div>}
      {error && <div style={{ color: 'red' }}>{error}</div>}

      <div style={{ border: '1px solid var(--mui-palette-divider)', borderRadius: 8, overflow: 'hidden' }}>
        <ResizableTable
          columns={columns as any}
          data={data as any}
          onColumnResize={() => {}}
          wrapMode={false}
        />
      </div>

      {!loading && rows.length === 0 && (
        <div style={{ color: '#888', marginTop: 12 }}>لا توجد قيود</div>
      )}
    </div>
  );
};

export default TransactionsGL2Page;