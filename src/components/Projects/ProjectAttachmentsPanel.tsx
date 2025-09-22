import { useEffect, useState } from 'react';
import { Box, Button, Checkbox, Divider, List, ListItem, ListItemText, Stack, Typography, Tooltip } from '@mui/material';
import { useToast } from '../../contexts/ToastContext';
import * as svc from '../../services/documents';
import DocumentPickerDialog from '../documents/DocumentPickerDialog';
import GenerateFromTemplateDialog from '../documents/GenerateFromTemplateDialog';
import { useHasPermission } from '../../hooks/useHasPermission';

interface Props {
  orgId: string;
  projectId: string;
}

export default function ProjectAttachmentsPanel({ orgId, projectId }: Props) {
  const { showToast } = useToast();
  const [docs, setDocs] = useState<svc.Document[]>([]);
  const [pickerOpen, setPickerOpen] = useState(false);
  const [genOpen, setGenOpen] = useState(false);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const hasPerm = useHasPermission();
  const canGenerate = hasPerm('templates.generate') || hasPerm('templates.manage');

  const refresh = async () => {
    const linked = await svc.getLinkedDocuments('projects', projectId);
    setDocs(linked);
  };

  useEffect(() => { refresh(); }, [projectId]);

  const onFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    try {
      const { document } = await svc.uploadDocument({ orgId, title: file.name, file, projectId });
      await svc.linkDocument(document.id, 'projects', projectId);
      await refresh();
      showToast('تم رفع وربط المستند بالمشروع', { severity: 'success' });
    } catch (e: any) {
      showToast(e?.message || 'فشل رفع/ربط المستند', { severity: 'error' });
    }
  };

  const handleUnlink = async (id: string) => {
    try {
      await svc.unlinkDocument(id, 'projects', projectId);
      await refresh();
      showToast('تم إلغاء ربط المستند', { severity: 'info' });
    } catch (e: any) {
      showToast(e?.message || 'فشل إلغاء الربط', { severity: 'error' });
    }
  };

  return (
    <Box>
      <Stack direction="row" spacing={2} alignItems="center">
        <Typography variant="h6">Project Documents {docs.length ? `(${docs.length})` : ''}</Typography>
        <Button variant="contained" component="label" size="small">
          Upload & Link
          <input hidden type="file" onChange={onFileChange} />
        </Button>
        <Button variant="outlined" size="small" onClick={refresh}>Refresh</Button>
        <Button variant="text" size="small" onClick={() => setPickerOpen(true)}>Link existing</Button>
        {canGenerate ? (
          <Button variant="outlined" size="small" onClick={() => setGenOpen(true)}>Generate from Template</Button>
        ) : (
          <Tooltip title="تحتاج لصلاحية templates.generate">
            <span>
              <Button variant="outlined" size="small" disabled>Generate from Template</Button>
            </span>
          </Tooltip>
        )}
        <Button variant={selectMode ? 'contained' : 'outlined'} size="small" onClick={() => { setSelectMode(!selectMode); setSelectedIds([]); }}>
          {selectMode ? 'Cancel Select' : 'Select'}
        </Button>
        {selectMode && (
          <>
            <Button size="small" variant="outlined" onClick={() => {
              if (selectedIds.length === docs.length) setSelectedIds([]);
              else setSelectedIds(docs.map(d => d.id));
            }}>
              {selectedIds.length === docs.length ? 'Deselect All' : 'Select All'}
            </Button>
            <Button color="error" size="small" variant="outlined" disabled={selectedIds.length === 0} onClick={async () => {
              try {
                for (const id of selectedIds) {
                  await svc.unlinkDocument(id, 'projects', projectId);
                }
                setSelectedIds([]);
                await refresh();
                showToast('تم إلغاء ربط المستندات المحددة', { severity: 'info' });
              } catch (e: any) {
                showToast(e?.message || 'فشل إلغاء الربط الجماعي', { severity: 'error' });
              }
            }}>Unlink Selected</Button>
          </>
        )}
      </Stack>
      <Divider sx={{ my: 2 }} />
      <List>
        {docs.map(d => (
          <ListItem key={d.id} secondaryAction={
            <Stack direction="row" spacing={1}>
              {!selectMode && <Button size="small" onClick={() => handleUnlink(d.id)}>Unlink</Button>}
            </Stack>
          }>
            {selectMode && (
              <Checkbox
                edge="start"
                checked={selectedIds.includes(d.id)}
                onChange={(e) => {
                  setSelectedIds(prev => e.target.checked ? [...prev, d.id] : prev.filter(x => x !== d.id));
                }}
                tabIndex={-1}
              />
            )}
            <ListItemText primary={d.title} secondary={`${d.status} • ${new Date(d.updated_at).toLocaleString()}`} />
          </ListItem>
        ))}
        {docs.length === 0 && (
          <Typography variant="body2" color="text.secondary" sx={{ px: 2 }}>
            No documents linked to this project yet.
          </Typography>
        )}
      </List>

      <DocumentPickerDialog
        open={pickerOpen}
        onClose={() => setPickerOpen(false)}
        orgId={orgId}
        onSelect={async (doc) => {
          await svc.linkDocument(doc.id, 'projects', projectId);
          setPickerOpen(false);
          await refresh();
        }}
        multiple
        onSelectMany={async (docsList) => {
          for (const d of docsList) {
            await svc.linkDocument(d.id, 'projects', projectId);
          }
          await refresh();
        }}
      />

      <GenerateFromTemplateDialog
        open={genOpen}
        onClose={() => setGenOpen(false)}
        orgId={orgId}
        entityType="projects"
        entityId={projectId}
      />
    </Box>
  );
}