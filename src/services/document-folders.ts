import { supabase } from '../utils/supabase';

export interface DocumentFolder {
  id: string;
  org_id: string;
  name: string;
  parent_id: string | null;
  position: number;
  created_by?: string | null;
  created_at?: string;
  updated_by?: string | null;
  updated_at?: string;
}

export type FolderAccessLevel = 'read' | 'write' | 'admin';

export interface FolderPermissionRow {
  id: string;
  folder_id: string;
  access_level: FolderAccessLevel;
  grantee_user_id: string | null;
  grantee_role_id: number | null; // roles.id is integer in DB
  created_by: string | null;
  created_at: string;
}

export interface FolderPermissionInput {
  access_level: FolderAccessLevel;
  grantee_user_id?: string;
  grantee_role_id?: number;
}

export async function listFolders(orgId: string): Promise<DocumentFolder[]> {
  const { data, error } = await supabase
    .from('document_folders')
    .select('*')
    .eq('org_id', orgId)
    .order('parent_id', { ascending: true })
    .order('position', { ascending: true })
    .order('name', { ascending: true });
  if (error) throw error;
  return (data as DocumentFolder[]) ?? [];
}

export async function getUnfiledFolderId(orgId: string): Promise<string | null> {
  const { data, error } = await supabase
    .from('document_folders')
    .select('id')
    .eq('org_id', orgId)
    .is('parent_id', null)
    .eq('name', 'Unfiled')
    .limit(1)
    .single();
  if (error) return null;
  return (data as any)?.id ?? null;
}

export async function createFolder(payload: {
  org_id: string;
  name: string;
  parent_id?: string | null;
  position?: number;
}): Promise<DocumentFolder> {
  const { data, error } = await supabase
    .from('document_folders')
    .insert({
      org_id: payload.org_id,
      name: payload.name,
      parent_id: payload.parent_id ?? null,
      position: payload.position ?? 0,
    })
    .select('*')
    .single();
  if (error) throw error;
  return data as DocumentFolder;
}

export async function renameFolder(id: string, name: string): Promise<DocumentFolder> {
  const { data, error } = await supabase
    .from('document_folders')
    .update({ name })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as DocumentFolder;
}

export async function moveFolder(id: string, parentId: string | null, position: number): Promise<DocumentFolder> {
  const { data, error } = await supabase
    .from('document_folders')
    .update({ parent_id: parentId, position })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as DocumentFolder;
}

export async function deleteFolder(id: string): Promise<void> {
  const { error } = await supabase
    .from('document_folders')
    .delete()
    .eq('id', id);
  if (error) throw error;
}

export async function reorderFolder(id: string, newPosition: number): Promise<DocumentFolder> {
  const { data, error } = await supabase
    .from('document_folders')
    .update({ position: newPosition })
    .eq('id', id)
    .select('*')
    .single();
  if (error) throw error;
  return data as DocumentFolder;
}

export async function getFolderPermissions(folderId: string): Promise<FolderPermissionRow[]> {
  const { data, error } = await supabase
    .from('folder_permissions')
    .select('*')
    .eq('folder_id', folderId)
    .order('created_at', { ascending: false });
  if (error) throw error;
  return (data as FolderPermissionRow[]) ?? [];
}

export async function setFolderPermissions(folderId: string, permissions: FolderPermissionInput[]): Promise<void> {
  // Replace strategy: delete all, then insert provided
  const del = await supabase.from('folder_permissions').delete().eq('folder_id', folderId);
  if (del.error) throw del.error;
  if (!permissions.length) return;

  const rows = permissions.map((p) => ({
    folder_id: folderId,
    access_level: p.access_level,
    grantee_user_id: p.grantee_user_id ?? null,
    grantee_role_id: p.grantee_role_id ?? null,
  }));
  const { error } = await supabase.from('folder_permissions').insert(rows);
  if (error) throw error;
}

export async function deleteFolderPermission(id: string): Promise<void> {
  const { error } = await supabase.from('folder_permissions').delete().eq('id', id);
  if (error) throw error;
}