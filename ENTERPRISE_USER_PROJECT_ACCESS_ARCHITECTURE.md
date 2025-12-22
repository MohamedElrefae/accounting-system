# Enterprise User-Project Access Control Architecture
## Technical Analysis & Implementation Plan

**Prepared by:** Senior Software Engineer  
**Date:** December 17, 2025  
**Status:** 📋 PROPOSAL FOR CEO REVIEW  
**Review Tool:** Perplexity AI

---

## Executive Summary

This document proposes an enterprise-grade User-Project access control system that extends the existing User-Organization isolation to include project-level permissions. This ensures users only see data for organizations AND projects they are explicitly assigned to.

---

## 1. Current State Analysis

### 1.1 Existing Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    CURRENT: Org-Level Isolation                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  user_profiles ──────┐                                          │
│       │              │                                          │
│       │         org_memberships                                 │
│       │              │                                          │
│       └──────────────┼──────────► organizations                 │
│                      │                   │                      │
│                      │                   │                      │
│                      │              projects (NO ACCESS CONTROL)│
│                      │                   │                      │
│                      └───────────────────┘                      │
│                                                                  │
│  ⚠️ PROBLEM: Users see ALL projects in their assigned orgs      │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 Current Tables

| Table | Purpose | Access Control |
|-------|---------|----------------|
| `user_profiles` | User information | Per-user |
| `org_memberships` | User ↔ Org assignment | ✅ Implemented |
| `organizations` | Organization data | Via org_memberships |
| `projects` | Project data | ❌ NO ACCESS CONTROL |

### 1.3 Problem Statement

Currently, when a user is assigned to an organization:
- They can see ALL projects in that organization
- They can access ALL data (transactions, reports, etc.) for ALL projects
- No granular project-level access control exists

**Business Risk:**
- Sensitive project data exposed to unauthorized users
- No audit trail for project access
- Compliance gaps for multi-project organizations

---

## 2. Proposed Architecture

### 2.1 New Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                 PROPOSED: Org + Project Isolation                │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  user_profiles ──────┬──────────────────────────────────────┐   │
│       │              │                                      │   │
│       │         org_memberships                    project_memberships
│       │              │                                      │   │
│       └──────────────┼──────────► organizations             │   │
│                      │                   │                  │   │
│                      │                   │                  │   │
│                      │              projects ◄──────────────┘   │
│                      │                   │                      │
│                      └───────────────────┘                      │
│                                                                  │
│  ✅ Users see ONLY projects they are explicitly assigned to     │
└─────────────────────────────────────────────────────────────────┘
```

### 2.2 Access Control Matrix

| User Type | Org Access | Project Access | Data Access |
|-----------|------------|----------------|-------------|
| Super Admin | All orgs | All projects | All data |
| Org Admin | Assigned orgs | All projects in org | All org data |
| Project Member | Assigned orgs | Assigned projects only | Project data only |
| Viewer | Assigned orgs | Assigned projects only | Read-only |

### 2.3 New Table: `project_memberships`

```sql
CREATE TABLE public.project_memberships (
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role varchar(50) DEFAULT 'member', -- 'admin', 'member', 'viewer'
  can_create boolean DEFAULT true,
  can_edit boolean DEFAULT true,
  can_delete boolean DEFAULT false,
  can_approve boolean DEFAULT false,
  is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id),
  PRIMARY KEY (project_id, user_id)
);
```

---

## 3. Implementation Options

### Option A: Strict Project Isolation (Recommended)
- Users MUST be assigned to specific projects
- No project = no access to any project data
- Most secure, best for compliance

### Option B: Org-Level Default with Project Override
- Users assigned to org see ALL projects by default
- Project memberships can RESTRICT access
- Less secure, easier migration

### Option C: Hybrid with "All Projects" Flag
- `org_memberships.can_access_all_projects` flag
- If true, user sees all projects in org
- If false, user only sees assigned projects
- Flexible, good for gradual rollout

**Recommendation:** Option C (Hybrid) for gradual migration, then transition to Option A.

---

## 4. Database Schema Changes

### 4.1 New Tables

```sql
-- Project memberships table
CREATE TABLE public.project_memberships (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  project_id uuid NOT NULL REFERENCES public.projects(id) ON DELETE CASCADE,
  user_id uuid NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  role varchar(50) DEFAULT 'member',
  can_create boolean DEFAULT true,
  can_edit boolean DEFAULT true,
  can_delete boolean DEFAULT false,
  can_approve boolean DEFAULT false,
  is_default boolean DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now(),
  created_by uuid REFERENCES public.user_profiles(id),
  UNIQUE (project_id, user_id)
);

-- Add flag to org_memberships for hybrid approach
ALTER TABLE public.org_memberships 
ADD COLUMN IF NOT EXISTS can_access_all_projects boolean DEFAULT true;
```

### 4.2 RLS Policies

```sql
-- Projects: Users see only assigned projects (or all if flag is true)
CREATE POLICY "Users see assigned projects" ON public.projects
FOR SELECT USING (
  -- Super admin sees all
  public.is_super_admin()
  OR
  -- User has org membership with all-projects access
  EXISTS (
    SELECT 1 FROM public.org_memberships om
    WHERE om.org_id = projects.org_id
      AND om.user_id = auth.uid()
      AND om.can_access_all_projects = true
  )
  OR
  -- User has specific project membership
  EXISTS (
    SELECT 1 FROM public.project_memberships pm
    WHERE pm.project_id = projects.id
      AND pm.user_id = auth.uid()
  )
);

