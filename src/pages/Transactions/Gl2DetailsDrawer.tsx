import React, { useEffect, useState } from 'react';
import { getGL2JournalDetails, postJournalUnified, voidJournalGL2, reverseJournalGL2 } from '../../services/transactions';

interface Props {
  open: boolean;
  journalId: string | null;
  onClose: () => void;
  onChanged?: () => void;
}

const Gl2DetailsDrawer: React.FC<Props> = ({ open, journalId, onClose, onChanged }) => {
  const [loading, setLoading] = useState(false);
  const [header, setHeader] = useState<any>(null);
  const [lines, setLines] = useState<any[]>([]);
  const [dimensions, setDimensions] = useState<Record<string, {key:string,value:string}[]>>({});
  const [msg, setMsg] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !journalId) return;
    setLoading(true);
    (async () => {
      const res = await getGL2JournalDetails(journalId);
      setHeader(res.header.data);
      setLines(res.lines.data || []);
      setDimensions(res.dimensions || {});
      setLoading(false);
    })();
  }, [open, journalId]);

  if (!open) return null;

  const onPost = async () => {
    if (!journalId) return;
    setMsg(null);
    const { error } = await postJournalUnified(journalId, new Date().toISOString().slice(0,10));
    if (error) setMsg(error.message || 'Failed to post');
    else { setMsg('Posted successfully'); onChanged && onChanged(); }
  };

  const onVoid = async () => {
    if (!journalId) return;
    setMsg(null);
    const { error } = await voidJournalGL2(journalId);
    if (error) setMsg(error.message || 'Failed to void (make sure api_void_journal exists)');
    else { setMsg('Voided successfully'); onChanged && onChanged(); }
  };

  const onReverse = async () => {
    if (!journalId) return;
    setMsg(null);
    const { error } = await reverseJournalGL2(journalId);
    if (error) setMsg(error.message || 'Failed to reverse (make sure api_reverse_journal exists)');
    else { setMsg('Reversed successfully'); onChanged && onChanged(); }
  };

  return (
    <div style={{ position: 'fixed', top:0, right:0, width: '40%', height: '100%', background: 'var(--mui-palette-background-paper)', boxShadow: '-2px 0 6px rgba(0,0,0,0.2)', padding: 16, overflowY: 'auto', zIndex: 1000 }}>
      <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
        <h3>تفاصيل قيد GL2</h3>
        <button onClick={onClose}>إغلاق</button>
      </div>
      {loading && <div>Loading...</div>}
      {header && (
        <div style={{ marginBottom: 12 }}>
          <div>رقم القيد: {header.number}</div>
          <div>الحالة: {header.status}</div>
          <div>تاريخ المستند: {header.doc_date}</div>
          <div>تاريخ الترحيل: {header.posting_date || '—'}</div>
          <div>الوصف: {header.description || '—'}</div>
        </div>
      )}
      {lines.map((l:any) => (
        <div key={l.id} style={{ border:'1px solid var(--mui-palette-divider)', borderRadius:8, padding:8, marginBottom:8 }}>
          <div>سطر #{l.line_no}</div>
          <div>الحساب: {l.accounts?.code} - {l.accounts?.name}</div>
          <div>مدين: {l.debit_base} | دائن: {l.credit_base}</div>
          {(dimensions[String(l.id)] || []).length > 0 && (
            <div style={{ fontSize:12, color:'#888' }}>
              الأبعاد: {(dimensions[String(l.id)] || []).map(d => `${d.key}=${d.value}`).join(', ')}
            </div>
          )}
        </div>
      ))}
      <div style={{ display:'flex', gap:8 }}>
        <button onClick={onPost}>ترحيل</button>
        <button onClick={onVoid}>إلغاء/إبطال</button>
        <button onClick={onReverse}>عكس القيد</button>
      </div>
      {msg && <div style={{ marginTop:8 }}>{msg}</div>}
    </div>
  );
};

export default Gl2DetailsDrawer;