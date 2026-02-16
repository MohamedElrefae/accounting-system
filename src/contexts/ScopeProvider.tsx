/**
 * ScopeProvider - Enterprise Organization/Project Scope Provider
 * 
 * Manages org/project state with:
 * - Automatic project clearing on org change
 * - localStorage persistence
 * - Integration with React Query for cache invalidation
 * - Unified sync manager compatibility
 */

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { useQueryClient } from '@tanstack/react-query';
import { ScopeContext, type ScopeContextValue } from './ScopeContext';
import { getOrganizations, type Organization } from '../services/organization';
import { getActiveProjectsByOrg, type Project } from '../services/projects';
import { queryKeys } from '../lib/queryKeys';
import { getConnectionMonitor, type ConnectionHealth } from '../utils/connectionMonitor';
import featureFlags from '../utils/featureFlags';
import { useAuthScopeData } from '../hooks/useAuthScopeData';

// localStorage keys
const ORG_KEY = 'org_id';
const PROJECT_KEY = 'project_id';

// Helper functions for localStorage
function getStoredOrgId(): string | null {
  try {
    return localStorage.getItem(ORG_KEY);
  } catch {
    return null;
  }
}

function setStoredOrgId(orgId: string | null): void {
  try {
    if (orgId) localStorage.setItem(ORG_KEY, orgId);
    else localStorage.removeItem(ORG_KEY);
  } catch {
    // Ignore storage errors
  }
}

function getStoredProjectId(): string | null {
  try {
    return localStorage.getItem(PROJECT_KEY);
  } catch {
    return null;
  }
}

function setStoredProjectId(projectId: string | null): void {
  try {
    if (projectId) localStorage.setItem(PROJECT_KEY, projectId);
    else localStorage.removeItem(PROJECT_KEY);
  } catch {
    // Ignore storage errors
  }
}

interface ScopeProviderProps {
  children: React.ReactNode;
}

