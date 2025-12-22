import { useEffect, useState } from 'react';
import { Dialog, DialogTitle, DialogContent, DialogActions, Button, FormControl, InputLabel, Select, MenuItem, Typography } from '@mui/material';
import { supabase } from '../../utils/supabase';

interface Props {
  open: boolean;
  orgId: string;
  onCancel: () => void;
  onSelect: (categoryId: string | null) => void;
}

export default function CategorySelectDialog({ open, orgId, onCancel, onSelect }: Props) {
  const [loading, setLoading] = useState(false);
  const [options, setOptions] = useState<Array<{ id: string; name: string }>>([]);
  const [selected, setSelected] = useState<string>('');

  useEffect(() => {
    if (!open || !orgId) return;
    (async () => {
      try {
        setLoading(true);
        const { data, error } = await supabase
          .from('document_categories')
          .select('id,name')
          .eq('org_id', orgId)
          .order('position');
        if (!error) setOptions((data || []) as any);
      } finally {
        setLoading(false);
      }
    })();
  }, [open, orgId]);

  return (
    <Dialog open={open} onClose={onCancel} fullWidth maxWidth="sm">
      <DialogTitle>Select Category</DialogTitle>
      <DialogContent>
        <Typography variant="body2" sx={{ mb: 1 }}>Optional: choose a category for this upload.</Typography>
        <FormControl fullWidth size="small">
          <InputLabel>Category</InputLabel>
          <Select
            label="Category"
            value={selected}
            onChange={(e) => setSelected(e.target.value)}
            disabled={loading}
          >
            <MenuItem value="">(None)</MenuItem>
            {options.map(opt => (
              <MenuItem key={opt.id} value={opt.id}>{opt.name}</MenuItem>
            ))}
          </Select>
        </FormControl>
      </DialogContent>
      <DialogActions>
        <Button onClick={onCancel}>Cancel</Button>
        <Button variant="contained" onClick={() => onSelect(selected || null)}>Continue</Button>
      </DialogActions>
    </Dialog>
  );
}