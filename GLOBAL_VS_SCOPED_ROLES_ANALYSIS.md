# Global vs Scoped Roles: Enterprise Architecture Analysis

**Date:** January 26, 2026  
**Topic:** Should roles be global or scoped to organizations/projects?

---

## 🎯 The Question

**Current System:**
- Roles are **global** (stored in `user_roles` table)
- Permissions are **global** (same permissions everywhere)
- ScopeContext **filters UI** based on selected org/project
- Database RLS **filters data** based on org/project membership

**Question:** Should we change to **org-scoped** and **project-scoped** roles?

---

## 📊 Two Approaches Compared

### Approach 1: Global Roles (Your Current System)

```sql
-- User has ONE set of roles globally
CREATE TABLE user_roles (
  user_id UUID,
  role TEXT, -- 'admin', 'accountant', 'viewer'
  -- No org_id or project_id
);

-- User belongs to orgs/projects
CREATE TABLE org_memberships (
  user_id UUID,
  org_id UUID,
  can_access_all_projects BOOLEAN
);

CREATE TABLE project_memberships (
  user_id UUID,
  project_id UUID
);
```

**How it works:**
- User is "accountant" everywhere
- Membership tables control WHICH orgs/projects they can access
- Same permissions in all orgs/projects they belong to

### Approach 2: Scoped Roles (Alternative)

```sql
-- User has DIFFERENT roles per org/project
CREATE TABLE user_roles (
  user_id UUID,
  role TEXT,
  org_id UUID, -- Role is scoped to org
  project_id UUID -- Role is scoped to project
);

-- Membership is implied by role assignment
-- No separate membership tables needed
```

**How it works:**
- User can be "admin" in Org A, "accountant" in Org B
- User can be "manager" in Project 1, "viewer" in Project 2
- Different permissions in different contexts

---

## 🏢 What Enterprise Applications Do

### Salesforce (Scoped Roles) ✅

```
User Profile (Global):
  - System Administrator
  - Standard User
  
Role (Org-Scoped):
  - CEO (in Org A)
  - Sales Manager (in Org B)
  
Permission Sets (Additive):
  - Can Edit Accounts
  - Can Delete Opportunities
```

**Architecture:**
- Global profile (base permissions)
- Org-specific roles (additional permissions)
- Permission sets (granular control)

### Microsoft Dynamics 365 (Scoped Roles) ✅

```
Security Role (Business Unit Scoped):
  - Sales Manager (in BU: North America)
  - Accountant (in BU: Europe)
  
Team Membership (Project Scoped):
  - Project Lead (in Project Alpha)
  - Team Member (in Project Beta)
```

**Architecture:**
- Roles scoped to business units
- Team roles scoped to projects
- Hierarchical inheritance

### SAP (Scoped Roles) ✅

```
Role (Company Code Scoped):
  - FI_ACCOUNTANT (in Company 1000)
  - FI_MANAGER (in Company 2000)
  
Authorization Object:
  - Company Code: 1000
  - Activity: Display, Change, Create
```

**Architecture:**
- Roles scoped to company codes
- Authorization objects define scope
- Complex but powerful

### Workday (Scoped Roles) ✅

```
Security Group (Domain Scoped):
  - HR Partner (for Organization: Engineering)
  - Recruiter (for Organization: Sales)
  
Role (Context-Aware):
  - Manager (for direct reports)
  - Viewer (for other employees)
```

**Architecture:**
- Security groups scoped to domains
- Context-aware permissions
- Dynamic based on relationships

### Slack (Scoped Roles) ✅

```
Workspace Role:
  - Owner (in Workspace A)
  - Member (in Workspace B)
  
Channel Role:
  - Admin (in #engineering)
  - Guest (in #general)
```

**Architecture:**
- Roles scoped to workspaces
- Channel-level permissions
- Simple and intuitive

---

## 🎓 Industry Consensus

### ✅ Scoped Roles are Standard

**Why?**

1. **Real-world scenarios:**
   - User is admin in their department, viewer in others
   - User manages Project A, contributes to Project B
   - User has full access in Org A, limited in Org B

2. **Security principle:**
   - Least privilege per context
   - Separation of duties
   - Audit trail per scope

3. **Scalability:**
   - Supports multi-tenant architecture
   - Enables delegation
   - Allows organizational hierarchy

---

## 📈 Detailed Comparison

### Use Case 1: Multi-Organization User

**Scenario:** Ahmed works for two companies using your system.

**Global Roles (Current):**
```
Ahmed:
  - Role: accountant (global)
  - Org Memberships: [Org A, Org B]
  - Result: Accountant in BOTH orgs
```

**Problem:** Ahmed should be admin in Org A (his company) but only viewer in Org B (client company).

**Scoped Roles (Better):**
```
Ahmed:
  - Role: admin (in Org A)
  - Role: viewer (in Org B)
  - Result: Different permissions per org ✅
```