export const ScopeProvider: React.FC<ScopeProviderProps> = ({ children }) => {
  const queryClient = useQueryClient();
  const mountedRef = useRef(true);
  const connectionHealthRef = useRef<ConnectionHealth | null>(null);
  const connectionIssueRef = useRef<boolean>(false);

  // State
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [availableOrgs, setAvailableOrgs] = useState<Organization[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [_connectionIssue, setConnectionIssue] = useState<boolean>(false);

  // Unified Auth PoC
  const useUnifiedAuth = featureFlags.isEnabled('UNIFIED_AUTH_DATA');
  const authScopeData = useAuthScopeData();
  const initializedFromAuthRef = useRef(false);

  // Load projects for a specific org with retry mechanism
  const loadProjectsForOrg = useCallback(async (orgId: string, retryCount = 0): Promise<Project[]> => {
    if (useUnifiedAuth && authScopeData.isReady) {
      if (import.meta.env.DEV) console.log('[ScopeProvider] UnifiedAuth: Using projects from auth state for org:', orgId);
      const filteredProjects = authScopeData.projects.filter((p: Project) => p.org_id === orgId);
      setAvailableProjects(filteredProjects);

      // Handle project restoration logic (shared with legacy path)
      const storedProjectId = getStoredProjectId();
      const matchingProject = filteredProjects.find((p: Project) => p.id === storedProjectId);
      if (matchingProject) {
        setCurrentProject(matchingProject);
      } else {
        setCurrentProject(null);
        setStoredProjectId(null);
      }
      return filteredProjects;
    }

    if (import.meta.env.DEV) console.log('[ScopeProvider] Loading projects for org:', orgId, { retryCount });
    setIsLoadingProjects(true);

    try {
      // Load projects using RPC (already filtered by access control)
      // The RPC get_user_accessible_projects() handles:
      // - org_memberships.can_access_all_projects = true → ALL projects
      // - org_memberships.can_access_all_projects = false → Only project_memberships
      const projects = await getActiveProjectsByOrg(orgId);

      if (!mountedRef.current) return projects;

      // Set available projects (no additional filtering needed - RPC already did it)
      setAvailableProjects(projects);

      // Provide user feedback about project access
      if (projects.length === 0) {
        console.warn('[ScopeProvider] ⚠️ No projects accessible for user in this organization');
        console.warn('[ScopeProvider] This could mean:');
        console.warn('[ScopeProvider]   1. User has no project memberships');
        console.warn('[ScopeProvider]   2. User cannot access all projects in org');
        console.warn('[ScopeProvider]   3. No active projects exist in this organization');

        // Clear any previously selected project since it's no longer accessible
        setCurrentProject(null);
        setStoredProjectId(null);
      } else {
        if (import.meta.env.DEV) console.log('[ScopeProvider] ✅ Loaded projects:', projects.length);

        // Restore project from localStorage if still valid and accessible
        const storedProjectId = getStoredProjectId();
        const matchingProject = projects.find(p => p.id === storedProjectId);

        if (matchingProject) {
          if (import.meta.env.DEV) console.log('[ScopeProvider] Restored project from storage:', matchingProject.code);
          setCurrentProject(matchingProject);
        } else {
          // Either no stored project or it's no longer accessible
          if (storedProjectId) {
            console.warn('[ScopeProvider] Previously selected project is no longer accessible, clearing selection');
          }
          setCurrentProject(null);
          setStoredProjectId(null);
        }
      }

      return projects;
    } catch (err) {
      console.error('[ScopeProvider] Failed to load projects:', err);

      // Implement retry logic for projects
      if (retryCount < 2) {
        if (import.meta.env.DEV) console.log(`[ScopeProvider] Retrying projects load (${retryCount + 1}/3)`);
        setTimeout(() => loadProjectsForOrg(orgId, retryCount + 1), 1000 * (retryCount + 1));
        return [];
      }

      if (mountedRef.current) {
        setAvailableProjects([]);
        setCurrentProject(null);
        setError('Failed to load projects. Please check your permissions and try again.');
      }
      return [];
    } finally {
      if (mountedRef.current) {
        setIsLoadingProjects(false);
      }
    }
  }, []);

  // Load organizations with retry mechanism and connection awareness
  const loadOrganizations = useCallback(async (retryCount = 0) => {
    if (import.meta.env.DEV) console.log('[ScopeProvider] Loading organizations...', { retryCount });

    // Check connection health first
    const connectionHealth = connectionHealthRef.current;
    if (connectionHealth && !connectionHealth.isOnline) {
      console.warn('[ScopeProvider] Skipping load due to connection issues');
      setConnectionIssue(true);
      setError('Connection issues detected. Retrying when connection is restored...');
      return;
    }

    setIsLoadingOrgs(true);
    setError(null);
    setConnectionIssue(false);

    // CRITICAL: Double check if unified data became ready while waiting
    if (useUnifiedAuth && authScopeData.isReady) {
      if (import.meta.env.DEV) console.log('[ScopeProvider] UnifiedAuth Ready: Skipping legacy load in loadOrganizations');
      const orgs = authScopeData.organizations;
      setAvailableOrgs(orgs);

      const storedOrgId = getStoredOrgId();
      const matchingOrg = orgs.find((o: Organization) => o.id === storedOrgId);
      if (matchingOrg) {
        setCurrentOrg(matchingOrg);
        await loadProjectsForOrg(matchingOrg.id);
      } else if (orgs.length > 0) {
        setCurrentOrg(orgs[0]);
        setStoredOrgId(orgs[0].id);
        await loadProjectsForOrg(orgs[0].id);
      }
      setIsLoadingOrgs(false);
      setLastUpdated(new Date());
      initializedFromAuthRef.current = true;
      return;
    }

    try {
      const orgs = await getOrganizations();
      if (import.meta.env.DEV) console.log('[ScopeProvider] Loaded organizations:', orgs.length, orgs.map(o => o.code));

      if (!mountedRef.current) return;

      setAvailableOrgs(orgs);

      // Restore from localStorage or select first
      const storedOrgId = getStoredOrgId();
      if (import.meta.env.DEV) console.log('[ScopeProvider] Stored org ID:', storedOrgId);
      const matchingOrg = orgs.find(o => o.id === storedOrgId);

      if (matchingOrg) {
        if (import.meta.env.DEV) console.log('[ScopeProvider] Restored org from storage:', matchingOrg.code);
        setCurrentOrg(matchingOrg);
        await loadProjectsForOrg(matchingOrg.id);
      } else if (orgs.length > 0) {
        if (import.meta.env.DEV) console.log('[ScopeProvider] Auto-selecting first org:', orgs[0].code);
        setCurrentOrg(orgs[0]);
        setStoredOrgId(orgs[0].id);
        await loadProjectsForOrg(orgs[0].id);
      }

      setLastUpdated(new Date());
    } catch (err) {
      console.error('[ScopeProvider] Failed to load organizations:', err);

      // Implement retry logic
      if (retryCount < 2) {
        if (import.meta.env.DEV) console.log(`[ScopeProvider] Retrying organizations load (${retryCount + 1}/3)`);
        setTimeout(() => loadOrganizations(retryCount + 1), 1000 * (retryCount + 1));
        return;
      }

      if (mountedRef.current) {
        setError('Failed to load organizations after multiple attempts');
        // Set fallback state to prevent app from being unusable
        setAvailableOrgs([]);
        setCurrentOrg(null);
        setCurrentProject(null);
        setAvailableProjects([]);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoadingOrgs(false);
      }
    }
  }, [loadProjectsForOrg]);

  // Load organizations on mount and monitor connection
  useEffect(() => {
    mountedRef.current = true;
    if (import.meta.env.DEV) console.log('[ScopeProvider] Mounting, loading organizations...');

    // Set up connection monitoring
    const monitor = getConnectionMonitor();
    connectionHealthRef.current = monitor.getHealth();

    const unsubscribe = monitor.subscribe((health) => {
      connectionHealthRef.current = health;

      // If connection is restored and we have issues, try to reload
      if (health.isOnline && connectionIssueRef.current) {
        if (import.meta.env.DEV) console.log('[ScopeProvider] Connection restored, reloading data...');
        loadOrganizations();
      }

      // Update connection issue state
      const nextIssue = !health.isOnline;
      connectionIssueRef.current = nextIssue;
      setConnectionIssue(nextIssue);
    });

    // Initial load
    if (!useUnifiedAuth || !authScopeData.isReady) {
      loadOrganizations();
    }

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [loadOrganizations]);

  // Re-initialize if unified auth becomes ready late
  useEffect(() => {
    if (useUnifiedAuth && authScopeData.isReady && !initializedFromAuthRef.current) {
      if (import.meta.env.DEV) console.log('[ScopeProvider] UnifiedAuth became ready, initializing...');
      loadOrganizations();
    }
  }, [useUnifiedAuth, authScopeData.isReady, loadOrganizations]);

  // Set organization - CLEARS PROJECT
  const setOrganization = useCallback(async (orgId: string | null) => {
    if (import.meta.env.DEV) console.log('[ScopeProvider] setOrganization:', orgId);

    if (!orgId) {
      setCurrentOrg(null);
      setCurrentProject(null);
      setAvailableProjects([]);
      setStoredOrgId(null);
      setStoredProjectId(null);
      return;
    }

    const org = availableOrgs.find(o => o.id === orgId);
    if (!org) {
      console.error('[ScopeProvider] Invalid org ID:', orgId);
      return;
    }

    // Update org
    setCurrentOrg(org);
    setStoredOrgId(orgId);

    // CRITICAL: Clear project when org changes
    setCurrentProject(null);
    setStoredProjectId(null);

    // Load projects for new org
    await loadProjectsForOrg(orgId);

    // Invalidate org-scoped queries
    queryClient.invalidateQueries({ queryKey: queryKeys.accounts.byOrg(orgId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.costCenters.byOrg(orgId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.categories.byOrg(orgId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.workItems.byOrg(orgId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.analysisItems.byOrg(orgId) });

    setLastUpdated(new Date());
  }, [availableOrgs, loadProjectsForOrg, queryClient]);

  // Set project - validates org ownership (access already validated by RPC)
  const setProject = useCallback(async (projectId: string | null) => {
    if (import.meta.env.DEV) console.log('[ScopeProvider] setProject:', projectId);

    if (!projectId) {
      setCurrentProject(null);
      setStoredProjectId(null);
      return;
    }

    // 1. Validate project is in available projects (already filtered by RPC)
    const project = availableProjects.find(p => p.id === projectId);
    if (!project) {
      console.error('[ScopeProvider] Invalid project ID or no access:', projectId);
      setError('Project not found or no access');
      return;
    }

    // 2. Validate org is selected
    if (!currentOrg) {
      console.error('[ScopeProvider] No organization selected');
      setError('Organization required');
      return;
    }

    // 3. Set project (access already validated by RPC get_user_accessible_projects)
    setCurrentProject(project);
    setStoredProjectId(projectId);

    // Invalidate project-scoped queries
    queryClient.invalidateQueries({
      queryKey: queryKeys.costCenters.byOrg(currentOrg.id, projectId)
    });

    setLastUpdated(new Date());
  }, [availableProjects, currentOrg, queryClient]);

  // Clear scope
  const clearScope = useCallback(() => {
    setCurrentOrg(null);
    setCurrentProject(null);
    setAvailableProjects([]);
    setStoredOrgId(null);
    setStoredProjectId(null);
  }, []);

  // Refresh scope with error handling
  const refreshScope = useCallback(async () => {
    try {
      await loadOrganizations();
    } catch (err) {
      console.error('[ScopeProvider] Refresh failed:', err);
      setError('Failed to refresh data');
    }
  }, [loadOrganizations]);

  // Getters
  const getOrgId = useCallback(() => currentOrg?.id ?? null, [currentOrg]);
  const getProjectId = useCallback(() => currentProject?.id ?? null, [currentProject]);

  // Manual refresh function for topbar
  const manualRefresh = useCallback(async () => {
    if (import.meta.env.DEV) console.log('[ScopeProvider] Manual refresh triggered');
    setError(null);
    setConnectionIssue(false);

    if (useUnifiedAuth) {
      if (import.meta.env.DEV) console.log('[ScopeProvider] UnifiedAuth: Triggering auth refresh');
      await authScopeData.refresh();
      // loadOrganizations() is NOT needed here because it reads from auth state,
      // and we have an effect that syncing availableOrgs when auth state changes.
      // However, to ensure instant update, we can call it.
      await loadOrganizations();
    } else {
      await loadOrganizations();
    }
  }, [loadOrganizations, useUnifiedAuth, authScopeData]);

  // Context value
  const value: ScopeContextValue = useMemo(() => ({
    // State
    currentOrg,
    currentProject,
    availableOrgs,
    availableProjects,
    isLoadingOrgs,
    isLoadingProjects,
    error,
    lastUpdated,

    // Actions
    setOrganization,
    setProject,
    clearScope,
    refreshScope,
    manualRefresh,
    getOrgId,
    getProjectId,
  }), [
    currentOrg,
    currentProject,
    availableOrgs,
    availableProjects,
    isLoadingOrgs,
    isLoadingProjects,
    error,
    lastUpdated,
    setOrganization,
    setProject,
    clearScope,
    refreshScope,
    manualRefresh,
    getOrgId,
    getProjectId,
  ]);

  return (
    <ScopeContext.Provider value={value}>
      {children}
    </ScopeContext.Provider>
  );
};

export default ScopeProvider;
