import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useToast } from '../../../contexts/ToastContext';
import { useHasPermission } from '../../../hooks/useHasPermission';
import { getOrganizations } from '../../../services/organization';
import { getActiveOrgId, getActiveProjectId } from '../../../utils/org';
import { supabase } from '../../../utils/supabase';
import { useDocuments } from '../../../hooks/documents/useDocuments';
import { uploadDocument, getSignedUrl, type Document as SvcDocument } from '../../../services/documents';
import CategorySelectDialog from '../../../components/documents/CategorySelectDialog';
import { downloadZip } from '../../../services/zip';
import { listFolders, getUnfiledFolderId, createFolder, renameFolder, deleteFolder, type DocumentFolder } from '../../../services/document-folders';
import DocumentDetailsDrawer from '../../../components/documents/DocumentDetailsDrawer';
import { moveDocument, deleteDocument } from '../../../services/documents';
import FolderPermissionsDialog from '../../../components/documents/FolderPermissionsDialog';
import DocumentPermissionsDialog from '../../../components/documents/DocumentPermissionsDialog';

import DocumentManagementLayout, { 
  type Document, 
  type DocumentManagementLayoutProps 
} from '../components/DocumentManagementLayout';

// Custom hook for debounced search
function useDebounced<T>(value: T, delay: number): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const handler = setTimeout(() => {
      setDebouncedValue(value);
    }, delay);

    return () => {
      clearTimeout(handler);
    };
  }, [value, delay]);

  return debouncedValue;
}

