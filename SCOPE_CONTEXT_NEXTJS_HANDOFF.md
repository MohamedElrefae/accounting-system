# Scope Context Service Replication Handoff (React/Vite -> Next.js App Router)

> **Purpose**: This is a **single-file handoff** you can attach to an AI agent to replicate the existing **Scope Context Service** (org/project selection + data loading) from the current repo into a **new Next.js App Router** app.
>
> This doc is based on the actual implementation in:
> - `src/contexts/ScopeContext.tsx`
> - `src/contexts/ScopeProvider.tsx`
> and its dependencies:
> - `src/services/organization.ts`
> - `src/services/projects.ts`
> - `src/utils/connectionMonitor.ts`
> - `src/lib/queryKeys.ts` (for React Query invalidation)

---

## 1) What the Service Does (Behavioral Contract)

The Scope Context Service provides **global, centralized scope state** across the app:

- **Org scope**: selected organization (`currentOrg`)
- **Project scope**: selected project (`currentProject`)

It manages:
- Loading **available orgs** from Supabase.
- Loading **available projects** filtered by selected org.
- Persisting selections in **localStorage**.
- Auto-restoring scope on reload.
- Auto-selecting a default org when none is stored.
- **Critical invariant**: when org changes, **project must be cleared**.
- Retry logic and connection monitoring.

### Must-have invariants
- `setOrganization(orgId)` always clears `currentProject` and stored `project_id`.
- Stored `project_id` is only restored if it is found in `availableProjects` for the selected org.
- If stored `org_id` is invalid, pick first org (if any) and persist it.

---

## 2) Current Repo Source-of-Truth Summary

### 2.1 Context types and hooks
File: `src/contexts/ScopeContext.tsx`

Exports:
- `ScopeContext`
- `useScope()` (throws if used outside provider)
- `useScopeOptional()` (returns null if used outside provider)

`ScopeContextValue` includes:

**State**
- `currentOrg: Organization | null`
- `currentProject: Project | null`
- `availableOrgs: Organization[]`
- `availableProjects: Project[]`
- `isLoadingOrgs: boolean`
- `isLoadingProjects: boolean`
- `error: string | null`
- `lastUpdated: Date | null`

**Actions**
- `setOrganization(orgId: string | null): Promise<void>`
- `setProject(projectId: string | null): Promise<void>`
- `clearScope(): void`
- `refreshScope(): Promise<void>`
- `manualRefresh(): Promise<void>`
- `getOrgId(): string | null`
- `getProjectId(): string | null`

### 2.2 Provider behavior
File: `src/contexts/ScopeProvider.tsx`

- On mount:
  - set up connection monitoring via `getConnectionMonitor()`
  - subscribe to connection changes:
    - when connection is restored and there were prior issues, trigger `loadOrganizations()`
  - trigger initial `loadOrganizations()`

- `loadOrganizations(retryCount)`:
  - if connection offline, set error and skip
  - fetch org list via `getOrganizations()`
  - restore stored `org_id` if valid, else select first org
  - load projects for that org via `loadProjectsForOrg(orgId)`

- `loadProjectsForOrg(orgId, retryCount)`:
  - fetch via `getActiveProjectsByOrg(orgId)`
  - restore stored `project_id` if valid for the returned list
  - else clear project and storage

- `setOrganization(orgId)`:
  - if null: clear scope + storage
  - validate org exists
  - set org + store `org_id`
  - **clear project** + store `null`
  - load projects for org
  - invalidate org-scoped react-query caches

- `setProject(projectId)`:
  - if null: clear project + storage
  - validate project exists in `availableProjects`
  - set project + store
  - invalidate project-scoped caches (subset)

- `manualRefresh()`:
  - clears error/connectionIssue then `loadOrganizations()`

### 2.3 Storage keys
The provider uses these exact keys:
- `org_id`
- `project_id`

---

## 3) Next.js App Router Replication Plan

### 3.1 Key Next.js constraints
- `localStorage`, `navigator.onLine`, `window.addEventListener` are **client-only**.
- Therefore the Scope Provider must be a **Client Component** (`'use client'`).

To replicate current behavior most closely, fetch orgs/projects using **Supabase JS from the browser** (client-side).

---

## 4) Target File Structure (Next.js)

Create these files:

