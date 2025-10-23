import { supabase } from '../utils/supabase';

export type DocumentStatus = 'draft' | 'submitted' | 'approved' | 'rejected' | 'archived';
export type AccessLevel = 'read' | 'write' | 'admin';

export interface Document {
  id: string;
  org_id: string;
  title: string;
  title_ar?: string | null;
  description?: string | null;
  status: DocumentStatus;
  current_version_id?: string | null;
  category_id?: string | null;
  project_id?: string | null;
  folder_id?: string | null;
  storage_path?: string | null;
  created_by: string;
  created_at: string;
  updated_by?: string | null;
  updated_at: string;
}

export interface DocumentVersion {
  id: string;
  document_id: string;
  version_number: number;
  storage_path: string;
  file_name: string;
  mime_type: string;
  file_size: number;
  checksum?: string | null;
  uploaded_by: string;
  uploaded_at: string;
  notes?: string | null;
}

export interface DocumentPermissionInput {
  access_level: AccessLevel;
  grantee_user_id?: string;
  grantee_role_id?: string;
}

const DOCUMENTS_BUCKET = 'documents';

/**
 * Sanitize filename for Supabase storage (removes non-ASCII and special characters)
 * Keeps only alphanumeric, hyphens, underscores, and file extension
 */
function sanitizeFileName(fileName: string): string {
  // Extract extension
  const ext = fileName.lastIndexOf('.') > 0 ? fileName.slice(fileName.lastIndexOf('.')) : '';
  // Remove extension from name
  const nameWithoutExt = fileName.slice(0, fileName.lastIndexOf('.') > 0 ? fileName.lastIndexOf('.') : fileName.length);
  
  // Keep only alphanumeric, hyphens, underscores, and dots in extension
  const sanitized = nameWithoutExt
    .replace(/[^a-zA-Z0-9_-]/g, '_') // Replace non-alphanumeric (except - and _) with underscore
    .replace(/_+/g, '_') // Collapse multiple underscores
    .replace(/^_+|_+$/g, '') // Remove leading/trailing underscores
    .slice(0, 200); // Limit length
  
  // Sanitize extension too
  const sanitizedExt = ext.replace(/[^a-zA-Z0-9.]/g, '').slice(0, 10);
  
  return `${sanitized}${sanitizedExt}` || `file_${Date.now()}${ext}`;
}

function buildStoragePath(orgId: string, folderId: string, documentId: string, version: number, fileName: string) {
  // Folder-aware path; stable because it uses folderId (not folder name)
  // Sanitize filename to ensure Supabase storage compatibility
  const sanitizedFileName = sanitizeFileName(fileName);
  return `documents/${orgId}/folders/${folderId}/${documentId}/${version}/${sanitizedFileName}`;
}

export async function getSignedUrl(storagePath: string, expiresIn = 900) {
  const { data, error } = await supabase.storage.from(DOCUMENTS_BUCKET).createSignedUrl(storagePath, expiresIn);
  if (error) throw error;
  return data.signedUrl as string;
}

