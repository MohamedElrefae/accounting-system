-- Authentication Debugging Queries
-- Run these to check your authentication status

-- 1. Check if you're authenticated
SELECT auth.uid() as current_user_id;

-- 2. Check your role
SELECT auth.role() as current_role;

-- 3. Check JWT claims
SELECT current_setting('request.jwt.claims', true)::jsonb as jwt_claims;

-- 4. If auth.uid() is null, try direct table access to analysis_work_items
-- (this should work if you're authenticated but the RPC has issues)
SELECT COUNT(*) as total_items FROM analysis_work_items;

-- 5. Test organization memberships with current user
SELECT COUNT(*) as membership_count FROM org_memberships WHERE user_id = auth.uid();