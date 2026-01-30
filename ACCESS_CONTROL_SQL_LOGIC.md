# Access Control SQL Logic - Detailed Breakdown

## The RPC Function Logic

### Full SQL Implementation

```sql
CREATE FUNCTION get_user_accessible_projects(p_org_id uuid)
RETURNS TABLE(...)
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $
  WITH user_org_access AS (
    -- Step 1: Get user's org membership record
    SELECT 
      om.can_access_all_projects,
      om.org_id
    FROM org_memberships om
    WHERE om.org_id = p_org_id
      AND om.user_id = auth.uid()
  )
  SELECT 
    p.id, p.org_id, p.code, p.name, p.description, 
    p.status, p.budget_amount, p.start_date, p.end_date,
    p.created_at, p.updated_at
  FROM projects p
  WHERE p.org_id = p_org_id
    AND p.status = 'active'
    AND (
      -- CONDITION 1: Org-level access (PRIORITY 1)
      (SELECT can_access_all_projects FROM user_org_access) = true
      OR
      -- CONDITION 2: Project-level access (PRIORITY 2)
      (
        (SELECT can_access_all_projects FROM user_org_access) = false
        AND EXISTS (
          SELECT 1 FROM project_memberships pm
          WHERE pm.project_id = p.id
            AND pm.user_id = auth.uid()
            AND pm.org_id = p_org_id
        )
      )
    )
  ORDER BY p.code ASC;
$;
```

## Step-by-Step Execution

### Step 1: Get User's Org Membership
```sql
WITH user_org_access AS (
  SELECT 
    om.can_access_all_projects,
    om.org_id
  FROM org_memberships om
  WHERE om.org_id = p_org_id
    AND om.user_id = auth.uid()
)
```

**What happens:**
- Queries `org_memberships` table for current user
- Filters by organization ID
- Extracts `can_access_all_projects` flag
- Result: Single row with flag value (true/false) or NULL if no membership

**Example:**
```
Input: org_id = 'org-123', user_id = 'user-456'

Result:
┌─────────────────────────┬────────┐
│ can_access_all_projects │ org_id │
├─────────────────────────┼────────┤
│ true                    │ org-123│
└─────────────────────────┴────────┘
```

### Step 2: Filter Projects by Organization and Status
```sql
FROM projects p
WHERE p.org_id = p_org_id
  AND p.status = 'active'
```

**What happens:**
- Gets all active projects in the organization
- Filters out inactive/completed projects
- Creates candidate list for access check

**Example:**
```
Input: org_id = 'org-123'

Candidate projects:
┌──────────┬──────────┬────────┐
│ id       │ code     │ status │
├──────────┼──────────┼────────┤
│ proj-001 │ PROJ-A   │ active │
│ proj-002 │ PROJ-B   │ active │
│ proj-003 │ PROJ-C   │ active │
│ proj-004 │ PROJ-D   │ active │
└──────────┴──────────┴────────┘
```

### Step 3: Apply Access Control Logic
```sql
AND (
  -- CONDITION 1: Org-level access (PRIORITY 1)
  (SELECT can_access_all_projects FROM user_org_access) = true
  OR
  -- CONDITION 2: Project-level access (PRIORITY 2)
  (
    (SELECT can_access_all_projects FROM user_org_access) = false
    AND EXISTS (
      SELECT 1 FROM project_memberships pm
      WHERE pm.project_id = p.id
        AND pm.user_id = auth.uid()
        AND pm.org_id = p_org_id
    )
  )
)
```

**Logic Flow:**

```
For each project in candidates:
  ├─ Check CONDITION 1: can_access_all_projects = true?
  │  ├─ YES → INCLUDE project (STOP checking)
  │  └─ NO → Continue to CONDITION 2
  │
  └─ Check CONDITION 2: can_access_all_projects = false AND has project_membership?
     ├─ YES → INCLUDE project
     └─ NO → EXCLUDE project
```

## Execution Examples

### Example 1: Admin User (can_access_all_projects = true)

**Setup:**
```sql
-- org_memberships
INSERT INTO org_memberships (org_id, user_id, can_access_all_projects)
VALUES ('org-123', 'user-admin', true);

-- project_memberships (empty - admin doesn't need explicit assignments)
-- (no rows)
```

**Execution:**
```
Step 1: Get org membership
  can_access_all_projects = true ✅

Step 2: Get candidate projects
  proj-001, proj-002, proj-003, proj-004

Step 3: Apply access control
  For proj-001:
    CONDITION 1: can_access_all_projects = true? YES ✅ → INCLUDE
  
  For proj-002:
    CONDITION 1: can_access_all_projects = true? YES ✅ → INCLUDE
  
  For proj-003:
    CONDITION 1: can_access_all_projects = true? YES ✅ → INCLUDE
  
  For proj-004:
    CONDITION 1: can_access_all_projects = true? YES ✅ → INCLUDE

Result: [proj-001, proj-002, proj-003, proj-004]
```

### Example 2: Project Manager (can_access_all_projects = false)

