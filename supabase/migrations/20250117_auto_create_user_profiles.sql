-- ============================================
-- AUTO CREATE USER PROFILES TRIGGER
-- Automatically creates user_profiles when users are added to auth.users
-- ============================================

SET search_path = public;

-- ============================================
-- SECTION 1: CREATE USER PROFILE CREATION FUNCTION
-- ============================================

CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  -- Insert into user_profiles with defaults
  INSERT INTO public.user_profiles (
    id,
    email,
    first_name,
    last_name,
    full_name_ar,
    department,
    job_title,
    is_active,
    is_super_admin,
    created_at,
    updated_at
  ) VALUES (
    NEW.id,
    NEW.email,
    COALESCE(NEW.raw_user_meta_data->>'first_name', 'User'),
    COALESCE(NEW.raw_user_meta_data->>'last_name', 'Account'),
    'مستخدم النظام',
    'الإدارة',
    'مستخدم',
    true,
    false, -- Don't auto-assign super admin
    NOW(),
    NOW()
  )
  ON CONFLICT (id) DO UPDATE SET
    email = EXCLUDED.email,
    updated_at = NOW();
    
  RETURN NEW;
EXCEPTION WHEN OTHERS THEN
  -- Don't fail user creation if profile creation fails
  RAISE WARNING 'Failed to create user profile for %: %', NEW.id, SQLERRM;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- ============================================
-- SECTION 2: CREATE TRIGGER ON auth.users
-- ============================================

-- Drop existing trigger if it exists
DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;

-- Create trigger to automatically create user profile
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ============================================
-- SECTION 3: FIX EXISTING USERS WITHOUT PROFILES
-- ============================================

-- Create profiles for any existing auth users who don't have profiles
DO $$
DECLARE
  v_user_id UUID;
  v_email TEXT;
  v_first_name TEXT;
  v_last_name TEXT;
BEGIN
  FOR v_user_id, v_email, v_first_name, v_last_name IN 
    SELECT 
      au.id,
      au.email,
      COALESCE(au.raw_user_meta_data->>'first_name', 'User'),
      COALESCE(au.raw_user_meta_data->>'last_name', 'Account')
    FROM auth.users au
    LEFT JOIN public.user_profiles up ON au.id = up.id
    WHERE up.id IS NULL
  LOOP
    INSERT INTO public.user_profiles (
      id,
      email,
      first_name,
      last_name,
      full_name_ar,
      department,
      job_title,
      is_active,
      is_super_admin,
      created_at,
      updated_at
    ) VALUES (
      v_user_id,
      v_email,
      v_first_name,
      v_last_name,
      'مستخدم النظام',
      'الإدارة',
      'مستخدم',
      true,
      false,
      NOW(),
      NOW()
    );
    
    RAISE NOTICE 'Created user profile for % (%)', v_email, v_user_id;
  END LOOP;
END $$;

-- ============================================
-- SECTION 4: VERIFICATION
-- ============================================

-- Show results
DO $$
DECLARE
  v_auth_users_count INTEGER;
  v_profile_count INTEGER;
  v_missing_profiles INTEGER;
BEGIN
  SELECT COUNT(*) INTO v_auth_users_count FROM auth.users;
  SELECT COUNT(*) INTO v_profile_count FROM public.user_profiles;
  SELECT COUNT(*) INTO v_missing_profiles 
  FROM auth.users au 
  LEFT JOIN public.user_profiles up ON au.id = up.id 
  WHERE up.id IS NULL;
  
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '✅ USER PROFILE AUTO-CREATION SETUP COMPLETE';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
  RAISE NOTICE '';
  RAISE NOTICE '📊 Statistics:';
  RAISE NOTICE '  • Auth users: %', v_auth_users_count;
  RAISE NOTICE '  • User profiles: %', v_profile_count;
  RAISE NOTICE '  • Missing profiles: %', v_missing_profiles;
  RAISE NOTICE '';
  IF v_missing_profiles = 0 THEN
    RAISE NOTICE '✅ All auth users now have corresponding profiles!';
  ELSE
    RAISE NOTICE '⚠️  Some users still need profiles (check logs above)';
  END IF;
  RAISE NOTICE '';
  RAISE NOTICE '🔧 What was set up:';
  RAISE NOTICE '  • Trigger: on_auth_user_created';
  RAISE NOTICE '  • Function: handle_new_user()';
  RAISE NOTICE '  • Auto-creates profiles for new users';
  RAISE NOTICE '  • Fixed existing users without profiles';
  RAISE NOTICE '━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━';
END $$;

-- Test the specific user mentioned in the issue
DO $$
DECLARE
  v_user_exists BOOLEAN;
  v_profile_exists BOOLEAN;
BEGIN
  SELECT EXISTS(SELECT 1 FROM auth.users WHERE id = '096dbbfc-ed82-4adf-8baa-b8b0720f11c2') INTO v_user_exists;
  SELECT EXISTS(SELECT 1 FROM public.user_profiles WHERE id = '096dbbfc-ed82-4adf-8baa-b8b0720f11c2') INTO v_profile_exists;
  
  IF v_user_exists AND v_profile_exists THEN
    RAISE NOTICE '✅ User 096dbbfc-ed82-4adf-8baa-b8b0720f11c2 now has a profile!';
  ELSIF v_user_exists AND NOT v_profile_exists THEN
    RAISE NOTICE '❌ User 096dbbfc-ed82-4adf-8baa-b8b0720f11c2 exists but profile creation failed';
  ELSE
    RAISE NOTICE 'ℹ️  User 096dbbfc-ed82-4adf-8baa-b8b0720f11c2 does not exist in auth.users';
  END IF;
END $$;
