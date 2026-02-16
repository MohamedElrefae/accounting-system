import { useEffect, useMemo, useState, useCallback } from 'react';
import { TextField, MenuItem } from '@mui/material';
import type { Organization } from '../../types';
import { useScopeOptional } from '../../contexts/ScopeContext';

interface Props {
  value?: string;
  onChange?: (orgId: string) => void;
  label?: string;
  persist?: boolean;
  sx?: any;
  size?: 'small' | 'medium';
}

export default function OrgSelector({ value, onChange, label = 'Organization', persist = true, sx, size = 'small' }: Props) {
  const scope = useScopeOptional();
  const orgs = scope?.availableOrgs || [];
  const [orgId, setOrgId] = useState<string>('');

  const effectiveValue = useMemo(() => {
    if (value !== undefined) return value;
    return scope?.currentOrg?.id || '';
  }, [scope?.currentOrg?.id, value]);

  useEffect(() => {
    if (!orgs.length) return;

    const candidate = effectiveValue;
    if (candidate && orgs.some(o => o.id === candidate)) {
      setOrgId(candidate);
    } else if (orgs.length > 0) {
      const first = orgs[0].id as string;
      setOrgId(first);
      if (persist && scope) { void scope.setOrganization(first) }
      onChange?.(first);
    }
  }, [effectiveValue, persist, scope, onChange, orgs]);

  useEffect(() => {
    setOrgId(effectiveValue);
  }, [effectiveValue]);

  const handleChange = useCallback((id: string) => {
    setOrgId(id);
    if (persist && scope) { void scope.setOrganization(id) }
    onChange?.(id);
  }, [persist, onChange, scope]);

  return (
    <TextField
      select
      fullWidth
      size={size}
      label={label}
      value={orgId}
      onChange={(e) => handleChange(e.target.value)}
      sx={sx}
      helperText={orgs.length === 0 ? 'No organizations found' : undefined}
      error={orgs.length === 0}
    >
      {orgs.map((o) => (
        <MenuItem key={o.id} value={o.id}>{o.code} - {o.name}</MenuItem>
      ))}
    </TextField>
  );
}