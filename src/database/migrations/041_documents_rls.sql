-- 041_documents_rls.sql
-- Align documents RLS with edms_* helpers and enforce org isolation

-- Enable and force RLS on core tables
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents FORCE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.document_versions FORCE ROW LEVEL SECURITY;

-- Base grants (RLS still applies)
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_versions TO authenticated;

-- Documents policies (edms_* helpers)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'edms_documents_select'
  ) THEN
    EXECUTE $$
      CREATE POLICY edms_documents_select
      ON public.documents
      FOR SELECT
      USING (
        edms_is_org_member(org_id)
        AND edms_has_document_access(id, 'read')
      );
    $$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'edms_documents_insert'
  ) THEN
    EXECUTE $$
      CREATE POLICY edms_documents_insert
      ON public.documents
      FOR INSERT
      WITH CHECK (
        edms_is_org_member(org_id)
        AND edms_has_org_permission(org_id, 'documents.create')
      );
    $$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'edms_documents_update'
  ) THEN
    EXECUTE $$
      CREATE POLICY edms_documents_update
      ON public.documents
      FOR UPDATE
      USING (
        edms_is_org_member(org_id)
        AND edms_has_document_access(id, 'write')
      )
      WITH CHECK (
        edms_is_org_member(org_id)
        AND edms_has_document_access(id, 'write')
      );
    $$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'documents' AND policyname = 'edms_documents_delete'
  ) THEN
    EXECUTE $$
      CREATE POLICY edms_documents_delete
      ON public.documents
      FOR DELETE
      USING (
        edms_is_org_member(org_id)
        AND edms_has_document_access(id, 'admin')
      );
    $$;
  END IF;
END$$;

-- Document versions policies (scope via parent document)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'document_versions' AND policyname = 'edms_document_versions_select'
  ) THEN
    EXECUTE $$
      CREATE POLICY edms_document_versions_select
      ON public.document_versions
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.documents d
          WHERE d.id = document_versions.document_id
            AND edms_is_org_member(d.org_id)
            AND edms_has_document_access(d.id, 'read')
        )
      );
    $$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'document_versions' AND policyname = 'edms_document_versions_insert'
  ) THEN
    EXECUTE $$
      CREATE POLICY edms_document_versions_insert
      ON public.document_versions
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.documents d
          WHERE d.id = document_versions.document_id
            AND edms_is_org_member(d.org_id)
            AND edms_has_document_access(d.id, 'write')
        )
      );
    $$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'document_versions' AND policyname = 'edms_document_versions_update'
  ) THEN
    EXECUTE $$
      CREATE POLICY edms_document_versions_update
      ON public.document_versions
      FOR UPDATE
      USING (
        EXISTS (
          SELECT 1 FROM public.documents d
          WHERE d.id = document_versions.document_id
            AND edms_is_org_member(d.org_id)
            AND edms_has_document_access(d.id, 'write')
        )
      )
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.documents d
          WHERE d.id = document_versions.document_id
            AND edms_is_org_member(d.org_id)
            AND edms_has_document_access(d.id, 'write')
        )
      );
    $$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'document_versions' AND policyname = 'edms_document_versions_delete'
  ) THEN
    EXECUTE $$
      CREATE POLICY edms_document_versions_delete
      ON public.document_versions
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.documents d
          WHERE d.id = document_versions.document_id
            AND edms_is_org_member(d.org_id)
            AND edms_has_document_access(d.id, 'admin')
        )
      );
    $$;
  END IF;
END$$;

-- Robust actor columns trigger: sets columns only if they exist on the target row
CREATE OR REPLACE FUNCTION public.set_actor_columns()
RETURNS trigger
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path TO public
AS $$
BEGIN
  -- INSERT defaults
  IF TG_OP = 'INSERT' THEN
    IF (to_jsonb(NEW) ? 'created_by') THEN
      NEW.created_by := COALESCE(NEW.created_by, auth.uid());
    END IF;
    IF (to_jsonb(NEW) ? 'created_at') THEN
      NEW.created_at := COALESCE(NEW.created_at, now());
    END IF;
    IF (to_jsonb(NEW) ? 'uploaded_by') THEN
      NEW.uploaded_by := COALESCE(NEW.uploaded_by, auth.uid());
    END IF;
    IF (to_jsonb(NEW) ? 'uploaded_at') THEN
      NEW.uploaded_at := COALESCE(NEW.uploaded_at, now());
    END IF;
  END IF;

  -- Always set update actor/timestamp if present
  IF (to_jsonb(NEW) ? 'updated_by') THEN
    NEW.updated_by := auth.uid();
  END IF;
  IF (to_jsonb(NEW) ? 'updated_at') THEN
    NEW.updated_at := now();
  END IF;

  RETURN NEW;
END
$$;

-- Attach the actor trigger to documents, document_versions, and document_relationships
DROP TRIGGER IF EXISTS trg_documents_actor ON public.documents;
CREATE TRIGGER trg_documents_actor
BEFORE INSERT OR UPDATE ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.set_actor_columns();

DROP TRIGGER IF EXISTS trg_document_versions_actor ON public.document_versions;
CREATE TRIGGER trg_document_versions_actor
BEFORE INSERT OR UPDATE ON public.document_versions
FOR EACH ROW EXECUTE FUNCTION public.set_actor_columns();

DROP TRIGGER IF EXISTS trg_document_relationships_actor ON public.document_relationships;
CREATE TRIGGER trg_document_relationships_actor
BEFORE INSERT OR UPDATE ON public.document_relationships
FOR EACH ROW EXECUTE FUNCTION public.set_actor_columns();

