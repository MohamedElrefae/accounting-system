import { useEffect, useState } from 'react';
import { TextField, MenuItem } from '@mui/material';
import { getOrganizations, type Organization } from '../../services/organization';
import { getActiveOrgId, setActiveOrgId } from '../../utils/org';

interface Props {
  value?: string;
  onChange?: (orgId: string) => void;
  label?: string;
  persist?: boolean; // also update local storage
  sx?: any;
  size?: 'small' | 'medium';
}

export default function OrgSelector({ value, onChange, label = 'Organization', persist = true, sx, size = 'small' }: Props) {
  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [orgId, setOrgId] = useState<string>(value || getActiveOrgId() || '');

  useEffect(() => {
    (async () => {
      try {
        console.log('🔍 [OrgSelector] Fetching organizations...');
        const list = await getOrganizations();
        console.log(`✅ [OrgSelector] Loaded ${list.length} organizations`, list);
        setOrgs(list);
        if (!orgId && list.length > 0) {
          const first = list[0].id as string;
          setOrgId(first);
          if (persist) setActiveOrgId(first);
          onChange?.(first);
          console.log(`✅ [OrgSelector] Auto-selected first org: ${first}`);
        } else if (list.length === 0) {
          console.warn('⚠️ [OrgSelector] No organizations found in database');
        }
      } catch (err) {
        console.error('❌ [OrgSelector] Error fetching organizations:', err);
        setOrgs([]);
      }
    })();
  }, []);

  useEffect(() => { if (value !== undefined) setOrgId(value); }, [value]);

  const handleChange = (id: string) => {
    setOrgId(id);
    if (persist) setActiveOrgId(id);
    onChange?.(id);
  };

  return (
    <TextField
      select
      size={size}
      label={label}
      value={orgId}
      onChange={(e) => handleChange(e.target.value)}
      sx={sx}
      helperText={orgs.length === 0 ? 'No organizations found. Please add one in settings.' : undefined}
      error={orgs.length === 0}
      placeholder="Select organization"
    >
      {orgs.length === 0 ? (
        <MenuItem value="" disabled>
          No organizations available
        </MenuItem>
      ) : (
        orgs.map((o) => (
          <MenuItem key={o.id} value={o.id}>{o.code} - {o.name}</MenuItem>
        ))
      )}
    </TextField>
  );
}