# Auth/RBAC Integration Progress Log

Updated: 2025-08-31 18:16 UTC
Org in focus: bc16bacc-4fbe-4aeb-8ab1-fef2d895b441

Summary
- Objective: Establish a consistent, org-aware RBAC model end-to-end (Auth → invites → org membership → roles/permissions → RLS → UI).
- Current status: Core DB helpers and flows are in place; role seeds exist; invite/accept RPCs created (compat with existing table); sync function maps memberships → role bindings; front-end hookup pending.

Key Observations (from schema/data snapshots)
- roles (int PK, requires name_ar):
  - Present: Super Admin (id=7), Owner (id=9), Admin (id=10), Manager (id=11), Viewer (id=12). Super Admin is system role.
- permissions:
  - Table includes resource/action columns; example entries show invoices.* and users.read.
  - Super Admin role has broad mappings (per role_permissions_matrix snapshot).
  - Owner/Admin/Manager/Viewer mappings need full permission catalog available to populate completely.
- org_memberships:
  - manager role exists for e84e1ac0-2240-4e37-b747-a01daa44ae4b in org bc16…
- user_roles (no org_id column):
  - After sync, assignments are global (org_id = null).
  - e84e… has Manager and Super Admin roles globally.
- user_profiles:
  - e84e… has is_super_admin = true (global bypass through is_org_member).
- user_invitations (existing):
  - Columns include invitation_token, status, role_id, invited_by, expires_at, accepted_at, metadata, etc.
  - We added org_id (nullable) + FK + indexes.

What We Added/Changed
1) Hardened membership + effective permissions
- is_org_member(p_org_id uuid, p_min_role text) SECURITY DEFINER (resilient):
  - Bypass for service_role.
  - Super admin via user_profiles.is_super_admin (if column present).
  - Threshold supports role or role_tier columns, else any membership.
- rpc_current_user_permissions(p_org_id uuid) SECURITY DEFINER (resilient):
  - Merges direct grants + role grants, includes global and matching org-scoped assignments if present; deduped.

2) Role seeds (org roles)
- Inserted: Owner/مالك, Admin/مسؤول, Manager/مدير, Viewer/مشاهد.
- Note: roles.id is integer in this schema.

3) Role → permission mappings (idempotent defaults)
- Owner: all business permissions including admin.all (if present).
- Admin: broad permissions (no admin.all), can manage roles/update, activate users.
- Manager: operational; read all tx; can post; limited master-data changes.
- Viewer: read-only/basics.
- Important: only permissions that already exist are mapped. Missing permissions should be seeded to make these mappings complete.

4) Membership → role bindings sync
- rpc_sync_memberships_to_user_roles(p_org_id uuid):
  - Resilient to roles.id type (uses roles.id%TYPE).
  - If user_roles.org_id exists: writes org-scoped bindings; else writes global (current case).
  - Maps org_memberships.role (or role_tier) to Owner/Admin/Manager/Viewer IDs.

5) Invites (compatible with existing user_invitations)
- Added org_id to existing public.user_invitations + FK + indexes (no new table).
- rpc_invite_user_to_org_compat(p_org_id uuid, p_email text, p_role_name text):
  - Inserts into existing user_invitations (org_id, role_id, invitation_token, status='pending', invited_by, expires_at).
  - Requires is_org_member(p_org_id,'admin') unless debug_settings.bypass_auth is true (SQL editor support).
- rpc_accept_org_invite_compat(p_token text, p_auto_sync boolean=true):
  - Confirms pending, not expired.
  - Requires current user’s email match.
  - Upserts org_memberships with role derived from role_id.
  - Marks invite accepted.
  - Auto-calls rpc_sync_memberships_to_user_roles if available.

6) RLS policy template (delivered, not applied yet)
- Per-table policy creation script using is_org_member thresholds or is_super_admin when org_id absent.
- To be run later per table (accounts, transactions, expenses_categories, projects, etc.).

7) Frontend (pending integration)
- Replace mock org with real org id (bc16bacc-4fbe-4aeb-8ab1-fef2d895b441) and persist in localStorage (org_id).
- Update useHasPermission to call rpc_current_user_permissions(orgId) and cache result per org.
- Optionally call ensure_user_profile once on login.