```
src/
  app/
    layout.tsx
    providers.tsx
  contexts/
    ScopeContext.tsx
    ScopeProvider.tsx
  services/
    organization.ts
    projects.ts
  utils/
    connectionMonitor.ts
    supabase/
      client.ts
  lib/
    queryKeys.ts   (optional; only if using React Query)
```

---

## 5) Environment Variables

Use environment variables (never hardcode):

- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

---

## 6) Code Skeletons (Copy into New App)

> Note: code below is intentionally close to the original behavior.

### 6.1 `src/utils/supabase/client.ts`

```ts
import { createClient } from '@supabase/supabase-js';

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url) throw new Error('Missing NEXT_PUBLIC_SUPABASE_URL');
if (!anonKey) throw new Error('Missing NEXT_PUBLIC_SUPABASE_ANON_KEY');

export const supabase = createClient(url, anonKey);
```

### 6.2 `src/utils/connectionMonitor.ts`

```ts
'use client';

import React from 'react';
import { supabase } from './supabase/client';

export interface ConnectionHealth {
  isOnline: boolean;
  latency: number | null;
  lastCheck: Date;
  error: string | null;
}

class ConnectionMonitor {
  private health: ConnectionHealth = {
    isOnline: typeof navigator !== 'undefined' ? navigator.onLine : true,
    latency: null,
    lastCheck: new Date(),
    error: null,
  };

  private listeners: Set<(health: ConnectionHealth) => void> = new Set();
  private checkInterval: ReturnType<typeof setInterval> | null = null;
  private isChecking = false;

  constructor() {
    window.addEventListener('online', this.handleOnline);
    window.addEventListener('offline', this.handleOffline);
    this.startPeriodicChecks();
  }

  private handleOnline = () => {
    this.updateHealth({ isOnline: true, error: null });
    this.checkConnection();
  };

  private handleOffline = () => {
    this.updateHealth({ isOnline: false, error: 'Network offline' });
  };

  private startPeriodicChecks() {
    this.checkInterval = setInterval(() => {
      if (!this.isChecking && this.health.isOnline) {
        this.checkConnection();
      }
    }, 30000);
  }

  private async checkConnection(): Promise<void> {
    if (this.isChecking) return;

    this.isChecking = true;
    const startTime = performance.now();

    try {
      const timeoutPromise = new Promise((_, reject) =>
        setTimeout(() => reject(new Error('Connection timeout')), 5000)
      );

      const queryPromise = supabase.from('organizations').select('id').limit(1);

      const { error } = (await Promise.race([queryPromise, timeoutPromise])) as any;

      const latency = performance.now() - startTime;

      if (error) throw error;

      this.updateHealth({
        isOnline: true,
        latency: Math.round(latency),
        error: null,
      });
    } catch (e: any) {
      this.updateHealth({
        isOnline: false,
        latency: null,
        error: e?.message || 'Connection failed',
      });
    } finally {
      this.isChecking = false;
    }
  }

  private updateHealth(updates: Partial<ConnectionHealth>) {
    this.health = {
      ...this.health,
      ...updates,
      lastCheck: new Date(),
    };

    this.listeners.forEach((listener) => listener({ ...this.health }));
  }

  public subscribe(listener: (health: ConnectionHealth) => void): () => void {
    this.listeners.add(listener);
    listener({ ...this.health });

    return () => {
      this.listeners.delete(listener);
    };
  }

  public getHealth(): ConnectionHealth {
    return { ...this.health };
  }

  public destroy() {
    if (this.checkInterval) {
      clearInterval(this.checkInterval);
      this.checkInterval = null;
    }

    window.removeEventListener('online', this.handleOnline);
    window.removeEventListener('offline', this.handleOffline);
    this.listeners.clear();
  }
}

let connectionMonitor: ConnectionMonitor | null = null;

export const getConnectionMonitor = (): ConnectionMonitor => {
  if (!connectionMonitor) {
    connectionMonitor = new ConnectionMonitor();
  }
  return connectionMonitor;
};

export const useConnectionHealth = () => {
  const [health, setHealth] = React.useState<ConnectionHealth>(() =>
    getConnectionMonitor().getHealth()
  );

  React.useEffect(() => {
    const unsubscribe = getConnectionMonitor().subscribe(setHealth);
    return () => unsubscribe();
  }, []);

  return health;
};
```

