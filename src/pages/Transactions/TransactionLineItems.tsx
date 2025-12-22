import React, { useEffect, useState } from 'react'
import { TransactionLineItemsSection } from '../../components/line-items/TransactionLineItemsSection'
import { useScopeOptional } from '../../contexts/ScopeContext'
import ScopeChips from '../../components/Scope/ScopeChips'

// Utility: read query param from window.location
function useQueryParam(name: string): string | null {
  const [val, setVal] = useState<string | null>(null)
  useEffect(() => {
    const read = () => {
      const params = new URLSearchParams(window.location.search)
      setVal(params.get(name))
    }
    read()
    const onPop = () => read()
    window.addEventListener('popstate', onPop)
    window.addEventListener('hashchange', onPop)
    return () => {
      window.removeEventListener('popstate', onPop)
      window.removeEventListener('hashchange', onPop)
    }
  }, [name])
  return val
}

export const TransactionLineItemsPage: React.FC = () => {
  const transactionId = useQueryParam('id')
  const [manualId, setManualId] = useState<string>('')
  const [header, setHeader] = useState<null | { entry_number: string; description: string }>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const scope = useScopeOptional()
  const orgId = scope?.currentOrg?.id || ''

  useEffect(() => {
    let mounted = true
    const loadHeader = async () => {
      if (!transactionId || !orgId) return
      setLoading(true)
      setError(null)
      try {
        const { supabase } = await import('../../utils/supabase')
        const { data, error } = await supabase
          .from('transactions')
          .select('entry_number, description')
          .eq('id', transactionId)
          .single()
        if (error) throw error
        if (mounted) setHeader({ entry_number: data.entry_number, description: data.description })
      } catch (e: any) {
        if (mounted) setError(e?.message || 'Failed to load transaction header')
      } finally {
        if (mounted) setLoading(false)
      }
    }
    loadHeader()
    return () => { mounted = false }
  }, [transactionId, orgId])

  if (!orgId) {
    return (
      <div className="page-root flex-col gap-4">
        <div className="page-header">
          <h2 className="text-title">Transaction Line Items</h2>
          <ScopeChips />
        </div>
        <div className="text-secondary">اختر مؤسسة من الشريط العلوي لعرض سطور المعاملات</div>
      </div>
    )
  }

  if (!transactionId) {
    return (
      <div className="page-root flex-col gap-4">
        <h2 className="text-title">Transaction Line Items</h2>
        <ScopeChips />
        <div className="text-secondary">اختر أو أدخل معرف المعاملة لعرض سطورها</div>
        <div className="flex-row gap-2">
          <input
            className="field"
            placeholder="transaction UUID"
            value={manualId}
            onChange={(e) => setManualId(e.target.value)}
            aria-label="Transaction ID"
          />
          <button
            className="btn btn-primary"
            onClick={() => {
              if (manualId && manualId.length > 0) {
                const url = new URL(window.location.href)
                url.searchParams.set('id', manualId)
                try {
                  window.history.pushState({}, '', url.toString())
                  // Re-run the param reader
                  const params = new URLSearchParams(window.location.search)
                  const v = params.get('id')
                  if (v) {
                    // Force state update via hash change event fallback
                    window.dispatchEvent(new PopStateEvent('popstate'))
                  }
                } catch {
                  window.location.href = url.toString()
                }
              }
            }}
          >
            فتح
          </button>
        </div>
        <div className="text-tertiary">أو افتح عبر الرابط: /Transactions/TransactionLineItems?id=&lt;transaction_uuid&gt;</div>
      </div>
    )
  }

  return (
    <div className="page-root flex-col gap-4">
      <div className="page-header">
        <h2 className="text-title">Transaction Line Items</h2>
        <ScopeChips />
        {header && (
          <div className="text-secondary">{header.entry_number} — {header.description}</div>
        )}
      </div>

      {loading && <div className="text-secondary">Loading…</div>}
      {error && <div className="text-danger" role="alert">{error}</div>}

      <TransactionLineItemsSection
        transactionId={transactionId}
        orgId={orgId}
      />
    </div>
  )
}

export default TransactionLineItemsPage
