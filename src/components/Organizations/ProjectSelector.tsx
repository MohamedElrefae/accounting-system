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

  const hasProjects = projects.length > 0;
  const noProjectsMessage = effectiveOrg && !hasProjects 
    ? 'لا توجد مشاريع مخصصة لك في هذه المؤسسة' 
    : undefined;

  return (
    <TextField
      select
      fullWidth
      size={size}
      label={label}
      value={hasProjects ? projectId : ''}
      onChange={(e) => handleChange(e.target.value)}
      sx={{
        ...sx,
        '& .MuiSelect-select': {
          color: !hasProjects ? '#d32f2f' : undefined,
        }
      }}
      disabled={!effectiveOrg || !hasProjects}
      helperText={!effectiveOrg ? 'اختر مؤسسة أولاً' : noProjectsMessage}
      error={!!noProjectsMessage}
      SelectProps={{
        displayEmpty: true,
        renderValue: (selected) => {
          if (!hasProjects) {
            return 'لا توجد مشاريع متاحة';
          }
          if (!selected) {
            return allowAll ? 'الكل' : 'اختر مشروع';
          }
          const project = projects.find(p => p.id === selected);
          return project ? `${project.code} - ${project.name}` : '';
        }
      }}
    >
      {!hasProjects ? (
        <MenuItem disabled value="">
          لا توجد مشاريع متاحة
        </MenuItem>
      ) : (
        <>
          {allowAll && <MenuItem value="">الكل</MenuItem>}
          {projects.map(p => (
            <MenuItem key={p.id} value={p.id}>{p.code} - {p.name}</MenuItem>
          ))}
        </>
      )}
    </TextField>
  );
}