const DocumentManagementPage: React.FC = () => {
  // Toast notifications
  const { showToast } = useToast();
  
  // Permissions
  const hasPermission = useHasPermission();
  
  // Organization and Project state
  const [organizations, setOrganizations] = useState<Array<{ id: string; name: string; code: string }>>([]);
  const [projects, setProjects] = useState<Array<{ id: string; name: string; name_ar?: string }>>([]);
  const [orgId, setOrgId] = useState<string>(() => getActiveOrgId() || '');
  const [projectId, setProjectId] = useState<string>(() => getActiveProjectId() || '');

  // Folders state
  const [folders, setFolders] = useState<DocumentFolder[]>([]);
  const [selectedFolderId, setSelectedFolderId] = useState<string | null>(null);
  const [folderPaths, setFolderPaths] = useState<Record<string, string>>({});
  const [expandedFolders, setExpandedFolders] = useState<Set<string>>(new Set());

  // Categories map for labels
  const [categoryNames, setCategoryNames] = useState<Record<string, string>>({});

  // Selection state
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  
  // Search and Filter state
  const [searchText, setSearchText] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  
  // UI state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<SvcDocument | null>(null);

  // Folder permissions dialog state
  const [folderPermsOpen, setFolderPermsOpen] = useState(false);
  const [docPermsOpen, setDocPermsOpen] = useState(false);
  const [docPermsId, setDocPermsId] = useState<string | null>(null);

  // Category selector for upload
  const [categoryDialogOpen, setCategoryDialogOpen] = useState(false);
  const [pendingFile, setPendingFile] = useState<File | null>(null);
  
  // Debounce search input
  const debouncedSearchText = useDebounced(searchText, 400);
  
  // Build query parameters for documents hook
  const documentsQuery = useMemo(() => {
    if (!orgId) return undefined;
    
    return {
      orgId,
      search: debouncedSearchText,
      status: activeFilters.length > 0 ? activeFilters : undefined,
      projectId: projectId || undefined,
      folderId: selectedFolderId || undefined,
      limit: 20,
      offset: 0,
      orderBy: { column: 'updated_at' as const, ascending: false },
      fts: debouncedSearchText.length > 2, // Use full-text search for longer queries
    };
  }, [orgId, debouncedSearchText, activeFilters, projectId, selectedFolderId]);
  
  // Use existing documents hook
  const { 
    data: documentsData, 
    isLoading: documentsLoading,
    error: documentsError 
  } = useDocuments(documentsQuery);
  
  // Load initial data
  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsInitializing(true);
        
        // Load organizations
        const orgs = await getOrganizations();
        setOrganizations(orgs || []);
        
        // Set default org if not already set
        if (!orgId && orgs && orgs.length > 0) {
          const defaultOrgId = orgs[0].id as string;
          setOrgId(defaultOrgId);
        }
      } catch (error) {
        console.error('Failed to initialize document management:', error);
        showToast('Failed to load organization data', { severity: 'error' });
      } finally {
        setIsInitializing(false);
      }
    };
    
    initializeData();
  }, [orgId, showToast]);
  
  // Load projects & folders when organization changes
  useEffect(() => {
    const loadProjects = async () => {
      if (!orgId) {
        setProjects([]);
        return;
      }
      
      try {
        const { data } = await supabase
          .from('projects')
          .select('id,name,name_ar')
          .eq('org_id', orgId)
          .order('name');
        
        setProjects(data || []);
      } catch (error) {
        console.error('Failed to load projects:', error);
        setProjects([]);
      }

      try {
        const fs = await listFolders(orgId);
        setFolders(fs);
        // Build folder path map
        const byId = new Map(fs.map(f => [f.id, f] as const));
        const buildPath = (id: string): string => {
          const names: string[] = [];
          let cur: DocumentFolder | undefined = byId.get(id);
          const guard = new Set<string>();
          while (cur && !guard.has(cur.id)) {
            guard.add(cur.id);
            names.unshift(cur.name);
            cur = cur.parent_id ? byId.get(cur.parent_id) : undefined;
          }
        return names.join('/');
        };
        const fp: Record<string, string> = {};
        fs.forEach(f => { fp[f.id] = buildPath(f.id); });
        setFolderPaths(fp);
        if (!selectedFolderId) {
          const unf = await getUnfiledFolderId(orgId);
          setSelectedFolderId(unf);
        }
      } catch (e) {
        console.warn('Failed to load folders', e);
        setFolders([]);
        setFolderPaths({});
      }

      // Load categories map
      try {
        const { data } = await supabase
          .from('document_categories')
          .select('id,name')
          .eq('org_id', orgId);
        const map: Record<string, string> = {};
        (data || []).forEach((c: any) => { map[c.id] = c.name; });
        setCategoryNames(map);
      } catch (e) {
        setCategoryNames({});
      }
    };
    
    loadProjects();
  }, [orgId]);
  
  // Reset project selection when organization changes
  useEffect(() => {
    setProjectId('');
  }, [orgId]);
  
  // Event handlers
  const handleOrgChange = useCallback((newOrgId: string) => {
    setOrgId(newOrgId);
    setProjectId(''); // Reset project when org changes
  }, []);
  
  const handleProjectChange = useCallback((newProjectId: string) => {
    setProjectId(newProjectId);
  }, []);
  
  const handleSearchChange = useCallback((newSearchText: string) => {
    setSearchText(newSearchText);
  }, []);
  
  const handleFilterToggle = useCallback((filter: string) => {
    setActiveFilters(prev => {
      if (prev.includes(filter)) {
        return prev.filter(f => f !== filter);
      } else {
        return [...prev, filter];
      }
    });
  }, []);
  
  const handleFilterClear = useCallback(() => {
    setActiveFilters([]);
  }, []);
  
  const handleNewDocument = useCallback(() => {
    // TODO: Navigate to document creation page or open modal
    showToast('New document creation not yet implemented', { severity: 'info' });
  }, [showToast]);
  
  const handleUploadDocument = useCallback(() => {
    if (!orgId) {
      showToast('Select an organization first', { severity: 'warning' });
      return;
    }
    if (!fileInputRef.current) return;
    fileInputRef.current.value = '';
    fileInputRef.current.click();
  }, [showToast, orgId]);
  
  const handleExportDocuments = useCallback(() => {
    // TODO: Export current filtered documents
    showToast('Document export not yet implemented', { severity: 'info' });
  }, [showToast]);
  
  const handleDocumentClick = useCallback((doc: Document) => {
    try {
      const full = (documentsData?.data as any[])?.find?.((d: any) => d.id === doc.id) as SvcDocument | undefined;
      if (full) {
        setSelectedDocument(full);
        setDetailsOpen(true);
      } else {
        showToast(`Unable to open document details for: ${doc.title}`, { severity: 'warning' });
      }
    } catch (e) {
      showToast('Unable to open document details', { severity: 'error' });
    }
  }, [documentsData?.data, showToast]);
  
  // Transform documents data
  const documents = useMemo((): Document[] => {
    if (!documentsData?.data) return [];
    
    return documentsData.data.map((doc: any) => ({
      id: doc.id,
      title: doc.title,
      description: doc.description,
      status: doc.status,
      category_id: doc.category_id,
      project_id: doc.project_id,
      updated_at: doc.updated_at,
      created_at: doc.created_at,
      file_url: doc.file_url,
      file_size: doc.file_size,
      mime_type: doc.mime_type,
    }));
  }, [documentsData?.data]);
  
  const totalCount = documentsData?.total || 0;
  
  // Determine if page is loading
  const isLoading = isInitializing || documentsLoading;
  
  // Format error message
  const errorMessage = documentsError 
    ? typeof documentsError === 'string' 
      ? documentsError 
      : documentsError.message || 'An error occurred while loading documents'
    : null;
  
  // Build props for layout component
  const onFileSelected = useCallback(async (e: React.ChangeEvent<HTMLInputElement>) => {
    try {
      const file = e.target.files?.[0];
      if (!file) return;
      setPendingFile(file);
      setCategoryDialogOpen(true);
      return;
      if (!orgId) {
        showToast('Select an organization first', { severity: 'warning' });
        return;
      }

      const title = (file as any).name?.split('.')?.slice(0, -1).join('.') || 'Untitled document';
      const { document, version } = await uploadDocument({ orgId, title, file, folderId: selectedFolderId || undefined });
      // Try to get a quick signed URL to validate storage path
      try {
        const url = await getSignedUrl(version.storage_path);
        console.debug('Signed URL generated', url);
      } catch {}
      showToast('Document uploaded successfully', { severity: 'success' });
    } catch (err: any) {
      console.error('Upload failed', err);
      showToast(err?.message || 'Upload failed', { severity: 'error' });
    } finally {
      try { if (fileInputRef.current) (fileInputRef.current as any).value = ''; } catch {}
    }
  }, [orgId, showToast, selectedFolderId]);

  const layoutProps: DocumentManagementLayoutProps = {
    // Organization and project data
    organizations,
    projects,
    orgId,
    projectId,
    searchText,
    activeFilters,
    
    // Event handlers
    onOrgChange: handleOrgChange,
    onProjectChange: handleProjectChange,
    onSearchChange: handleSearchChange,
    onFilterToggle: handleFilterToggle,
    onFilterClear: handleFilterClear,
    onNewDocument: handleNewDocument,
    onUploadDocument: handleUploadDocument,
    onExportDocuments: handleExportDocuments,
    onDocumentClick: handleDocumentClick,
    onDocumentSelect: setSelectedIds,
    selectedDocumentIds: selectedIds,
    categoryNames,
    folderPaths,
    
    // Document data
    documents,
    totalCount,
    documentsLoading,
    viewMode,
    error: errorMessage,
    
    // Loading and permissions
    isLoading,
    canCreate: hasPermission('documents.create'),
    canUpload: hasPermission('documents.create'), // Assuming upload requires create permission
    canExport: hasPermission('documents.read'), // Assuming export requires read permission
  };
  
  const handleDebug = useCallback(async () => {
    try {
      const { data: sess } = await supabase.auth.getSession();
      const uid = sess?.session?.user?.id || null;
      const tokenPresent = Boolean(sess?.session?.access_token);

      let memberCheck: { isMember: boolean; count: number | null; error?: any } = { isMember: false, count: null };
      if (uid && orgId) {
        const { count, error } = await supabase
          .from('org_memberships')
          .select('user_id', { count: 'exact', head: true })
          .eq('org_id', orgId)
          .eq('user_id', uid);
        memberCheck = { isMember: (count ?? 0) > 0, count: count ?? 0, error };
      }

      // Check effective documents.create via roles (client-side join)
      let hasRoleCreate = false;
      if (uid) {
        const { data: roles, error: rErr } = await supabase
          .from('user_roles')
          .select('role_id')
          .eq('user_id', uid);
        if (!rErr && roles?.length) {
          const roleIds = roles.map((r: any) => r.role_id);
          const { data: rps, error: rpErr } = await supabase
            .from('role_permissions')
            .select('permission_id')
            .in('role_id', roleIds);
          if (!rpErr && rps?.length) {
            const permIds = rps.map((rp: any) => rp.permission_id);
            const { data: perms, error: pErr } = await supabase
              .from('permissions')
              .select('id,name')
              .in('id', permIds);
            if (!pErr && perms?.length) {
              hasRoleCreate = perms.some((p: any) => p.name === 'documents.create');
            }
          }
        }
      }

      const info = {
        orgId,
        tokenPresent,
        uid,
        memberCheck,
        hasRoleCreate,
      } as const;
      console.log('[Documents Debug]', info);
      alert(
        `Documents Debug\n\n` +
        `tokenPresent: ${tokenPresent}\n` +
        `uid: ${uid}\n` +
        `orgId: ${orgId}\n` +
        `isMember(org_memberships): ${memberCheck.isMember} (count=${memberCheck.count})\n` +
        `hasRoleCreate: ${hasRoleCreate}`
      );
    } catch (e: any) {
      console.error('[Documents Debug] failed', e);
      alert(`Documents Debug failed: ${e?.message || e}`);
    }
  }, [orgId]);

  return (
    <>
      <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
        <button type="button" onClick={handleDebug} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }}>
          Debug Documents Auth
        </button>
        <button type="button" onClick={async () => {
          try {
            if (!orgId) { alert('Select an organization first'); return; }
            const { data, error } = await supabase.rpc('edms_debug_identity', { p_org_id: orgId });
            if (error) { console.error('[Run Debug RPC] error', error); alert('Debug RPC failed: ' + error.message); return; }
            const row: any = Array.isArray(data) ? data[0] : data;
            const text =
              'edms_debug_identity\n\n' +
              `uid: ${row?.uid}\n` +
              `jwt_role: ${row?.jwt_role}\n` +
              `db_user: ${row?.db_user}\n` +
              `db_role: ${row?.db_role}\n` +
              `is_member: ${row?.is_member}\n` +
              `has_role_create: ${row?.has_role_create}`;
            console.log('[Run Debug RPC]\n' + text);
            try { await (navigator as any)?.clipboard?.writeText?.(text); alert('Debug RPC results copied to clipboard and printed in console.'); }
            catch { alert(text); }
          } catch (e: any) {
            console.error('[Run Debug RPC] failed', e);
            alert('Debug RPC failed: ' + (e?.message || e));
          }
        }} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }}>
          Run Debug RPC
        </button>
        <button type="button" onClick={handleUploadDocument} style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }}>
          Upload Document
        </button>
      </div>
      <input
        type="file"
        ref={fileInputRef}
        style={{ display: 'none' }}
        onChange={onFileSelected}
      />
      <div style={{ display: 'grid', gridTemplateColumns: '260px 1fr', gap: 12 }}>
        {/* Left: simple folders list */}
        <div style={{ border: '1px solid var(--border)', borderRadius: 8, padding: 8, height: '100%', minHeight: 480 }}>
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 8 }}>
            <div style={{ fontWeight: 600 }}>Folders</div>
            <div style={{ display: 'flex', gap: 6 }}>
              <button
                type="button"
                title="New Folder"
                onClick={async () => {
                  try {
                    if (!orgId) { showToast('Select an organization first', { severity: 'warning' }); return; }
                    const name = window.prompt('Folder name');
                    if (!name) return;
                    const parentId = selectedFolderId && folders.find(f => f.id === selectedFolderId)?.parent_id === null
                      ? selectedFolderId
                      : null;
                    const f = await createFolder({ org_id: orgId, name, parent_id: parentId ?? null });
                    setFolders(prev => [...prev, f]);
                    showToast('Folder created', { severity: 'success' });
                  } catch (e: any) {
                    showToast(e?.message || 'Failed to create folder', { severity: 'error' });
                  }
                }}
                style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }}
              >New</button>
              <button
                type="button"
                title="Rename Folder"
                onClick={async () => {
                  try {
                    if (!selectedFolderId) { showToast('Select a folder first', { severity: 'warning' }); return; }
                    const current = folders.find(f => f.id === selectedFolderId);
                    if (!current) { showToast('Folder not found', { severity: 'warning' }); return; }
                    const name = window.prompt('New name', current.name);
                    if (!name || name === current.name) return;
                    const { data, error } = await supabase
                      .from('document_folders')
                      .update({ name })
                      .eq('id', selectedFolderId)
                      .select('*')
                      .single();
                    if (error) throw error;
                    setFolders(prev => prev.map(f => f.id === selectedFolderId ? (data as any) : f));
                    showToast('Folder renamed', { severity: 'success' });
                  } catch (e: any) {
                    showToast(e?.message || 'Failed to rename folder', { severity: 'error' });
                  }
                }}
                style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }}
              >Rename</button>
              <button
                type="button"
                title="Delete Folder"
                onClick={async () => {
                  try {
                    if (!selectedFolderId) { showToast('Select a folder first', { severity: 'warning' }); return; }
                    const ok = window.confirm('Delete this folder? (Will fail if it has subfolders/documents)');
                    if (!ok) return;
                    await deleteFolder(selectedFolderId);
                    setFolders(prev => prev.filter(f => f.id !== selectedFolderId));
                    setSelectedFolderId(await getUnfiledFolderId(orgId) );
                    showToast('Folder deleted', { severity: 'success' });
                  } catch (e: any) {
                    showToast(e?.message || 'Failed to delete folder (ensure it has no subfolders/documents)', { severity: 'error' });
                  }
                }}
                style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }}
              >Delete</button>
            </div>
            <button
              type="button"
              onClick={() => {
                if (!selectedFolderId) { showToast('Select a folder first', { severity: 'info' }); return; }
                setFolderPermsOpen(true);
              }}
              style={{ padding: '4px 6px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }}
            >Permissions</button>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4, overflowY: 'auto', maxHeight: 680 }}>
            {(() => {
              // Build children map
              const children: Record<string, DocumentFolder[]> = {};
              const roots: DocumentFolder[] = [];
              folders.forEach(f => {
                if (f.parent_id) {
                  (children[f.parent_id] ||= []).push(f);
                } else {
                  roots.push(f);
                }
              });
              Object.values(children).forEach(arr => arr.sort((a,b) => (a.position - b.position) || a.name.localeCompare(b.name)));
              roots.sort((a,b) => (a.position - b.position) || a.name.localeCompare(b.name));

              // Expand/collapse state: expand roots and selected ancestry
              const isExpanded = (id: string) => expandedFolders.has(id);
              const toggle = (id: string) => {
                setExpandedFolders(prev => {
                  const next = new Set(prev);
                  if (next.has(id)) next.delete(id); else next.add(id);
                  return next;
                });
              };

              const handleSwapPositions = async (a: DocumentFolder, b: DocumentFolder) => {
                try {
                  await supabase.from('document_folders').update({ position: b.position }).eq('id', a.id);
                  await supabase.from('document_folders').update({ position: a.position }).eq('id', b.id);
                  const fs = await listFolders(orgId);
                  setFolders(fs);
                } catch (e) { console.warn(e); }
              };

              const renderNode = (node: DocumentFolder, depth: number): any => {
                const kids = children[node.id] || [];
                const isSelected = node.id === selectedFolderId;
                return (
                  <div key={node.id}
                    draggable
                    onDragStart={(e) => { e.dataTransfer.setData('text/plain', node.id); }}
                    onDragOver={(e) => { e.preventDefault(); }}
                    onDrop={(e) => {
                      e.preventDefault();
                      const sourceId = e.dataTransfer.getData('text/plain');
                      if (!sourceId || sourceId === node.id) return;
                      const source = folders.find(f => f.id === sourceId);
                      if (!source) return;
                      // If same parent: swap positions; else move under the target folder as last child
                      if ((source.parent_id || '') === (node.parent_id || '')) {
                        handleSwapPositions(source as any, node);
                      } else {
                        (async () => {
                          try {
                            // Move under node as child with last position among its current children
                            const kids = (children[node.id] || []).slice().sort((a,b) => a.position - b.position);
                            const lastPos = kids.length ? kids[kids.length - 1].position : -1;
                            await supabase.from('document_folders').update({ parent_id: node.id, position: lastPos + 1 }).eq('id', source.id);
                            const fs = await listFolders(orgId);
                            setFolders(fs);
                          } catch (e) { console.warn(e); }
                        })();
                      }
                    }}
                  >
                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      {kids.length > 0 && (
                        <button onClick={() => toggle(node.id)} title={isExpanded(node.id) ? 'Collapse' : 'Expand'} style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '0 4px', cursor: 'pointer' }}>
                          {isExpanded(node.id) ? '▾' : '▸'}
                        </button>
                      )}
                      <button
                        onClick={() => setSelectedFolderId(node.id)}
                        style={{
                          textAlign: 'left',
                          padding: '6px 8px',
                          paddingLeft: 8 + depth * 12,
                          borderRadius: 6,
                          border: '1px solid var(--border)',
                          background: isSelected ? 'var(--hover-bg)' : 'transparent',
                          cursor: 'pointer',
                          flex: 1
                        }}
                        title={folderPaths[node.id] || node.name}
                      >
                        {kids.length > 0 ? '📁' : '📄'} {node.name}
                      </button>
                      {/* Reorder within siblings: simple up/down */}
                      <button
                        title="Move up"
                        onClick={async () => {
                          try {
                            const sibs = (children[node.parent_id || ''] || (node.parent_id ? children[node.parent_id] : roots)).slice();
                            const idx = sibs.findIndex(s => s.id === node.id);
                            if (idx <= 0) return;
                            const prevSib = sibs[idx - 1];
                            await handleSwapPositions(node, prevSib);
                          } catch (e) { console.warn(e); }
                        }}
                        style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '0 6px', cursor: 'pointer' }}
                      >↑</button>
                      <button
                        title="Move down"
                        onClick={async () => {
                          try {
                            const sibs = (children[node.parent_id || ''] || (node.parent_id ? children[node.parent_id] : roots)).slice();
                            const idx = sibs.findIndex(s => s.id === node.id);
                            if (idx < 0 || idx >= sibs.length - 1) return;
                            const nextSib = sibs[idx + 1];
                            await handleSwapPositions(node, nextSib);
                          } catch (e) { console.warn(e); }
                        }}
                        style={{ border: '1px solid var(--border)', borderRadius: 4, padding: '0 6px', cursor: 'pointer' }}
                      >↓</button>
                    </div>
                    {isExpanded(node.id) && kids.map(child => renderNode(child, depth + 1))}
                  </div>
                );
              };

              return roots.map(r => renderNode(r, 0));
            })()}
          </div>
        </div>
        {/* Right: existing layout */}
        <div>
          <div style={{ display: 'flex', gap: 8, marginBottom: 8 }}>
            <button
              type="button"
              onClick={async () => {
                try {
                  if (!selectedDocument?.id) { showToast('Open a document first (click to open details)', { severity: 'info' }); return; }
                  if (!selectedFolderId) { showToast('Select a destination folder from the left', { severity: 'info' }); return; }
                  await moveDocument(selectedDocument.id, selectedFolderId);
                  showToast('Document moved to selected folder', { severity: 'success' });
                } catch (e: any) {
                  showToast(e?.message || 'Failed to move document', { severity: 'error' });
                }
              }}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }}
            >Move Open Doc to Selected Folder</button>

            <button
              type="button"
              onClick={async () => {
                try {
                  if (!selectedIds.length) { showToast('Select documents (checkbox) first', { severity: 'info' }); return; }
                  if (!selectedFolderId) { showToast('Select a destination folder from the left', { severity: 'info' }); return; }
                  await Promise.all(selectedIds.map(id => moveDocument(id, selectedFolderId)));
                  showToast('Selected documents moved', { severity: 'success' });
                } catch (e: any) {
                  showToast(e?.message || 'Failed to move selected documents', { severity: 'error' });
                }
              }}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }}
            >Move Selected to Folder</button>

            <button
              type="button"
              onClick={async () => {
                try {
                  if (!selectedIds.length) { showToast('Select documents first', { severity: 'info' }); return; }
                  // Sequential download
                  for (const id of selectedIds) {
                    let storagePath: string | null = null;
                    const row = (documents as any[]).find(d => d.id === id) as any;
                    storagePath = row?.storage_path || null;
                    if (!storagePath) {
                      const { supabase } = await import('../../../utils/supabase');
                      const { data } = await supabase.from('documents').select('storage_path').eq('id', id).single();
                      storagePath = (data as any)?.storage_path || null;
                    }
                    if (storagePath) {
                      const url = await getSignedUrl(storagePath);
                      window.open(url, '_blank', 'noopener');
                    }
                  }
                } catch (e: any) {
                  showToast(e?.message || 'Failed to download selected', { severity: 'error' });
                }
              }}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }}
            >Download Selected</button>

            <button
              type="button"
              onClick={async () => {
                try {
                  if (!selectedIds.length) { showToast('Select documents first', { severity: 'info' }); return; }
                  // Collect storage paths for ZIP (current versions)
                  const paths: string[] = [];
                  const { supabase } = await import('../../../utils/supabase');
                  for (const id of selectedIds) {
                    let p: string | null = null;
                    const row = (documents as any[]).find(d => d.id === id) as any;
                    p = row?.storage_path || null;
                    if (!p) {
                      const { data } = await supabase
                        .from('documents')
                        .select('storage_path')
                        .eq('id', id)
                        .single();
                      p = (data as any)?.storage_path || null;
                    }
                    if (p) paths.push(p);
                  }
                  if (!paths.length) { showToast('No files found for selected documents', { severity: 'warning' }); return; }
                  await downloadZip(paths, 'documents');
                } catch (e: any) {
                  showToast(e?.message || 'Failed to build ZIP', { severity: 'error' });
                }
              }}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }}
            >Download Selected as ZIP</button>

            <button
              type="button"
              onClick={async () => {
                try {
                  if (!selectedIds.length) { showToast('Select documents first', { severity: 'info' }); return; }
                  const ok = window.confirm(`Delete ${selectedIds.length} document(s)? This will remove their files.`);
                  if (!ok) return;
                  for (const id of selectedIds) await deleteDocument(id);
                  showToast('Selected documents deleted', { severity: 'success' });
                } catch (e: any) {
                  showToast(e?.message || 'Failed to delete selected', { severity: 'error' });
                }
              }}
              style={{ padding: '6px 10px', borderRadius: 6, border: '1px solid var(--border)', cursor: 'pointer' }}
            >Delete Selected</button>
          </div>
          <DocumentManagementLayout {...layoutProps}
            onMoveToSelectedFolder={async (docId) => {
              try {
                if (!selectedFolderId) { showToast('Select a destination folder from the left', { severity: 'info' }); return; }
                await moveDocument(docId, selectedFolderId);
                showToast('Document moved to selected folder', { severity: 'success' });
              } catch (e: any) {
                showToast(e?.message || 'Failed to move document', { severity: 'error' });
              }
            }}
            onOpenDocumentPermissions={(docId) => { setDocPermsId(docId); setDocPermsOpen(true); }}
            onLinkToCurrentProject={async (docId) => {
              try {
                if (!projectId) { showToast('Select a project first', { severity: 'info' }); return; }
                const { linkDocument } = await import('../../../services/documents');
                await linkDocument(docId, 'projects', projectId);
                showToast('Linked to current project', { severity: 'success' });
              } catch (e: any) { showToast(e?.message || 'Failed to link to project', { severity: 'error' }); }
            }}
            onDownloadDocument={async (docId) => {
              try {
                // Get current version storage_path and open
                const row = (documents as any[]).find(d => d.id === docId) as any;
                // Fallback to service if not present
                let storagePath = row?.storage_path;
                if (!storagePath) {
                  const { supabase } = await import('../../../utils/supabase');
                  const { data } = await supabase.from('documents').select('storage_path').eq('id', docId).single();
                  storagePath = (data as any)?.storage_path;
                }
                if (!storagePath) { showToast('No storage path found', { severity: 'warning' }); return; }
                const url = await getSignedUrl(storagePath);
                window.open(url, '_blank', 'noopener');
              } catch (e: any) {
                showToast(e?.message || 'Failed to download', { severity: 'error' });
              }
            }}
          />
        </div>
      </div>
      <DocumentDetailsDrawer
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        document={selectedDocument}
      />
      {selectedFolderId && (
        <FolderPermissionsDialog
          open={folderPermsOpen}
          onClose={() => setFolderPermsOpen(false)}
          folderId={selectedFolderId}
        />
      )}
      {docPermsOpen && docPermsId && (
        <DocumentPermissionsDialog
          open={docPermsOpen}
          onClose={() => setDocPermsOpen(false)}
          documentId={docPermsId}
        />
      )}
      {/* Category select for upload */}
      {orgId && (
        <CategorySelectDialog
          open={categoryDialogOpen}
          orgId={orgId}
          onCancel={() => { setCategoryDialogOpen(false); setPendingFile(null); try { if (fileInputRef.current) (fileInputRef.current as any).value=''; } catch {} }}
          onSelect={async (categoryId) => {
            try {
              if (!pendingFile) return;
              const file = pendingFile;
              const title = (file as any).name?.split('.')?.slice(0, -1).join('.') || 'Untitled document';
              const { version } = await uploadDocument({ orgId, title, file, folderId: selectedFolderId || undefined, categoryId: categoryId || undefined });
              try { const url = await getSignedUrl(version.storage_path); console.debug('Signed URL generated', url); } catch {}
              showToast('Document uploaded successfully', { severity: 'success' });
            } catch (err: any) {
              console.error('Upload failed', err);
              showToast(err?.message || 'Upload failed', { severity: 'error' });
            } finally {
              setCategoryDialogOpen(false);
              setPendingFile(null);
              try { if (fileInputRef.current) (fileInputRef.current as any).value=''; } catch {}
            }
          }}
        />
      )}
    </>
  );
};

export default DocumentManagementPage;