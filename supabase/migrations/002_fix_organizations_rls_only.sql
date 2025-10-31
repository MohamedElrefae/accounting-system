-- Migration: Fix RLS policies for organizations table (READ ACCESS ONLY)
-- Created: 2025-10-29
-- Description: Allows authenticated and anonymous users to read existing organizations

-- Step 1: Check current RLS status
DO $$ 
DECLARE
  rls_enabled boolean;
  policy_count integer;
BEGIN
  -- Check if RLS is enabled
  SELECT relrowsecurity INTO rls_enabled
  FROM pg_class
  WHERE relname = 'organizations';
  
  -- Count existing policies
  SELECT COUNT(*) INTO policy_count
  FROM pg_policies
  WHERE tablename = 'organizations' AND cmd = 'SELECT';
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '🔍 Current State:';
  RAISE NOTICE '  • RLS Enabled: %', CASE WHEN rls_enabled THEN 'YES ⚠️' ELSE 'NO ✅' END;
  RAISE NOTICE '  • Existing SELECT policies: %', policy_count;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- Step 2: Drop any restrictive existing policies
DROP POLICY IF EXISTS "Allow authenticated users to read organizations" ON organizations;
DROP POLICY IF EXISTS "organizations_select_policy" ON organizations;
DROP POLICY IF EXISTS "Enable read access for all users" ON organizations;
DROP POLICY IF EXISTS "Enable read access for authenticated users" ON organizations;
DROP POLICY IF EXISTS "Enable read access for anonymous users" ON organizations;

-- Step 3: Create permissive SELECT policies
-- For authenticated users (logged in)
CREATE POLICY "organizations_select_authenticated"
  ON organizations
  FOR SELECT
  TO authenticated
  USING (true);

-- For anonymous users (public access)
CREATE POLICY "organizations_select_anon"
  ON organizations
  FOR SELECT
  TO anon
  USING (true);

-- Confirmation message
DO $$ 
BEGIN 
  RAISE NOTICE '';
  RAISE NOTICE '✅ Cleaned up old policies';
  RAISE NOTICE '✅ Created policy for authenticated users';
  RAISE NOTICE '✅ Created policy for anonymous users';
END $$;

-- Step 4: Verify existing organizations
DO $$ 
DECLARE
  org_count integer;
  org_record RECORD;
BEGIN
  -- Count organizations
  SELECT COUNT(*) INTO org_count FROM organizations;
  
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '📊 Database Status:';
  RAISE NOTICE '  • Total organizations found: %', org_count;
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  
  IF org_count = 0 THEN
    RAISE WARNING '⚠️  No organizations in database!';
    RAISE WARNING '   Please add organizations via your admin interface.';
  ELSE
    RAISE NOTICE '';
    RAISE NOTICE '📋 Your Organizations:';
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
    
    FOR org_record IN 
      SELECT 
        code, 
        name, 
        COALESCE(status, 'N/A') as status,
        is_active
      FROM organizations 
      ORDER BY code
      LIMIT 10
    LOOP
      RAISE NOTICE '  • [%] % (status: %, active: %)', 
        org_record.code, 
        org_record.name, 
        org_record.status,
        CASE WHEN org_record.is_active THEN '✅' ELSE '❌' END;
    END LOOP;
    
    IF org_count > 10 THEN
      RAISE NOTICE '  ... and % more', org_count - 10;
    END IF;
    
    RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  END IF;
END $$;

-- Step 5: Test the policies
DO $$
DECLARE
  can_read boolean;
BEGIN
  -- Simple test: try to read organizations
  PERFORM * FROM organizations LIMIT 1;
  can_read := FOUND;
  
  RAISE NOTICE '';
  RAISE NOTICE '🧪 Policy Test:';
  RAISE NOTICE '  • Can read organizations: %', CASE WHEN can_read THEN '✅ YES' ELSE '❌ NO' END;
  
  IF NOT can_read THEN
    RAISE WARNING '⚠️  Policies may still be blocking access!';
    RAISE WARNING '   Try disabling RLS temporarily: ALTER TABLE organizations DISABLE ROW LEVEL SECURITY;';
  END IF;
END $$;

-- Success message
DO $$ 
BEGIN 
  RAISE NOTICE '';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ Migration completed successfully!';
  RAISE NOTICE '✅ RLS policies updated for read access';
  RAISE NOTICE '';
  RAISE NOTICE '🚀 Next Steps:';
  RAISE NOTICE '  1. Refresh your app: Ctrl+Shift+R';
  RAISE NOTICE '  2. Check browser console for:';
  RAISE NOTICE '     "✅ [OrgSelector] Loaded X organizations"';
  RAISE NOTICE '  3. Organizations should appear in dropdown';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