### Use Case 2: Project-Based Access

**Scenario:** Sara manages Project X, contributes to Project Y.

**Global Roles (Current):**
```
Sara:
  - Role: manager (global)
  - Project Memberships: [Project X, Project Y]
  - Result: Manager permissions in BOTH projects
```

**Problem:** Sara should manage Project X but only view Project Y.

**Scoped Roles (Better):**
```
Sara:
  - Role: project_manager (in Project X)
  - Role: contributor (in Project Y)
  - Result: Different permissions per project ✅
```

### Use Case 3: Temporary Access

**Scenario:** External auditor needs temporary access to Org A.

**Global Roles (Current):**
```
Auditor:
  - Role: auditor (global)
  - Org Memberships: [Org A]
  - Problem: If added to Org B, has auditor access there too
```

**Scoped Roles (Better):**
```
Auditor:
  - Role: auditor (in Org A only)
  - No role in Org B
  - Result: Isolated access ✅
```

---

## 🔒 Security Implications

### Global Roles (Current System)

**Security Risks:**

1. **Over-Privileged Access:**
   ```
   User is "admin" globally
   → Admin in ALL orgs they join
   → Cannot limit to specific org
   ```

2. **Cannot Delegate:**
   ```
   Cannot make user "admin" of Org A only
   → Must make them global admin
   → Security risk
   ```

3. **Audit Complexity:**
   ```
   User accessed Org B data
   → Was it authorized?
   → Hard to determine context
   ```

### Scoped Roles (Recommended)

**Security Benefits:**

1. **Least Privilege:**
   ```
   User is "admin" in Org A only
   → No access to Org B
   → Principle of least privilege ✅
   ```

2. **Delegation:**
   ```
   Org A admin can grant roles in Org A
   → Cannot affect Org B
   → Safe delegation ✅
   ```

3. **Clear Audit Trail:**
   ```
   User accessed Org B data
   → Check: Does user have role in Org B?
   → Clear authorization path ✅
   ```

---

## 🎨 Database Schema Comparison

### Current Schema (Global Roles)

```sql
-- Global roles
CREATE TABLE user_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL -- 'admin', 'accountant', etc.
);

-- Separate membership tables
CREATE TABLE org_memberships (
  id UUID PRIMARY KEY,
  user_id UUID,
  org_id UUID,
  can_access_all_projects BOOLEAN
);

CREATE TABLE project_memberships (
  id UUID PRIMARY KEY,
  user_id UUID,
  project_id UUID
);
```

**Problems:**
- Role and membership are separate
- Cannot have different roles per org
- Complex to query "what can user do in Org A?"

### Recommended Schema (Scoped Roles)

```sql
-- Org-scoped roles
CREATE TABLE org_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  org_id UUID REFERENCES organizations(id),
  role TEXT NOT NULL, -- 'org_admin', 'org_accountant', etc.
  can_access_all_projects BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Project-scoped roles
CREATE TABLE project_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  project_id UUID REFERENCES projects(id),
  role TEXT NOT NULL, -- 'project_manager', 'contributor', etc.
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- Optional: Global roles for system-wide permissions
CREATE TABLE system_roles (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  role TEXT NOT NULL, -- 'super_admin', 'system_auditor'
  created_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Benefits:**
- Role and scope are together
- Clear: "User X has role Y in context Z"
- Easy to query: "What can user do in Org A?"
- Supports hierarchy: System > Org > Project

---

## 🚀 Migration Path

### Phase 1: Add Scoped Role Tables

```sql
-- Create new tables
CREATE TABLE org_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  org_id UUID REFERENCES organizations(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  can_access_all_projects BOOLEAN DEFAULT false,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, org_id, role)
);

CREATE TABLE project_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE,
  project_id UUID REFERENCES projects(id) ON DELETE CASCADE,
  role TEXT NOT NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE(user_id, project_id, role)
);

-- Indexes for performance
CREATE INDEX idx_org_roles_user ON org_roles(user_id);
CREATE INDEX idx_org_roles_org ON org_roles(org_id);
CREATE INDEX idx_project_roles_user ON project_roles(user_id);
CREATE INDEX idx_project_roles_project ON project_roles(project_id);
```

### Phase 2: Migrate Existing Data

```sql
-- Migrate org memberships to org roles
INSERT INTO org_roles (user_id, org_id, role, can_access_all_projects)
SELECT 
  om.user_id,
  om.org_id,
  COALESCE(ur.role, 'viewer') as role, -- Use existing global role or default
  om.can_access_all_projects
FROM org_memberships om
LEFT JOIN user_roles ur ON ur.user_id = om.user_id;

-- Migrate project memberships to project roles
INSERT INTO project_roles (user_id, project_id, role)
SELECT 
  pm.user_id,
  pm.project_id,
  COALESCE(ur.role, 'contributor') as role -- Use existing global role or default
