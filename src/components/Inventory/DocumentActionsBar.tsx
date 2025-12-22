import React, { useState } from 'react'
import { Card, CardContent, Grid, TextField, Button, Typography, MenuItem } from '@mui/material'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/hooks/useAuth'
import { approveInventoryDocument, postInventoryDocument, voidInventoryDocument, getInventoryDocument, listRecentDocuments, type InventoryDocumentSummary, type DocType } from '@/services/inventory/documents'
import { useScopeOptional } from '@/contexts/ScopeContext'

// Lazy permission guard wrapper
import { RequirePermission } from '@/components/security/RequirePermission'
import AsyncAutocomplete, { type AsyncOption } from '@/components/Common/AsyncAutocomplete'
import StatusChip from '@/components/Inventory/StatusChip'
import { useNavigate } from 'react-router-dom'

const DocumentActionsBar: React.FC = () => {
  const { showToast } = useToast()
  const { user } = useAuth()
  const navigate = useNavigate()
  const scope = useScopeOptional()
  const orgId = scope?.currentOrg?.id || ''
  const [documentId, setDocumentId] = useState<string>('')
  const [reason, setReason] = useState<string>('')
  const [loading, setLoading] = useState(false)
  const [statusLine, setStatusLine] = useState<string>('')
  const [statusValue, setStatusValue] = useState<string>('')
  const [docTypeFilter, setDocTypeFilter] = useState<'all' | DocType>('all')

  const guard = () => {
    if (!orgId || !documentId) { showToast('Provide org and document ID', { severity: 'warning' }); return false }
    if (!user?.id) { showToast('User not identified', { severity: 'warning' }); return false }
    return true
  }

  const refreshStatus = async () => {
    try {
      setStatusLine('')
      if (!documentId) return
      const doc = await getInventoryDocument(documentId)
      if (doc) { setStatusLine(`${doc.doc_type} | date ${doc.document_date} | posted_at ${doc.posted_at ?? '-'}`); setStatusValue(doc.status) }
      else setStatusLine('Not found')
    } catch (e: any) {
      setStatusLine(e?.message || 'Failed to load status')
    }
  }

  const onApprove = async () => {
    if (!guard()) return
    try {
      setLoading(true)
      await approveInventoryDocument(orgId, documentId, user!.id)
      showToast('Document approved', { severity: 'success' })
      await refreshStatus()
    } catch (e: any) {
      showToast(e?.message || 'Approve failed', { severity: 'error' })
    } finally { setLoading(false) }
  }

  const onPost = async () => {
    if (!guard()) return
    try {
      setLoading(true)
      await postInventoryDocument(orgId, documentId, user!.id)
      showToast('Document posted', { severity: 'success' })
      await refreshStatus()
    } catch (e: any) {
      showToast(e?.message || 'Post failed', { severity: 'error' })
    } finally { setLoading(false) }
  }

  const onVoid = async () => {
    if (!guard()) return
    try {
      setLoading(true)
      await voidInventoryDocument(orgId, documentId, user!.id, reason || 'void via UI')
      showToast('Document voided (if eligible)', { severity: 'success' })
      await refreshStatus()
    } catch (e: any) {
      showToast(e?.message || 'Void failed', { severity: 'error' })
    } finally { setLoading(false) }
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" gutterBottom>Document Actions (Approve / Post / Void)</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <AsyncAutocomplete
              label="Find recent documents (type code or paste ID)"
              value={documentId}
              onChange={(v) => { setDocumentId(v || ''); setTimeout(refreshStatus, 0) }}
              loader={async (q: string): Promise<AsyncOption<InventoryDocumentSummary>[]> => {
                if (!orgId) return []
                const rows = await listRecentDocuments({ orgId, q: q || undefined, limit: 25, types: docTypeFilter === 'all' ? undefined : [docTypeFilter] })
                return rows.map(r => ({ id: r.id, label: `${r.doc_number ?? r.id.slice(0,8)} — ${r.doc_type} — ${r.status}`, raw: r }))
              }}
            />
          </Grid>
          <Grid item xs={12} md={3}>
            <TextField select fullWidth label="Filter Type" value={docTypeFilter} onChange={e => setDocTypeFilter(e.target.value as any)} SelectProps={{ displayEmpty: true }}>
              <MenuItem value="all">All</MenuItem>
              <MenuItem value="receipt">receipt</MenuItem>
              <MenuItem value="issue">issue</MenuItem>
              <MenuItem value="transfer">transfer</MenuItem>
              <MenuItem value="adjust">adjust</MenuItem>
              <MenuItem value="return">return</MenuItem>
            </TextField>
          </Grid>
          <Grid item xs={12} md={3} style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
            <StatusChip status={statusValue} />
            {statusLine && (
              <Typography variant="body2" color="text.secondary">{statusLine}</Typography>
            )}
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Inventory Document ID (UUID)" value={documentId} onChange={e => setDocumentId(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Reason (for Void)" value={reason} onChange={e => setReason(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={3}>
            <Button variant="outlined" onClick={refreshStatus} disabled={loading}>Check Status</Button>
          </Grid>
          <Grid item xs={12} md={3}>
            <RequirePermission permission="inventory.approve">
              <Button variant="outlined" onClick={onApprove} disabled={loading}>Approve</Button>
            </RequirePermission>
          </Grid>
          <Grid item xs={12} md={3}>
            <RequirePermission permission="inventory.post">
              <Button variant="contained" color="primary" onClick={onPost} disabled={loading}>Post</Button>
            </RequirePermission>
          </Grid>
          <Grid item xs={12} md={3}>
            <RequirePermission permission="inventory.post">
              <Button variant="contained" color="warning" onClick={onVoid} disabled={loading}>Void</Button>
            </RequirePermission>
          </Grid>
          <Grid item xs={12} md={3}>
            <Button variant="text" onClick={() => { if (documentId) navigate(`/inventory/documents/${documentId}`) }} disabled={!documentId}>View Details</Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default DocumentActionsBar