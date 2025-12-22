/**
 * ScopeContext - Enterprise Organization/Project Scope Management
 * 
 * Provides centralized state management for org/project selection across the app.
 * Ensures data isolation and prevents user errors by:
 * - Automatically clearing project when org changes
 * - Validating project belongs to selected org
 * - Integrating with unified sync manager
 */

import { createContext, useContext } from 'react';
import type { Organization } from '../services/organization';
import type { Project } from '../services/projects';

export interface ScopeState {
  // Current selections
  currentOrg: Organization | null;
  currentProject: Project | null;
  
  // Available options
  availableOrgs: Organization[];
  availableProjects: Project[];
  
  // Loading states
  isLoadingOrgs: boolean;
  isLoadingProjects: boolean;
  
  // Error handling
  error: string | null;
  
  // Metadata
  lastUpdated: Date | null;
}

export interface ScopeActions {
  // Primary actions
  setOrganization: (orgId: string | null) => Promise<void>;
  setProject: (projectId: string | null) => Promise<void>;
  
  // Utility actions
  clearScope: () => void;
  refreshScope: () => Promise<void>;
  
  // Getters for convenience
  getOrgId: () => string | null;
  getProjectId: () => string | null;
}

export interface ScopeContextValue extends ScopeState, ScopeActions {}

export const ScopeContext = createContext<ScopeContextValue | undefined>(undefined);

export const useScope = (): ScopeContextValue => {
  const context = useContext(ScopeContext);
  if (!context) {
    throw new Error('useScope must be used within ScopeProvider');
  }
  return context;
};

// Optional hook that doesn't throw if outside provider
export const useScopeOptional = (): ScopeContextValue | null => {
  return useContext(ScopeContext) ?? null;
};

export default ScopeContext;
