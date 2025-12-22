import { useEffect, useState } from 'react';
import { Button, Dialog, DialogActions, DialogContent, DialogTitle, MenuItem, Stack, TextField, Typography } from '@mui/material';
import { useToast } from '../../contexts/ToastContext';
import { listTemplates, generatePdfFromTemplate, type DocumentTemplate } from '../../services/templates';
import * as docs from '../../services/documents';

interface Props {
  open: boolean;
  onClose: () => void;
  orgId: string;
  entityType: 'transactions' | 'projects';
  entityId: string;
}

export default function GenerateFromTemplateDialog({ open, onClose, orgId, entityType, entityId }: Props) {
  const { showToast } = useToast();
  const [templates, setTemplates] = useState<DocumentTemplate[]>([]);
  const [templateId, setTemplateId] = useState('');
  const [dataJson, setDataJson] = useState('{}');
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (!open || !orgId) return;
    (async () => {
      try {
        const list = await listTemplates(orgId);
        setTemplates(list);
      } catch (e: any) {
        showToast(e?.message || 'فشل تحميل القوالب', { severity: 'error' });
      }
    })();
  }, [open, orgId, showToast]);

  const handleGenerate = async () => {
    if (!templateId) return;
    const t = templates.find(x => x.id === templateId);
    if (!t) return;
    try {
      setBusy(true);
      const payload = JSON.parse(dataJson || '{}');
      const blob = await generatePdfFromTemplate(t, payload);
      const file = new File([blob], `${t.name}.pdf`, { type: 'application/pdf' });
      const upload = await docs.uploadDocument({ orgId, title: `${t.name} (${new Date().toLocaleDateString()})`, file });
      await docs.linkDocument(upload.document.id, entityType, entityId);
      showToast('تم إنشاء وربط المستند', { severity: 'success' });
      onClose();
    } catch (e: any) {
      showToast(e?.message || 'فشل إنشاء المستند من القالب', { severity: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="md">
      <DialogTitle>إنشاء مستند من قالب</DialogTitle>
      <DialogContent>
        <Stack spacing={2} sx={{ mt: 1 }}>
          <TextField select label="القالب" value={templateId} onChange={(e)=>setTemplateId(e.target.value)} fullWidth>
            {templates.map(t => (
              <MenuItem key={t.id} value={t.id}>{t.name}</MenuItem>
            ))}
          </TextField>
          <TextField label="بيانات JSON" value={dataJson} onChange={(e)=>setDataJson(e.target.value)} multiline minRows={10} fullWidth />
          <Typography variant="body2" color="text.secondary">سيتم رفع الملف الناتج وربطه تلقائياً بهذا السجل.</Typography>
        </Stack>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose} disabled={busy}>إلغاء</Button>
        <Button onClick={handleGenerate} variant="contained" disabled={busy || !templateId}>إنشاء وربط</Button>
      </DialogActions>
    </Dialog>
  );
}