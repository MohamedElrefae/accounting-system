# Access Control Visual Diagrams

## 1. Access Priority Hierarchy

```
┌─────────────────────────────────────────────────────────────────┐
│                    USER SELECTS ORGANIZATION                    │
└────────────────────────────┬────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│  PRIORITY 1: Check org_memberships.can_access_all_projects      │
│                                                                 │
│  SELECT can_access_all_projects FROM org_memberships            │
│  WHERE org_id = ? AND user_id = auth.uid()                      │
└────────────────────────────┬────────────────────────────────────┘
                             │
                ┌────────────┴────────────┐
                │                         │
                ▼                         ▼
            TRUE ✅                   FALSE ❌
                │                         │
                │                         ▼
                │              ┌──────────────────────────────┐
                │              │ PRIORITY 2: Check            │
                │              │ project_memberships          │
                │              │                              │
                │              │ SELECT * FROM                │
                │              │ project_memberships          │
                │              │ WHERE user_id = auth.uid()   │
                │              └──────────────┬───────────────┘
                │                             │
                │                ┌────────────┴────────────┐
                │                │                         │
                │                ▼                         ▼
                │            HAS ENTRIES ✅           EMPTY ❌
                │                │                         │
                ▼                ▼                         ▼
        ┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
        │ SHOW ALL     │  │ SHOW ONLY    │  │ SHOW NOTHING     │
        │ PROJECTS     │  │ ASSIGNED     │  │ (ERROR MESSAGE)  │
        │ IN ORG       │  │ PROJECTS     │  │                  │
        └──────────────┘  └──────────────┘  └──────────────────┘
```

## 2. Access Decision Tree

```
START: User selects organization
  │
  ├─ Is user in org_memberships?
  │  ├─ NO → No access (error message)
  │  └─ YES → Continue
  │
  ├─ Is can_access_all_projects = true?
  │  ├─ YES → GRANT ACCESS TO ALL PROJECTS ✅
  │  │        (STOP - don't check project_memberships)
  │  │
  │  └─ NO → Continue to project-level check
  │
  ├─ Does user have project_memberships?
  │  ├─ YES → GRANT ACCESS TO THOSE PROJECTS ✅
  │  └─ NO → DENY ACCESS (error message) ❌
  │
END
```

## 3. Four User Scenarios