### 6.3 `src/services/organization.ts`

```ts
'use client';

import { supabase } from '../utils/supabase/client';

export interface Organization {
  id: string;
  code: string;
  name: string;
  name_ar?: string | null;
  is_active?: boolean;
  created_at?: string;
}

const CACHE_KEY = 'organizations_cache';
const CACHE_DURATION = 5 * 60 * 1000;

interface CacheEntry {
  data: Organization[];
  timestamp: number;
}

function validateCacheEntry(entry: CacheEntry): boolean {
  if (!entry || typeof entry !== 'object') return false;
  if (!Array.isArray(entry.data)) return false;
  if (typeof entry.timestamp !== 'number') return false;
  if (Date.now() - entry.timestamp > CACHE_DURATION) return false;
  if (entry.data.length === 0) return false;

  return entry.data.every(
    (item) =>
      item &&
      typeof item === 'object' &&
      typeof item.id === 'string' &&
      typeof item.code === 'string' &&
      typeof item.name === 'string'
  );
}

function getCachedOrganizations(): Organization[] | null {
  try {
    const cached = localStorage.getItem(CACHE_KEY);
    if (!cached) return null;

    const entry: CacheEntry = JSON.parse(cached);

    if (!validateCacheEntry(entry)) {
      localStorage.removeItem(CACHE_KEY);
      return null;
    }

    return entry.data;
  } catch {
    try {
      localStorage.removeItem(CACHE_KEY);
    } catch {}
    return null;
  }
}

function setCachedOrganizations(data: Organization[]): void {
  try {
    if (!Array.isArray(data) || data.length === 0) return;
    const entry: CacheEntry = { data, timestamp: Date.now() };
    localStorage.setItem(CACHE_KEY, JSON.stringify(entry));
  } catch {
    // ignore
  }
}

const withRetry = async <T,>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error?.status >= 400 && error?.status < 500) throw error;
      if (attempt === maxRetries) throw error;
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('Max retries exceeded');
};

export async function getOrganizations(): Promise<Organization[]> {
  const cached = getCachedOrganizations();
  if (cached) return cached;

  try {
    const { data, error } = await withRetry(() =>
      supabase
        .from('organizations')
        .select('id, code, name, name_ar, is_active, created_at')
        .eq('is_active', true)
        .order('code', { ascending: true })
        .limit(50)
    );

    if (error) throw error;

    const orgs = (data as Organization[]) || [];
    setCachedOrganizations(orgs);
    return orgs;
  } catch {
    return [];
  }
}
```

### 6.4 `src/services/projects.ts`

```ts
'use client';

import { supabase } from '../utils/supabase/client';

export interface Project {
  id: string;
  code: string;
  name: string;
  org_id?: string | null;
  status?: string | null;
}

const withRetry = async <T,>(
  fn: () => Promise<T>,
  maxRetries = 3,
  baseDelay = 1000
): Promise<T> => {
  for (let attempt = 0; attempt <= maxRetries; attempt++) {
    try {
      return await fn();
    } catch (error: any) {
      if (error?.status >= 400 && error?.status < 500) throw error;
      if (attempt === maxRetries) throw error;
      const delay = baseDelay * Math.pow(2, attempt) + Math.random() * 1000;
      await new Promise((r) => setTimeout(r, delay));
    }
  }
  throw new Error('Max retries exceeded');
};

export async function getActiveProjectsByOrg(orgId: string): Promise<Project[]> {
  try {
    // 1) Prefer RPC (if exists)
    try {
      const { data, error } = await withRetry(
        () => supabase.rpc('get_user_accessible_projects', { p_org_id: orgId }),
        2,
        500
      );

      if (!error && data) return (data as Project[]) || [];
    } catch {
      // ignore -> fallback
    }

    // 2) Fallback direct query
    const { data, error } = await withRetry(() =>
      supabase
        .from('projects')
        .select('*')
        .eq('status', 'active')
        .eq('org_id', orgId)
        .order('code', { ascending: true })
    );

    if (error) throw error;
    return (data as Project[]) || [];
  } catch {
    return [];
  }
}
```

### 6.5 `src/contexts/ScopeContext.tsx`

