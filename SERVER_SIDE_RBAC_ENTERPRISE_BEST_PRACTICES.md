# Server-Side RBAC: Enterprise Best Practices

**Date:** January 26, 2026  
**Topic:** Why Database-Level Role Assignment is Superior to Client-Side Context

---

## 🎯 The Question

**Should we assign roles and permissions in the database (server-side) or manage them in React Context (client-side)?**

**Answer:** **Database (Server-Side)** - This is the industry standard for enterprise applications.

---

## 🏢 What Enterprise Applications Do

### Industry Leaders

**Salesforce:**
- Roles stored in database
- Permission sets in database
- Profile-based access in database
- Client only displays what server allows

**Microsoft Dynamics 365:**
- Security roles in SQL Server
- Business units in database
- Team memberships in database
- Frontend reflects database state

**SAP:**
- Authorization objects in database
- Role assignments in database tables
- Organizational assignments in database
- UI adapts to database permissions

**Workday:**
- Security groups in database
- Domain security policies in database
- Organization assignments in database
- Client-side is presentation only

**Oracle ERP:**
- Roles and responsibilities in database
- Data security policies in database
- Organization access in database
- Forms/UI controlled by database

---

## 🔒 Why Server-Side is Superior

### 1. Security (Most Important)

**Server-Side (✅ Secure):**
```
User Request → Database checks permissions → Allow/Deny
```
- Cannot be bypassed
- Cannot be manipulated by user
- Cannot be hacked from browser
- Single source of truth

**Client-Side (❌ Insecure):**
```
User Request → Client checks context → Database trusts client
```
- Can be bypassed with browser DevTools
- Can be manipulated by modifying JavaScript
- Can be hacked by changing React state
- Multiple sources of truth (client + server)

**Real-World Example:**
```javascript
// CLIENT-SIDE (BAD) - Can be hacked
const { canDelete } = useContext(PermissionsContext);
if (canDelete) {
  await deleteOrganization(id); // ❌ Anyone can call this!
}

// SERVER-SIDE (GOOD) - Cannot be bypassed
const { canDelete } = useOptimizedAuth(); // Just for UI
if (canDelete) {
  await deleteOrganization(id); // ✅ Database will verify!
}
// Database RLS policy:
// CREATE POLICY delete_orgs ON organizations
// FOR DELETE USING (
//   EXISTS (
//     SELECT 1 FROM user_roles
//     WHERE user_id = auth.uid()
//     AND role IN ('admin', 'super_admin')
//   )
// );
```

### 2. Consistency

**Server-Side:**
- ✅ One place to check permissions (database)
- ✅ All clients see same permissions (web, mobile, API)
- ✅ No sync issues
- ✅ No cache invalidation problems

**Client-Side:**
- ❌ Must sync between client and server
- ❌ Different clients might show different permissions
- ❌ Cache can become stale
- ❌ Race conditions between updates

### 3. Auditability

**Server-Side:**
- ✅ All permission checks logged in database
- ✅ Can audit who accessed what and when
- ✅ Compliance-ready (SOC 2, GDPR, HIPAA)
- ✅ Forensic analysis possible

**Client-Side:**
- ❌ No reliable audit trail
- ❌ User can manipulate logs
- ❌ Cannot prove what user actually did
- ❌ Compliance nightmare

### 4. Performance

**Server-Side:**
- ✅ Database indexes optimize permission checks
- ✅ Query planner optimizes joins
- ✅ Caching at database level
- ✅ One query returns data + permissions

**Client-Side:**
- ❌ Must fetch permissions separately
- ❌ Must fetch data separately
- ❌ Multiple round trips
- ❌ Client must merge data + permissions

### 5. Scalability

**Server-Side:**
- ✅ Scales with database (proven technology)
- ✅ Can add read replicas
- ✅ Can cache at CDN level
- ✅ Stateless (no session management)

**Client-Side:**
- ❌ Must manage state per user
- ❌ Memory usage grows with users
- ❌ Complex state synchronization
- ❌ Difficult to scale horizontally

---

## 📊 Architecture Comparison

### Current System (Hybrid - Recommended)

```
┌─────────────────────────────────────────────────────────┐
│                    CLIENT (React)                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  useOptimizedAuth Hook                           │  │
│  │  - Fetches permissions from database             │  │
│  │  - Caches for performance                        │  │
│  │  - Used ONLY for UI (show/hide buttons)         │  │
│  └──────────────────────────────────────────────────┘  │
│                         ↓                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │  UI Components                                    │  │
│  │  - Show/hide buttons based on permissions        │  │
│  │  - Provide better UX                             │  │
│  │  - NOT for security                              │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         ↓
                    API Request
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  DATABASE (PostgreSQL)                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Row Level Security (RLS) Policies               │  │
│  │  - Check user_roles table                        │  │
│  │  - Check org_memberships table                   │  │
│  │  - Check project_memberships table               │  │
│  │  - ENFORCE permissions (cannot be bypassed)      │  │
│  └──────────────────────────────────────────────────┘  │
│                         ↓                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │  Data Tables                                      │  │
│  │  - organizations                                  │  │
│  │  - projects                                       │  │
│  │  - transactions                                   │  │
│  │  - Only returns data user can access             │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

### Bad Architecture (Client-Side Only)

```
┌──────────────────��──────────────────────────────────────┐
│                    CLIENT (React)                        │
│  ┌──────────────────────────────────────────────────┐  │
│  │  PermissionsContext                              │  │
│  │  - Stores roles in React state                   │  │
│  │  - Checks permissions in JavaScript              │  │
│  │  - USED FOR SECURITY ❌ (BAD!)                   │  │
│  └──────────────────────────────────────────────────┘  │
│                         ↓                                │
│  ┌──────────────────────────────────────────────────┐  │
│  │  UI Components                                    │  │
│  │  - Check context before API calls                │  │
│  │  - Assume server trusts client ❌                │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
                         ↓
                    API Request
                         ↓
