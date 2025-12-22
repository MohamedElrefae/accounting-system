/**
 * ScopedOrgSelector - Enterprise Organization Selector
 * 
 * Controlled component that uses ScopeContext for state management.
 * When org changes, project is automatically cleared.
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
  sx?: any;
  showLoading?: boolean;
  variant?: 'outlined' | 'filled' | 'standard';
}

export const ScopedOrgSelector: React.FC<Props> = ({ 
  size = 'small', 
  label,
  sx,
  showLoading = true,
  variant = 'outlined'
}) => {
  const { language } = useAppStore();
  const { 
    currentOrg, 
    availableOrgs, 
    setOrganization,
    isLoadingOrgs,
    error
  } = useScope();

  const defaultLabel = language === 'ar' ? 'المؤسسة' : 'Organization';
  const noOrgsText = language === 'ar' ? 'لا توجد مؤسسات' : 'No organizations';
  const loadingText = language === 'ar' ? 'جاري التحميل...' : 'Loading...';

  const handleChange = useCallback(async (event: any) => {
    const orgId = event.target.value as string;
    console.log('[ScopedOrgSelector] Selection changed:', orgId);
    try {
      await setOrganization(orgId || null);
    } catch (err) {
      console.error('[ScopedOrgSelector] Error setting organization:', err);
    }
  }, [setOrganization]);

  // Show error state inline
  if (error) {
    return (
      <FormControl size={size} sx={{ minWidth: 180, ...sx }} error>
        <InputLabel>{defaultLabel}</InputLabel>
        <Select
          value=""
          label={label || defaultLabel}
          disabled
          variant={variant}
        >
          <MenuItem value="" disabled>
            {error}
          </MenuItem>
        </Select>
      </FormControl>
    );
  }

  return (
    <FormControl size={size} sx={{ minWidth: 180, ...sx }}>
      <InputLabel>{label || defaultLabel}</InputLabel>
      <Select
        value={currentOrg?.id || ''}
        onChange={handleChange}
        label={label || defaultLabel}
        disabled={isLoadingOrgs}
        variant={variant}
        displayEmpty
        renderValue={(selected) => {
          if (isLoadingOrgs && !selected) {
            return (
              <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                <CircularProgress size={14} />
                <span style={{ color: '#999' }}>{loadingText}</span>
              </Box>
            );
          }
          if (!selected && availableOrgs.length === 0) {
            return <span style={{ color: '#999' }}>{noOrgsText}</span>;
          }
          const org = availableOrgs.find(o => o.id === selected);
          if (org) {
            return `${org.code} - ${language === 'ar' && org.name_ar ? org.name_ar : org.name}`;
          }
          return '';
        }}
        endAdornment={
          showLoading && isLoadingOrgs ? (
            <CircularProgress size={16} sx={{ mr: 2 }} />
          ) : undefined
        }
        MenuProps={{
          PaperProps: {
            sx: { maxHeight: 300 }
          }
        }}
      >
        {availableOrgs.length === 0 ? (
          <MenuItem value="" disabled>
            {isLoadingOrgs ? loadingText : noOrgsText}
          </MenuItem>
        ) : (
          availableOrgs.map((org) => (
            <MenuItem key={org.id} value={org.id}>
              {org.code} - {language === 'ar' && org.name_ar ? org.name_ar : org.name}
            </MenuItem>
          ))
        )}
      </Select>
    </FormControl>
  );
};

export default ScopedOrgSelector;