```tsx
'use client';

import { createContext, useContext } from 'react';
import type { Organization } from '../services/organization';
import type { Project } from '../services/projects';

export interface ScopeState {
  currentOrg: Organization | null;
  currentProject: Project | null;

  availableOrgs: Organization[];
  availableProjects: Project[];

  isLoadingOrgs: boolean;
  isLoadingProjects: boolean;

  error: string | null;
  lastUpdated: Date | null;
}

export interface ScopeActions {
  setOrganization: (orgId: string | null) => Promise<void>;
  setProject: (projectId: string | null) => Promise<void>;

  clearScope: () => void;
  refreshScope: () => Promise<void>;
  manualRefresh: () => Promise<void>;

  getOrgId: () => string | null;
  getProjectId: () => string | null;
}

export interface ScopeContextValue extends ScopeState, ScopeActions {}

export const ScopeContext = createContext<ScopeContextValue | undefined>(undefined);

export const useScope = (): ScopeContextValue => {
  const ctx = useContext(ScopeContext);
  if (!ctx) throw new Error('useScope must be used within ScopeProvider');
  return ctx;
};

export const useScopeOptional = (): ScopeContextValue | null => {
  return useContext(ScopeContext) ?? null;
};
```

### 6.6 `src/contexts/ScopeProvider.tsx`

> If you use React Query in Next.js, add invalidations like the original.
> If you don’t use React Query, remove query invalidation and rely on consumers.

