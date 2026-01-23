# Next.js Replication Spec — User Profile Service (from current app)

## Goal
Replicate the existing **User Profile** feature/service (edit personal info, avatar upload, security actions, preferences, activity log) in a new **Next.js** app.

This spec is derived from the current repo implementation:
- `src/pages/admin/Profile.tsx`
- `src/pages/admin/EditProfile.tsx`
- `src/contexts/UserProfileProvider.tsx`
- `src/contexts/UserProfileContext.tsx`
- `src/components/ProfileActivity.tsx`
- `USER_PROFILE_SYSTEM.md`

## What the feature does (behavioral requirements)

### 1) Personal profile editing
**Screen**: “الملف الشخصي” tab: “البيانات الشخصية”

**Editable fields (stored in `user_profiles`)**
- `first_name` (string)
- `last_name` (string)
- `full_name_ar` (string)
- `department` (string)
- `phone` (string)
- `bio` (string) *(optional; current UI treats it as “may not exist until SQL migration”)*
- `avatar_url` (string | null)
- `updated_at` (timestamp)

**Save behavior**
- Update row in `user_profiles` where `id = auth.user.id`.
- After save:
  - Refresh Auth profile context (`refreshProfile()` from `useAuth`).
  - Refresh UserProfileContext (`userProfileCtx.refreshProfile()`).
  - Emit audit event `profile.update` with list of changed fields.
  - Show success toast + success alert.
- On error:
  - Show error toast + error alert.

**Display name priority (used at top of profile and in header components)**
1. If `first_name` exists: `${first_name} ${last_name}` (trim)
2. Else if `full_name_ar` exists: `full_name_ar`
3. Else fallback: email prefix `user.email.split('@')[0]`

### 2) Avatar upload
**Storage**: Supabase Storage bucket `user-avatars`.

**Client validation**
- Must be `image/*`.
- Max size: 2MB.

**Upload path policy**
- Path is `${user.id}/${Date.now()}.${ext}`.
  - Important: the *first folder* must be the authenticated user id (for RLS policy).

**Upload flow**
- `supabase.storage.from('user-avatars').upload(path, file, { upsert: true })`
- `getPublicUrl(path)`
- Save `avatar_url` into `user_profiles` during personal save.

### 3) Security actions
**Password change**
- Uses Supabase Auth: `supabase.auth.updateUser({ password })`
- Validates passwords match.
- Audits: `security.password_change`.

**Email change**
- Uses Supabase Auth: `supabase.auth.updateUser({ email: newEmail })`
- Validates new email differs from current.
- Audits: `security.email_change_request`.

### 4) Preferences
Stored in `user_profiles` (JSONB fields):
- `notification_preferences`:
  - `email_notifications: boolean`
  - `push_notifications: boolean`
  - `security_alerts: boolean`
- `security_settings`:
  - `two_factor_enabled: boolean`
  - `login_alerts: boolean`
  - `session_timeout: number` *(UI default is 30; current UI doesn’t expose editing this number)*

**Load behavior**
- On profile page mount, attempt to fetch `notification_preferences, security_settings`.
- If query fails, ignore (preferences are treated as optional).
- Defaults:
  - all notification booleans `true`
  - `two_factor_enabled=false`, `login_alerts=true`, `session_timeout=30`

**Save behavior**
- Updates JSONB fields in `user_profiles` for current user.
- Audits: `profile.preferences_update`.

### 5) Activity Log
Component: `ProfileActivity.tsx`

**Primary mode (preferred)**
- Query view/table `audit_log_enriched`.

**Fallback mode**
- If `audit_log_enriched` fails, query legacy `audit_logs` selecting:
  - `id, action, created_at, details`

**Display behavior**
- Arabic/English formatting using `dayjs` locale.
- Shows last 100 logs ordered by `created_at desc`.

## Existing “service layer” in current app

### UserProfileContext (global profile/roles)
Files:
- `src/contexts/UserProfileContext.tsx`
- `src/contexts/UserProfileProvider.tsx`

Responsibilities:
- Keep a global `profile` object and expose:
  - `refreshProfile()`
  - `updateProfile(updates)` (updates DB then refreshes)
  - `hasRole(role)` / `isSuperAdmin()`
  - `getRoleDisplayName(role)` (Arabic labels)

Load strategy (important detail):
- Load from `user_profiles` with `select('*').eq('id', userId).single()`.
- Load roles separately from `user_roles` joined to `roles(name)` and filter `is_active=true`.
  - This is intentionally separated “to avoid relationship issues”.

