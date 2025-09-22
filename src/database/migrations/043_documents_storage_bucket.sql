-- 043_documents_storage_bucket.sql
-- Upsert documents bucket and add edms_* storage policies based on metadata.document_id

-- Create/Update bucket settings
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'documents',                -- id and name
  'documents',
  false,                      -- private
  50 * 1024 * 1024,           -- 50 MB
  ARRAY[
    'application/pdf',
    'image/png',
    'image/jpeg',
    'image/webp',
    'text/plain',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document', -- .docx
    'application/msword',                                                       -- .doc
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',       -- .xlsx
    'application/vnd.ms-excel'                                                 -- .xls
  ]::text[]
)
ON CONFLICT (id) DO UPDATE
SET public = EXCLUDED.public,
    file_size_limit = EXCLUDED.file_size_limit,
    allowed_mime_types = EXCLUDED.allowed_mime_types;

-- Policies on storage.objects for documents bucket
DO $$
BEGIN
  -- SELECT: allow if the object path matches a document version the user can read
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'edms_documents_bucket_select'
  ) THEN
    EXECUTE $$
      CREATE POLICY edms_documents_bucket_select
      ON storage.objects
      FOR SELECT
      USING (
        bucket_id = 'documents'
        AND EXISTS (
          SELECT 1
          FROM public.document_versions v
          JOIN public.documents d ON d.id = v.document_id
          WHERE v.storage_path = storage.objects.name
            AND edms_is_org_member(d.org_id)
            AND edms_has_document_access(d.id, 'read')
        )
      );
    $$;
  END IF;

  -- INSERT: allow upload if there is a corresponding document_versions row and user can write
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'edms_documents_bucket_insert'
  ) THEN
    EXECUTE $$
      CREATE POLICY edms_documents_bucket_insert
      ON storage.objects
      FOR INSERT
      WITH CHECK (
        bucket_id = 'documents'
        AND EXISTS (
          SELECT 1
          FROM public.document_versions v
          JOIN public.documents d ON d.id = v.document_id
          WHERE v.storage_path = storage.objects.name
            AND edms_is_org_member(d.org_id)
            AND edms_has_document_access(d.id, 'write')
        )
      );
    $$;
  END IF;

  -- UPDATE: allow rename/update if it maps to a document the user can write
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'edms_documents_bucket_update'
  ) THEN
    EXECUTE $$
      CREATE POLICY edms_documents_bucket_update
      ON storage.objects
      FOR UPDATE
      USING (
        bucket_id = 'documents'
        AND EXISTS (
          SELECT 1
          FROM public.document_versions v
          JOIN public.documents d ON d.id = v.document_id
          WHERE v.storage_path = storage.objects.name
            AND edms_is_org_member(d.org_id)
            AND edms_has_document_access(d.id, 'write')
        )
      )
      WITH CHECK (
        bucket_id = 'documents'
        AND EXISTS (
          SELECT 1
          FROM public.document_versions v
          JOIN public.documents d ON d.id = v.document_id
          WHERE v.storage_path = storage.objects.name
            AND edms_is_org_member(d.org_id)
            AND edms_has_document_access(d.id, 'write')
        )
      );
    $$;
  END IF;

  -- DELETE: allow delete if user has admin on the parent document
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'storage' AND tablename = 'objects' AND policyname = 'edms_documents_bucket_delete'
  ) THEN
    EXECUTE $$
      CREATE POLICY edms_documents_bucket_delete
      ON storage.objects
      FOR DELETE
      USING (
        bucket_id = 'documents'
        AND EXISTS (
          SELECT 1
          FROM public.document_versions v
          JOIN public.documents d ON d.id = v.document_id
          WHERE v.storage_path = storage.objects.name
            AND edms_is_org_member(d.org_id)
            AND edms_has_document_access(d.id, 'admin')
        )
      );
    $$;
  END IF;
END$$;