FROM project_memberships pm
LEFT JOIN user_roles ur ON ur.user_id = pm.user_id;
```

### Phase 3: Update RLS Policies

```sql
-- Example: Transactions RLS with scoped roles
CREATE POLICY "org_scoped_access" ON transactions
FOR ALL USING (
  -- Check if user has role in transaction's org
  EXISTS (
    SELECT 1 FROM org_roles
    WHERE user_id = auth.uid()
    AND org_id = transactions.org_id
    AND role IN ('org_admin', 'org_accountant', 'org_manager')
  )
  OR
  -- Check if user has role in transaction's project
  EXISTS (
    SELECT 1 FROM project_roles
    WHERE user_id = auth.uid()
    AND project_id = transactions.project_id
    AND role IN ('project_manager', 'contributor')
  )
);
```

### Phase 4: Update Auth Hook

```typescript
// Update useOptimizedAuth to support scoped roles
export const useOptimizedAuth = () => {
  // ... existing code ...
  
  // New functions for scoped permissions
  const hasRoleInOrg = (orgId: string, role: string): boolean => {
    return authState.orgRoles.some(
      r => r.org_id === orgId && r.role === role
    );
  };
  
  const hasRoleInProject = (projectId: string, role: string): boolean => {
    return authState.projectRoles.some(
      r => r.project_id === projectId && r.role === role
    );
  };
  
  const canPerformActionInOrg = (
    orgId: string, 
    action: string
  ): boolean => {
    const userRoles = authState.orgRoles
      .filter(r => r.org_id === orgId)
      .map(r => r.role);
    
    return userRoles.some(role => 
      roleHasPermission(role, action)
    );
  };
  
  return {
    // ... existing returns ...
    hasRoleInOrg,
    hasRoleInProject,
    canPerformActionInOrg,
  };
};
```

### Phase 5: Deprecate Old Tables (Optional)

```sql
-- After migration is complete and tested
-- Keep for backward compatibility or remove

-- Option 1: Keep as views for compatibility
CREATE VIEW user_roles AS
SELECT DISTINCT user_id, role
FROM org_roles
UNION
SELECT DISTINCT user_id, role
FROM project_roles;

-- Option 2: Drop old tables
-- DROP TABLE user_roles CASCADE;
-- DROP TABLE org_memberships CASCADE;
-- DROP TABLE project_memberships CASCADE;
```

---

## 💡 Recommendation

### ✅ Implement Scoped Roles

**Why:**

1. **Industry Standard:** All major enterprise apps use scoped roles
2. **Better Security:** Least privilege per context
3. **More Flexible:** Different roles in different contexts
4. **Easier Delegation:** Org admins can manage their org
5. **Clearer Audit:** Know exactly what user can do where

### 🎯 Recommended Architecture

```
System Level (Global):
  - super_admin (can do anything anywhere)
  - system_auditor (can view everything)

Organization Level (Org-Scoped):
  - org_admin (full control in org)
  - org_manager (manage users/projects in org)
  - org_accountant (manage transactions in org)
  - org_viewer (read-only in org)

Project Level (Project-Scoped):
  - project_manager (full control in project)
  - project_contributor (create/edit in project)
  - project_viewer (read-only in project)
```

### 📋 Implementation Priority

**Phase 1 (High Priority):**
- ✅ Create org_roles and project_roles tables
- ✅ Migrate existing data
- ✅ Update RLS policies
- ✅ Update auth hook

**Phase 2 (Medium Priority):**
- Update UI components to use scoped roles
- Add role management UI per org/project
- Update documentation

**Phase 3 (Low Priority):**
- Deprecate old tables
- Clean up legacy code
- Performance optimization

---

## 🎓 Best Practices

### DO ✅

1. **Use scoped roles for multi-tenant apps**
2. **Keep system roles separate from org/project roles**
3. **Store role assignments in database**
4. **Enforce with RLS policies**
5. **Cache for performance**

### DON'T ❌

1. **Don't use global roles for multi-tenant apps**
2. **Don't mix system and org roles in same table**
3. **Don't check roles in client-side only**
4. **Don't forget to migrate existing data**
5. **Don't skip testing with real scenarios**

---

## 📚 Summary

**Your Current System:**
- Global roles ❌
- Works but limited
- Cannot have different roles per org/project

**Recommended System:**
- Scoped roles ✅
- Industry standard
- Flexible and secure
- Better for multi-tenant

**Migration:**
- Can be done incrementally
- Keep backward compatibility
- Test thoroughly

**Conclusion:** **Yes, you should migrate to scoped roles.** This is the enterprise standard and will make your system more flexible, secure, and scalable.

---

**Last Updated:** January 26, 2026  
**Status:** Architectural Recommendation  
**Priority:** HIGH - Foundational Change