Auth context sync:
- Provider merges `useAuth()`’s `profile` + `roles` into its own `profile` state so the entire app sees consistent data.

## Database dependencies (do NOT assume — verify)
This feature depends on:
- `user_profiles` table with columns listed above.
- `user_roles` + `roles` tables (to compute roles).
- Supabase Storage bucket `user-avatars`.
- Audit objects:
  - `audit_log_enriched` (view/table) OR `audit_logs` (legacy).
- Optional RPC used by audit util (`log_audit`) depending on how `src/utils/audit` is implemented.

### Schema discovery SQL (run in Supabase SQL editor)
Use this to extract the **real** schema before replicating in Next.js:

```sql
-- 00_profile_schema_discovery.sql

-- 1) user_profiles columns
select
  c.table_schema,
  c.table_name,
  c.column_name,
  c.data_type,
  c.is_nullable,
  c.column_default
from information_schema.columns c
where c.table_schema = 'public'
  and c.table_name in ('user_profiles','user_roles','roles','audit_logs','audit_log_enriched')
order by c.table_name, c.ordinal_position;

-- 2) constraints for user_profiles
select
  tc.table_name,
  tc.constraint_name,
  tc.constraint_type,
  kcu.column_name,
  ccu.table_name as foreign_table_name,
  ccu.column_name as foreign_column_name
from information_schema.table_constraints tc
left join information_schema.key_column_usage kcu
  on tc.constraint_name = kcu.constraint_name
  and tc.table_schema = kcu.table_schema
left join information_schema.constraint_column_usage ccu
  on tc.constraint_name = ccu.constraint_name
  and tc.table_schema = ccu.table_schema
where tc.table_schema = 'public'
  and tc.table_name = 'user_profiles'
order by tc.constraint_type, tc.constraint_name;

-- 3) RLS policies (tables)
select
  schemaname,
  tablename,
  policyname,
  permissive,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'public'
  and tablename in ('user_profiles','user_roles','roles','audit_logs','audit_log_enriched')
order by tablename, policyname;

-- 4) Storage bucket existence
select id, name, public, created_at
from storage.buckets
where id = 'user-avatars';

-- 5) Storage policies for objects
select
  schemaname,
  tablename,
  policyname,
  roles,
  cmd,
  qual,
  with_check
from pg_policies
where schemaname = 'storage'
  and tablename = 'objects'
order by policyname;
```

## Next.js implementation guide (App Router)

### Recommended folder structure
- `src/lib/supabase/client.ts` (browser client)
- `src/lib/supabase/server.ts` (server client for RSC/actions)
- `src/features/profile/` (UI + services)
  - `profile.types.ts`
  - `profile.service.ts` (data access wrappers)
  - `ProfilePage.tsx` (tabs)
  - `AvatarUploader.tsx`
  - `ProfileActivity.tsx`

### Environment variables
Use environment variables (do not hardcode):
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`

### Data access patterns
You can replicate the behavior with either approach:

#### Option A: Client-side Supabase calls (closest to current app)
- Use `@supabase/supabase-js` client in client components.
- Update `user_profiles` directly.
- Upload to storage directly.
- Use `supabase.auth.updateUser` for password/email.

Pros:
- Minimal behavior drift from current React app.

Cons:
- Must ensure RLS is correct for all operations.

#### Option B: Server Actions (recommended for Next.js)
- Keep reads and writes in server actions for better control.
- Storage upload can still be client-side unless you implement signed upload URLs.

Pros:
- Centralized validation and better security.

Cons:
- More implementation effort.

### Feature parity checklist
- **Tabs**: personal / security / preferences / activity.
- **Personal save** updates `user_profiles` and refreshes global state.
- **Avatar upload** to `user-avatars` under `{userId}/...`.
- **Preferences** stored in JSONB with defaults and optional load.
- **Security**: password change + email change.
- **Activity**: query `audit_log_enriched` else fallback to `audit_logs`.

## Edge cases (keep same behavior)
- Preferences load failures are non-blocking.
- `bio` may be missing; UI should not crash if column absent.
- After any successful profile update, refresh any “global user” state so header/sidebar updates immediately.

## What to provide to the Next.js agent
When you ask an AI agent to implement this in the new Next.js app, attach this file and specify:
- Which UI library you want in Next.js (MUI recommended for consistency).
- Whether you want Option A (client-only) or Option B (server actions).
- Paste the output of the **Schema discovery SQL** above so the agent uses the real schema.

