# User Profile Issues - Debug Guide

## Issues Encountered
1. Profile updates not saving to database
2. Top bar not showing updated username/avatar
3. Profile data not persisting when navigating back
4. All profile displays throughout app not consistent

## Debugging Steps

### 1. First, run the SQL diagnostic script in Supabase

Run `debug_profile_issues.sql` in your Supabase SQL Editor to check:
- Table structure
- RLS policies
- Current user permissions
- Sample data

### 2. Check browser console

With the debugging code added, you should see detailed logs:
- `[Profile] Starting save with data:` - shows what data is being saved
- `[Profile] Updating database with:` - shows the update payload
- `[Profile] Database update successful:` - confirms database operation
- `[UserProfileContext] Loading profile for user:` - shows profile loading
- `[UserProfileContext] Database query result:` - shows database response
- `[TopBar] Profile data:` - shows what profile data TopBar receives

### 3. Test the profile update flow

1. Go to Settings → Profile
2. Update your first name, last name, and upload avatar
3. Click Save
4. Check console logs for errors
5. Navigate to another page and back - data should persist
6. Check if TopBar shows updated name and avatar

## Likely Causes and Fixes

### Issue 1: RLS Policies Missing or Incorrect

If you see permission errors in console, run this SQL:

```sql
-- Fix RLS policies
DROP POLICY IF EXISTS "Users can view own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can update own profile" ON user_profiles;
DROP POLICY IF EXISTS "Users can insert own profile" ON user_profiles;

CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id);

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id)
    WITH CHECK (auth.uid() = id);

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id);

-- Ensure RLS is enabled
ALTER TABLE user_profiles ENABLE ROW LEVEL SECURITY;

-- Grant necessary permissions
GRANT SELECT, INSERT, UPDATE ON user_profiles TO authenticated;
```

### Issue 2: User Profile Row Doesn't Exist

If the profile doesn't exist, create it:

```sql
-- Insert missing user profile (replace 'your-user-id' with actual user ID)
INSERT INTO user_profiles (
    id, 
    email, 
    created_at
) 
VALUES (
    'your-user-id',  -- Replace with your actual user ID from auth.users
    'your-email@example.com',  -- Replace with your email
    NOW()
)
ON CONFLICT (id) DO NOTHING;
```

### Issue 3: Storage Bucket Not Set Up

If avatar uploads fail, ensure storage bucket exists:

```sql
-- Check if storage bucket exists
SELECT * FROM storage.buckets WHERE id = 'user-avatars';

-- Create bucket if it doesn't exist (run in Supabase Dashboard → Storage)
-- Or use the Supabase interface to create a public bucket named 'user-avatars'
```

### Issue 4: Context Refresh Issues

The code now includes:
- Proper context dependency arrays in useMemo
- Debug logging to track context updates
- Both AuthContext and UserProfileContext refresh calls

## Testing Checklist

After applying fixes:

- [ ] Can save profile data without errors
- [ ] Console shows successful database updates
- [ ] TopBar immediately shows updated name/avatar
- [ ] Profile data persists when navigating away and back
- [ ] All components show consistent user information
- [ ] Avatar upload works correctly
- [ ] Browser console shows no errors

## Additional Notes

- Check Network tab in DevTools for failed API calls
- Verify user authentication state in console logs
- Ensure Supabase client is properly configured
- Check if there are any CORS issues with storage uploads

## Files Modified

1. `src/contexts/UserProfileContext.tsx` - Added debugging and fixed memoization
2. `src/pages/admin/Profile.tsx` - Added comprehensive save debugging
3. `src/components/layout/TopBar.tsx` - Added profile data debugging
4. `src/pages/admin/EditProfile.tsx` - Fixed context refresh calls

## Next Steps

1. Run the SQL diagnostic script
2. Check console logs during profile save
3. Apply any necessary SQL fixes based on the diagnostic results
4. Test the complete flow
5. Remove debug logging once working
