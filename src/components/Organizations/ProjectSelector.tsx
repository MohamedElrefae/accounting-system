import { useEffect, useMemo, useState, useCallback } from 'react';
import { TextField, MenuItem } from '@mui/material';
import { type Project } from '../../services/projects';
import { useScopeOptional } from '../../contexts/ScopeContext';
import { useAuthScopeData } from '../../hooks/useAuthScopeData';

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
  const authScopeData = useAuthScopeData();
  const [projectId, setProjectId] = useState<string>('');

  const effectiveOrg = useMemo(() => {
    return orgId || scope?.currentOrg?.id || '';
  }, [orgId, scope?.currentOrg?.id]);

  const projects = useMemo(() => {
    if (!effectiveOrg) return [];
    return authScopeData.projects.filter(p => p.org_id === effectiveOrg);
  }, [authScopeData.projects, effectiveOrg]);

  const effectiveValue = useMemo(() => {
    if (value !== undefined) return value;
    return scope?.currentProject?.id || '';
  }, [scope?.currentProject?.id, value]);

  useEffect(() => {
    if (!authScopeData.isReady) return;

    if (!effectiveOrg) {
      setProjectId('');
      return;
    }

    const candidate = effectiveValue;
    if (candidate && projects.some(p => p.id === candidate)) {
      setProjectId(candidate);
    } else if (!allowAll && projects.length > 0) {
      const first = projects[0].id as string;
      setProjectId(first);
      if (persist && scope) { void scope.setProject(first) }
      onChange?.(first);
    } else {
      setProjectId('');
      if (persist && scope) { void scope.setProject(null) }
    }
  }, [allowAll, effectiveOrg, effectiveValue, onChange, persist, scope, authScopeData.isReady, projects]);

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