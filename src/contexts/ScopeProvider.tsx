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

  // Load projects for a specific org with retry mechanism and connectivity awareness
  const loadProjectsForOrg = useCallback(async (orgId: string, retryCount = 0): Promise<Project[]> => {
    if (useUnifiedAuth && authScopeData.isReady) {
      if (import.meta.env.DEV) console.log('[ScopeProvider] UnifiedAuth: Using projects from auth state for org:', orgId);
      const filteredProjects = authScopeData.projects.filter((p: Project) => p.org_id === orgId);
      setAvailableProjects(filteredProjects);

      // Handle project restoration logic
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

    // Unified check moved inside service calls

    setIsLoadingProjects(true);
    try {
      const projects = await getActiveProjectsByOrg(orgId);
      if (!mountedRef.current) return [];

      setAvailableProjects(projects);

      const storedProjectId = getStoredProjectId();
      const matchingProject = projects.find(p => p.id === storedProjectId);

      if (matchingProject) {
        setCurrentProject(matchingProject);
      } else {
        setCurrentProject(null);
        setStoredProjectId(null);
      }
      return projects;
    } catch (err) {
      if (import.meta.env.DEV && monitor.getHealth().isOnline) {
        console.error('[ScopeProvider] Failed to load projects:', err);
      }
      return [];
    } finally {
      if (mountedRef.current) {
        setIsLoadingProjects(false);
      }
    }
  }, [useUnifiedAuth, authScopeData]);

  // Load organizations with retry mechanism and connection awareness
  const loadOrganizations = useCallback(async (retryCount = 0) => {
    if (!mountedRef.current) return;

    const monitor = getConnectionMonitor();
    const isOnline = monitor.getHealth().isOnline;

    setIsLoadingOrgs(true);

    // 1. Try to initialize from unified auth data if ready
    if (useUnifiedAuth && authScopeData.isReady) {
      const orgs = authScopeData.organizations;
      setAvailableOrgs(orgs);

      const storedOrgId = getStoredOrgId();
      const matchingOrg = orgs.find((o: Organization) => o.id === (storedOrgId || authScopeData.defaultOrgId));
      const orgToSet = matchingOrg || orgs[0] || null;

      if (orgToSet) {
        setCurrentOrg(orgToSet);
        setStoredOrgId(orgToSet.id);
        await loadProjectsForOrg(orgToSet.id);
      }

      initializedFromAuthRef.current = true;
      setIsLoadingOrgs(false);
      setLastUpdated(new Date());
      return;
    }

    // Unified check moved inside service calls via getOrganizations()

    try {
      const orgs = await getOrganizations();
      if (!mountedRef.current) return;

      setAvailableOrgs(orgs);
      setError(null);
      setConnectionIssue(false);

      const storedOrgId = getStoredOrgId();
      const matchingOrg = orgs.find(o => o.id === storedOrgId);
      const orgToSet = matchingOrg || orgs[0] || null;

      if (orgToSet) {
        setCurrentOrg(orgToSet);
        setStoredOrgId(orgToSet.id);
        await loadProjectsForOrg(orgToSet.id);
      }

      setLastUpdated(new Date());
    } catch (err) {
      if (import.meta.env.DEV && monitor.getHealth().isOnline) {
        console.error('[ScopeProvider] Failed to load organizations:', err);
      }
      if (retryCount < 2 && monitor.getHealth().isOnline) {
        setTimeout(() => loadOrganizations(retryCount + 1), 2000);
      }
    } finally {
      if (mountedRef.current) {
        setIsLoadingOrgs(false);
      }
    }
  }, [loadProjectsForOrg, useUnifiedAuth, authScopeData]);

  // Load organizations on mount and monitor connection
  useEffect(() => {
    mountedRef.current = true;

    const monitor = getConnectionMonitor();
    const unsubscribe = monitor.subscribe((health) => {
      connectionHealthRef.current = health;
      if (health.isOnline && connectionIssueRef.current) {
        loadOrganizations();
      }
      connectionIssueRef.current = !health.isOnline;
      setConnectionIssue(!health.isOnline);
    });

    if (!useUnifiedAuth || !authScopeData.isReady) {
      loadOrganizations();
    }

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [loadOrganizations, useUnifiedAuth, authScopeData.isReady]);

  // Re-initialize if unified auth becomes ready late
  useEffect(() => {
    if (useUnifiedAuth && authScopeData.isReady && !initializedFromAuthRef.current) {
      loadOrganizations();
    }
  }, [useUnifiedAuth, authScopeData.isReady, loadOrganizations]);

  // Set organization - CLEARS PROJECT
  const setOrganization = useCallback(async (orgId: string | null) => {
    if (!orgId) {
      setCurrentOrg(null);
      setCurrentProject(null);
      setAvailableProjects([]);
      setStoredOrgId(null);
      setStoredProjectId(null);
      return;
    }

    const org = availableOrgs.find(o => o.id === orgId);
    if (!org) return;

    setCurrentOrg(org);
    setStoredOrgId(orgId);
    setCurrentProject(null);
    setStoredProjectId(null);

    await loadProjectsForOrg(orgId);

    queryClient.invalidateQueries({ queryKey: queryKeys.accounts.byOrg(orgId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.costCenters.byOrg(orgId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.categories.byOrg(orgId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.workItems.byOrg(orgId) });
    queryClient.invalidateQueries({ queryKey: queryKeys.analysisItems.byOrg(orgId) });

    setLastUpdated(new Date());
  }, [availableOrgs, loadProjectsForOrg, queryClient]);

  // Set project
  const setProject = useCallback(async (projectId: string | null) => {
    if (!projectId) {
      setCurrentProject(null);
      setStoredProjectId(null);
      return;
    }

    const project = availableProjects.find(p => p.id === projectId);
    if (!project || !currentOrg) return;

    setCurrentProject(project);
    setStoredProjectId(projectId);

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

  // Refresh scope
  const refreshScope = useCallback(async () => {
    await loadOrganizations();
  }, [loadOrganizations]);

  // Manual refresh
  const manualRefresh = useCallback(async () => {
    setError(null);
    setConnectionIssue(false);
    if (useUnifiedAuth) {
      await authScopeData.refresh();
      await loadOrganizations();
    } else {
      await loadOrganizations();
    }
  }, [loadOrganizations, useUnifiedAuth, authScopeData]);

  // Getters
  const getOrgId = useCallback(() => currentOrg?.id ?? null, [currentOrg]);
  const getProjectId = useCallback(() => currentProject?.id ?? null, [currentProject]);

  const value: ScopeContextValue = useMemo(() => ({
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
