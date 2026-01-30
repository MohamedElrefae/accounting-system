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
  const allLabel = language === 'ar' ? 'الكل' : 'All';
  const selectOrgFirst = language === 'ar' ? 'اختر المؤسسة أولاً' : 'Select org first';
  const noProjectsText = language === 'ar' ? 'لا توجد مشاريع متاحة' : 'No projects available';
  const noProjectsAssigned = language === 'ar' ? 'لا توجد مشاريع مخصصة لك في هذه المؤسسة' : 'No projects assigned to you in this organization';
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

  const hasProjects = availableProjects.length > 0;
  const isDisabled = !currentOrg || isLoadingProjects || !hasProjects;

  return (
    <FormControl 
      size={size} 
      sx={{ minWidth: 180, ...sx }} 
      disabled={isDisabled}
      error={currentOrg && !hasProjects && !isLoadingProjects}
    >
      <InputLabel>{label || defaultLabel}</InputLabel>
      <Select
        value={hasProjects ? (currentProject?.id || '') : ''}
        onChange={handleChange}
        label={label || defaultLabel}
        disabled={isDisabled}
        variant={variant}
        displayEmpty
        sx={{
          '& .MuiSelect-select': {
            color: (currentOrg && !hasProjects && !isLoadingProjects) ? '#d32f2f' : undefined,
          }
        }}
        renderValue={(selected) => {
          // No org selected
          if (!currentOrg) {
            return <span style={{ color: '#999' }}>{selectOrgFirst}</span>;
          }
          // Loading projects
          if (isLoadingProjects) {
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={14} />
                <span style={{ color: '#999' }}>{loadingText}</span>
              </Box>
            );
          }
          // No projects available
          if (!hasProjects) {
            return <span style={{ color: '#d32f2f' }}>{noProjectsText}</span>;
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
        {!hasProjects ? (
          <MenuItem value="" disabled>
            {isLoadingProjects ? loadingText : noProjectsText}
          </MenuItem>
        ) : (
          [
            allowAll && (
              <MenuItem key="all" value="">
                {allLabel}
              </MenuItem>
            ),
            ...availableProjects.map((project) => (
              <MenuItem key={project.id} value={project.id}>
                {project.code} - {project.name}
              </MenuItem>
            ))
          ].filter(Boolean)
        )}
      </Select>
      {currentOrg && !hasProjects && !isLoadingProjects && (
        <Box sx={{ fontSize: '0.75rem', color: '#d32f2f', mt: 0.5, px: 1.75 }}>
          {noProjectsAssigned}
        </Box>
      )}
    </FormControl>
  );
};

export default ScopedProjectSelector;