Verified Outcomes
- user_roles now shows Manager and Super Admin for e84e… (global assignments: org_id null).
- With is_super_admin=true in user_profiles, user has global bypass via is_org_member.
- Sync function works with integer role IDs and no org_id on user_roles (writes global bindings).

Known Gaps / Decisions
- Permissions catalog incomplete on DB (e.g., only a few entries listed). Owner/Admin/Manager/Viewer mappings will be partial until all expected permission names are seeded.
- user_roles currently lacks org_id, so role assignments are global. If multi-org per user is desired, add org_id to user_roles and re-run sync.
- RLS not yet applied across all tables (template ready; apply per table with desired thresholds).
- Debug bypass for invites is currently enabled if debug_settings.bypass_auth=true; remove or set to false before production.

Exact SQL We Ran / Prepared
- is_org_member (SECURITY DEFINER) [resilient].
- rpc_current_user_permissions (resilient, deduped).
- Role seeds for Owner/Admin/Manager/Viewer (with name_ar).
- Role → permission mappings (idempotent; only inserts existing permission names).
- rpc_sync_memberships_to_user_roles (int role IDs, global bindings when no org_id).
- ALTER TABLE user_invitations ADD COLUMN org_id uuid + FK + indexes.
- rpc_invite_user_to_org_compat (uses invitation_token/status/role_id/invited_by/org_id, debug bypass support).
- rpc_accept_org_invite_compat (membership upsert + accepted + auto-sync).

How to Use / Verify
- Invite:
  select public.rpc_invite_user_to_org_compat(
    'bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'::uuid,
    'new.user@example.com',
    'manager'
  ) as invite_token;
  (In SQL editor, requires public.debug_settings.key='bypass_auth' with value=true; in app, no bypass needed for org admins.)

- Accept:
  -- Called as the invited user (logged in)
  select public.rpc_accept_org_invite_compat('{{INVITE_TOKEN}}', true);

- Sync manually (if needed):
  select public.rpc_sync_memberships_to_user_roles('bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'::uuid);

- Effective permissions (call from app so auth.uid() is set):
  select * from public.rpc_current_user_permissions('bc16bacc-4fbe-4aeb-8ab1-fef2d895b441'::uuid);

- Check role bindings:
  select ur.user_id, r.name as role_name, to_jsonb(ur)->>'org_id' as org_id
  from public.user_roles ur
  join public.roles r on r.id = ur.role_id
  order by ur.user_id, role_name;

Next Steps
1) Permissions catalog reconciliation
   - Seed all expected permission names (resource.action) for modules: accounts, transactions, expenses_categories, invoices, reports, roles, settings, users.
   - Re-run the role → permission mapping script to fully populate Owner/Admin/Manager/Viewer permissions.

2) Optional: org-scoped user_roles
   - Add org_id column to public.user_roles (nullable); backfill with bc16… id where appropriate.
   - Update rpc_sync_memberships_to_user_roles to always write org-scoped when org_id exists.

3) Apply RLS template per table
   - For org tables: select(viewer), insert/update(manager), delete(admin/owner as needed).
   - For non-org tables: is_super_admin() or service_role-only as default.

4) Frontend integration
   - Persist real org id (bc16bacc-4fbe-4aeb-8ab1-fef2d895b441).
   - Change permission hook to call rpc_current_user_permissions.
   - Optionally wire invites UI to rpc_invite_user_to_org_compat and accept page to rpc_accept_org_invite_compat.

5) Production hardening
   - Ensure debug_settings.bypass_auth=false.
   - Review function SECURITY DEFINER and search_path settings; keep search_path = public.
   - Audit trail for membership/role changes (optional).

Open Questions / Notes
- Do we want to expose a viewer-only “org switcher” now or hardcode to bc16… until multi-org is needed?
- Should Super Admin be represented exclusively via user_profiles.is_super_admin (recommended) and remove the Super Admin role to avoid confusion?
- Confirm if we should add org_id to user_roles now, or defer until a second org is introduced.

Reference IDs
- Admin user: e84e1ac0-2240-4e37-b747-a01daa44ae4b
- Org (current company): bc16bacc-4fbe-4aeb-8ab1-fef2d895b441


