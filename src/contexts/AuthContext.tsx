/**
 * Auth Context
 * 
 * Feature: enterprise-auth-performance-optimization
 * Provides authentication and permission checking functionality
 * with optimized batch operations and caching.
 */

import { createContext, useContext, type ReactNode } from 'react';

export interface AuthScope {
  orgId?: string;
  projectId?: string;
}

export interface AuthContextValue {
  user: any | null;
  permissions: Map<string, boolean>;
  roles: any[];
  organizations: any[];
  loading: boolean;
  error: string | null;
  
  // Single permission check
  checkPermission: (permission: string, action?: string, context?: Record<string, any>) => boolean;
  
  // Batch permission checks
  checkPermissionsBatch: (permissions: string[]) => Record<string, boolean>;
  
  // Refresh auth data
  refreshAuth: () => Promise<void>;
  
  // Performance metrics
  authLoadTime: number;
  cacheHitRate: number;
}

export const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export const useAuth = (): AuthContextValue => {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth must be used within AuthProvider');
  }
  return ctx;
};

export default AuthContext;
