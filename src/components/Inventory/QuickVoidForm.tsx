import React, { useState } from 'react'
import { Card, CardContent, Grid, TextField, Button, Typography } from '@mui/material'
import { useToast } from '@/contexts/ToastContext'
import { useAuth } from '@/contexts/AuthContext'
import { voidInventoryDocument } from '@/services/inventory/documents'

function getActiveOrgIdSafe(): string | null { try { return localStorage.getItem('org_id') } catch { return null } }

const QuickVoidForm: React.FC = () => {
  const { showToast } = useToast()
  const { user } = useAuth()
  const [orgId] = useState<string>(getActiveOrgIdSafe() || '')
  const [documentId, setDocumentId] = useState('')
  const [reason, setReason] = useState('')
  const [loading, setLoading] = useState(false)

  const onVoid = async () => {
    try {
      if (!orgId || !documentId) { showToast('Provide org and document ID', { severity: 'warning' }); return }
      if (!user?.id) { showToast('User not identified', { severity: 'warning' }); return }
      setLoading(true)
      await voidInventoryDocument(orgId, documentId, user.id, reason || 'void via QuickVoidForm')
      showToast('Void requested (if eligible)', { severity: 'success' })
    } catch (e: any) {
      showToast(e?.message || 'Void failed', { severity: 'error' })
    } finally { setLoading(false) }
  }

  return (
    <Card>
      <CardContent>
        <Typography variant="subtitle1" gutterBottom>Quick Void Inventory Document</Typography>
        <Grid container spacing={2}>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Document ID (UUID)" value={documentId} onChange={e => setDocumentId(e.target.value)} />
          </Grid>
          <Grid item xs={12} md={6}>
            <TextField fullWidth label="Reason (optional)" value={reason} onChange={e => setReason(e.target.value)} />
          </Grid>
          <Grid item xs={12}>
            <Button variant="contained" color="warning" onClick={onVoid} disabled={loading}>Void</Button>
          </Grid>
        </Grid>
      </CardContent>
    </Card>
  )
}

export default QuickVoidForm
