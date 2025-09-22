import React, { useEffect, useMemo, useState } from 'react'
import DraggableResizablePanel from '../Common/DraggableResizablePanel'
import { Box, Button, Divider, Stack, TextField, Typography, MenuItem, List, ListItem, ListItemText } from '@mui/material'
import { useToast } from '../../contexts/ToastContext'
import { useDocument, useDocumentVersions } from '../../hooks/documents/useDocuments'
import * as svc from '../../services/documents'
import { useHasPermission } from '../../hooks/useHasPermission'

interface Props {
  orgId: string
  documentId: string
  isOpen: boolean
  onClose: () => void
  onChanged?: () => void // parent can refetch
}

export default function DocumentDetailsPanel({ orgId, documentId, isOpen, onClose, onChanged }: Props) {
  const { showToast } = useToast()
  const { data: doc, refetch: refetchDoc } = useDocument(documentId)
  const { data: versions = [], refetch: refetchVersions } = useDocumentVersions(documentId)
  const hasPerm = useHasPermission()

  const canManage = hasPerm('documents.manage')
  const canCreate = hasPerm('documents.create') || canManage

  const [title, setTitle] = useState('')
  const [description, setDescription] = useState('')
  const [status, setStatus] = useState<'draft' | 'submitted' | 'approved' | 'rejected' | 'archived'>('draft')

  useEffect(() => {
    if (doc) {
      setTitle(doc.title || '')
      setDescription(doc.description || '')
      setStatus(doc.status as any)
    }
  }, [doc])

  const refresh = async () => {
    await Promise.all([refetchDoc(), refetchVersions()])
    onChanged && onChanged()
  }

  const handleSave = async () => {
    if (!canManage) return
    try {
      await svc.updateDocument(documentId, { title, description })
      showToast('تم حفظ بيانات المستند', { severity: 'success' })
      await refresh()
    } catch (e: any) {
      showToast(e?.message || 'فشل حفظ بيانات المستند', { severity: 'error' })
    }
  }

  const handleDelete = async () => {
    if (!canManage) return
    const ok = window.confirm('هل تريد حذف هذا المستند وجميع نسخه نهائيًا؟')
    if (!ok) return
    try {
      await svc.deleteDocument(documentId)
      showToast('تم حذف المستند', { severity: 'success' })
      onChanged && onChanged()
      onClose()
    } catch (e: any) {
      showToast(e?.message || 'فشل حذف المستند', { severity: 'error' })
    }
  }

  const handleUploadNewVersion = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0]
    if (!file) return
    try {
      await svc.createDocumentVersion(documentId, orgId, file)
      showToast('تم رفع نسخة جديدة وتم تعيينها كنسخة حالية', { severity: 'success' })
      await refresh()
    } catch (er: any) {
      showToast(er?.message || 'فشل رفع النسخة الجديدة', { severity: 'error' })
    } finally {
      try { (e.target as any).value = '' } catch {}
    }
  }

  // Documents panel layout state with persistence
  const [position, setPosition] = useState<{ x: number; y: number }>(() => {
    try { const s = localStorage.getItem('docDetailsPanel:position'); return s ? JSON.parse(s) : { x: 160, y: 140 } } catch { return { x: 160, y: 140 } }
  })
  const [size, setSize] = useState<{ width: number; height: number }>(() => {
    try { const s = localStorage.getItem('docDetailsPanel:size'); return s ? JSON.parse(s) : { width: 800, height: 650 } } catch { return { width: 800, height: 650 } }
  })
  const [maximized, setMaximized] = useState<boolean>(() => { try { return localStorage.getItem('docDetailsPanel:maximized') === 'true' } catch { return false } })
  const [docked, setDocked] = useState<boolean>(() => { try { return localStorage.getItem('docDetailsPanel:docked') === 'true' } catch { return false } })
  const [dockPos, setDockPos] = useState<'left' | 'right' | 'top' | 'bottom'>(() => { try { return (localStorage.getItem('docDetailsPanel:dockPosition') as any) || 'right' } catch { return 'right' } })

  useEffect(() => { try { localStorage.setItem('docDetailsPanel:position', JSON.stringify(position)) } catch {} }, [position])
  useEffect(() => { try { localStorage.setItem('docDetailsPanel:size', JSON.stringify(size)) } catch {} }, [size])
  useEffect(() => { try { localStorage.setItem('docDetailsPanel:maximized', String(maximized)) } catch {} }, [maximized])
  useEffect(() => { try { localStorage.setItem('docDetailsPanel:docked', String(docked)) } catch {} }, [docked])
  useEffect(() => { try { localStorage.setItem('docDetailsPanel:dockPosition', dockPos) } catch {} }, [dockPos])

  return (
    <DraggableResizablePanel
      title={`إدارة المستند - ${doc?.title || ''}`}
      isOpen={isOpen}
      onClose={onClose}
      position={position}
      size={size}
      onMove={setPosition}
      onResize={setSize}
      isMaximized={maximized}
      onMaximize={() => setMaximized(!maximized)}
      isDocked={docked}
      dockPosition={dockPos}
      onDock={(p) => { setDocked(true); setDockPos(p) }}
      onResetPosition={() => {
        setPosition({ x: 160, y: 140 })
        setSize({ width: 800, height: 650 })
        setMaximized(false)
        setDocked(false)
        setDockPos('right')
      }}
    >
      <div className="panel-actions">
        <Button className="ultimate-btn ultimate-btn-success" onClick={handleSave} disabled={!canManage} title={canManage ? 'حفظ' : 'تحتاج صلاحية documents.manage'}>
          <div className="btn-content"><span className="btn-text">💾 حفظ</span></div>
        </Button>
        <Button className="ultimate-btn ultimate-btn-delete" onClick={handleDelete} disabled={!canManage} title={canManage ? 'حذف المستند' : 'تحتاج صلاحية documents.manage'}>
          <div className="btn-content"><span className="btn-text">🗑️ حذف</span></div>
        </Button>
        <Button
          className="ultimate-btn"
          title="حفظ تخطيط اللوحة"
          onClick={() => { try { localStorage.setItem('docDetailsPanel:preferred', JSON.stringify({ position, size, maximized, docked, dockPos, savedTimestamp: Date.now() })) } catch {} }}
        >
          <div className="btn-content"><span className="btn-text">حفظ التخطيط</span></div>
        </Button>
        <Button
          className="ultimate-btn ultimate-btn-warning"
          title="إعادة تعيين التخطيط"
          onClick={() => {
            setPosition({ x: 160, y: 140 })
            setSize({ width: 800, height: 650 })
            setMaximized(false)
            setDocked(false)
            setDockPos('right')
            try {
              localStorage.removeItem('docDetailsPanel:preferred')
              localStorage.removeItem('docDetailsPanel:position')
              localStorage.removeItem('docDetailsPanel:size')
              localStorage.removeItem('docDetailsPanel:maximized')
              localStorage.removeItem('docDetailsPanel:docked')
              localStorage.removeItem('docDetailsPanel:dockPosition')
            } catch {}
          }}
        >
          <div className="btn-content"><span className="btn-text">🔄 إعادة تعيين</span></div>
        </Button>
      </div>

      <Box sx={{ p: 2, display: 'grid', gridTemplateColumns: '1fr', gap: 2 }}>
        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2}>
          <TextField label="العنوان" size="small" value={title} onChange={(e) => setTitle(e.target.value)} fullWidth disabled={!canManage} />
        </Stack>
        <TextField label="الوصف" size="small" value={description} onChange={(e) => setDescription(e.target.value)} fullWidth multiline minRows={2} disabled={!canManage} />

        <Stack direction={{ xs: 'column', sm: 'row' }} spacing={2} alignItems={{ xs: 'stretch', sm: 'center' }}>
          <TextField select size="small" label="الحالة" value={status} onChange={async (e) => {
            const s = e.target.value as any
            setStatus(s)
            try {
              if (s === 'submitted') await svc.submitForApproval(documentId)
              else if (s === 'approved') await svc.approveDocument(documentId)
              else if (s === 'rejected') await svc.rejectDocument(documentId)
              else await svc.updateDocument(documentId, { status: s })
              showToast('تم تحديث الحالة', { severity: 'success' })
              await refresh()
            } catch (er: any) {
              showToast(er?.message || 'فشل تحديث الحالة', { severity: 'error' })
            }
          }} disabled={!canManage} sx={{ minWidth: 220 }}>
            {['draft','submitted','approved','rejected','archived'].map(s => (
              <MenuItem key={s} value={s}>{s}</MenuItem>
            ))}
          </TextField>

          <Button variant="contained" component="label" disabled={!canCreate} title={canCreate ? 'رفع نسخة جديدة' : 'تحتاج صلاحية documents.create'}>
            رفع نسخة جديدة
            <input hidden type="file" onChange={handleUploadNewVersion} />
          </Button>
        </Stack>

        <Divider />
        <Typography variant="h6">الإصدارات</Typography>
        <List sx={{ maxHeight: 280, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          {versions.map(v => (
            <ListItem key={v.id} secondaryAction={
              <Stack direction="row" spacing={1}>
                <Button size="small" onClick={async () => {
                  try { const url = await svc.downloadDocumentByVersion(v.id); window.open(url, '_blank', 'noopener'); } catch (e: any) { showToast(e?.message || 'فشل التنزيل', { severity: 'error' }) }
                }}>Download</Button>
              </Stack>
            }>
              <ListItemText primary={`v${v.version_number} - ${v.file_name}`} secondary={`${(v.file_size/1024).toFixed(1)} KB • ${new Date(v.uploaded_at).toLocaleString()}`} />
            </ListItem>
          ))}
          {versions.length === 0 && (
            <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>لا توجد نسخ بعد.</Typography>
          )}
        </List>
      </Box>
    </DraggableResizablePanel>
  )
}
