/**
 * ScopeChips - Display current org/project scope as Chips
 * 
 * Use this component to show the current scope selection in pages.
 * Clicking on chips navigates to TopBar for selection changes.
 */

import React from 'react';
import { Box, Chip, Typography, Skeleton } from '@mui/material';
import { BusinessIcon, WorkIcon } from '../icons/SimpleIcons';
import { useScope } from '../../contexts/ScopeContext';
import useAppStore from '../../store/useAppStore';

interface Props {
  showLabels?: boolean;
  size?: 'small' | 'medium';
  variant?: 'outlined' | 'filled';
  sx?: any;
}

export const ScopeChips: React.FC<Props> = ({
  showLabels = true,
  size = 'small',
  variant = 'outlined',
  sx,
}) => {
  const { language } = useAppStore();
  const { 
    currentOrg, 
    currentProject, 
    isLoadingOrgs, 
    isLoadingProjects 
  } = useScope();

  const allProjectsLabel = language === 'ar' ? 'كل المشاريع' : 'All Projects';
  const noOrgLabel = language === 'ar' ? 'لم يتم اختيار مؤسسة' : 'No organization selected';

  if (isLoadingOrgs) {
    return (
      <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', ...sx }}>
        <Skeleton variant="rounded" width={120} height={24} />
        <Skeleton variant="rounded" width={100} height={24} />
      </Box>
    );
  }

  return (
    <Box sx={{ display: 'flex', gap: 1, alignItems: 'center', flexWrap: 'wrap', ...sx }}>
      {showLabels && (
        <Typography variant="body2" color="text.secondary" sx={{ mr: 0.5 }}>
          {language === 'ar' ? 'النطاق:' : 'Scope:'}
        </Typography>
      )}
      
      {/* Organization Chip */}
      <Chip
        icon={<BusinessIcon sx={{ fontSize: 16 }} />}
        label={currentOrg 
          ? `${currentOrg.code} - ${language === 'ar' && currentOrg.name_ar ? currentOrg.name_ar : currentOrg.name}`
          : noOrgLabel
        }
        size={size}
        variant={variant}
        color={currentOrg ? 'primary' : 'default'}
        sx={{ 
          fontWeight: 500,
          '& .MuiChip-icon': { ml: language === 'ar' ? 0 : 0.5, mr: language === 'ar' ? 0.5 : 0 }
        }}
      />
      
      {/* Project Chip */}
      {currentOrg && (
        <Chip
          icon={<WorkIcon sx={{ fontSize: 16 }} />}
          label={
            isLoadingProjects 
              ? (language === 'ar' ? 'جاري التحميل...' : 'Loading...')
              : currentProject 
                ? `${currentProject.code} - ${currentProject.name}`
                : allProjectsLabel
          }
          size={size}
          variant={variant}
          color={currentProject ? 'secondary' : 'default'}
          sx={{ 
            fontWeight: 500,
            '& .MuiChip-icon': { ml: language === 'ar' ? 0 : 0.5, mr: language === 'ar' ? 0.5 : 0 }
          }}
        />
      )}
    </Box>
  );
};

export default ScopeChips;
