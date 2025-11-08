import { useEffect, useState } from 'react';
import { Box, Button, Divider, Stack, TextField, Typography, styled } from '@mui/material';
import OrgSelector from '../../../components/Organizations/OrgSelector';
import { useToast } from '../../../contexts/ToastContext';
import { getActiveOrgId } from '../../../utils/org';
import * as svc from '../../../services/templates';
import { useNavigate } from 'react-router-dom';
import { useHasPermission } from '../../../hooks/useHasPermission';

const Root = styled(Box)(({ theme }) => ({
  padding: theme.spacing(2)
}));

const ToolbarRow = styled(Stack)(({ theme }) => ({
  alignItems: 'center',
  gap: theme.spacing(1)
}));

const RowItem = styled(Stack)(({ theme }) => ({
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'space-between',
  paddingTop: theme.spacing(1),
  paddingBottom: theme.spacing(1),
  borderBottom: `1px solid ${theme.palette.divider}`
}));

export default function TemplateLibrary() {
  const { showToast } = useToast();
  const hasPerm = useHasPermission();
  const canManage = hasPerm('templates.manage');
  const navigate = useNavigate();
  const [orgId, setOrgId] = useState('');
  const [rows, setRows] = useState<svc.DocumentTemplate[]>([]);
  const [name, setName] = useState('');

  const refresh = async () => {
    if (!orgId) return;
    try {
      const list = await svc.listTemplates(orgId);
      setRows(list);
    } catch (e:any) {
      showToast(e?.message || 'Failed to load templates', { severity: 'error' });
    }
  };

  useEffect(() => {
    const id = getActiveOrgId();
    if (id) setOrgId(id);
  }, []);

  useEffect(() => { refresh(); }, [orgId]);

  const create = async () => {
    if (!orgId || !name.trim()) return;
    try {
      const t = await svc.createTemplate({ org_id: orgId, name: name.trim(), content: {}, version: 1 });
      setName('');
      await refresh();
      navigate(`/main-data/document-templates/${t.id}`);
    } catch (e:any) {
      showToast(e?.message || 'Failed to create template', { severity: 'error' });
    }
  };

  return (
    <Root>
      <Typography variant="h5" gutterBottom>Document Templates</Typography>
      <ToolbarRow direction={{ xs:'column', sm:'row' }}>
        <OrgSelector value={orgId} onChange={(id)=>setOrgId(id)} />
        <TextField size="small" label="New template name" value={name} onChange={(e)=>setName(e.target.value)} disabled={!canManage} />
        {canManage && <Button variant="contained" onClick={create}>Create</Button>}
        <Button variant="outlined" onClick={refresh}>Refresh</Button>
      </ToolbarRow>
      <Divider />
      {rows.map((t) => (
        <RowItem key={t.id}>
          <Typography variant="body2">{t.name}</Typography>
          <Stack direction="row" spacing={1}>
            <Button size="small" variant="outlined" onClick={()=>navigate(canManage ? `/main-data/document-templates/${t.id}` : `/main-data/document-templates/${t.id}/view`)}>View</Button>
            {canManage && <Button size="small" variant="outlined" onClick={()=>navigate(`/main-data/document-templates/${t.id}`)}>Edit</Button>}
            {canManage && <Button size="small" color="error" onClick={async()=>{ await svc.deleteTemplate(t.id); await refresh(); }}>Delete</Button>}
          </Stack>
        </RowItem>
      ))}
      {!canManage && (
        <Typography variant="caption" color="text.secondary">لا تملك صلاحية إدارة القوالب. يمكنك الاستعراض فقط.</Typography>
      )}
      {rows.length === 0 && (<Typography variant="body2" color="text.secondary">No templates yet.</Typography>)}
    </Root>
  );
}