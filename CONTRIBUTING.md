# Contributing Guide

Thank you for contributing to accounting-system! Please follow these project conventions to keep things consistent and secure.

Storage/RLS rule (critical)
- Always follow the path-first pattern for any new private buckets subject to RLS:
  1) Insert the database row first (e.g., <entity>_versions) with a deterministic storage_path
  2) Upload the file to the exact same storage_path in the bucket
  3) Write storage.objects policies that validate access by joining on the versions table using storage.objects.name = <entity>_versions.storage_path and applying org/permission helpers
- Do NOT rely on arbitrary object metadata for authorization.
- Public buckets (e.g., user-avatars) may use simpler policies, but prefer folder naming conventions (user_id prefixes) for write access.

Policies and helpers
- Reuse edms_* helpers where available (edms_is_org_member, edms_has_document_access, edms_has_org_permission)
- Prefer idempotent migrations (IF NOT EXISTS, ON CONFLICT DO NOTHING)
- Use FORCE ROW LEVEL SECURITY for sensitive tables

Migrations
- Keep migrations focused and logically separated:
  - 041_documents_rls.sql: RLS and policies for documents and document_versions
  - 042_documents_permissions.sql: permission catalog inserts only
  - 043_documents_storage_bucket.sql: bucket config + storage.objects policies

TypeScript services
- Uploads must pass contentType when calling supabase.storage.from(bucket).upload
- Services should create DB rows first, then perform storage operations using the stored path

Documentation
- See docs/README-documents-storage-rls.md for the full storage + RLS workflow and verification queries

Code style
- Use TypeScript strict mode
- Handle Supabase errors explicitly and surface helpful messages
- Keep functions small and composable

Security
- Never log secrets or JWTs
- Do not echo secrets in scripts; read them from environment as variables

Thank you for helping keep the codebase robust and secure.
