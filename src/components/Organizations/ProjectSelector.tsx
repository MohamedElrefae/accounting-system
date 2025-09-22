import { useEffect, useState } from 'react';
import { TextField, MenuItem } from '@mui/material';
import { getActiveProjectsByOrg, type Project } from '../../services/projects';
import { getActiveOrgId } from '../../utils/org';
import { getActiveProjectId, setActiveProjectId } from '../../utils/org';

interface Props {
  orgId?: string; // if not provided, read from local storage
  value?: string;
  onChange?: (projectId: string) => void;
  label?: string;
  persist?: boolean;
  allowAll?: boolean; // include an "All" option with empty value
  sx?: any;
  size?: 'small' | 'medium';
}

export default function ProjectSelector({ orgId, value, onChange, label = 'Project', persist = true, allowAll = true, sx, size = 'small' }: Props) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [projectId, setProjectId] = useState<string>(value || getActiveProjectId() || '');
  const [effectiveOrg, setEffectiveOrg] = useState<string>(orgId || getActiveOrgId() || '');

  useEffect(() => { setEffectiveOrg(orgId || getActiveOrgId() || ''); }, [orgId]);

  useEffect(() => {
    (async () => {
      try {
        if (!effectiveOrg) { setProjects([]); return; }
        const list = await getActiveProjectsByOrg(effectiveOrg);
        setProjects(list);
        if (!projectId) {
          // Do not auto-pick when allowAll is enabled; leave empty to mean "All"
          if (!allowAll && list.length > 0) {
            const first = list[0].id as string;
            setProjectId(first);
            if (persist) setActiveProjectId(first);
            onChange?.(first);
          }
        }
      } catch {
        setProjects([]);
      }
    })();
  }, [effectiveOrg]);

  useEffect(() => { if (value !== undefined) setProjectId(value); }, [value]);

  const handleChange = (id: string) => {
    setProjectId(id);
    if (persist) setActiveProjectId(id || null);
    onChange?.(id);
  };

  return (
    <TextField
      select
      size={size}
      label={label}
      value={projectId}
      onChange={(e)=>handleChange(e.target.value)}
      sx={sx}
      disabled={!effectiveOrg}
      helperText={!effectiveOrg ? 'Select organization first' : undefined}
    >
      {allowAll && (<MenuItem value="">All</MenuItem>)}
      {projects.map(p => (
        <MenuItem key={p.id} value={p.id}>{p.code} - {p.name}</MenuItem>
      ))}
    </TextField>
  );
}