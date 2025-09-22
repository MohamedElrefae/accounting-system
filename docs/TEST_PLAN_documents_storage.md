# Integration Test Plan: Documents + Storage (RLS)

Scope
- Verify end-to-end behavior for documents, document_versions, and documents storage bucket under RLS.
- Covers success path and permission denial cases.

Prerequisites
- A test user with Super Admin or sufficient documents.* permissions.
- At least one organization available and the user is a member.
- Migrations applied (041/042/043) and edms_* helpers available.

Manual Test Cases
1) Create document and initial version, upload and download
- Create document via UI or SQL (status = draft).
- Insert document_versions row with storage_path.
- Upload a small file to the documents bucket at the exact storage_path.
- Generate a signed URL for the uploaded file and verify it opens.
- Expected: Upload succeeds; signed URL works; no RLS errors in console.

2) Create second version and verify both versions accessible
- Insert another document_versions row with next version_number and new storage_path.
- Upload another file at the new path.
- List versions and retrieve signed URL for each; both should work.
- Expected: Both downloads succeed; correct MIME is returned (contentType from client).

3) RLS denial: missing permissions
- Use a user without documents.read and documents.write for the document’s org.
- Attempt SELECT on documents and document_versions, then try to upload to the same storage_path.
- Expected: SELECT returns 0 rows; storage INSERT fails due to RLS; signed URL generation fails.

4) RLS denial: mismatched path
- With a privileged user, attempt to upload a file to a path that has no matching row in document_versions.
- Expected: Upload fails due to RLS (no matching join on storage.objects.name).

5) Org isolation
- With a user who is not a member of the document’s org, attempt to read/upload.
- Expected: All operations fail due to edms_is_org_member(org_id) check.

Automated (outline)
- Use a test runner (e.g., Vitest/Jest + @supabase/supabase-js) and a dedicated test project or schema.
- Steps per test:
  1) Sign in a test user (service role on CI, or session-based locally)
  2) Insert org, user membership, document, version with path
  3) Upload via storage to the same path
  4) Assert: can create signed URL and HEAD succeeds
  5) Switch to a user without permissions and assert failures
- Use a fresh schema or unique test identifiers and clean up objects & rows after tests.

SQL Snippets (for quick verification in SQL editor)
- Check policies exist
```sql
SELECT policyname, cmd
FROM pg_policies
WHERE (schemaname, tablename) IN ((
  'public','documents'),('public','document_versions'),('storage','objects')
) ORDER BY schemaname, tablename, policyname;
```

- Confirm a storage path is registered
```sql
SELECT v.id, v.version_number, v.storage_path, d.org_id
FROM public.document_versions v
JOIN public.documents d ON d.id = v.document_id
WHERE v.storage_path = '{{path}}';
```

- Basic permission probe
```sql
-- Adjust role/user context as needed
SELECT edms_is_org_member('{{org_id}}'::uuid) AS is_member;
SELECT edms_has_document_access('{{document_id}}'::uuid, 'read') AS can_read;
```

Notes
- Storage policies rely on the path-first pattern. If uploads fail, verify the document_versions row and storage_path match exactly.
- Ensure JWT/session contains the correct user and organization membership for accurate edms_* helper evaluation.
