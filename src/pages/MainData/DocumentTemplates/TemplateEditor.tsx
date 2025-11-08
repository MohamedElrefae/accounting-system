import { useEffect, useState } from 'react';
import { Box, Button, Divider, Stack, TextField, Typography, styled, FormControlLabel, Checkbox } from '@mui/material';
import OrgSelector from '../../../components/Organizations/OrgSelector';
import { useParams } from 'react-router-dom';
import { useToast } from '../../../contexts/ToastContext';
import * as tpl from '../../../services/templates';
import * as docs from '../../../services/documents';
import PdfPreview from '../../../components/documents/PdfPreview';
import { useHasPermission } from '../../../hooks/useHasPermission';
import { getActiveOrgId } from '../../../utils/org';

const Root = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2)
}));

const ToolbarRow = styled(Stack)(({ theme }) => ({
  alignItems: 'center',
  gap: theme.spacing(1)
}));

const TwoCol = styled(Stack)(({ theme }) => ({
  gap: theme.spacing(2)
}));

export default function TemplateEditor() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [orgId, setOrgId] = useState('');
  const [template, setTemplate] = useState<tpl.DocumentTemplate | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [content, setContent] = useState<string>('{}');
  const [data, setData] = useState<string>('{}');
  const [busy, setBusy] = useState(false);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [autoPreview, setAutoPreview] = useState(true);
  const hasPerm = useHasPermission();
  const canManage = hasPerm('templates.manage');
  const canGenerate = hasPerm('templates.generate') || canManage;

  useEffect(()=>{ const id = getActiveOrgId(); if (id) setOrgId(id); },[]);

  const load = async () => {
    if (!id) return;
    try {
      const t = await tpl.getTemplate(id);
      setTemplate(t);
      setName(t.name);
      setDescription(t.description || '');
      setContent(JSON.stringify(t.content || {}, null, 2));
    } catch (e:any) {
      showToast(e?.message || 'Failed to load template', { severity: 'error' });
    }
  };

  useEffect(()=>{ load(); }, [id]);

  useEffect(() => {
    if (!autoPreview) return;
    const t = setTimeout(async () => {
      try {
        const payload = JSON.parse(data || '{}');
        const blob = await tpl.generatePdfFromTemplate(template || { ...((template as any) || {}), name }, payload);
        const url = URL.createObjectURL(blob);
        if (previewUrl) URL.revokeObjectURL(previewUrl);
        setPreviewUrl(url);
      } catch {
        // ignore preview errors to avoid noise while typing
      }
    }, 700);
    return () => clearTimeout(t);
  }, [data, name, autoPreview]);

  const save = async () => {
    if (!id) return;
    try {
      const parsed = JSON.parse(content);
      await tpl.updateTemplate(id, { name, description, content: parsed });
      showToast('تم حفظ القالب', { severity: 'success' });
      await load();
    } catch (e:any) {
      showToast(e?.message || 'فشل حفظ القالب', { severity: 'error' });
    }
  };

  const generate = async () => {
    if (!template || !orgId) return;
    try {
      setBusy(true);
      const payload = JSON.parse(data || '{}');
      const blob = await tpl.generatePdfFromTemplate(template, payload);
      const file = new File([blob], `${template.name}.pdf`, { type: 'application/pdf' });
      const upload = await docs.uploadDocument({ orgId, title: `${template.name} (${new Date().toLocaleDateString()})`, file });
      showToast('تم إنشاء المستند من القالب', { severity: 'success' });
    } catch (e:any) {
      showToast(e?.message || 'فشل إنشاء المستند', { severity: 'error' });
    } finally {
      setBusy(false);
    }
  };

  return (
    <Root>
      <Typography variant="h5" gutterBottom>Template Editor</Typography>
      <ToolbarRow direction={{ xs:'column', sm:'row' }}>
        <OrgSelector value={orgId} onChange={(id)=>setOrgId(id)} />
        <TextField size="small" label="Name" value={name} onChange={(e)=>setName(e.target.value)} inputProps={{ 'data-minwidth': 260, readOnly: !canManage }} />
        <Button variant="outlined" onClick={async()=>{
          try {
            const payload = JSON.parse(data || '{}');
            const blob = await tpl.generatePdfFromTemplate(template || { ...((template as any) || {}), name }, payload);
            const url = URL.createObjectURL(blob);
            if (previewUrl) URL.revokeObjectURL(previewUrl);
            setPreviewUrl(url);
          } catch (e: any) {
            showToast(e?.message || 'Failed to preview', { severity: 'error' });
          }
        }} disabled={busy}>Preview</Button>
        <FormControlLabel control={<Checkbox checked={autoPreview} onChange={(e)=>setAutoPreview(e.target.checked)} />} label="Auto preview" />
        {previewUrl && (
          <Button variant="text" onClick={()=>{ const a=document.createElement('a'); a.href=previewUrl; a.download=`${name||'document'}.pdf`; a.click(); }}>Download</Button>
        )}
        {canManage && <Button variant="contained" onClick={save} disabled={busy}>Save</Button>}
        {canGenerate && <Button variant="outlined" onClick={generate} disabled={busy || !orgId}>Generate Document</Button>}
      </ToolbarRow>
      <TextField size="small" label="Description" value={description} onChange={(e)=>setDescription(e.target.value)} fullWidth inputProps={{ readOnly: !canManage }} />
      {!canManage && (
        <Typography variant="caption" color="text.secondary">هذه الصفحة للعرض فقط. يلزم صلاحية templates.manage للتحرير.</Typography>
      )}
      <Divider />
      <TwoCol direction={{ xs:'column', md:'row' }}>
        <TextField label="Template JSON" value={content} onChange={(e)=>setContent(e.target.value)} multiline minRows={20} fullWidth inputProps={{ readOnly: !canManage }} />
        <TextField label="Data JSON" value={data} onChange={(e)=>setData(e.target.value)} multiline minRows={20} fullWidth />
      </TwoCol>
      {previewUrl && (
        <Box sx={{ mt: 2 }}>
          <PdfPreview file={previewUrl} height={520} />
        </Box>
      )}
    </Root>
  );
}