-- Policies for document_relationships (select/insert/delete)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'document_relationships' AND policyname = 'edms_document_relationships_select'
  ) THEN
    EXECUTE $$
      CREATE POLICY edms_document_relationships_select
      ON public.document_relationships
      FOR SELECT
      USING (
        EXISTS (
          SELECT 1 FROM public.documents d
          WHERE d.id = document_relationships.document_id
            AND edms_is_org_member(d.org_id)
            AND edms_has_document_access(d.id, 'read')
        )
      );
    $$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'document_relationships' AND policyname = 'edms_document_relationships_insert'
  ) THEN
    EXECUTE $$
      CREATE POLICY edms_document_relationships_insert
      ON public.document_relationships
      FOR INSERT
      WITH CHECK (
        EXISTS (
          SELECT 1 FROM public.documents d
          WHERE d.id = document_relationships.document_id
            AND edms_is_org_member(d.org_id)
            AND edms_has_document_access(d.id, 'write')
        )
      );
    $$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_policies 
    WHERE schemaname = 'public' AND tablename = 'document_relationships' AND policyname = 'edms_document_relationships_delete'
  ) THEN
    EXECUTE $$
      CREATE POLICY edms_document_relationships_delete
      ON public.document_relationships
      FOR DELETE
      USING (
        EXISTS (
          SELECT 1 FROM public.documents d
          WHERE d.id = document_relationships.document_id
            AND edms_is_org_member(d.org_id)
            AND edms_has_document_access(d.id, 'write')
        )
      );
    $$;
  END IF;
END$$;

-- Ensure grants for relationship table
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_relationships TO authenticated;

-- Ensure schema/table grants for core tables
GRANT USAGE ON SCHEMA public TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.documents TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.document_versions TO authenticated;

-- Install read policies required for permission evaluation (idempotent)
-- org_memberships self-select
ALTER TABLE public.org_memberships ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='org_memberships' AND policyname='org_memberships_select_self'
  ) THEN
    EXECUTE $$
      CREATE POLICY org_memberships_select_self
      ON public.org_memberships
      FOR SELECT
      USING (user_id = auth.uid());
    $$;
  END IF;
END$$;
GRANT SELECT ON public.org_memberships TO authenticated;

-- user_roles self-select
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_roles' AND policyname='user_roles_select_self'
  ) THEN
    EXECUTE $$
      CREATE POLICY user_roles_select_self
      ON public.user_roles
      FOR SELECT
      USING (user_id = auth.uid());
    $$;
  END IF;
END$$;
GRANT SELECT ON public.user_roles TO authenticated;

-- roles read-all
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='roles' AND policyname='roles_select_all'
  ) THEN
    EXECUTE $$
      CREATE POLICY roles_select_all
      ON public.roles
      FOR SELECT
      USING (true);
    $$;
  END IF;
END$$;
GRANT SELECT ON public.roles TO authenticated;

-- permissions read-all
ALTER TABLE public.permissions ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='permissions' AND policyname='permissions_select_all'
  ) THEN
    EXECUTE $$
      CREATE POLICY permissions_select_all
      ON public.permissions
      FOR SELECT
      USING (true);
    $$;
  END IF;
END$$;
GRANT SELECT ON public.permissions TO authenticated;

-- role_permissions read-all
ALTER TABLE public.role_permissions ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='role_permissions' AND policyname='role_permissions_select_all'
  ) THEN
    EXECUTE $$
      CREATE POLICY role_permissions_select_all
      ON public.role_permissions
      FOR SELECT
      USING (true);
    $$;
  END IF;
END$$;
GRANT SELECT ON public.role_permissions TO authenticated;

-- user_permissions self-select
ALTER TABLE public.user_permissions ENABLE ROW LEVEL SECURITY;
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies
    WHERE schemaname='public' AND tablename='user_permissions' AND policyname='user_permissions_select_self'
  ) THEN
    EXECUTE $$
      CREATE POLICY user_permissions_select_self
      ON public.user_permissions
      FOR SELECT
      USING (user_id = auth.uid());
    $$;
  END IF;
END$$;
GRANT SELECT ON public.user_permissions TO authenticated;

-- Final strict policies for documents (insert/select)
DO $$
BEGIN
  -- INSERT: org member + global documents.create
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='documents' AND policyname='edms_documents_insert'
  ) THEN
    EXECUTE $$ DROP POLICY edms_documents_insert ON public.documents; $$;
  END IF;
  EXECUTE $$
    CREATE POLICY edms_documents_insert
    ON public.documents
    FOR INSERT
    WITH CHECK (
      EXISTS (
        SELECT 1 FROM public.org_memberships m
        WHERE m.org_id = documents.org_id AND m.user_id = auth.uid()
      )
      AND (
        EXISTS (
          SELECT 1 FROM public.user_permissions upm
          JOIN public.permissions p ON p.id = upm.permission_id
          WHERE upm.user_id = auth.uid() AND p.name = 'documents.create'
        )
        OR EXISTS (
          SELECT 1 FROM public.user_roles ur
          JOIN public.role_permissions rp ON rp.role_id = ur.role_id
          JOIN public.permissions p ON p.id = rp.permission_id
          WHERE ur.user_id = auth.uid() AND p.name = 'documents.create'
        )
      )
    );
  $$;

  -- SELECT: org member + (has read OR creator)
  IF EXISTS (
    SELECT 1 FROM pg_policies WHERE schemaname='public' AND tablename='documents' AND policyname='edms_documents_select'
  ) THEN
    EXECUTE $$ DROP POLICY edms_documents_select ON public.documents; $$;
  END IF;
  EXECUTE $$
    CREATE POLICY edms_documents_select
    ON public.documents
    FOR SELECT
    USING (
      public.edms_is_org_member(org_id)
      AND (
        public.edms_has_document_access(id, 'read')
        OR created_by = auth.uid()
      )
    );
  $$;
END$$;
