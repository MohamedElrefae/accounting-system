/**
 * useScopedFilters - Hook for getting current scope filters
 * 
 * Use this hook in any component that needs to filter data by org/project.
 * Provides consistent filter values across the app.
 */

import { useMemo } from 'react';
import { useScope } from '../contexts/ScopeContext';

export interface ScopedFilters {
  orgId: string | null;
  projectId: string | null;
  hasOrg: boolean;
  hasProject: boolean;
}

export const useScopedFilters = (): ScopedFilters => {
  const { currentOrg, currentProject } = useScope();
  
  return useMemo(() => ({
    orgId: currentOrg?.id ?? null,
    projectId: currentProject?.id ?? null,
    hasOrg: !!currentOrg,
    hasProject: !!currentProject,
  }), [currentOrg, currentProject]);
};

/**
 * Hook for building query filters with scope
 */
export const useScopedQueryFilters = <T extends Record<string, any>>(
  additionalFilters?: T
): T & ScopedFilters => {
  const scopedFilters = useScopedFilters();
  
  return useMemo(() => ({
    ...scopedFilters,
    ...(additionalFilters || {}),
  } as T & ScopedFilters), [scopedFilters, additionalFilters]);
};

export default useScopedFilters;
