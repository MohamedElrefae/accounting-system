import { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, FormControl, InputLabel, MenuItem, Select, Stack, TextField, Typography, Autocomplete } from '@mui/material';
import { useToast } from '../../contexts/ToastContext';
import { getFolderPermissions, setFolderPermissions, deleteFolderPermission, type FolderPermissionInput } from '../../services/document-folders';

interface Props {
  open: boolean;
  onClose: () => void;
  folderId: string;
}

type AccessLevel = 'read' | 'write' | 'admin';

export default function FolderPermissionsDialog({ open, onClose, folderId }: Props) {
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<FolderPermissionInput[]>([]);
  const [existing, setExisting] = useState<any[]>([]);
  const { showToast } = useToast();
  const [userOptions, setUserOptions] = useState<Array<{ id: string; label: string }>>([]);
  const [roleOptions, setRoleOptions] = useState<Array<{ id: number; label: string }>>([]);
  const [userMap, setUserMap] = useState<Record<string, string>>({});
  const [roleMap, setRoleMap] = useState<Record<number, string>>({});

  useEffect(() => {
    if (!open) return;
    (async () => {
      try {
        setLoading(true);
        const perms = await getFolderPermissions(folderId);
        setExisting(perms);
        // Load role options + map
        try {
          const { supabase } = await import('../../utils/supabase');
          const { data: roles } = await supabase.from('roles').select('id,name').order('name');
          const roleOpts = (roles || []).map((r: any) => ({ id: r.id, label: r.name }));
          setRoleOptions(roleOpts);
          const rmap: Record<number, string> = {};
          roleOpts.forEach(r => { rmap[r.id] = r.label; });
          setRoleMap(rmap);
        } catch {}
        // Load users for existing entries from public.user_profiles
        try {
          const { supabase } = await import('../../utils/supabase');
          const userIds = Array.from(new Set((perms || []).map((p: any) => p.grantee_user_id).filter(Boolean)));
          if (userIds.length > 0) {
            const { data: profiles } = await supabase
              .from('user_profiles')
              .select('id,email,first_name,last_name,full_name_ar')
              .in('id', userIds as string[]);
            const umap: Record<string, string> = {};
            (profiles || []).forEach((u: any) => {
              const name = u.full_name_ar || [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || u.id;
              umap[u.id] = name;
            });
            setUserMap(umap);
          } else {
            setUserMap({});
          }
        } catch {}
      } finally {
        setLoading(false);
      }
    })();
  }, [open, folderId]);

  const addRow = () => setRows(prev => [...prev, { access_level: 'read' }]);
  const removeRow = (idx: number) => setRows(prev => prev.filter((_, i) => i !== idx));

  const updateRow = (idx: number, patch: Partial<FolderPermissionInput>) => {
    setRows(prev => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const save = async () => {
    try {
      await setFolderPermissions(folderId, rows);
      const perms = await getFolderPermissions(folderId);
      setExisting(perms);
      setRows([]);
      showToast('تم حفظ صلاحيات المجلد', { severity: 'success' });
    } catch (e: any) {
      showToast(e?.message || 'فشل حفظ الصلاحيات', { severity: 'error' });
    }
  };

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Manage Folder Permissions</DialogTitle>
      <DialogContent>
        <Typography variant="subtitle2" sx={{ mt: 1 }}>Current</Typography>
        <Box sx={{ border: '1px solid', borderColor: 'divider', borderRadius: 1, p: 1, maxHeight: 180, overflow: 'auto', mb: 2 }}>
          {existing.length === 0 && <Typography variant="body2" color="text.secondary">No explicit permissions. Creator and org managers have access.</Typography>}
          {existing.map(row => (
            <Stack key={row.id} direction={{ xs: 'column', sm: 'row' }} spacing={2} sx={{ py: 0.5, alignItems: 'center' }}>
              <Typography variant="body2" sx={{ minWidth: 80 }}>{row.access_level}</Typography>
              <Typography variant="body2" color="text.secondary">User: {row.grantee_user_id ? (userMap[row.grantee_user_id] || row.grantee_user_id) : '—'}</Typography>
              <Typography variant="body2" color="text.secondary">Role: {row.grantee_role_id != null ? (roleMap[row.grantee_role_id] || row.grantee_role_id) : '—'}</Typography>
              <Button size="small" color="error" onClick={async () => {
                try {
                  await deleteFolderPermission(row.id);
                  const perms = await getFolderPermissions(folderId);
                  setExisting(perms);
                  showToast('تم إزالة الصلاحية', { severity: 'info' });
                } catch (e: any) {
                  showToast(e?.message || 'فشل إزالة الصلاحية', { severity: 'error' });
                }
              }}>Remove</Button>
            </Stack>
          ))}
        </Box>

        <Typography variant="subtitle2">Add/Replace Permissions</Typography>
        {rows.map((r, idx) => (
          <Stack key={idx} direction={{ xs: 'column', sm: 'row' }} spacing={1} sx={{ my: 1 }}>
            <FormControl size="small" sx={{ minWidth: 120 }}>
              <InputLabel>Level</InputLabel>
              <Select value={r.access_level} label="Level" onChange={(e) => updateRow(idx, { access_level: e.target.value as AccessLevel })}>
                <MenuItem value="read">read</MenuItem>
                <MenuItem value="write">write</MenuItem>
                <MenuItem value="admin">admin</MenuItem>
              </Select>
            </FormControl>
            <Autocomplete
              sx={{ minWidth: 240 }}
              options={userOptions}
              onInputChange={async (_e, value) => {
                try {
                  const { supabase } = await import('../../utils/supabase');
                  const { data } = await supabase.from('user_profiles')
                    .select('id,email,first_name,last_name,full_name_ar')
                    .or(`email.ilike.%${value}%,full_name_ar.ilike.%${value}%`)
                    .limit(10);
                  setUserOptions((data || []).map((u: any) => ({ id: u.id, label: u.full_name_ar || [u.first_name, u.last_name].filter(Boolean).join(' ') || u.email || u.id })));
                } catch {}
              }}
              onChange={(_e, value) => updateRow(idx, { grantee_user_id: value ? (value as any).id : undefined, grantee_role_id: undefined })}
              renderInput={(params) => <TextField {...params} size="small" label="User (search email)" />}
            />
            <Autocomplete
              sx={{ minWidth: 240 }}
              options={roleOptions}
              getOptionLabel={(o) => o.label}
              onChange={(_e, value) => updateRow(idx, { grantee_role_id: value ? (value as any).id : undefined, grantee_user_id: undefined })}
              renderInput={(params) => <TextField {...params} size="small" label="Role" />}
            />
            <Button variant="outlined" color="error" onClick={() => removeRow(idx)}>Remove</Button>
          </Stack>
        ))}
        <Button variant="text" onClick={addRow} sx={{ mt: 1 }}>Add Row</Button>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        <Button onClick={save} variant="contained" disabled={loading || rows.length === 0}>Save</Button>
      </DialogActions>
    </Dialog>
  );
}