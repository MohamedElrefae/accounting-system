-- Fix permission_audit_logs resource_id type
-- Roles use Integer IDs, but other resources use UUIDs. Standardizing on TEXT to support both.

-- 1. Alter the column type to TEXT
ALTER TABLE permission_audit_logs ALTER COLUMN resource_id TYPE TEXT;

-- 2. Drop the index on resource_id (if it exists) and recreate it for TEXT
DROP INDEX IF EXISTS idx_permission_audit_resource;
CREATE INDEX idx_permission_audit_resource ON permission_audit_logs(resource_type, resource_id);
