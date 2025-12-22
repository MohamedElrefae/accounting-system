import { useEffect, useMemo, useState, useCallback } from 'react';
import { TextField, MenuItem } from '@mui/material';
import { getActiveProjectsByOrg, type Project } from '../../services/projects';
import { useScopeOptional } from '../../contexts/ScopeContext';

interface Props {
  orgId?: string;
  value?: string;
  onChange?: (projectId: string) => void;
  label?: string;
  persist?: boolean;
  allowAll?: boolean;
  sx?: any;
  size?: 'small' | 'medium';
}

export default function ProjectSelector({ orgId, value, onChange, label = 'Project', persist = true, allowAll = true, sx, size = 'small' }: Props) {
  const scope = useScopeOptional();
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>('');
  const effectiveOrg = useMemo(() => {
    return orgId || scope?.currentOrg?.id || '';
  }, [orgId, scope?.currentOrg?.id]);

  const effectiveValue = useMemo(() => {
    if (value !== undefined) return value;
    return scope?.currentProject?.id || '';
  }, [scope?.currentProject?.id, value]);

  useEffect(() => {
    (async () => {
      try {
        if (!effectiveOrg) {
          setProjects([]);
          setProjectId('');
          return;
        }
        const list = await getActiveProjectsByOrg(effectiveOrg);
        setProjects(list);

        const candidate = effectiveValue;
        if (candidate && list.some(p => p.id === candidate)) {
          setProjectId(candidate);
        } else if (!allowAll && list.length > 0) {
          const first = list[0].id as string;
          setProjectId(first);
          if (persist && scope) { void scope.setProject(first) }
          onChange?.(first);
        } else {
          setProjectId('');
          if (persist && scope) { void scope.setProject(null) }
        }
      } catch {
        setProjects([]);
        setProjectId('');
      }
    })();
  }, [allowAll, effectiveOrg, effectiveValue, onChange, persist, scope]);

  useEffect(() => {
    setProjectId(effectiveValue);
  }, [effectiveValue]);

  const handleChange = useCallback((id: string) => {
    setProjectId(id);
    if (persist && scope) { void scope.setProject(id || null) }
    onChange?.(id);
  }, [persist, onChange, scope]);

  return (
    <TextField
      select
      fullWidth
      size={size}
      label={label}
      value={projectId}
      onChange={(e) => handleChange(e.target.value)}
      sx={sx}
      disabled={!effectiveOrg}
      helperText={!effectiveOrg ? 'Select organization first' : undefined}
    >
      {allowAll && <MenuItem value="">All</MenuItem>}
      {projects.map(p => (
        <MenuItem key={p.id} value={p.id}>{p.code} - {p.name}</MenuItem>
      ))}
    </TextField>
  );
}