export async function uploadDocument(params: {
  orgId: string;
  title: string;
  file: File | Blob;
  description?: string;
  categoryId?: string;
  projectId?: string;
  folderId?: string; // optional; if not provided, defaults to Unfiled
  notes?: string;
}) {
  const { orgId, title, file, description, categoryId, projectId, folderId, notes } = params;

  console.log('[uploadDocument] payload', { orgId, title, hasFile: Boolean(file), description, categoryId, projectId });
  // resolve folder id: use provided or fallback to Unfiled
  let resolvedFolderId = folderId ?? null;
  if (!resolvedFolderId) {
    try {
      const { getUnfiledFolderId } = await import('./document-folders');
      resolvedFolderId = await getUnfiledFolderId(orgId);
    } catch {}
  }

  const insertPayload = {
    org_id: orgId,
    title,
    description: description ?? null,
    category_id: categoryId ?? null,
    project_id: projectId ?? null,
    folder_id: resolvedFolderId ?? null,
    status: 'draft'
  } as const;
  const { data: docIns, error: docErr } = await supabase
    .from('documents')
    .insert(insertPayload)
    .select('*')
    .single();
  if (docErr) {
    console.error('[uploadDocument] documents insert failed', { error: docErr, insertPayload });
    try {
      // Surface key details to UI for quick diagnostics
      const text =
        'Documents insert failed due to RLS.\n\n' +
        'Payload: ' + JSON.stringify(insertPayload, null, 2) + '\n\n' +
        'Error: ' + JSON.stringify(docErr, null, 2);
      console.log('[uploadDocument] DEBUG\n' + text);
      try {
        await (navigator as any)?.clipboard?.writeText?.(text);
        alert('Documents insert failed due to RLS.\n\nDetails were copied to your clipboard and printed in the console.');
      } catch {
        alert(text);
      }
    } catch {}
    throw docErr;
  }
  const document = docIns as Document;

  const versionNumber = 1;
  const name = (file as any).name ?? `upload-${Date.now()}`;
  const type = (file as any).type ?? 'application/octet-stream';
  const size = (file as any).size ?? 0;
  const storagePath = buildStoragePath(orgId, (document as any).folder_id || (resolvedFolderId || 'unassigned'), document.id, versionNumber, name);

  const { data: verIns, error: verErr } = await supabase
    .from('document_versions')
    .insert({
      document_id: document.id,
      version_number: versionNumber,
      storage_path: storagePath,
      file_name: name,
      mime_type: type,
      file_size: size,
      notes: notes ?? null
    })
    .select('*')
    .single();
  if (verErr) {
    console.error('[uploadDocument] document_versions insert failed', { error: verErr, storagePath, documentId: document.id });
    throw verErr;
  }

  const { error: uploadErr } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, file, { upsert: false, contentType: type });
  if (uploadErr) throw uploadErr;

  const { data: docUpd, error: updErr } = await supabase
    .from('documents')
    .update({ current_version_id: (verIns as any).id, storage_path: storagePath })
    .eq('id', document.id)
    .select('*')
    .single();
  if (updErr) throw updErr;

  return { document: docUpd as Document, version: verIns as DocumentVersion };
}

export async function createDocumentVersion(documentId: string, orgId: string, file: File | Blob, notes?: string) {
  // ensure we know the folder_id from the document
  const { data: docRow, error: docErr } = await supabase
    .from('documents')
    .select('id, org_id, folder_id')
    .eq('id', documentId)
    .single();
  if (docErr) throw docErr;
  const docMeta = docRow as Pick<Document, 'id' | 'org_id' | 'folder_id'>;

  const { data: versions, error: vErr } = await supabase
    .from('document_versions')
    .select('version_number')
    .eq('document_id', documentId)
    .order('version_number', { ascending: false })
    .limit(1);
  if (vErr) throw vErr;
  const nextVersion = (versions?.[0]?.version_number ?? 0) + 1;
  const name = (file as any).name ?? `upload-${Date.now()}`;
  const type = (file as any).type ?? 'application/octet-stream';
  const size = (file as any).size ?? 0;
  const storagePath = buildStoragePath(orgId, (docMeta.folder_id as any) || 'unassigned', documentId, nextVersion, name);

  const { data: verIns, error: verErr } = await supabase
    .from('document_versions')
    .insert({
      document_id: documentId,
      version_number: nextVersion,
      storage_path: storagePath,
      file_name: name,
      mime_type: type,
      file_size: size,
      notes: notes ?? null
    })
    .select('*')
    .single();
  if (verErr) throw verErr;

  const { error: uploadErr } = await supabase.storage
    .from(DOCUMENTS_BUCKET)
    .upload(storagePath, file, { upsert: false, contentType: type });
  if (uploadErr) throw uploadErr;

  const { error: updErr } = await supabase
    .from('documents')
    .update({ current_version_id: (verIns as any).id, storage_path: storagePath })
    .eq('id', documentId);
  if (updErr) throw updErr;

  return verIns as DocumentVersion;
}

