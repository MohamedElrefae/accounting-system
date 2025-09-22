import { useEffect, useState } from 'react';
import { Box, Button, Dialog, DialogActions, DialogContent, DialogTitle, IconButton, InputAdornment, List, ListItem, ListItemText, TextField, Typography } from '@mui/material';
import SearchIcon from '@mui/icons-material/Search';
import * as svc from '../../services/documents';

interface Props {
  open: boolean;
  onClose: () => void;
  orgId: string;
  onSelect: (doc: svc.Document) => void;
  multiple?: boolean;
  onSelectMany?: (docs: svc.Document[]) => void;
}

export default function DocumentPickerDialog({ open, onClose, orgId, onSelect, multiple = false, onSelectMany }: Props) {
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(false);
  const [rows, setRows] = useState<svc.Document[]>([]);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);

  const load = async () => {
    if (!orgId) return;
    setLoading(true);
    try {
      const res = await svc.getDocuments({ orgId, search, limit: 20, offset: 0, orderBy: { column: 'updated_at', ascending: false } } as any);
      setRows(res.data);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (open) { load(); }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open]);

  return (
    <Dialog open={open} onClose={onClose} fullWidth maxWidth="sm">
      <DialogTitle>Select existing document</DialogTitle>
      <DialogContent>
        <TextField
          fullWidth
          size="small"
          placeholder="Search by title"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          onKeyDown={(e) => { if (e.key === 'Enter') load(); }}
          InputProps={{
            endAdornment: (
              <InputAdornment position="end">
                <IconButton onClick={load} disabled={loading}>
                  <SearchIcon />
                </IconButton>
              </InputAdornment>
            )
          }}
        />
        <Box sx={{ mt: 2, maxHeight: 320, overflow: 'auto', border: '1px solid', borderColor: 'divider', borderRadius: 1 }}>
          <List>
            {rows.map((d) => (
              <ListItem key={d.id} button onClick={() => {
                if (multiple) {
                  setSelectedIds(prev => prev.includes(d.id) ? prev.filter(x => x !== d.id) : [...prev, d.id]);
                } else {
                  onSelect(d);
                }
              }}>
                <ListItemText primary={d.title} secondary={`${d.status} • ${new Date(d.updated_at).toLocaleString()}`} />
              </ListItem>
            ))}
            {rows.length === 0 && (
              <Typography variant="body2" color="text.secondary" sx={{ p: 2 }}>
                {loading ? 'Loading...' : 'No documents found.'}
              </Typography>
            )}
          </List>
        </Box>
      </DialogContent>
      <DialogActions>
        <Button onClick={onClose}>Close</Button>
        {multiple && (
          <Button variant="contained" disabled={selectedIds.length === 0} onClick={() => {
            const selected = rows.filter(r => selectedIds.includes(r.id));
            onSelectMany && onSelectMany(selected);
            setSelectedIds([]);
            onClose();
          }}>Link Selected</Button>
        )}
      </DialogActions>
    </Dialog>
  );
}