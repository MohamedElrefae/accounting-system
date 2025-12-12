import React, { useEffect, useMemo, useState } from 'react'
import { supabase } from '../../utils/supabase'
import { useHasPermission } from '../../hooks/useHasPermission'
import '../../components/Common/ExportButtons.css'
import '../../components/Common/UltimateButtons.css'

interface ClientErrorLog {
  id: string
  user_id: string | null
  context: string
  message: string
  extra: any
  created_at: string
}

const PAGE_SIZES = [20, 50, 100]

const ClientErrorLogs: React.FC = () => {
  const hasPerm = useHasPermission()
  const [logs, setLogs] = useState<ClientErrorLog[]>([])
  const [total, setTotal] = useState(0)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [page, setPage] = useState(1)
  const [pageSize, setPageSize] = useState(20)

  // Selection state for sending to agent
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  // Copy format: 'md' for Markdown, 'json' for plain JSON
  const [copyFormat, setCopyFormat] = useState<'md' | 'json'>('md')

  const canView = hasPerm('transactions.manage')

  const range = useMemo(() => {
    const from = (page - 1) * pageSize
    const to = from + pageSize - 1
    return { from, to }
  }, [page, pageSize])

  async function load() {
    setLoading(true)
    setError(null)
    try {
      // Reset selection on reload of the page data
      setSelectedIds([])
      let query = supabase
        .from('client_error_logs')
        .select('*', { count: 'exact' })
        .order('created_at', { ascending: false })

      if (search.trim()) {
        const s = search.trim()
        query = query.or(`context.ilike.%${s}%,message.ilike.%${s}%`)
      }
      if (dateFrom) query = query.gte('created_at', dateFrom)
      if (dateTo) query = query.lte('created_at', dateTo)

      const { data, error, count } = await query.range(range.from, range.to)
      if (error) throw error
      setLogs((data as ClientErrorLog[]) || [])
      setTotal(count || 0)
    } catch {
      setError('Failed to load logs')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (!canView) return
    load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [canView, page, pageSize, search, dateFrom, dateTo])

  const allVisibleSelected = useMemo(() => logs.length > 0 && selectedIds.length === logs.length, [logs, selectedIds])
  const selectedLogs = useMemo(() => logs.filter(l => selectedIds.includes(l.id)), [logs, selectedIds])

  function toggleSelectAll() {
    if (allVisibleSelected) {
      setSelectedIds([])
    } else {
      setSelectedIds(logs.map(l => l.id))
    }
  }

  function toggleSelectOne(id: string) {
    setSelectedIds(prev => prev.includes(id) ? prev.filter(x => x !== id) : [...prev, id])
  }

  function downloadJSON(data: any, filename?: string) {
    try {
      const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json;charset=utf-8' })
      const url = URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = filename || `client_error_logs_${new Date().toISOString().replace(/[:.]/g,'-')}.json`
      document.body.appendChild(a)
      a.click()
      a.remove()
      URL.revokeObjectURL(url)
    } catch {
      // ignore secondary failures silently
    }
  }

  async function handleSendToAgent() {
    let payload: any = null
    try {
      if (selectedLogs.length === 0) return
      payload = {
        type: 'client_error_logs',
        count: selectedLogs.length,
        filters: { search: search || null, dateFrom: dateFrom || null, dateTo: dateTo || null },
        items: selectedLogs
      }
      let text: string
      if (copyFormat === 'md') {
        text = `### Agent request: Please analyze and suggest fixes for these client error logs (count=${selectedLogs.length}).\n\n\`\`\`json\n${JSON.stringify(payload, null, 2)}\n\`\`\`\n`
      } else {
        text = JSON.stringify(payload, null, 2)
      }
      await navigator.clipboard.writeText(text)
      alert(copyFormat === 'md' ? 'تم نسخ Markdown إلى الحافظة.' : 'تم نسخ JSON إلى الحافظة.')
    } catch {
      // Clipboard blocked or failed — fallback to automatic JSON download
      downloadJSON(payload ?? { items: selectedLogs })
      alert('تم تنزيل JSON تلقائيًا لأن النسخ إلى الحافظة فشل.')
    }
  }

  if (!canView) {
    return <div style={{ padding: 16 }} dir="rtl">ليس لديك صلاحية للاطلاع على سجل أخطاء العميل (يتطلب transactions.manage).</div>
  }

  return (
    <div style={{ padding: 16 }} dir="rtl">
      <h1 style={{ marginTop: 0 }}>سجل أخطاء العميل</h1>

      <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap', alignItems: 'center', marginBottom: 12 }}>
        <input
          placeholder="بحث في السياق/الرسالة"
          value={search}
          onChange={e => { setSearch(e.target.value); setPage(1) }}
          style={{ padding: '8px 12px', borderRadius: 8, border: '1px solid rgba(0,0,0,0.2)', minWidth: 240 }}
        />
        <input type="date" value={dateFrom} onChange={e => { setDateFrom(e.target.value); setPage(1) }} />
        <input type="date" value={dateTo} onChange={e => { setDateTo(e.target.value); setPage(1) }} />
        <button
          className="ultimate-btn ultimate-btn-warning"
          onClick={() => { setSearch(''); setDateFrom(''); setDateTo(''); setPage(1) }}
        >
          <div className="btn-content"><span className="btn-text">مسح الفلاتر</span></div>
        </button>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div>الإجمالي: {total}</div>
          <select value={copyFormat} onChange={e => setCopyFormat((e.target.value as 'md' | 'json') || 'md')} title="صيغة النسخ">
            <option value="md">Markdown</option>
            <option value="json">JSON</option>
          </select>
          <button
            className="ultimate-btn ultimate-btn-primary"
            onClick={handleSendToAgent}
            disabled={selectedIds.length === 0}
            title={selectedIds.length === 0 ? 'اختر سجلات أولاً' : (copyFormat === 'md' ? 'نسخ كـ Markdown' : 'نسخ كـ JSON')}
          >
            <div className="btn-content"><span className="btn-text">إرسال للوكيل</span></div>
          </button>
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button className="ultimate-btn ultimate-btn-neutral" onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page === 1}>
            <div className="btn-content"><span className="btn-text">السابق</span></div>
          </button>
          <span>صفحة {page} من {Math.max(1, Math.ceil(total / pageSize))}</span>
          <button className="ultimate-btn ultimate-btn-neutral" onClick={() => setPage(p => Math.min(Math.ceil(total / pageSize) || 1, p + 1))} disabled={page >= Math.ceil(total / pageSize)}>
            <div className="btn-content"><span className="btn-text">التالي</span></div>
          </button>
          <select value={pageSize} onChange={e => { setPageSize(parseInt(e.target.value) || 20); setPage(1) }}>
            {PAGE_SIZES.map(s => <option key={s} value={s}>{s}</option>)}
          </select>
        </div>
      </div>

      {loading ? (
        <div className="loading-container"><div className="loading-spinner" />جاري التحميل...</div>
      ) : error ? (
        <div className="error-container">خطأ: {error}</div>
      ) : (
        <div style={{ border: '1px solid rgba(0,0,0,0.1)', borderRadius: 8, overflow: 'hidden' }}>
          <table style={{ width: '100%', borderCollapse: 'collapse', tableLayout: 'fixed' }}>
            <thead>
              <tr>
                <th style={{ textAlign: 'center', padding: 12, width: 60 }}>
                  <input type="checkbox" checked={allVisibleSelected} onChange={toggleSelectAll} />
                </th>
                <th style={{ textAlign: 'right', padding: 12 }}>التاريخ</th>
                <th style={{ textAlign: 'right', padding: 12 }}>المستخدم</th>
                <th style={{ textAlign: 'right', padding: 12 }}>السياق</th>
                <th style={{ textAlign: 'right', padding: 12 }}>الرسالة</th>
                <th style={{ textAlign: 'right', padding: 12 }}>تفاصيل</th>
              </tr>
            </thead>
            <tbody>
              {logs.map(l => (
                <tr key={l.id}>
                  <td style={{ textAlign: 'center', padding: 12, borderTop: '1px solid rgba(0,0,0,0.1)' }}>
                    <input type="checkbox" checked={selectedIds.includes(l.id)} onChange={() => toggleSelectOne(l.id)} />
                  </td>
                  <td style={{ padding: 12, borderTop: '1px solid rgba(0,0,0,0.1)' }}>{new Date(l.created_at).toLocaleString('ar-EG')}</td>
                  <td style={{ padding: 12, borderTop: '1px solid rgba(0,0,0,0.1)' }}>{l.user_id ? l.user_id.substring(0, 8) : '—'}</td>
                  <td style={{ padding: 12, borderTop: '1px solid rgba(0,0,0,0.1)' }}>{l.context}</td>
                  <td style={{ padding: 12, borderTop: '1px solid rgba(0,0,0,0.1)', direction: 'ltr' }}>{l.message}</td>
                  <td style={{ padding: 12, borderTop: '1px solid rgba(0,0,0,0.1)', direction: 'ltr' }}>
                    <pre style={{ margin: 0, whiteSpace: 'pre-wrap' }}>{JSON.stringify(l.extra, null, 2)}</pre>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default ClientErrorLogs

