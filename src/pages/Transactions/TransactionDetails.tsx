import React, { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { CircularProgress, Box, Typography, Button, Chip, Stack, Grid, TextField, MenuItem } from '@mui/material'
import UnifiedTransactionDetailsPanel from '@/components/Transactions/UnifiedTransactionDetailsPanel'
import EnhancedLineApprovalManager from '@/components/Approvals/EnhancedLineApprovalManager'
import { findInventoryDocumentByTransaction, listInventoryPostingsByTransaction, listMovementsByDocument, listTransactionsLinkedToDocuments, type InventoryPostingLink } from '@/services/inventory/documents'
import { getTransactionById, getTransactionAudit, getUserDisplayMap, type TransactionRecord, getAccounts, getProjects } from '@/services/transactions'
import { useScopeOptional } from '@/contexts/ScopeContext'
import { useTransactionsData } from '@/contexts/TransactionsDataContext'

// Approval history type - moved to local definition
type ApprovalHistoryRow = {
  id: string
  request_id: string
  step_order: number
  action: 'approve' | 'reject' | 'request_changes' | 'comment'
  reason: string | null
  actor_user_id: string
  created_at: string
}

const TransactionDetailsPage: React.FC = () => {
  const { id } = useParams<{ id: string }>()
  const navigate = useNavigate()
  const scope = useScopeOptional()
  const orgId = scope?.currentOrg?.id ?? null

  // Get complete data from TransactionsDataContext
  const {
    organizations,
    projects,
    accounts,
    costCenters,
    workItems,
    categories,
    classifications,
    analysisItemsMap,
    currentUserId,
    isLoading: contextLoading,
  } = useTransactionsData()

  const [loading, setLoading] = useState(true)
  const [tx, setTx] = useState<TransactionRecord | null>(null)
  const [audit, setAudit] = useState<any[]>([])
  const [userMap, setUserMap] = useState<Record<string, string>>({})
  const [approvalHistory, setApprovalHistory] = useState<ApprovalHistoryRow[]>([])
  const [linkedDocId, setLinkedDocId] = useState<string | null>(null)
  const [postings, setPostings] = useState<InventoryPostingLink[]>([])
  const [movements, setMovements] = useState<any[]>([])
  // Linked movements quick filters/sorting
  const [mvType, setMvType] = useState<string>('')
  const [mvLoc, setMvLoc] = useState<string>('')
  const [mvFrom, setMvFrom] = useState<string>('')
  const [mvTo, setMvTo] = useState<string>('')
  const [mvSort, setMvSort] = useState<'date_desc' | 'date_asc' | 'amount_desc' | 'amount_asc'>('date_desc')
  const [approvalModalOpen, setApprovalModalOpen] = useState(false)

  // Load saved filters on mount
  useEffect(() => {
    try {
      const raw = localStorage.getItem('txDetails:mvFilters')
      if (raw) {
        const saved = JSON.parse(raw)
        if (typeof saved.mvType === 'string') setMvType(saved.mvType)
        if (typeof saved.mvLoc === 'string') setMvLoc(saved.mvLoc)
        if (typeof saved.mvFrom === 'string') setMvFrom(saved.mvFrom)
        if (typeof saved.mvTo === 'string') setMvTo(saved.mvTo)
        if (['date_desc', 'date_asc', 'amount_desc', 'amount_asc'].includes(saved.mvSort)) setMvSort(saved.mvSort)
      }
    } catch { }
  }, [])

  // Persist filters whenever they change
  useEffect(() => {
    try {
      const toSave = { mvType, mvLoc, mvFrom, mvTo, mvSort }
      localStorage.setItem('txDetails:mvFilters', JSON.stringify(toSave))
    } catch { }
  }, [mvType, mvLoc, mvFrom, mvTo, mvSort])

  const filteredSortedMovements = useMemo(() => {
    const filtered = movements.filter((m: any) => {
      if (mvType && m.movement_type !== mvType) return false
      if (mvLoc && m.location_id !== mvLoc) return false
      if (mvFrom && String(m.movement_date).slice(0, 10) < mvFrom) return false
      if (mvTo && String(m.movement_date).slice(0, 10) > mvTo) return false
      return true
    })
    const sorted = [...filtered].sort((a: any, b: any) => {
      if (mvSort === 'date_desc') return (a.movement_date > b.movement_date ? -1 : 1)
      if (mvSort === 'date_asc') return (a.movement_date < b.movement_date ? -1 : 1)
      const aAmt = Number(a.total_cost ?? ((a.unit_cost ?? 0) * (a.quantity ?? 0)))
      const bAmt = Number(b.total_cost ?? ((b.unit_cost ?? 0) * (b.quantity ?? 0)))
      if (mvSort === 'amount_desc') return bAmt - aAmt
      if (mvSort === 'amount_asc') return aAmt - bAmt
      return 0
    })
    return sorted
  }, [movements, mvType, mvLoc, mvFrom, mvTo, mvSort])
  const [otherLinkedTx, setOtherLinkedTx] = useState<Array<{ transaction_id: string; entry_number: string | null }>>([])

  useEffect(() => {
    let mounted = true
    const load = async () => {
      if (!id) { setLoading(false); return }
      try {
        const [txRow, auditRows] = await Promise.all([
          getTransactionById(id),
          getTransactionAudit(id),
        ])
        if (!mounted) return
        setTx(txRow)
        setAudit(auditRows)
        // Load approval history if transaction exists
        if (txRow) {
          try {
            const { getLineReviewsForTransaction } = await import('../../services/lineReviewService')
            const lines = await getLineReviewsForTransaction(txRow.id)
            const hist = lines.flatMap(line => line.approval_history || [])
            setApprovalHistory(hist)
            if (import.meta.env.DEV) console.log(`✅ Loaded ${hist.length} approval history records`)
          } catch (error) {
            console.error('❌ Failed to fetch approval history:', error)
            setApprovalHistory([])
          }
        }
        // Find linked inventory document via postings
        if (txRow && txRow.org_id) {
          const [link, links] = await Promise.all([
            findInventoryDocumentByTransaction({ orgId: txRow.org_id, transactionId: txRow.id }),
            listInventoryPostingsByTransaction({ orgId: txRow.org_id, transactionId: txRow.id }),
          ])
          if (mounted) {
            setLinkedDocId(link?.id || null)
            setPostings(links)
            // Fetch movements for all linked documents
            const allMovs: any[] = []
            for (const l of links) {
              try {
                const rows = await listMovementsByDocument(l.document_id)
                allMovs.push(...rows)
              } catch { }
            }
            setMovements(allMovs)
            // Fetch other GL transactions linked to same documents
            try {
              const docIds = links.map(l => l.document_id)
              const others = await listTransactionsLinkedToDocuments({ orgId: txRow.org_id, documentIds: docIds, excludeTransactionId: txRow.id })
              setOtherLinkedTx(others.map(o => ({ transaction_id: o.transaction_id, entry_number: o.entry_number })))
            } catch { }
          }
        }
        // Build user map from fields
        const ids = [] as string[]
        if (txRow?.created_by) ids.push(txRow.created_by)
        if (txRow?.posted_by) ids.push(txRow.posted_by)
        const map = await getUserDisplayMap(ids)
        if (!mounted) return
        setUserMap(map)
      } finally {
        if (mounted) setLoading(false)
      }
    }
    load()
    return () => { mounted = false }
  }, [id, orgId])

  const handleClose = () => navigate(-1)

  if (loading) {
    return (
      <Box display="flex" alignItems="center" justifyContent="center" minHeight="50vh">
        <CircularProgress />
      </Box>
    )
  }

  if (!tx) {
    return (
      <Box p={3}>
        <Typography variant="h6">Transaction not found</Typography>
        <Button onClick={handleClose} sx={{ mt: 2 }} variant="contained">Back</Button>
      </Box>
    )
  }

  return (
    <Box p={1}>
      {postings.length > 0 && (
        <Box display="flex" justifyContent="space-between" alignItems="center" mb={1} p={1} sx={{ border: '1px solid #e5e7eb', borderRadius: 1 }}>
          <Box>
            <Typography variant="subtitle2">Linked Inventory Documents</Typography>
            <Stack direction="row" spacing={1} flexWrap="wrap" mt={0.5}>
              {postings.map(p => (
                <Stack key={p.document_id} direction="row" spacing={1} alignItems="center" sx={{ border: '1px solid #e5e7eb', borderRadius: 1, p: 0.5 }}>
                  <Chip size="small" label={p.document.doc_type} />
                  <Chip size="small" color={p.document.status === 'posted' ? 'success' : p.document.status === 'approved' ? 'primary' : 'default'} label={p.document.status} />
                  <Typography variant="body2">{p.document.doc_number || p.document.id}</Typography>
                  <Button size="small" onClick={() => navigate(`/inventory/documents/${p.document_id}`)}>View</Button>
                </Stack>
              ))}
            </Stack>
          </Box>
          <Box>
            {linkedDocId ? (
              <Button variant="outlined" onClick={() => navigate(`/inventory/documents/${linkedDocId}`)}>View Inventory Document</Button>
            ) : null}
          </Box>
        </Box>
      )}
      {/* Other Linked GL Transactions (reverse via postings) */}
      {otherLinkedTx.length > 0 && (
        <Box mb={1} p={1} sx={{ border: '1px dashed #e5e7eb', borderRadius: 1 }}>
          <Typography variant="subtitle2">Other Linked GL Transactions</Typography>
          <Stack direction="row" spacing={1} flexWrap="wrap" mt={0.5}>
            {otherLinkedTx.map(t => (
              <Button key={t.transaction_id} size="small" onClick={() => navigate(`/transactions/${t.transaction_id}`)}>
                {t.entry_number ?? t.transaction_id.slice(0, 8)}
              </Button>
            ))}
          </Stack>
        </Box>
      )}

      {/* Linked Movements (from inventory) */}
      {movements.length > 0 && (
        <Box mb={1} p={1} sx={{ border: '1px solid #e5e7eb', borderRadius: 1 }}>
          <Typography variant="subtitle2" sx={{ mb: 1 }}>Linked Inventory Movements</Typography>

          {/* Quick Filters - analogous to PowerShell Where-Object on the client side */}
          <Grid container spacing={1} sx={{ mb: 1 }}>
            <Grid item xs={12} md={3}>
              <TextField label="Movement Type" select fullWidth value={mvType} onChange={e => setMvType(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {Array.from(new Set(movements.map((m: any) => m.movement_type))).map((t: string) => (
                  <MenuItem key={t} value={t}>{t}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={3}>
              <TextField label="Location" select fullWidth value={mvLoc} onChange={e => setMvLoc(e.target.value)}>
                <MenuItem value="">All</MenuItem>
                {Array.from(new Set(movements.map((m: any) => m.location_id))).map((l: string) => (
                  <MenuItem key={l} value={l}>{l}</MenuItem>
                ))}
              </TextField>
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField type="date" label="From" InputLabelProps={{ shrink: true }} fullWidth value={mvFrom} onChange={e => setMvFrom(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField type="date" label="To" InputLabelProps={{ shrink: true }} fullWidth value={mvTo} onChange={e => setMvTo(e.target.value)} />
            </Grid>
            <Grid item xs={12} md={2}>
              <TextField label="Sort" select fullWidth value={mvSort} onChange={e => setMvSort(e.target.value as any)}>
                <MenuItem value="date_desc">Date ↓</MenuItem>
                <MenuItem value="date_asc">Date ↑</MenuItem>
                <MenuItem value="amount_desc">Amount ↓</MenuItem>
                <MenuItem value="amount_asc">Amount ↑</MenuItem>
              </TextField>
            </Grid>
          </Grid>

          {/* Export button */}
          <Box display="flex" justifyContent="flex-end" sx={{ mb: 1 }}>
            <Button size="small" variant="outlined" onClick={() => {
              const rows = filteredSortedMovements
              const headers = ['movement_id', 'document_id', 'movement_date', 'movement_type', 'material_id', 'location_id', 'uom_id', 'quantity', 'unit_cost', 'total_cost']
              const csvRows = [headers.join(',')]
              for (const r of rows) {
                const vals = [
                  r.id,
                  r.document_id,
                  String(r.movement_date ?? '').replace('T', ' ').split('.')[0],
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
                  return /[",\n]/.test(s) ? '"' + s.replaceAll('"', '""') + '"' : s
                }).join(','))
              }
              const blob = new Blob([csvRows.join('\n')], { type: 'text/csv;charset=utf-8;' })
              const url = URL.createObjectURL(blob)
              const a = document.createElement('a')
              a.href = url
              a.download = `linked_movements_${(tx?.id || 'transaction').toString().slice(0, 8)}.csv`
              document.body.appendChild(a)
              a.click()
              document.body.removeChild(a)
              URL.revokeObjectURL(url)
            }}>Export CSV</Button>
          </Box>

          {filteredSortedMovements.map((m: any) => (
            <div key={m.id} style={{ display: 'flex', gap: 16, fontSize: 14, padding: '4px 0' }}>
              <span>{m.movement_type}</span>
              <span>Loc: {m.location_id}</span>
              <span>Qty: {m.quantity}</span>
              <span>Unit Cost: {m.unit_cost}</span>
              <span>Total: {m.total_cost}</span>
              <span>Date: {String(m.movement_date).slice(0, 10)}</span>
            </div>
          ))}
          {filteredSortedMovements.length === 0 && (
            <Typography color="text.secondary">No movements match the current filters</Typography>
          )}
        </Box>
      )}

      {/* Review Button for Transactions - Always visible, disabled if posted */}
      {tx && (
        <Box mb={2} display="flex" justifyContent="flex-end">
          <Button
            variant="contained"
            onClick={() => setApprovalModalOpen(true)}
            disabled={tx.is_posted}
            title={tx.is_posted ? 'لا يمكن مراجعة المعاملة المرحلة' : 'مراجعة واعتماد المعاملة'}
            sx={{
              background: tx.is_posted ? '#ccc' : 'var(--accent)',
              color: tx.is_posted ? '#666' : 'var(--on-accent)',
              fontWeight: 600,
              padding: '10px 24px',
              borderRadius: 'var(--radius-md)',
              cursor: tx.is_posted ? 'not-allowed' : 'pointer',
              opacity: tx.is_posted ? 0.6 : 1,
              '&:hover': {
                background: tx.is_posted ? '#ccc' : 'var(--accent-primary-hover)'
              }
            }}
          >
            مراجعة واعتماد المعاملة
          </Button>
        </Box>
      )}

      <UnifiedTransactionDetailsPanel
        transaction={tx}
        audit={audit}
        approvalHistory={approvalHistory}
        userNames={userMap}
        accounts={accounts}
        projects={projects}
        organizations={organizations || []}
        classifications={classifications || []}
        categories={categories || []}
        workItems={workItems || []}
        costCenters={costCenters || []}
        analysisItemsMap={analysisItemsMap || {}}
        currentUserId={currentUserId}
        onClose={handleClose}
        canEdit={false}
        canDelete={false}
        canReview={false}
        canPost={false}
        canManage={false}
      />

      {/* Approval Workflow Modal */}
      {approvalModalOpen && tx && (
        <EnhancedLineApprovalManager
          transactionId={tx.id}
          onApprovalComplete={() => {
            setApprovalModalOpen(false)
            // Refresh transaction data instead of full page reload
            if (typeof onTransactionUpdate === 'function') {
              onTransactionUpdate()
            }
          }}
          onApprovalFailed={(error) => {
            console.error('Approval failed:', error)
            setApprovalModalOpen(false)
          }}
        />
      )}
    </Box>
  )
}

export default TransactionDetailsPage