-- Transactions: Filter by project membership
CREATE POLICY "Users see transactions for assigned projects" ON public.transactions
FOR SELECT USING (
  public.is_super_admin()
  OR
  -- Org-level access with all-projects flag
  EXISTS (
    SELECT 1 FROM public.org_memberships om
    WHERE om.org_id = transactions.org_id
      AND om.user_id = auth.uid()
      AND om.can_access_all_projects = true
  )
  OR
  -- Project-level access
  (
    transactions.project_id IS NULL -- Org-level transactions
    AND EXISTS (
      SELECT 1 FROM public.org_memberships om
      WHERE om.org_id = transactions.org_id
        AND om.user_id = auth.uid()
    )
  )
  OR
  EXISTS (
    SELECT 1 FROM public.project_memberships pm
    WHERE pm.project_id = transactions.project_id
      AND pm.user_id = auth.uid()
  )
);
```

---

## 5. Frontend Changes

### 5.1 ScopeProvider Updates

```typescript
// Update ScopeProvider to filter projects by user access
const loadProjectsForOrg = async (orgId: string) => {
  // Call new RPC that respects project_memberships
  const projects = await getAccessibleProjectsByOrg(orgId);
  setAvailableProjects(projects);
};
```

### 5.2 New Service Functions

```typescript
// src/services/projects.ts
export async function getAccessibleProjectsByOrg(orgId: string): Promise<Project[]> {
  const { data, error } = await supabase
    .rpc('get_user_accessible_projects', { p_org_id: orgId });
  if (error) throw error;
  return data || [];
}
```

### 5.3 Admin UI for Project Assignment

New admin page: `/admin/project-access`
- List users in organization
- Assign/remove users from projects
- Set project-level permissions

---

## 6. Migration Strategy

### Phase 1: Database Setup (Week 1)
1. Create `project_memberships` table
2. Add `can_access_all_projects` to `org_memberships`
3. Set default `can_access_all_projects = true` for existing users
4. Create RLS policies

### Phase 2: Admin UI (Week 2)
1. Create project assignment admin page
2. Add bulk assignment tools
3. Add audit logging

### Phase 3: Frontend Integration (Week 3)
1. Update ScopeProvider to use new RPC
2. Update all pages to respect project access
3. Add "no access" messaging

### Phase 4: Gradual Rollout (Week 4)
1. Start with new users (can_access_all_projects = false)
2. Migrate existing users organization by organization
3. Set can_access_all_projects = false for all

---

## 7. API Changes

### 7.1 New RPC Functions

```sql
-- Get projects user can access in an org
CREATE FUNCTION get_user_accessible_projects(p_org_id uuid)
RETURNS SETOF projects AS $$
  SELECT p.* FROM projects p
  WHERE p.org_id = p_org_id
    AND p.status = 'active'
    AND (
      public.is_super_admin()
      OR EXISTS (
        SELECT 1 FROM org_memberships om
        WHERE om.org_id = p_org_id
          AND om.user_id = auth.uid()
          AND om.can_access_all_projects = true
      )
      OR EXISTS (
        SELECT 1 FROM project_memberships pm
        WHERE pm.project_id = p.id
          AND pm.user_id = auth.uid()
      )
    )
  ORDER BY p.code;
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- Assign user to project
CREATE FUNCTION assign_user_to_project(
  p_user_id uuid,
  p_project_id uuid,
  p_role varchar DEFAULT 'member'
)
RETURNS project_memberships AS $$
DECLARE
  v_org_id uuid;
  v_result project_memberships;
BEGIN
  -- Get project's org
  SELECT org_id INTO v_org_id FROM projects WHERE id = p_project_id;
  
  -- Verify user is member of org
  IF NOT EXISTS (
    SELECT 1 FROM org_memberships 
    WHERE user_id = p_user_id AND org_id = v_org_id
  ) THEN
    RAISE EXCEPTION 'User must be member of organization first';
  END IF;
  
  -- Insert or update membership
  INSERT INTO project_memberships (project_id, user_id, org_id, role, created_by)
  VALUES (p_project_id, p_user_id, v_org_id, p_role, auth.uid())
  ON CONFLICT (project_id, user_id) DO UPDATE SET role = p_role
  RETURNING * INTO v_result;
  
  RETURN v_result;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;
```

---

## 8. Security Considerations

| Concern | Mitigation |
|---------|------------|
| Privilege escalation | RLS policies enforce access at DB level |
| Data leakage | All queries filtered by project_memberships |
| Audit trail | created_by and created_at on all assignments |
| Super admin bypass | Explicit is_super_admin() check |

---

## 9. Benefits Summary

| Benefit | Business Impact |
|---------|-----------------|
| Granular access control | Compliance with data privacy regulations |
| Project-level isolation | Sensitive project data protected |
| Audit trail | Track who has access to what |
| Flexible permissions | Different roles per project |
| Gradual migration | No disruption to existing users |

---

## 10. Estimated Timeline

| Phase | Duration | Effort |
|-------|----------|--------|
| Database schema | 2 days | Low |
| RLS policies | 2 days | Medium |
| Admin UI | 3 days | Medium |
| Frontend integration | 2 days | Low |
| Testing | 2 days | Medium |
| **Total** | **~2 weeks** | **Medium** |

---

## 11. Approval Request

Please review this proposal and provide:
1. ✅ Approval to proceed with Option C (Hybrid)
2. ❌ Rejection with feedback
3. 🔄 Request for modifications

**Questions for CEO:**
1. Should we use Option A (strict) or Option C (hybrid)?
2. Should existing users default to "all projects" access?
3. Priority: Security vs. ease of migration?

---

*Document prepared for CEO review via Perplexity AI*
