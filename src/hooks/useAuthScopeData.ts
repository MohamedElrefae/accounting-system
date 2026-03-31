import { useMemo } from 'react';
import useOptimizedAuth from './useOptimizedAuth';

/**
 * useAuthScopeData - Bridge hook that exposes organization and project data
 * from the unified authentication state.
 * 
 * This hook is intended to be used by ScopeProvider and UserProfileProvider
 * when the UNIFIED_AUTH_DATA feature flag is enabled.
 */
export function useAuthScopeData() {
  const auth = useOptimizedAuth();
  
  return useMemo(() => ({
    organizations: auth.userOrganizations,
    projects: auth.userProjects,
    defaultOrgId: auth.defaultOrgId,
    orgRoles: auth.orgRoles,
    projectRoles: auth.projectRoles,
    isReady: !auth.loading && auth.user !== null,
    refresh: auth.refreshProfile,
  }), [
    auth.userOrganizations, 
    auth.userProjects, 
    auth.defaultOrgId, 
    auth.orgRoles, 
    auth.projectRoles, 
    auth.loading, 
    auth.user, 
    auth.refreshProfile
  ]);
}

export default useAuthScopeData;
