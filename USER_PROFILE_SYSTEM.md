# User Profile System Documentation

## Overview
Complete user profile management system with avatar support, real-time updates, and proper Arabic/English name handling.

## Features
- ✅ **Real-time profile updates** across all components
- ✅ **Avatar upload and display** with storage integration
- ✅ **Arabic and English name support** with proper fallbacks
- ✅ **Persistent data storage** with proper RLS policies
- ✅ **Context-aware updates** ensuring consistency
- ✅ **Clean error handling** with user-friendly messages

## Architecture

### Context System
- **AuthContext**: Manages authentication state and basic profile data
- **UserProfileContext**: Manages extended profile data and roles
- **Dual refresh system**: Both contexts update together for consistency

### Components
- **Profile.tsx**: Main profile editing interface
- **EditProfile.tsx**: Simplified profile editing
- **TopBar.tsx**: Displays user info with proper name/avatar logic
- **UserManagement.tsx**: Admin interface for managing user profiles

### Database Schema
```sql
-- Main user profiles table
CREATE TABLE user_profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id),
  email TEXT NOT NULL,
  first_name TEXT,
  last_name TEXT,
  full_name_ar TEXT,
  avatar_url TEXT,
  phone TEXT,
  department TEXT,
  bio TEXT,
  notification_preferences JSONB,
  security_settings JSONB,
  is_active BOOLEAN DEFAULT true,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

-- Storage bucket for avatars
INSERT INTO storage.buckets (id, name, public) 
VALUES ('user-avatars', 'user-avatars', true);
```

## Display Name Logic
The system uses a priority-based approach for displaying user names:

1. **Primary**: `first_name + last_name` (if first_name exists)
2. **Secondary**: `full_name_ar` (Arabic full name)
3. **Fallback**: First part of email address

## Avatar System
- **Storage**: Supabase Storage bucket `user-avatars`
- **Path structure**: `{user_id}/{timestamp}.{ext}`
- **Fallback**: Initials based on actual name (not email)
- **File limits**: 2MB max, image formats only

## Key Functions

### UserProfileContext
```typescript
// Load user profile with roles
const load = useCallback(async (userId: string) => {
  // Loads profile data and user roles separately
  // Handles relationship conflicts gracefully
});

// Update profile and refresh
const updateProfile = async (updates: Partial<AppUserProfile>) => {
  // Updates database and immediately refreshes context
};
```

### TopBar Display Logic
```typescript
// Get proper display name
const getDisplayName = () => {
  if (profile?.first_name) {
    return `${profile.first_name} ${profile.last_name || ''}`.trim();
  }
  if (profile?.full_name_ar) {
    return profile.full_name_ar;
  }
  return user?.email?.split('@')[0] || 'User';
};

// Get proper avatar initials
const getAvatarInitials = () => {
  if (profile?.first_name) {
    return (profile.first_name.charAt(0) + (profile.last_name?.charAt(0) || '')).toUpperCase();
  }
  if (profile?.full_name_ar) {
    const names = profile.full_name_ar.split(' ');
    return names.length > 1 
      ? (names[0].charAt(0) + names[names.length - 1].charAt(0)).toUpperCase()
      : profile.full_name_ar.charAt(0).toUpperCase();
  }
  return user?.email?.charAt(0).toUpperCase() || 'U';
};
```

## Security Policies

### Row Level Security (RLS)
```sql
-- Users can only access their own profile
CREATE POLICY "Users can view own profile" ON user_profiles
    FOR SELECT USING (auth.uid() = id OR current_setting('role') = 'service_role');

CREATE POLICY "Users can update own profile" ON user_profiles
    FOR UPDATE USING (auth.uid() = id OR current_setting('role') = 'service_role')
    WITH CHECK (auth.uid() = id OR current_setting('role') = 'service_role');

CREATE POLICY "Users can insert own profile" ON user_profiles
    FOR INSERT WITH CHECK (auth.uid() = id OR current_setting('role') = 'service_role');
```

### Storage Security
```sql
-- Users can only upload to their own folder
CREATE POLICY "Users can upload own avatars" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'user-avatars' AND
        auth.uid()::text = split_part(name, '/', 1)
    );

-- Public read access for avatars
CREATE POLICY "Users can view all avatars" ON storage.objects
    FOR SELECT USING (bucket_id = 'user-avatars');
```

## Common Issues & Solutions

### Issue: Profile not loading
**Cause**: Missing user profile row or RLS policy issues  
**Solution**: Run the service role SQL script to create profile and fix policies

### Issue: Avatar upload fails
**Cause**: Storage bucket or policies not set up  
**Solution**: Ensure `user-avatars` bucket exists with proper policies

### Issue: TopBar shows email instead of name
**Cause**: Profile context not receiving updated data  
**Solution**: Ensure both AuthContext and UserProfileContext refresh after updates

### Issue: Changes don't persist
**Cause**: Database update fails due to RLS or missing profile row  
**Solution**: Check browser console for errors, verify profile row exists

## Development Workflow

### Adding New Profile Fields
1. Add field to `user_profiles` table
2. Update `AppUserProfile` type in `UserProfileContext.tsx`
3. Add form field in `Profile.tsx`
4. Update save logic to include new field

### Testing Profile Updates
1. Open browser console
2. Navigate to Settings → Profile
3. Make changes and save
4. Verify success messages and console logs
5. Check TopBar updates immediately
6. Navigate away and back to verify persistence

## File Structure
```
src/
├── contexts/
│   ├── AuthContext.tsx          # Authentication and basic profile
│   └── UserProfileContext.tsx   # Extended profile management
├── pages/admin/
│   ├── Profile.tsx             # Main profile editing
│   ├── EditProfile.tsx         # Simple profile editing
│   └── UserManagement.tsx      # Admin user management
└── components/layout/
    └── TopBar.tsx              # Header with user display
```

## Future Enhancements
- [ ] Profile image cropping/resizing
- [ ] Bulk user import/export
- [ ] Advanced role-based field visibility
- [ ] Profile completion progress
- [ ] Social media links
- [ ] Custom profile themes
