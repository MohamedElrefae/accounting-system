# Documents Storage and RLS Guide

This project enforces storage access via Postgres RLS using the parent document and document_versions rows. Follow this flow to ensure uploads and downloads work under RLS.

1) Insert the document and its version first
- Insert into public.documents (status typically 'draft')
- Insert into public.document_versions with a deterministic storage_path

2) Upload to Storage using the same storage_path
- Use the documents bucket
- Path must exactly match document_versions.storage_path
- The client library should set contentType to the file's MIME type

3) Access control
- storage.objects policies for bucket "documents" validate:
  - The object path matches a row in public.document_versions
  - The current user is an org member: edms_is_org_member(documents.org_id)
  - The user has appropriate access on the parent document via edms_has_document_access(document_id, action)

4) Common pitfalls
- Uploading to an arbitrary path without a backing document_versions row will be blocked by RLS
- Using a different org or a mismatched path will fail SELECT/INSERT with permission errors
- Ensure your JWT includes whatever claims your backend helpers require

5) Quick SQL checks
```sql
-- Confirm bucket and policies
select id, public, file_size_limit from storage.buckets where id = 'documents';
select policyname, cmd from pg_policies where schemaname = 'storage' and tablename = 'objects' and policyname ilike 'edms_documents_bucket_%' order by policyname;

-- Confirm a path is registered
select v.id, v.storage_path, d.org_id
from public.document_versions v
join public.documents d on d.id = v.document_id
where v.storage_path = '{{path}}';
```

6) Client upload snippet (TypeScript)
```ts
await supabase.storage.from('documents').upload(storagePath, file, { upsert: false, contentType: file.type || 'application/octet-stream' });
```

7) Transactions linking
- Linking happens via public.document_relationships
- Triggers: set_actor_columns populates created_by/updated_by if those columns exist
- RLS policies (installed in migrations):
  - edms_document_relationships_select: user must be in the document org AND have read access to the parent document
  - edms_document_relationships_insert: user must be in the org AND have write access to the parent document
  - edms_document_relationships_delete: user must be in the org AND have write access to the parent document
- Grants: authenticated has SELECT/INSERT/UPDATE/DELETE on document_relationships

Required permissions to link/unlink
- org membership for the parent document’s org
- documents.write (or stronger) to create/delete links

Common linking errors
- 400 created_by is null: ensure the set_actor_columns trigger is attached to document_relationships (migration includes it)
- 403 on insert/delete: user lacks documents.write on the parent document or is not an org member
