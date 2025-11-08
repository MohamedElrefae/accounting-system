import { useParams } from 'react-router-dom';
import { Box, TextField, Typography, Stack, Button } from '@mui/material';
import { useEffect, useState } from 'react';
import ProjectAttachmentsPanel from '../../components/Projects/ProjectAttachmentsPanel';
import { getActiveOrgId, setActiveOrgId } from '../../utils/org';
import { supabase } from '../../utils/supabase';
import { getOrganizations, type Organization } from '../../services/organization';
import { MenuItem } from '@mui/material';

export default function ProjectAttachmentsPage() {
  const { id } = useParams();
  const [orgId, setOrgId] = useState<string>('');
  const [loading, setLoading] = useState<boolean>(true);
  const [orgs, setOrgs] = useState<Organization[]>([]);

  useEffect(() => {
    (async () => {
      try {
        const list = await getOrganizations();
        setOrgs(list);
        const fromLocal = getActiveOrgId();
        if (fromLocal) {
          setOrgId(fromLocal);
        } else if (id) {
          const { data: proj } = await supabase.from('projects').select('org_id').eq('id', id).single();
          if (proj?.org_id) {
            setOrgId(proj.org_id);
            setActiveOrgId(proj.org_id);
          }
        }
      } finally {
        setLoading(false);
      }
    })();
  }, [id]);

  if (!id) return <Box p={2}><Typography>Project not found.</Typography></Box>;

  return (
    <Box p={2}>
      <Typography variant="h5" gutterBottom>Project Attachments</Typography>
      {!orgId && (
        <Stack direction={{ xs:'column', sm:'row' }} spacing={1} alignItems={{ xs:'stretch', sm:'center' }} sx={{ mb: 2 }}>
          <TextField select size="small" label="Organization" value={orgId} onChange={(e)=>{ setOrgId(e.target.value); setActiveOrgId(e.target.value); }} sx={{ minWidth: 260 }}>
            {orgs.map(o => (<MenuItem key={o.id} value={o.id}>{o.code} - {o.name}</MenuItem>))}
          </TextField>
          <Typography variant="caption" color="text.secondary">Select your organization to continue.</Typography>
        </Stack>
      )}
      {orgId ? (
        <ProjectAttachmentsPanel orgId={orgId} projectId={id} />
      ) : (
        <Typography variant="body2" color="text.secondary">Awaiting Organization ID...</Typography>
      )}
    </Box>
  );
}
