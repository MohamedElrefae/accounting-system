# Roleless Organization Memberships

Status: Adopted
Date: 2025-09-26

Summary
- public.org_memberships is now roleless (binary). A row (org_id, user_id) indicates membership only.
- org_id is used for data isolation, not permission tiering.
- Any previous references to org_memberships.role are legacy and have been removed from DB and app code.

Implications
- Database functions and RLS policies should check membership existence only, e.g. EXISTS (SELECT 1 FROM public.org_memberships m WHERE m.org_id = ... AND m.user_id = ...), or call helpers like fn_is_org_member(org_id, user_id) or is_org_member(org_id, 'viewer') where the second argument is ignored internally.
- Application logic should not read or write a role field on org_memberships.
- Permission tiering must come from the enterprise roles/permissions system (roles, role_permissions, user_roles, user_permissions), not from org_memberships.

Helpers
- fn_is_org_member(p_org_id uuid, p_user_id uuid) -> boolean
  - Roleless, explicit user_id. Recommended for SQL where auth.uid() is not set.
- is_org_member(p_org_id uuid, p_min_role text) -> boolean
  - Backward-compatible signature; ignores p_min_role internally and relies on auth.uid().

Migration Notes
- Dropped column: public.org_memberships.role
- Removed role-based conditions from policies and functions (e.g., analysis_work_items_*, work_items_*).
- Updated frontend to remove role from org membership UI and services.

Verification
- Ensure fn_is_org_member(...) returns true for existing (org_id, user_id) pairs.
- Ensure RLS permits org members to access org rows as intended.

Contact
- For questions about permissions, see enterprise role/permission docs or contact the security owner.
