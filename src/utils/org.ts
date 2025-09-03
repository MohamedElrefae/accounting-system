// Centralized helpers for org/project selection stored in localStorage
// Handles SSR/unsupported storage gracefully and exposes small helpers

const ORG_KEY = 'org_id'
const PROJECT_KEY = 'project_id'

export function getActiveOrgId(): string | null {
  try {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(ORG_KEY)
  } catch {
    return null
  }
}

export function setActiveOrgId(orgId: string | null): void {
  try {
    if (typeof window === 'undefined') return
    if (orgId) localStorage.setItem(ORG_KEY, orgId)
    else localStorage.removeItem(ORG_KEY)
  } catch {
    // ignore
  }
}

export function getActiveProjectId(): string | null {
  try {
    if (typeof window === 'undefined') return null
    return localStorage.getItem(PROJECT_KEY)
  } catch {
    return null
  }
}

export function setActiveProjectId(projectId: string | null): void {
  try {
    if (typeof window === 'undefined') return
    if (projectId) localStorage.setItem(PROJECT_KEY, projectId)
    else localStorage.removeItem(PROJECT_KEY)
  } catch {
    // ignore
  }
}
