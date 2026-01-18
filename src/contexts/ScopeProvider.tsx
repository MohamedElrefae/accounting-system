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
  
  // State
  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [availableOrgs, setAvailableOrgs] = useState<Organization[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [connectionIssue, setConnectionIssue] = useState<boolean>(false);

  // Load projects for a specific org with retry mechanism
  const loadProjectsForOrg = useCallback(async (orgId: string, retryCount = 0): Promise<Project[]> => {
    if (import.meta.env.DEV) console.log('[ScopeProvider] Loading projects for org:', orgId, { retryCount });
    setIsLoadingProjects(true);
    
    try {
      const projects = await getActiveProjectsByOrg(orgId);
      if (import.meta.env.DEV) console.log('[ScopeProvider] Loaded projects:', projects.length);
      
      if (!mountedRef.current) return projects;
      
      setAvailableProjects(projects);
      
      // Restore project from localStorage if valid
      const storedProjectId = getStoredProjectId();
      const matchingProject = projects.find(p => p.id === storedProjectId);
      
      if (matchingProject) {
        if (import.meta.env.DEV) console.log('[ScopeProvider] Restored project from storage:', matchingProject.code);
        setCurrentProject(matchingProject);
      } else {
        setCurrentProject(null);
        setStoredProjectId(null);
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
      if (health.isOnline && connectionIssue) {
        if (import.meta.env.DEV) console.log('[ScopeProvider] Connection restored, reloading data...');
        loadOrganizations();
      }
      
      // Update connection issue state
      setConnectionIssue(!health.isOnline);
    });
    
    // Initial load
    loadOrganizations();
    
    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [loadOrganizations, connectionIssue]);

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

  // Set project - validates org ownership
  const setProject = useCallback(async (projectId: string | null) => {
    if (import.meta.env.DEV) console.log('[ScopeProvider] setProject:', projectId);
    
    if (!projectId) {
      setCurrentProject(null);
      setStoredProjectId(null);
      return;
    }
    
    // Validate project belongs to current org
    const project = availableProjects.find(p => p.id === projectId);
    if (!project) {
      console.error('[ScopeProvider] Invalid project ID or project not in current org:', projectId);
      return;
    }
    
    setCurrentProject(project);
    setStoredProjectId(projectId);
    
    // Invalidate project-scoped queries
    if (currentOrg) {
      queryClient.invalidateQueries({ 
        queryKey: queryKeys.costCenters.byOrg(currentOrg.id, projectId) 
      });
    }
    
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
    await loadOrganizations();
  }, [loadOrganizations]);

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