export async function getDocuments(params: {
  orgId: string;
  status?: DocumentStatus[];
  categoryId?: string;
  projectId?: string;
  folderId?: string;
  search?: string;
  limit?: number;
  offset?: number;
  orderBy?: { column: string; ascending: boolean };
  fts?: boolean; // use full-text search on search_vector
}) {
  const { orgId, status, categoryId, projectId, folderId, search, limit = 20, offset = 0, orderBy, fts } = params;
  let query = supabase.from('documents').select('*', { count: 'exact' }).eq('org_id', orgId);

  if (status?.length) query = query.in('status', status as any);
  if (categoryId) query = query.eq('category_id', categoryId);
  if (projectId) query = query.eq('project_id', projectId);
  if (folderId) query = query.eq('folder_id', folderId);
  if (search) {
    if (fts) {
      // Use PostgREST text search on tsvector column
      // plain to_tsquery with 'simple' config
      // Note: PostgREST textSearch expects raw query string
      query = (query as any).textSearch('search_vector', search, { type: 'plain', config: 'simple' });
    } else {
      query = query.ilike('title', `%${search}%`);
    }
  }

  if (orderBy) query = query.order(orderBy.column as any, { ascending: orderBy.ascending });
  query = query.range(offset, offset + limit - 1);

  const { data, error, count } = await query;
  if (error) throw error;
  return { data: (data as Document[]) ?? [], count: count ?? 0 };
}

export async function getDocumentById(id: string) {
  const { data, error } = await supabase.from('documents').select('*').eq('id', id).single();
  if (error) throw error;
  return data as Document;
}

export async function getDocumentVersions(documentId: string) {
  const { data, error } = await supabase
    .from('document_versions')
    .select('*')
    .eq('document_id', documentId)
    .order('version_number', { ascending: false });
  if (error) throw error;
  return (data as DocumentVersion[]) ?? [];
}

export async function promoteDocumentVersion(versionId: string) {
  // Fetch version to get document_id and storage_path
  const { data: ver, error: vErr } = await supabase
    .from('document_versions')
    .select('id, document_id, storage_path')
    .eq('id', versionId)
    .single();
  if (vErr) throw vErr;
  const version = ver as Pick<DocumentVersion, 'id' | 'document_id' | 'storage_path'>;
  // Update document current_version_id and storage_path to selected version
  const { data: doc, error: dErr } = await supabase
    .from('documents')
    .update({ current_version_id: version.id as any, storage_path: version.storage_path })
    .eq('id', (version as any).document_id)
    .select('*')
    .single();
  if (dErr) throw dErr;
  return doc as Document;
}

export async function downloadDocumentByVersion(versionId: string) {
  const { data, error } = await supabase.from('document_versions').select('storage_path').eq('id', versionId).single();
  if (error) throw error;
  return getSignedUrl((data as any).storage_path);
}

export async function getDocumentPermissions(documentId: string) {
  const { data, error } = await supabase
    .from('document_permissions')
    .select('*')
    .eq('document_id', documentId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return data as Array<{ id: string; document_id: string; access_level: AccessLevel; grantee_user_id: string | null; grantee_role_id: number | null; created_at: string; created_by: string | null }>;
}

export async function deleteDocumentPermission(id: string) {
  const { error } = await supabase.from('document_permissions').delete().eq('id', id);
  if (error) throw error;
}

export async function setDocumentPermissions(documentId: string, permissions: DocumentPermissionInput[]) {
  const del = await supabase.from('document_permissions').delete().eq('document_id', documentId);
  if (del.error) throw del.error;

  if (!permissions.length) return;

  const rows = permissions.map(p => ({
    document_id: documentId,
    access_level: p.access_level,
    grantee_user_id: p.grantee_user_id ?? null,
    grantee_role_id: p.grantee_role_id ?? null
  }));
  const { error } = await supabase.from('document_permissions').insert(rows);
  if (error) throw error;
}

export async function linkDocument(documentId: string, entityType: 'transactions' | 'projects', entityId: string) {
  const { error } = await supabase.from('document_relationships').insert({
    document_id: documentId,
    entity_type: entityType,
    entity_id: entityId
  });
  if (error) throw error;
}

export async function unlinkDocument(documentId: string, entityType: 'transactions' | 'projects', entityId: string) {
  const { error } = await supabase
    .from('document_relationships')
    .delete()
    .eq('document_id', documentId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);
  if (error) throw error;
}

export async function getLinkedDocuments(entityType: 'transactions' | 'projects', entityId: string) {
  const { data, error } = await supabase
    .from('document_relationships')
    .select('document_id, documents(*)')
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);
  if (error) throw error;
  return (data ?? []).map((r: any) => r.documents as Document);
}