```tsx
'use client';

import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { ScopeContext, type ScopeContextValue } from './ScopeContext';
import { getOrganizations, type Organization } from '../services/organization';
import { getActiveProjectsByOrg, type Project } from '../services/projects';
import { getConnectionMonitor, type ConnectionHealth } from '../utils/connectionMonitor';

const ORG_KEY = 'org_id';
const PROJECT_KEY = 'project_id';

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
    // ignore
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
    // ignore
  }
}

export const ScopeProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const mountedRef = useRef(true);
  const connectionHealthRef = useRef<ConnectionHealth | null>(null);
  const connectionIssueRef = useRef(false);

  const [currentOrg, setCurrentOrg] = useState<Organization | null>(null);
  const [currentProject, setCurrentProject] = useState<Project | null>(null);
  const [availableOrgs, setAvailableOrgs] = useState<Organization[]>([]);
  const [availableProjects, setAvailableProjects] = useState<Project[]>([]);
  const [isLoadingOrgs, setIsLoadingOrgs] = useState(true);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [lastUpdated, setLastUpdated] = useState<Date | null>(null);
  const [_connectionIssue, setConnectionIssue] = useState(false);

  const loadProjectsForOrg = useCallback(async (orgId: string, retryCount = 0): Promise<Project[]> => {
    setIsLoadingProjects(true);

    try {
      const projects = await getActiveProjectsByOrg(orgId);
      if (!mountedRef.current) return projects;

      setAvailableProjects(projects);

      const storedProjectId = getStoredProjectId();
      const matchingProject = projects.find((p) => p.id === storedProjectId);

      if (matchingProject) {
        setCurrentProject(matchingProject);
      } else {
        setCurrentProject(null);
        setStoredProjectId(null);
      }

      return projects;
    } catch {
      if (retryCount < 2) {
        setTimeout(() => {
          loadProjectsForOrg(orgId, retryCount + 1);
        }, 1000 * (retryCount + 1));
        return [];
      }

      if (mountedRef.current) {
        setAvailableProjects([]);
        setCurrentProject(null);
      }

      return [];
    } finally {
      if (mountedRef.current) setIsLoadingProjects(false);
    }
  }, []);

  const loadOrganizations = useCallback(
    async (retryCount = 0) => {
      const connectionHealth = connectionHealthRef.current;
      if (connectionHealth && !connectionHealth.isOnline) {
        setConnectionIssue(true);
        setError('Connection issues detected. Retrying when connection is restored...');
        return;
      }

      setIsLoadingOrgs(true);
      setError(null);
      setConnectionIssue(false);

      try {
        const orgs = await getOrganizations();
        if (!mountedRef.current) return;

        setAvailableOrgs(orgs);

        const storedOrgId = getStoredOrgId();
        const matchingOrg = orgs.find((o) => o.id === storedOrgId);

        if (matchingOrg) {
          setCurrentOrg(matchingOrg);
          await loadProjectsForOrg(matchingOrg.id);
        } else if (orgs.length > 0) {
          setCurrentOrg(orgs[0]);
          setStoredOrgId(orgs[0].id);
          await loadProjectsForOrg(orgs[0].id);
        }

        setLastUpdated(new Date());
      } catch {
        if (retryCount < 2) {
          setTimeout(() => {
            loadOrganizations(retryCount + 1);
          }, 1000 * (retryCount + 1));
          return;
        }

        if (mountedRef.current) {
          setError('Failed to load organizations after multiple attempts');
          setAvailableOrgs([]);
          setCurrentOrg(null);
          setCurrentProject(null);
          setAvailableProjects([]);
        }
      } finally {
        if (mountedRef.current) setIsLoadingOrgs(false);
      }
    },
    [loadProjectsForOrg]
  );

  useEffect(() => {
    mountedRef.current = true;

    const monitor = getConnectionMonitor();
    connectionHealthRef.current = monitor.getHealth();

    const unsubscribe = monitor.subscribe((health) => {
      connectionHealthRef.current = health;

      if (health.isOnline && connectionIssueRef.current) {
        loadOrganizations();
      }

      const nextIssue = !health.isOnline;
      connectionIssueRef.current = nextIssue;
      setConnectionIssue(nextIssue);
    });

    loadOrganizations();

    return () => {
      mountedRef.current = false;
      unsubscribe();
    };
  }, [loadOrganizations]);

  const setOrganization = useCallback(
    async (orgId: string | null) => {
      if (!orgId) {
        setCurrentOrg(null);
        setCurrentProject(null);
        setAvailableProjects([]);
        setStoredOrgId(null);
        setStoredProjectId(null);
        return;
      }

      const org = availableOrgs.find((o) => o.id === orgId);
      if (!org) return;

      setCurrentOrg(org);
      setStoredOrgId(orgId);

      // CRITICAL: clear project on org change
      setCurrentProject(null);
      setStoredProjectId(null);

      await loadProjectsForOrg(orgId);
      setLastUpdated(new Date());
    },
    [availableOrgs, loadProjectsForOrg]
  );

  const setProject = useCallback(
    async (projectId: string | null) => {
      if (!projectId) {
        setCurrentProject(null);
        setStoredProjectId(null);
        return;
      }

      const project = availableProjects.find((p) => p.id === projectId);
      if (!project) return;

      setCurrentProject(project);
      setStoredProjectId(projectId);
      setLastUpdated(new Date());
    },
    [availableProjects]
  );

  const clearScope = useCallback(() => {
    setCurrentOrg(null);
    setCurrentProject(null);
    setAvailableProjects([]);
    setStoredOrgId(null);
    setStoredProjectId(null);
  }, []);

  const refreshScope = useCallback(async () => {
    try {
      await loadOrganizations();
    } catch {
      setError('Failed to refresh data');
    }
  }, [loadOrganizations]);

  const manualRefresh = useCallback(async () => {
    setError(null);
    setConnectionIssue(false);
    await loadOrganizations();
  }, [loadOrganizations]);

  const getOrgId = useCallback(() => currentOrg?.id ?? null, [currentOrg]);
  const getProjectId = useCallback(() => currentProject?.id ?? null, [currentProject]);

  const value: ScopeContextValue = useMemo(
    () => ({
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
    }),
    [
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
    ]
  );

  return <ScopeContext.Provider value={value}>{children}</ScopeContext.Provider>;
};
```

### 6.7 `src/app/providers.tsx` (wrap the app)

```tsx
'use client';

import React from 'react';
import { ScopeProvider } from '../contexts/ScopeProvider';

export default function Providers({ children }: { children: React.ReactNode }) {
  return <ScopeProvider>{children}</ScopeProvider>;
}
```

### 6.8 `src/app/layout.tsx`

```tsx
import Providers from './providers';

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
```

---

## 7) Test Checklist (Quick Manual)

- Reload app:
  - org auto-selected if no storage
  - org restored if stored
- Change org:
  - project immediately cleared
  - projects list reloads
- Change project:
  - must only accept projects from that org list
- Offline mode:
  - scope load sets error message
  - going back online triggers reload

---

## 8) Questions to Confirm in the New App

- Are you using Supabase Auth in Next.js? (If yes, confirm session handling; may require SSR helpers.)
- Do you want React Query in the new app as well? (If yes, replicate invalidation logic as in the current provider.)
