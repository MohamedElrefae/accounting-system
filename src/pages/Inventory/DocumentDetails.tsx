import React, { useEffect, useMemo, useState } from 'react'
import { Card, CardContent, Typography, Grid, Divider, Button } from '@mui/material'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/hooks/useAuth'
import { getInventoryDocument, listDocumentLines, listInventoryMovements } from '@/services/inventory/documents'
import { supabase } from '@/utils/supabase'
import StatusChip from '@/components/Inventory/StatusChip'
import { useNavigate } from 'react-router-dom'

interface TxRow {
  id: string
  entry_number: string | null
  entry_date: string
  posted_at: string | null
  amount: number
  debit_account_id: string
  credit_account_id: string
}

const DocumentDetailsPage: React.FC = () => {
  const { showToast } = useToast()
  const navigate = useNavigate()
  const { user } = useAuth()
  const [loading, setLoading] = useState(false)
  const [docId, setDocId] = useState<string>('')
  const [header, setHeader] = useState<any>(null)
  const [lines, setLines] = useState<any[]>([])
  const [movements, setMovements] = useState<any[]>([])
  const [transactions, setTransactions] = useState<TxRow[]>([])
  const [postings, setPostings] = useState<any[]>([])

  useEffect(() => {
    const id = window.location.pathname.split('/').pop() || ''
    setDocId(id)
  }, [])

  useEffect(() => {
    (async () => {
      if (!docId) return
      setLoading(true)
      try {
        const hdr = await getInventoryDocument(docId)
        setHeader(hdr)
        if (!hdr) return
        const ln = await listDocumentLines(docId)
        setLines(ln)
        // movements for this org filtered client-side
        const mov = await listInventoryMovements(hdr.org_id)
        setMovements((mov || []).filter((m: any) => m.document_id === docId))
        // GL transactions linked by source
        const { data: tx, error: txErr } = await supabase
          .from('transactions')
          .select('id, entry_number, entry_date, posted_at, amount, debit_account_id, credit_account_id')
          .eq('org_id', hdr.org_id)
          .eq('source_module', 'inventory')
          .eq('source_reference_id', docId)
          .order('posted_at', { ascending: false })
        if (txErr) throw txErr
        setTransactions(tx || [])
        // postings linkage
        const { data: ip, error: ipErr } = await supabase
          .from('inventory_postings')
          .select('*')
          .eq('document_id', docId)
          .order('posting_date', { ascending: false })
        if (ipErr) throw ipErr
        setPostings(ip || [])
      } catch (e: any) {
        showToast(e?.message || 'Failed to load document details', { severity: 'error' })
      } finally { setLoading(false) }
    })()
  }, [docId])

  const docTitle = useMemo(() => {
    if (!header) return 'Inventory Document'
    const dn = header.doc_number ? `#${header.doc_number}` : header.id?.slice(0,8)
    return `${header.doc_type?.toUpperCase?.()} ${dn}`
  }, [header])

  return (
    <div style={{ padding: 16 }}>
      <Typography variant="h6" gutterBottom>{docTitle} {' '}{header && <StatusChip status={header.status} />}</Typography>
      {transactions.length > 0 && (
        <div style={{ marginTop: -8, marginBottom: 12 }}>
          <Typography variant="caption" color="text.secondary">Linked Transactions:</Typography>{' '}
          {transactions.map(t => (
            <Button key={t.id} size="small" sx={{ mr: 1, mb: 1 }} onClick={() => navigate(`/transactions/${t.id}`)}>
              {t.entry_number ?? t.id.slice(0,8)}
            </Button>
          ))}
        </div>
      )}
      {header && (
        <Card sx={{ mb: 2 }}>
          <CardContent>
            <Grid container spacing={2}>
              <Grid item xs={12} md={3}><b>Date:</b> {header.document_date}</Grid>
              <Grid item xs={12} md={3}><b>Status:</b> {header.status}</Grid>
              <Grid item xs={12} md={3}><b>Posted at:</b> {header.posted_at ?? '-'}</Grid>
              <Grid item xs={12} md={3}><b>Totals:</b> {header.total_lines} lines / Qty {header.total_quantity} / Value {header.total_value}</Grid>
              <Grid item xs={12} md={3}><b>From:</b> {header.location_from_id ?? '-'}</Grid>
              <Grid item xs={12} md={3}><b>To:</b> {header.location_to_id ?? '-'}</Grid>
            </Grid>
          </CardContent>
        </Card>
      )}

      <Typography variant="subtitle1">Lines</Typography>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          {lines.length ? lines.map((l) => (
            <div key={l.id} style={{ display: 'flex', gap: 16, fontSize: 14, padding: '4px 0' }}>
              <span>#{l.line_no}</span>
              <span>Mat: {l.material_id}</span>
              <span>UOM: {l.uom_id}</span>
              <span>Qty: {l.quantity}</span>
              <span>Cost: {l.unit_cost ?? '-'}</span>
            </div>
          )) : (<Typography color="text.secondary">No lines</Typography>)}
        </CardContent>
      </Card>

      <Typography variant="subtitle1">Movements</Typography>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8 }}>
            {movements.length > 0 && (
              <Button size="small" variant="outlined" onClick={() => {
                try {
                  const headers = ['movement_id','movement_date','movement_type','material_id','location_id','uom_id','quantity','unit_cost','total_cost']
                  const csvRows = [headers.join(',')]
                  for (const r of movements) {
                    const vals = [
                      r.id,
                      String(r.movement_date ?? '').replace('T',' ').split('.')[0],
                      r.movement_type,
                      r.material_id,
                      r.location_id,
                      r.uom_id,
                      String(r.quantity ?? ''),
                      String(r.unit_cost ?? ''),
                      String((r.total_cost ?? (r.unit_cost ?? 0) * (r.quantity ?? 0)))
                    ]
                    csvRows.push(vals.map(v => {
                      const s = String(v ?? '')
                      const needs = s.includes(',') || s.includes('"') || s.includes('\n')
                      return needs ? '"' + s.replaceAll('"','""') + '"' : s
                    }).join(','))
                  }
                  const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
                  const url = URL.createObjectURL(blob)
                  const a = document.createElement('a')
                  a.href = url
                  a.download = `document_${(header?.doc_number || header?.id || 'document').toString().replaceAll(' ','_')}_movements.csv`
                  document.body.appendChild(a)
                  a.click()
                  document.body.removeChild(a)
                  URL.revokeObjectURL(url)
                } catch {}
              }}>Export CSV</Button>
            )}
          </div>
          {movements.length > 0 && movements.map((m: any) => (
            <div key={m.id} style={{ display: 'flex', gap: 16, fontSize: 14, padding: '4px 0' }}>
              <span>{m.movement_type}</span>
              <span>Loc: {m.location_id}</span>
              <span>Qty: {m.quantity}</span>
              <span>Unit Cost: {m.unit_cost}</span>
              <span>Total: {m.total_cost}</span>
            </div>
          ))}
          {movements.length === 0 && (
            <Typography color="text.secondary">No movements</Typography>
          )}
        </CardContent>
      </Card>

      <Typography variant="subtitle1">GL Transactions</Typography>
      <Card sx={{ mb: 2 }}>
        <CardContent>
          {transactions.length ? transactions.map((t) => (
            <div key={t.id} style={{ display: 'flex', gap: 16, fontSize: 14, padding: '4px 0', alignItems: 'center' }}>
              <span>{t.entry_number ?? t.id.slice(0,8)}</span>
              <span>Amount: {t.amount}</span>
              <span>Posted: {t.posted_at ?? '-'}</span>
              <Button size="small" variant="outlined" onClick={() => navigate(`/transactions/${t.id}`)}>View</Button>
            </div>
          )) : (<Typography color="text.secondary">No GL transactions</Typography>)}
        </CardContent>
      </Card>

      <Typography variant="subtitle1">Postings Linkage</Typography>
      <Card>
        <CardContent>
          {postings.length ? postings.map((p) => (
            <div key={p.id} style={{ display: 'flex', gap: 16, fontSize: 14, padding: '4px 0', alignItems: 'center' }}>
              <span>Move: {p.movement_id}</span>
              <span>Tx: {p.transaction_id}</span>
              <span>Date: {p.posting_date}</span>
              <Button size="small" onClick={() => navigate(`/transactions/${p.transaction_id}`)}>View Tx</Button>
            </div>
          )) : (<Typography color="text.secondary">No postings linkage</Typography>)}
        </CardContent>
      </Card>
    </div>
  )
}

export default DocumentDetailsPage