export async function getProjectDocumentCounts(projectIds: string[]): Promise<Record<string, number>> {
  if (!projectIds.length) return {};
  const { data, error } = await supabase
    .from('document_relationships')
    .select('entity_id, count:document_id', { head: false })
    .eq('entity_type', 'projects' as any)
    .in('entity_id', projectIds)
    .group('entity_id');
  if (error) throw error;
  const map: Record<string, number> = {};
  (data as any[] | null)?.forEach((row: any) => {
    map[row.entity_id] = Number(row.count) || 0;
  });
  // Ensure all keys exist
  for (const id of projectIds) if (!(id in map)) map[id] = 0;
  return map;
}

export async function updateDocument(id: string, updates: Partial<Pick<Document, 'title' | 'title_ar' | 'description' | 'category_id' | 'project_id' | 'folder_id'>>) {
  const { data, error } = await supabase.from('documents').update(updates).eq('id', id).select('*').single();
  if (error) throw error;
  return data as Document;
}

export async function moveDocument(documentId: string, newFolderId: string) {
  const { data, error } = await supabase
    .from('documents')
    .update({ folder_id: newFolderId })
    .eq('id', documentId)
    .select('id, folder_id')
    .single();
  if (error) throw error;
  return data as Pick<Document, 'id' | 'folder_id'>;
}

export async function deleteDocument(id: string) {
  const { data: versions, error: vErr } = await supabase.from('document_versions').select('storage_path').eq('document_id', id);
  if (vErr) throw vErr;

  if (versions?.length) {
    const paths = (versions as any[]).map(v => v.storage_path);
    const { error: delErr } = await supabase.storage.from(DOCUMENTS_BUCKET).remove(paths);
    if (delErr) throw delErr;
  }

  const { error } = await supabase.from('documents').delete().eq('id', id);
  if (error) throw error;
}

export async function submitForApproval(documentId: string) {
  const { data, error } = await supabase.from('documents').update({ status: 'submitted' }).eq('id', documentId).select('*').single();
  if (error) throw error;
  return data as Document;
}

export async function approveDocument(documentId: string) {
  const { data, error } = await supabase.from('documents').update({ status: 'approved' }).eq('id', documentId).select('*').single();
  if (error) throw error;
  return data as Document;
}

export async function rejectDocument(documentId: string) {
  const { data, error } = await supabase.from('documents').update({ status: 'rejected' }).eq('id', documentId).select('*').single();
  if (error) throw error;
  return data as Document;
}

// ==================== DOCUMENT ASSOCIATIONS (Unified Linking Model) ====================
// Link documents to ANY entity (transaction, transaction_line, invoice, etc) via document_associations table
// This avoids FK bloat and supports extensibility to new entity types

export type EntityType = 'transaction' | 'transaction_line' | 'transaction_line_items' | 'invoice' | 'purchase_order' | 'payment';

export interface DocumentAssociation {
  id: string;
  document_id: string;
  entity_type: EntityType;
  entity_id: string;
  sort_order: number;
  created_at: string;
}

/**
 * Link a document to an entity (transaction, line, invoice, etc)
 */
export async function linkDocumentToEntity(
  documentId: string,
  entityType: EntityType,
  entityId: string
): Promise<void> {
  const { error } = await supabase
    .from('document_associations')
    .insert({ document_id: documentId, entity_type: entityType, entity_id: entityId });
  
  // Silently ignore duplicate key errors (already linked)
  if (error && !error.message.includes('duplicate')) throw error;
}