```
┌─────────────────────────────────────────────────────────────────┐
│ SCENARIO A: ADMIN USER (Org-level access wins)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ User: Alice                                                     │
│ ├─ org_memberships.can_access_all_projects = true ← PRIORITY 1 │
│ ├─ project_memberships = [proj-001, proj-002]                  │
│                                                                 │
│ Result: Alice sees ALL projects in organization                │
│ ├─ proj-001 ✅ (from org-level access)                         │
│ ├─ proj-002 ✅ (from org-level access)                         │
│ ├─ proj-003 ✅ (from org-level access - OVERRIDES no member)   │
│ └─ proj-004 ✅ (from org-level access - OVERRIDES no member)   │
│                                                                 │
│ Why: org_memberships.can_access_all_projects = true OVERRIDES  │
│      project_memberships                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SCENARIO B: PROJECT MANAGER (Project-level access)             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ User: Bob                                                       │
│ ├─ org_memberships.can_access_all_projects = false ← PRIORITY 1│
│ ├─ project_memberships = [proj-001, proj-002] ← PRIORITY 2     │
│                                                                 │
│ Result: Bob sees ONLY proj-001 and proj-002                    │
│ ├─ proj-001 ✅ (has project_membership)                        │
│ ├─ proj-002 ✅ (has project_membership)                        │
│ ├─ proj-003 ❌ (no project_membership - BLOCKED)               │
│ └─ proj-004 ❌ (no project_membership - BLOCKED)               │
│                                                                 │
│ Why: org-level access is false, so project_memberships is used │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SCENARIO C: NEW USER (No access)                               │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ User: Carol                                                     │
│ ├─ org_memberships.can_access_all_projects = false ← PRIORITY 1│
│ ├─ project_memberships = [] (empty) ← PRIORITY 2               │
│                                                                 │
│ Result: Carol sees NO projects                                 │
│ ├─ proj-001 ❌ (no project_membership)                         │
│ ├─ proj-002 ❌ (no project_membership)                         │
│ ├─ proj-003 ❌ (no project_membership)                         │
│ └─ proj-004 ❌ (no project_membership)                         │
│                                                                 │
│ UI: Dropdown disabled, error message shown                     │
│ Why: Both levels deny access                                   │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘

┌─────────────────────────────────────────────────────────────────┐
│ SCENARIO D: CONTRACTOR (Org-level access wins)                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ User: Dave                                                      │
│ ├─ org_memberships.can_access_all_projects = true ← PRIORITY 1 │
│ ├─ project_memberships = [proj-001]                            │
│                                                                 │
│ Result: Dave sees ALL projects in organization                 │
│ ├─ proj-001 ✅ (from org-level access)                         │
│ ├─ proj-002 ✅ (from org-level access - OVERRIDES no member)   │
│ ├─ proj-003 ✅ (from org-level access - OVERRIDES no member)   │
│ └─ proj-004 ✅ (from org-level access - OVERRIDES no member)   │
│                                                                 │
│ Why: org_memberships.can_access_all_projects = true OVERRIDES  │
│      project_memberships                                        │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 4. SQL Execution Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1: Get User's Org Membership                              │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ WITH user_org_access AS (                                      │
│   SELECT can_access_all_projects                               │
│   FROM org_memberships                                         │
│   WHERE org_id = ? AND user_id = auth.uid()                    │
│ )                                                               │
│                                                                 │
│ Result: can_access_all_projects = true/false                   │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ STEP 2: Get Candidate Projects                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ FROM projects p                                                │
│ WHERE p.org_id = ? AND p.status = 'active'                     │
│                                                                 │
│ Result: [proj-001, proj-002, proj-003, proj-004]               │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ STEP 3: Apply Access Control Logic                             │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ For each project:                                              │
│   ├─ Check CONDITION 1: can_access_all_projects = true?        │
│   │  ├─ YES → INCLUDE project (STOP)                           │
│   │  └─ NO → Continue to CONDITION 2                           │
│   │                                                             │
│   └─ Check CONDITION 2: can_access_all_projects = false        │
│      AND has project_membership?                               │
│      ├─ YES → INCLUDE project                                  │
│      └─ NO → EXCLUDE project                                   │
│                                                                 │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ RESULT: Filtered Project List                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Return projects that passed access control                     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 5. Component Behavior

```
┌─────────────────────────────────────────────────────────────────┐
│ ProjectSelector Component                                       │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ User selects organization                                      │
│   │                                                             │
│   ▼                                                             │
│ Call: getActiveProjectsByOrg(orgId)                            │
│   │                                                             │
│   ├─ Try: supabase.rpc('get_user_accessible_projects')         │
│   │  ├─ Success → Use RPC results                              │
│   │  └─ Fail → Fallback to direct query                        │
│   │                                                             │
│   ▼                                                             │
│ Check: hasProjects = projects.length > 0                       │
│   │                                                             │
│   ├─ YES (hasProjects = true)                                  │
│   │  ├─ Enable dropdown ✅                                     │
│   │  ├─ Show "All" option                                      │
│   │  ├─ Show project list                                      │
│   │  └─ No error message                                       │
│   │                                                             │
│   └─ NO (hasProjects = false)                                  │
│      ├─ Disable dropdown ❌                                    │
│      ├─ Hide "All" option                                      │
│      ├─ Show "No projects available" placeholder               │
│      └─ Show error message in RED:                             │
│         "No projects assigned to you in this organization"     │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 6. Database Schema Relationships

```
┌──────────────────────────┐
│   org_memberships        │
├──────────────────────────┤
│ id (PK)                  │
│ org_id (FK)              │
│ user_id (FK)             │
│ can_access_all_projects  │ ← KEY FIELD
│ created_at               │
│ updated_at               │
└──────────────────────────┘
         │
         │ (1:N)
         │
         ▼
┌──────────────────────────┐
│   organizations          │
├──────────────────────────┤
│ id (PK)                  │
│ code                     │
│ name                     │
│ created_at               │
└──────────────────────────┘
         │
         │ (1:N)
         │
         ▼
┌──────────────────────────┐
│   projects               │
├──────────────────────────┤
│ id (PK)                  │
│ org_id (FK)              │
│ code                     │
│ name                     │
│ status                   │
│ created_at               │
└──────────────────────────┘
         │
         │ (1:N)
         │
         ▼
┌──────────────────────────┐
│ project_memberships      │
├──────────────────────────┤
│ id (PK)                  │
│ project_id (FK)          │
│ org_id (FK)              │
│ user_id (FK)             │
│ created_at               │
└──────────────────────────┘

Access Check Flow:
1. User → org_memberships (check can_access_all_projects)
2. If false → project_memberships (check membership)
3. If true → projects (return all in org)
```

