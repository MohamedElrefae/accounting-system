/**
 * ScopedProjectSelector - Enterprise Project Selector
 * 
 * Controlled component that uses ScopeContext for state management.
 * Automatically disabled when no org is selected.
 * Only shows projects belonging to the current org.
 */

import React, { useCallback } from 'react';
import { 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem, 
  CircularProgress, 
  Box
} from '@mui/material';
import { useScope } from '../../contexts/ScopeContext';
import useAppStore from '../../store/useAppStore';

interface Props {
  size?: 'small' | 'medium';
  label?: string;
  allowAll?: boolean;
  sx?: any;
  showLoading?: boolean;
  variant?: 'outlined' | 'filled' | 'standard';
}

export const ScopedProjectSelector: React.FC<Props> = ({ 
  size = 'small', 
  label,
  allowAll = true,
  sx,
  showLoading = true,
  variant = 'outlined'
}) => {
  const { language } = useAppStore();
  const { 
    currentOrg,
    currentProject, 
    availableProjects, 
    setProject,
    isLoadingProjects 
  } = useScope();

  const defaultLabel = language === 'ar' ? 'المشروع' : 'Project';
  const allLabel = language === 'ar' ? 'كل المشاريع' : 'All Projects';
  const selectOrgFirst = language === 'ar' ? 'اختر المؤسسة أولاً' : 'Select org first';
  const noProjectsText = language === 'ar' ? 'لا توجد مشاريع' : 'No projects';
  const loadingText = language === 'ar' ? 'جاري التحميل...' : 'Loading...';

  const handleChange = useCallback(async (event: any) => {
    const projectId = event.target.value as string;
    console.log('[ScopedProjectSelector] Selection changed:', projectId);
    try {
      await setProject(projectId || null);
    } catch (err) {
      console.error('[ScopedProjectSelector] Error setting project:', err);
    }
  }, [setProject]);

  const isDisabled = !currentOrg || isLoadingProjects;

  return (
    <FormControl size={size} sx={{ minWidth: 180, ...sx }} disabled={isDisabled}>
      <InputLabel>{label || defaultLabel}</InputLabel>
      <Select
        value={currentProject?.id || ''}
        onChange={handleChange}
        label={label || defaultLabel}
        disabled={isDisabled}
        variant={variant}
        displayEmpty
        renderValue={(selected) => {
          // No org selected
          if (!currentOrg) {
            return <span style={{ color: '#999' }}>{selectOrgFirst}</span>;
          }
          // Loading projects
          if (isLoadingProjects && !selected) {
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={14} />
                <span style={{ color: '#999' }}>{loadingText}</span>
              </Box>
            );
          }
          // No project selected (All Projects)
          if (!selected) {
            return allLabel;
          }
          // Show selected project
          const project = availableProjects.find(p => p.id === selected);
          if (project) {
            return `${project.code} - ${project.name}`;
          }
          return '';
        }}
        endAdornment={
          showLoading && isLoadingProjects ? (
            <CircularProgress size={16} sx={{ mr: 2 }} />
          ) : undefined
        }
        MenuProps={{
          PaperProps: {
            sx: { maxHeight: 300 }
          }
        }}
      >
        {allowAll && (
          <MenuItem value="">
            {allLabel}
          </MenuItem>
        )}
        {availableProjects.length === 0 && currentOrg ? (
          <MenuItem value="" disabled>
            {isLoadingProjects ? loadingText : noProjectsText}
          </MenuItem>
        ) : (
          availableProjects.map((project) => (
            <MenuItem key={project.id} value={project.id}>
              {project.code} - {project.name}
            </MenuItem>
          ))
        )}
      </Select>
    </FormControl>
  );
};

export default ScopedProjectSelector;