/**
 * Get documents linked to a transaction line
 */
export async function getTransactionLineDocuments(transactionLineId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('document_associations')
    .select('document_id, documents!document_id(*)')
    .eq('entity_type', 'transaction_line')
    .eq('entity_id', transactionLineId)
    .order('sort_order', { ascending: true });
  
  if (error) throw error;
  return data?.map((row: any) => row.documents).filter(Boolean) || [];
}

/**
 * Get documents linked to a transaction (from both transaction and its lines)
 */
export async function getTransactionDocuments(transactionId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('document_associations')
    .select('document_id, documents!document_id(*)')
    .in('entity_type', ['transaction', 'transaction_line'])
    .in('entity_id', [
      transactionId, // direct transaction links
      supabase.rpc('get_transaction_line_ids', { tx_id: transactionId }) // line links (will be handled by separate call)
    ])
    .order('sort_order', { ascending: true });
  
  if (error) throw error;
  return data?.map((row: any) => row.documents).filter(Boolean) || [];
}

/**
 * Get document count for a transaction line
 */
export async function getTransactionLineDocumentCount(transactionLineId: string): Promise<number> {
  const { count, error } = await supabase
    .from('document_associations')
    .select('*', { count: 'exact' })
    .eq('entity_type', 'transaction_line')
    .eq('entity_id', transactionLineId);
  
  if (error) throw error;
  return count || 0;
}

/**
 * Get document count for an entity (transaction, line, etc)
 */
export async function getEntityDocumentCount(
  entityType: EntityType,
  entityId: string
): Promise<number> {
  const { count, error } = await supabase
    .from('document_associations')
    .select('*', { count: 'exact' })
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);
  
  if (error) throw error;
  return count || 0;
}

/**
 * Unlink a document from an entity
 */
export async function unlinkDocumentFromEntity(
  documentId: string,
  entityType: EntityType,
  entityId: string
): Promise<void> {
  const { error } = await supabase
    .from('document_associations')
    .delete()
    .eq('document_id', documentId)
    .eq('entity_type', entityType)
    .eq('entity_id', entityId);
  
  if (error) throw error;
}

/**
 * Convenience alias: Link document to transaction line
 */
export const linkDocumentToTransactionLine = (documentId: string, lineId: string) =>
  linkDocumentToEntity(documentId, 'transaction_line', lineId);

/**
 * Convenience alias: Unlink document from transaction line
 */
export const unlinkDocumentFromTransactionLine = (documentId: string, lineId: string) =>
  unlinkDocumentFromEntity(documentId, 'transaction_line', lineId);

/**
 * Convenience alias: Link document to transaction line items
 */
export const linkDocumentToTransactionLineItems = (documentId: string, lineItemId: string) =>
  linkDocumentToEntity(documentId, 'transaction_line_items', lineItemId);

/**
 * Convenience alias: Unlink document from transaction line items
 */
export const unlinkDocumentFromTransactionLineItems = (documentId: string, lineItemId: string) =>
  unlinkDocumentFromEntity(documentId, 'transaction_line_items', lineItemId);

/**
 * Get documents linked to transaction line items
 */
export async function getTransactionLineItemsDocuments(lineItemId: string): Promise<Document[]> {
  const { data, error } = await supabase
    .from('document_associations')
    .select('document_id, documents!document_id(*)')
    .eq('entity_type', 'transaction_line_items')
    .eq('entity_id', lineItemId)
    .order('sort_order', { ascending: true });
  
  if (error) throw error;
  return data?.map((row: any) => row.documents).filter(Boolean) || [];
}

/**
 * Get document count for transaction line items
 */
export async function getTransactionLineItemsDocumentCount(lineItemId: string): Promise<number> {
  const { count, error } = await supabase
    .from('document_associations')
    .select('*', { count: 'exact' })
    .eq('entity_type', 'transaction_line_items')
    .eq('entity_id', lineItemId);
  
  if (error) throw error;
  return count || 0;
}
