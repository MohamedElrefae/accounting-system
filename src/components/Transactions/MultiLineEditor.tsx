import React, { useMemo, useState, useEffect } from 'react'
import { getTransactionLines, replaceTransactionLines, type TxLineInput } from '@/services/transaction-lines'
import type { Account } from '@/services/transactions'

export interface MultiLineEditorProps {
  transactionId: string
  accounts: Account[]
  orgId: string
  disabled?: boolean
  onSaved?: (summary: { totalDebits: number; totalCredits: number }) => void
  /** Optional callback to inform parent about current lines state (totals, balance, count) */
  onLinesStateChange?: (state: { totalDebits: number; totalCredits: number; isBalanced: boolean; linesCount: number }) => void
}

export const MultiLineEditor: React.FC<MultiLineEditorProps> = ({ transactionId, accounts, orgId, disabled = false, onSaved, onLinesStateChange }) => {
  const [lines, setLines] = useState<TxLineInput[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const postableAccounts = useMemo(() => accounts.filter(a => a.is_postable).sort((x, y) => x.code.localeCompare(y.code)), [accounts])

  const totals = useMemo(() => {
    const d = lines.reduce((s, l) => s + Number(l.debit_amount || 0), 0)
    const c = lines.reduce((s, l) => s + Number(l.credit_amount || 0), 0)
    const diff = d - c
    return { totalDebits: d, totalCredits: c, diff, isBalanced: Math.abs(diff) < 0.01 }
  }, [lines])

  // Notify parent about current state
  useEffect(() => {
    if (onLinesStateChange) {
      onLinesStateChange({
        totalDebits: totals.totalDebits,
        totalCredits: totals.totalCredits,
        isBalanced: totals.isBalanced,
        linesCount: lines.length,
      })
    }
  }, [onLinesStateChange, totals.totalDebits, totals.totalCredits, totals.isBalanced, lines.length])

  useEffect(() => {
    (async () => {
      try {
        setIsLoading(true)
        const existing = await getTransactionLines(transactionId)
        if (existing.length > 0) {
          setLines(existing.map((l: any) => ({
            line_no: l.line_no,
            account_id: l.account_id,
            debit_amount: Number(l.debit_amount) || 0,
            credit_amount: Number(l.credit_amount) || 0,
            description: l.description || '',
            project_id: l.project_id || null,
            cost_center_id: l.cost_center_id || null,
            work_item_id: l.work_item_id || null,
            analysis_work_item_id: l.analysis_work_item_id || null,
            classification_id: l.classification_id || null,
            sub_tree_id: l.sub_tree_id || null,
          })))
        } else {
          // initialize with two empty lines
          setLines([
            { line_no: 1, account_id: '', debit_amount: 0, credit_amount: 0, description: '' },
            { line_no: 2, account_id: '', debit_amount: 0, credit_amount: 0, description: '' },
          ])
        }
      } catch (e: any) {
        setError(e.message || 'Failed to load lines')
      } finally {
        setIsLoading(false)
      }
    })()
  }, [transactionId])

  const setLine = (idx: number, patch: Partial<TxLineInput>) => {
    setLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l))
  }

  const addLine = () => {
    setLines(prev => [...prev, { line_no: prev.length + 1, account_id: '', debit_amount: 0, credit_amount: 0, description: '' }])
  }

  const removeLine = (idx: number) => {
    setLines(prev => {
      if (prev.length <= 2) return prev
      const next = prev.filter((_, i) => i !== idx).map((l, i2) => ({ ...l, line_no: i2 + 1 }))
      return next
    })
  }

  const handleSave = async () => {
    setError(null)
    setIsLoading(true)
    try {
      const summary = await replaceTransactionLines(transactionId, lines)
      onSaved?.(summary)
      alert('تم حفظ القيود التفصيلية بنجاح')
    } catch (e: any) {
      setError(e.message || 'فشل حفظ القيود')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <div style={{ border: '1px solid var(--border-light)', borderRadius: 8, padding: 12, background: 'var(--surface)' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <h4 style={{ margin: 0 }}>قيود متعددة الأسطر</h4>
        <button onClick={addLine} disabled={disabled || isLoading} className="ultimate-btn ultimate-btn-success">+ إضافة سطر</button>
      </div>

      {error && <div style={{ color: 'var(--danger)' }}>{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: '60px 1fr 140px 140px 1fr 40px', gap: 8 }}>
        <div>#</div>
        <div>الحساب</div>
        <div>مدين</div>
        <div>دائن</div>
        <div>الوصف</div>
        <div></div>
      </div>

      {lines.map((line, idx) => (
        <div key={idx} style={{ display: 'grid', gridTemplateColumns: '60px 1fr 140px 140px 1fr 40px', gap: 8, alignItems: 'center', padding: '6px 0', borderBottom: '1px solid var(--border-subtle)' }}>
          <div style={{ textAlign: 'center' }}>{idx + 1}</div>
          <div>
            <select
              disabled={disabled || isLoading}
              value={line.account_id}
              onChange={e => setLine(idx, { account_id: e.target.value })}
              style={{ width: '100%' }}
            >
              <option value="">اختر الحساب...</option>
              {postableAccounts.map(a => (
                <option key={a.id} value={a.id}>{a.code} - {a.name}</option>
              ))}
            </select>
          </div>
          <div>
            <input
              disabled={disabled || isLoading}
              type="number"
              step="0.01"
              value={line.debit_amount || 0}
              onChange={e => setLine(idx, { debit_amount: Number(e.target.value || 0), credit_amount: 0 })}
              style={{ width: '100%', textAlign: 'right' }}
            />
          </div>
          <div>
            <input
              disabled={disabled || isLoading}
              type="number"
              step="0.01"
              value={line.credit_amount || 0}
              onChange={e => setLine(idx, { credit_amount: Number(e.target.value || 0), debit_amount: 0 })}
              style={{ width: '100%', textAlign: 'right' }}
            />
          </div>
          <div>
            <input
              disabled={disabled || isLoading}
              type="text"
              value={line.description || ''}
              onChange={e => setLine(idx, { description: e.target.value })}
              style={{ width: '100%' }}
              placeholder="وصف السطر"
            />
          </div>
          <div>
            <button onClick={() => removeLine(idx)} disabled={disabled || isLoading || lines.length <= 2} className="ultimate-btn ultimate-btn-delete">🗑</button>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 8, display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <div>
          <strong>الإجمالي مدين:</strong> {totals.totalDebits.toLocaleString('ar-EG')} —
          <strong> الإجمالي دائن:</strong> {totals.totalCredits.toLocaleString('ar-EG')} —
          <strong> الفرق:</strong> {totals.diff.toFixed(2)} {totals.isBalanced ? '✅' : '❌'}
        </div>
        <button onClick={handleSave} disabled={disabled || isLoading || !totals.isBalanced} className="ultimate-btn ultimate-btn-primary">
          {isLoading ? 'جارٍ الحفظ...' : 'حفظ القيود'}
        </button>
      </div>
    </div>
  )
}

export default MultiLineEditor