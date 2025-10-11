import React, { useState } from 'react';
import { createJournalUnified } from '../../services/transactions';

const CreateJournalGL2Page: React.FC = () => {
  const [orgId, setOrgId] = useState('');
  const [number, setNumber] = useState('JV-UI-GL2-0001');
  const [docDate, setDocDate] = useState(() => new Date().toISOString().slice(0,10));
  const [amount, setAmount] = useState(100);
  const [debitCode, setDebitCode] = useState('5110');
  const [creditCode, setCreditCode] = useState('1110');
  const [projectId, setProjectId] = useState('');
  const [costCenterId, setCostCenterId] = useState('');
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  const onCreate = async () => {
    setBusy(true); setMsg(null);
    try {
      const { error } = await createJournalUnified({
        orgId,
        number,
        docType: 'JV',
        docDate,
        description: 'GL2 UI test',
        lines: [
          {
            account_code: debitCode,
            debit_base: amount,
            credit_base: 0,
            dimensions: {
              project_id: projectId || undefined,
              cost_center_id: costCenterId || undefined,
            },
          },
          {
            account_code: creditCode,
            debit_base: 0,
            credit_base: amount,
          },
        ],
      });
      if (error) throw error;
      setMsg('Created draft journal successfully.');
    } catch (e: any) {
      setMsg(e?.message || 'Failed to create');
    } finally { setBusy(false); }
  };

  return (
    <div style={{ padding: 16 }}>
      <h2>إنشاء قيد GL2 (تجريبي)</h2>
      <div style={{ display: 'grid', gap: 8, maxWidth: 480 }}>
        <input placeholder="Org UUID" value={orgId} onChange={e=>setOrgId(e.target.value)} />
        <input placeholder="Number" value={number} onChange={e=>setNumber(e.target.value)} />
        <input type="date" value={docDate} onChange={e=>setDocDate(e.target.value)} />
        <input placeholder="Debit account code" value={debitCode} onChange={e=>setDebitCode(e.target.value)} />
        <input placeholder="Credit account code" value={creditCode} onChange={e=>setCreditCode(e.target.value)} />
        <input type="number" placeholder="Amount" value={amount} onChange={e=>setAmount(parseFloat(e.target.value))} />
        <input placeholder="Project UUID (optional)" value={projectId} onChange={e=>setProjectId(e.target.value)} />
        <input placeholder="Cost Center UUID (optional)" value={costCenterId} onChange={e=>setCostCenterId(e.target.value)} />
        <button onClick={onCreate} disabled={busy}>إنشاء مسودة</button>
        {msg && <div>{msg}</div>}
      </div>
    </div>
  );
};

export default CreateJournalGL2Page;