## 7. Security Enforcement Layers

```
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 1: Database Level (SECURITY DEFINER)                     │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ RPC Function: get_user_accessible_projects()                   │
│ ├─ Runs with SECURITY DEFINER (trusted execution)              │
│ ├─ Checks org_memberships.can_access_all_projects              │
│ ├─ Checks project_memberships                                  │
│ ├─ Uses auth.uid() (cannot be spoofed)                         │
│ └─ Returns only accessible projects                            │
│                                                                 │
│ ✅ CANNOT BE BYPASSED FROM UI                                  │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 2: Application Level (RLS Policies)                      │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ Row-Level Security Policies on projects table                  │
│ ├─ Additional protection at table level                        │
│ ├─ Prevents direct table access                                │
│ └─ Works alongside RPC function                                │
│                                                                 │
│ ✅ DEFENSE IN DEPTH                                            │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
                             │
                             ▼
┌─────────────────────────────────────────────────────────────────┐
│ LAYER 3: UI Level (Component Logic)                            │
├─────────────────────────────────────────────────────────────────┤
│                                                                 │
│ ProjectSelector Component                                      │
│ ├─ Disables dropdown when no projects                          │
│ ├─ Shows error message                                         │
│ ├─ Hides "All" option                                          │
│ └─ Provides user feedback                                      │
│                                                                 │
│ ⚠️ USER EXPERIENCE (not security)                              │
│                                                                 │
└─────────────────────────────────────────────────────────────────┘
```

## 8. Access Control Matrix

```
┌──────────────┬──────────────┬──────────────────┬──────────────────┐
│ User Type    │ Org Access   │ Project Members  │ Result           │
├──────────────┼──────────────┼──────────────────┼──────────────────┤
│ Admin        │ true         │ [] (empty)       │ Sees ALL projects│
│              │              │                  │ (org-level wins) │
├──────────────┼──────────────┼──────────────────┼──────────────────┤
│ PM           │ false        │ [A, B]           │ Sees A, B only   │
│              │              │                  │ (project-level)  │
├──────────────┼──────────────┼──────────────────┼──────────────────┤
│ New User     │ false        │ [] (empty)       │ Sees NO projects │
│              │              │                  │ (error message)  │
├──────────────┼──────────────┼──────────────────┼──────────────────┤
│ Contractor   │ true         │ [A]              │ Sees ALL projects│
│              │              │                  │ (org-level wins) │
└──────────────┴──────────────┴──────────────────┴──────────────────┘
```

## 9. Deployment Flow

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. Deploy RPC Function                                          │
├─────────────────────────────────────────────────────────────────┤
│ supabase/migrations/20260126_phase_2_get_user_accessible_...sql │
│ ├─ Creates get_user_accessible_projects() function             │
│ ├─ Sets SECURITY DEFINER                                       │
│ └─ Grants EXECUTE to authenticated users                       │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ 2. Update Component                                             │
├─────────────────────────────────────────────────────────────────┤
│ src/components/Organizations/ProjectSelector.tsx               │
│ ├─ Already updated to use RPC                                  │
│ ├─ Disables dropdown when no projects                          │
│ └─ Shows error message                                         │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ 3. Update Service                                               │
├─────────────────────────────────────────────────────────────────┤
│ src/services/projects.ts                                        │
│ ├─ Already updated to call RPC                                 │
│ ├─ Has fallback to direct query                                │
│ └─ Handles errors gracefully                                   │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ 4. Test                                                         │
├─────────────────────────────────────────────────────────────────┤
│ ├─ Admin user sees all projects                                │
│ ├─ PM user sees only assigned projects                         │
│ ├─ New user sees error message                                 │
│ └─ Contractor sees all projects                                │
└────────────────────────────┬────────────────────────────────────┘
                             │
┌────────────────────────────▼────────────────────────────────────┐
│ 5. Verify                                                       │
├─────────────────────────────────────────────────────────────────┤
│ ├─ All verification checklist items complete                   │
│ ├─ Security enforced at database level                         │
│ └─ Ready for production                                        │
└─────────────────────────────────────────────────────────────────┘
```

---

**All diagrams show the access control hierarchy and implementation details.**