**Setup:**
```sql
-- org_memberships
INSERT INTO org_memberships (org_id, user_id, can_access_all_projects)
VALUES ('org-123', 'user-pm', false);

-- project_memberships
INSERT INTO project_memberships (project_id, org_id, user_id)
VALUES 
  ('proj-001', 'org-123', 'user-pm'),
  ('proj-002', 'org-123', 'user-pm');
```

**Execution:**
```
Step 1: Get org membership
  can_access_all_projects = false ✅

Step 2: Get candidate projects
  proj-001, proj-002, proj-003, proj-004

Step 3: Apply access control
  For proj-001:
    CONDITION 1: can_access_all_projects = true? NO
    CONDITION 2: can_access_all_projects = false AND has membership?
      can_access_all_projects = false? YES ✅
      has project_membership? YES ✅ → INCLUDE
  
  For proj-002:
    CONDITION 1: can_access_all_projects = true? NO
    CONDITION 2: can_access_all_projects = false AND has membership?
      can_access_all_projects = false? YES ✅
      has project_membership? YES ✅ → INCLUDE
  
  For proj-003:
    CONDITION 1: can_access_all_projects = true? NO
    CONDITION 2: can_access_all_projects = false AND has membership?
      can_access_all_projects = false? YES ✅
      has project_membership? NO ❌ → EXCLUDE
  
  For proj-004:
    CONDITION 1: can_access_all_projects = true? NO
    CONDITION 2: can_access_all_projects = false AND has membership?
      can_access_all_projects = false? YES ✅
      has project_membership? NO ❌ → EXCLUDE

Result: [proj-001, proj-002]
```

### Example 3: New User (can_access_all_projects = false, no memberships)

**Setup:**
```sql
-- org_memberships
INSERT INTO org_memberships (org_id, user_id, can_access_all_projects)
VALUES ('org-123', 'user-new', false);

-- project_memberships (empty)
-- (no rows)
```

**Execution:**
```
Step 1: Get org membership
  can_access_all_projects = false ✅

Step 2: Get candidate projects
  proj-001, proj-002, proj-003, proj-004

Step 3: Apply access control
  For proj-001:
    CONDITION 1: can_access_all_projects = true? NO
    CONDITION 2: can_access_all_projects = false AND has membership?
      can_access_all_projects = false? YES ✅
      has project_membership? NO ❌ → EXCLUDE
  
  For proj-002:
    CONDITION 1: can_access_all_projects = true? NO
    CONDITION 2: can_access_all_projects = false AND has membership?
      can_access_all_projects = false? YES ✅
      has project_membership? NO ❌ → EXCLUDE
  
  For proj-003:
    CONDITION 1: can_access_all_projects = true? NO
    CONDITION 2: can_access_all_projects = false AND has membership?
      can_access_all_projects = false? YES ✅
      has project_membership? NO ❌ → EXCLUDE
  
  For proj-004:
    CONDITION 1: can_access_all_projects = true? NO
    CONDITION 2: can_access_all_projects = false AND has membership?
      can_access_all_projects = false? YES ✅
      has project_membership? NO ❌ → EXCLUDE

Result: [] (empty)
```

## Key Points

### 1. OR Logic (Either condition can grant access)
```sql
AND (
  CONDITION_1 = true
  OR
  CONDITION_2 = true
)
```
- If CONDITION 1 is true, project is included (short-circuit)
- If CONDITION 1 is false, CONDITION 2 is evaluated
- If either is true, project is included

### 2. AND Logic (Both parts must be true)
```sql
(
  (SELECT can_access_all_projects FROM user_org_access) = false
  AND EXISTS (...)
)
```
- Both parts must be true for CONDITION 2 to grant access
- If either is false, project is excluded

### 3. EXISTS Subquery (Check for membership)
```sql
EXISTS (
  SELECT 1 FROM project_memberships pm
  WHERE pm.project_id = p.id
    AND pm.user_id = auth.uid()
    AND pm.org_id = p_org_id
)
```
- Returns true if at least one matching row exists
- Returns false if no matching rows
- Efficient: stops after finding first match

## Performance Considerations

### Indexes Needed
```sql
-- For org_memberships lookup
CREATE INDEX idx_org_memberships_org_user 
ON org_memberships(org_id, user_id);

-- For project_memberships lookup
CREATE INDEX idx_project_memberships_project_user 
ON project_memberships(project_id, user_id, org_id);

-- For projects filtering
CREATE INDEX idx_projects_org_status 
ON projects(org_id, status);
```

### Query Execution Plan
```
1. Scan org_memberships (indexed by org_id, user_id) - O(1)
2. Scan projects (indexed by org_id, status) - O(n)
3. For each project, check EXISTS in project_memberships - O(1) per project
Total: O(n) where n = number of active projects in org
```

## Security Notes

### SECURITY DEFINER
```sql
SECURITY DEFINER
SET search_path = public
```
- Function runs with creator's privileges (usually superuser)
- Prevents privilege escalation
- Ensures consistent access control regardless of caller

### auth.uid()
```sql
AND om.user_id = auth.uid()
```
- Gets current authenticated user ID from Supabase
- Cannot be spoofed by client
- Enforced at database level

### RLS Policies
- This RPC works alongside Row-Level Security (RLS) policies
- RLS provides additional protection at table level
- RPC provides application-level access control
