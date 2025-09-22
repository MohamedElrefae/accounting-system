-- 042_documents_permissions.sql
-- Insert document permissions with correct schema; no role grants (assign via UI)

-- Ensure required document permissions exist
INSERT INTO public.permissions (name, name_ar, resource, action, description)
VALUES
  ('documents.view',    'عرض المستندات',          'documents', 'read',    'View documents'),
  ('documents.read',    'قراءة المستندات',         'documents', 'read',    'Read documents'),
  ('documents.create',  'إنشاء المستندات',         'documents', 'create',  'Create documents'),
  ('documents.update',  'تحديث المستندات',         'documents', 'update',  'Update documents'),
  ('documents.delete',  'حذف المستندات',           'documents', 'delete',  'Delete documents'),
  ('documents.write',   'إنشاء وتحرير المستندات',  'documents', 'write',   'Create and edit documents'),
  ('documents.approve', 'اعتماد المستندات',         'documents', 'approve', 'Approve documents'),
  ('documents.manage',  'إدارة المستندات والصلاحيات','documents', 'manage',  'Manage documents and permissions'),
  ('documents.admin',   'إدارة المستندات',          'documents', 'admin',   'Administer documents')
ON CONFLICT (name) DO NOTHING;