┌─────────────────────────────────────────────────────────┐
│                  DATABASE (PostgreSQL)                   │
│  ┌──────────────────────────────────────────────────┐  │
│  │  NO RLS Policies ❌                              │  │
│  │  - Trusts client to check permissions            │  │
│  │  - Anyone can access any data                    │  │
│  │  - SECURITY VULNERABILITY                        │  │
│  └──────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────┘
```

---

## 🎓 Real-World Example: Organization Access

### Server-Side Approach (Your Current System)

**Database Schema:**
```sql
-- Store memberships in database
CREATE TABLE org_memberships (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES auth.users(id),
  org_id UUID REFERENCES organizations(id),
  role TEXT NOT NULL,
  can_access_all_projects BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- RLS Policy enforces access
CREATE POLICY "Users can only see their orgs"
ON organizations FOR SELECT
USING (
  id IN (
    SELECT org_id 
    FROM org_memberships 
    WHERE user_id = auth.uid()
  )
);
```

**Client Code:**
```typescript
// Client just displays what database allows
const { data: orgs } = await supabase
  .from('organizations')
  .select('*');
// Database automatically filters to user's orgs
// User cannot bypass this by modifying JavaScript
```

**Benefits:**
- ✅ Secure: Cannot be bypassed
- ✅ Simple: One query gets filtered data
- ✅ Fast: Database indexes optimize query
- ✅ Auditable: Database logs all access

### Client-Side Approach (Anti-Pattern)

**React Context:**
```typescript
// Store in React state (BAD!)
const PermissionsContext = createContext({
  userOrgs: ['org1', 'org2'], // ❌ Can be modified in DevTools
  canAccessOrg: (orgId) => userOrgs.includes(orgId)
});

// Component checks context (INSECURE!)
const { canAccessOrg } = useContext(PermissionsContext);
if (canAccessOrg(orgId)) {
  // ❌ User can modify context to bypass this check
  const { data } = await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId); // ❌ Database returns data without checking!
}
```

**Problems:**
- ❌ Insecure: User can modify context in browser
- ❌ Complex: Must sync context with database
- ❌ Slow: Multiple queries needed
- ❌ Not auditable: No reliable logs

---

## 🔐 Defense in Depth Strategy

### Layer 1: Database RLS (SECURITY)
```sql
-- ULTIMATE SECURITY - Cannot be bypassed
CREATE POLICY "org_access" ON organizations
FOR ALL USING (
  id IN (
    SELECT org_id FROM org_memberships
    WHERE user_id = auth.uid()
  )
);
```

### Layer 2: API/Backend Validation (REDUNDANCY)
```typescript
// Additional check (optional but recommended)
export async function getOrganization(orgId: string) {
  // Check membership
  const { data: membership } = await supabase
    .from('org_memberships')
    .select('*')
    .eq('user_id', userId)
    .eq('org_id', orgId)
    .single();
    
  if (!membership) {
    throw new Error('Access denied');
  }
  
  // Fetch data (RLS will also check)
  return await supabase
    .from('organizations')
    .select('*')
    .eq('id', orgId)
    .single();
}
```

### Layer 3: Client-Side UI (USER EXPERIENCE)
```typescript
// Show/hide buttons for better UX
const { belongsToOrg } = useOptimizedAuth();

return (
  <div>
    {belongsToOrg(orgId) ? (
      <button onClick={handleEdit}>Edit</button>
    ) : (
      <p>Read-only access</p>
    )}
  </div>
);
```

**Key Point:** Layers 2 and 3 are for UX, Layer 1 is for SECURITY.

---

## 📈 Performance Comparison

### Server-Side (Optimized)

**Single Query:**
```sql
-- One query returns filtered data
SELECT o.*, 
       om.role,
       om.can_access_all_projects
FROM organizations o
JOIN org_memberships om ON o.id = om.org_id
WHERE om.user_id = auth.uid();
```

**Performance:**
- Query time: ~5-10ms
- Network: 1 round trip
- Total: ~50-100ms

### Client-Side (Slow)

**Multiple Queries:**
```typescript
// Query 1: Get user's org memberships
const memberships = await fetch('/api/memberships');

// Query 2: Get all organizations
const allOrgs = await fetch('/api/organizations');

