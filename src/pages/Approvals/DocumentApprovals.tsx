import { useEffect, useState } from 'react';
import { Box, Button, Chip, Divider, Stack, Typography } from '@mui/material';
import { supabase } from '../../utils/supabase';
import { useToast } from '../../contexts/ToastContext';

interface Row { id: string; org_id: string; status: string; submitted_at: string | null; target_id: string; }

export default function DocumentApprovalsPage() {
  const { showToast } = useToast();
  const [rows, setRows] = useState<Row[]>([]);
  const [loading, setLoading] = useState(false);

  const refresh = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('approval_requests')
        .select('id, org_id, status, submitted_at, target_id, target_table')
        .eq('target_table', 'documents')
        .order('submitted_at', { ascending: false });
      if (error) throw error;
      setRows((data as any[]) || []);
    } catch (e:any) {
      showToast(e?.message || 'Failed to load approvals', { severity: 'error' });
    } finally { setLoading(false); }
  };

  useEffect(()=>{ refresh(); },[]);

  const approve = async (id: string, docId: string) => {
    try {
      const { error } = await supabase.from('documents').update({ status: 'approved' }).eq('id', docId);
      if (error) throw error;
      showToast('تم اعتماد المستند', { severity: 'success' });
      await refresh();
    } catch (e:any) { showToast(e?.message || 'فشل الاعتماد', { severity: 'error' }); }
  };

  const reject = async (id: string, docId: string) => {
    try {
      const { error } = await supabase.from('documents').update({ status: 'rejected' }).eq('id', docId);
      if (error) throw error;
      showToast('تم رفض المستند', { severity: 'info' });
      await refresh();
    } catch (e:any) { showToast(e?.message || 'فشل الرفض', { severity: 'error' }); }
  };

  return (
    <Box sx={{ p: 2 }}>
      <Stack direction="row" spacing={1} alignItems="center" sx={{ mb: 2 }}>
        <Typography variant="h5">Document Approvals</Typography>
        <Button variant="outlined" onClick={refresh} disabled={loading}>Refresh</Button>
      </Stack>
      <Divider sx={{ mb: 2 }} />
      {rows.map(r => (
        <Stack key={r.id} direction="row" justifyContent="space-between" alignItems="center" sx={{ py: 1, borderBottom: '1px solid', borderColor: 'divider' }}>
          <Typography variant="body2">Request #{r.id.substring(0,8)} • Doc {r.target_id.substring(0,8)} • {r.submitted_at ? new Date(r.submitted_at).toLocaleString() : '—'}</Typography>
          <Stack direction="row" spacing={1}>
            <Chip size="small" label={r.status} />
            <Button size="small" variant="contained" onClick={()=>approve(r.id, r.target_id)}>Approve</Button>
            <Button size="small" variant="outlined" color="error" onClick={()=>reject(r.id, r.target_id)}>Reject</Button>
          </Stack>
        </Stack>
      ))}
      {rows.length === 0 && (<Typography variant="body2" color="text.secondary">No document approval requests.</Typography>)}
    </Box>
  );
}