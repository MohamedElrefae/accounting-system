import { useEffect, useState, useMemo } from 'react';
import { Box, Button, Divider, Stack, TextField, Typography, styled, FormControlLabel, Checkbox, Switch } from '@mui/material';
import { useParams } from 'react-router-dom';
import { useToast } from '../../../contexts/ToastContext';
import * as tpl from '../../../services/templates';
import PdfPreview from '../../../components/documents/PdfPreview';

const Root = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2)
}));

const TwoCol = styled(Stack)(({ theme }) => ({
  gap: theme.spacing(2)
}));

export default function TemplateViewer() {
  const { id } = useParams();
  const { showToast } = useToast();
  const [template, setTemplate] = useState<tpl.DocumentTemplate | null>(null);
  const [data, setData] = useState<string>('{}');
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [autoPreview, setAutoPreview] = useState(true);
  const [continuous, setContinuous] = useState(true);

  useEffect(()=>{
    const load = async () => {
      if (!id) return;
      try {
        const t = await tpl.getTemplate(id);
        setTemplate(t);
      } catch (e:any) {
        showToast(e?.message || 'Failed to load template', { severity: 'error' });
      }
    };
    load();
    return () => { if (previewUrl) URL.revokeObjectURL(previewUrl); };
  }, [id]);

  const generatePreview = async () => {
    if (!template) return;
    try {
      const payload = JSON.parse(data || '{}');
      const blob = await tpl.generatePdfFromTemplate(template, payload);
      const url = URL.createObjectURL(blob);
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      setPreviewUrl(url);
    } catch (e:any) {
      showToast(e?.message || 'Failed to generate preview', { severity: 'error' });
    }
  };

  const contentPretty = useMemo(()=> JSON.stringify(template?.content ?? {}, null, 2), [template?.content]);

  useEffect(() => {
    if (!autoPreview) return;
    const t = setTimeout(() => { generatePreview(); }, 600);
    return () => clearTimeout(t);
  }, [data, autoPreview]);

  return (
    <Root>
      <Typography variant="h5" gutterBottom>Template Viewer</Typography>
      <Typography variant="subtitle1" gutterBottom>{template?.name}</Typography>
      <Typography variant="body2" color="text.secondary" gutterBottom>{template?.description}</Typography>
      <Divider />
      <TwoCol direction={{ xs:'column', md:'row' }}>
        <TextField label="Template JSON" value={contentPretty} multiline minRows={16} fullWidth InputProps={{ readOnly: true }} />
        <Stack spacing={1} sx={{ minWidth: 300 }}>
          <TextField label="Data JSON" value={data} onChange={(e)=>setData(e.target.value)} multiline minRows={10} fullWidth />
          <Stack direction="row" spacing={1} alignItems="center">
            <Button variant="outlined" onClick={generatePreview}>Preview PDF</Button>
            <FormControlLabel control={<Checkbox checked={autoPreview} onChange={(e)=>setAutoPreview(e.target.checked)} />} label="Auto preview" />
            <FormControlLabel control={<Switch checked={continuous} onChange={(e)=>setContinuous(e.target.checked)} />} label="Continuous" />
            {previewUrl && (
              <Button variant="text" onClick={()=>{
                const a = document.createElement('a');
                a.href = previewUrl;
                a.download = `${template?.name || 'document'}.pdf`;
                a.click();
              }}>Download</Button>
            )}
          </Stack>
          {previewUrl && (
            <PdfPreview file={previewUrl} height={480} continuous={continuous} />
          )}
        </Stack>
      </TwoCol>
    </Root>
  );
}