# Phase 2 Task 4: Database Schema Fix - Foreign Key Relationship Issue

## Problem
When testing the ProjectMembersManager tab, two 400 errors occurred:

1. **Foreign Key Relationship Error**: 
   ```
   Could not find a relationship between 'org_memberships' and 'user_profiles' in the schema cache
   ```

2. **Column Not Found Error**:
   ```
   column user_profiles_1.name does not exist
   ```

## Root Cause
The code was attempting to use Supabase's implicit foreign key joins with the syntax:
```typescript
.select(`
  *,
  user_profiles!org_memberships_user_id_fkey(id, name, email)
`)
```

This failed because:
1. The foreign key relationship wasn't properly defined in the schema
2. The `user_profiles` table doesn't have a `name` column - it has `first_name`, `last_name`, and `full_name_ar`

## Solution
Replaced implicit foreign key joins with explicit two-step queries:

### 1. Fixed `getOrganizationUsers()` in `src/services/organization.ts`
**Before**: Used implicit join with non-existent foreign key
**After**: 
- Step 1: Query `org_memberships` to get user IDs
- Step 2: Query `user_profiles` with those IDs
- Combine results with proper name formatting

### 2. Fixed `getProjectMembersWithDetails()` in `src/services/projectMemberships.ts`
**Before**: Used implicit join with non-existent foreign key
**After**:
- Step 1: Query `project_memberships` to get all members
- Step 2: Query `user_profiles` with those user IDs
- Create a map and combine results with proper name formatting

### 3. Name Formatting Logic
Both functions now use consistent name formatting:
```typescript
name: profile.full_name_ar || [profile.first_name, profile.last_name].filter(Boolean).join(' ') || 'Unknown'
```

This prioritizes:
1. Arabic full name (`full_name_ar`)
2. Combination of first and last name
3. Fallback to 'Unknown'

## Files Modified
1. `src/services/organization.ts` - Added `getOrganizationUsers()` function
2. `src/services/projectMemberships.ts` - Fixed `getProjectMembersWithDetails()` function
3. `src/components/Projects/ProjectMembersManager.tsx` - Fixed TypeScript errors

## Testing
The ProjectMembersManager tab should now:
- ✅ Load without import errors
- ✅ Fetch organization users successfully
- ✅ Fetch project members with user details
- ✅ Display user names and emails correctly
- ✅ Allow adding/removing members
- ✅ Allow changing member roles

## Status
✅ **COMPLETE** - All database schema issues resolved. Ready for testing.