// Client-side filtering
const userOrgs = allOrgs.filter(org => 
  memberships.some(m => m.org_id === org.id)
);
```

**Performance:**
- Query 1: ~50ms
- Query 2: ~50ms
- Network: 2 round trips
- Client filtering: ~10ms
- Total: ~200-300ms (3x slower!)

---

## 🌍 Multi-Tenant Architecture

### Server-Side (Scalable)

```sql
-- Automatic tenant isolation
CREATE POLICY "tenant_isolation" ON transactions
FOR ALL USING (
  org_id IN (
    SELECT org_id FROM org_memberships
    WHERE user_id = auth.uid()
  )
);
```

**Benefits:**
- ✅ Perfect tenant isolation
- ✅ No data leakage possible
- ✅ Scales to millions of tenants
- ✅ Database handles complexity

### Client-Side (Problematic)

```typescript
// Must manually filter everywhere
const transactions = allTransactions.filter(t => 
  userOrgs.includes(t.org_id)
);
```

**Problems:**
- ❌ Easy to forget filtering
- ❌ Data leakage risk
- ❌ Performance degrades with scale
- ❌ Complex to maintain

---

## 🎯 Your Current System Analysis

### What You Have (Good!)

**Database Tables:**
```sql
✅ org_memberships (user → org mapping)
✅ project_memberships (user → project mapping)
✅ user_roles (user → role mapping)
✅ RLS policies on all tables
```

**Auth Hook:**
```typescript
✅ useOptimizedAuth() - Fetches from database
✅ Caches for performance
✅ Used for UI only
```

**RLS Policies:**
```sql
✅ All tables have RLS enabled
✅ Policies check memberships
✅ Cannot be bypassed
```

### What You Should Keep

**Current Architecture:**
1. ✅ Store roles in database
2. ✅ Store org memberships in database
3. ✅ Store project memberships in database
4. ✅ Use RLS policies for enforcement
5. ✅ Use auth hook for UI optimization

**Don't Change To:**
1. ❌ Storing roles in React Context
2. ❌ Checking permissions in JavaScript
3. ❌ Trusting client-side checks
4. ❌ Removing RLS policies

---

## 📚 Industry Standards

### OWASP Top 10 (Security)

**A01:2021 – Broken Access Control**
- #1 security risk
- Must enforce access control server-side
- Client-side checks are NOT security

**Recommendation:**
> "Access control enforcement must be done on the server-side or serverless API, where the attacker cannot modify the access control check or metadata."

### NIST Guidelines

**NIST 800-53 (Access Control)**
- AC-3: Access Enforcement
- Must enforce at system level (database)
- Cannot rely on client-side enforcement

### SOC 2 Compliance

**CC6.1 - Logical Access**
- Access controls must be enforced server-side
- Must be auditable
- Must be tamper-proof

---

## 🎓 Best Practices Summary

### DO ✅

1. **Store roles in database**
   - user_roles table
   - org_memberships table
   - project_memberships table

2. **Enforce with RLS policies**
   - All tables have RLS
   - Policies check memberships
   - Cannot be bypassed

3. **Use client-side for UX**
   - Show/hide buttons
   - Provide feedback
   - Improve experience

4. **Cache for performance**
   - Cache auth data in client
   - Invalidate on changes
   - Reduce database queries

5. **Audit everything**
   - Log all access attempts
   - Track permission changes
   - Enable forensics

### DON'T ❌

1. **Don't store roles in React Context**
   - Not secure
   - Can be manipulated
   - Not auditable

2. **Don't check permissions in JavaScript**
   - Not enforceable
   - Can be bypassed
   - Not reliable

3. **Don't trust client-side checks**
   - Always verify server-side
   - Client is for UX only
   - Never for security

4. **Don't skip RLS policies**
   - Ultimate security layer
   - Cannot be bypassed
   - Industry standard

5. **Don't mix concerns**
   - Database = Security
   - Client = User Experience
   - Keep them separate

---

## 🚀 Conclusion

**Your current system is correct!**

You're using:
- ✅ Database-stored roles and memberships
- ✅ RLS policies for enforcement
- ✅ Client-side auth hook for UX
- ✅ Server-side validation

This is exactly what enterprise applications do. Don't change it to client-side context management - that would be a step backwards in security, performance, and scalability.

**The client-side auth hook (`useOptimizedAuth`) is perfect as-is:**
- Fetches permissions from database
- Caches for performance
- Used for UI optimization
- NOT used for security enforcement

**Keep doing what you're doing!** 🎉

---

## 📖 Further Reading

- [OWASP Access Control Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Access_Control_Cheat_Sheet.html)
- [PostgreSQL Row Level Security](https://www.postgresql.org/docs/current/ddl-rowsecurity.html)
- [Supabase Auth Deep Dive](https://supabase.com/docs/guides/auth/row-level-security)
- [NIST Access Control Guidelines](https://csrc.nist.gov/publications/detail/sp/800-53/rev-5/final)

---

**Last Updated:** January 26, 2026  
**Status:** Reference Document  
**Audience:** Developers, Architects, Security Teams
