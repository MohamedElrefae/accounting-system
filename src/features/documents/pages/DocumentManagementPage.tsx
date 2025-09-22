import React, { useState, useEffect, useCallback, useMemo, useRef } from 'react';
import { useToast } from '../../../contexts/ToastContext';
import { useHasPermission } from '../../../hooks/useHasPermission';
import { getOrganizations } from '../../../services/organization';
import { getActiveOrgId, getActiveProjectId } from '../../../utils/org';
import { supabase } from '../../../utils/supabase';
import { useDocuments } from '../../../hooks/documents/useDocuments';
import { uploadDocument, getSignedUrl, type Document as SvcDocument } from '../../../services/documents';
import DocumentDetailsDrawer from '../../../components/documents/DocumentDetailsDrawer';

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
  
  // Search and Filter state
  const [searchText, setSearchText] = useState<string>('');
  const [activeFilters, setActiveFilters] = useState<string[]>([]);
  
  // UI state
  const [viewMode, setViewMode] = useState<'grid' | 'list'>('grid');
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [isInitializing, setIsInitializing] = useState(true);
  const [detailsOpen, setDetailsOpen] = useState(false);
  const [selectedDocument, setSelectedDocument] = useState<SvcDocument | null>(null);
  
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
      limit: 20,
      offset: 0,
      orderBy: { column: 'updated_at' as const, ascending: false },
      fts: debouncedSearchText.length > 2, // Use full-text search for longer queries
    };
  }, [orgId, debouncedSearchText, activeFilters, projectId]);
  
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
  
  // Load projects when organization changes
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
  }, [showToast]);
  
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
      if (!orgId) {
        showToast('Select an organization first', { severity: 'warning' });
        return;
      }
      const title = (file as any).name?.split('.')?.slice(0, -1).join('.') || 'Untitled document';
      const { document, version } = await uploadDocument({ orgId, title, file });
      // Try to get a quick signed URL to validate storage path
      try {
        const url = await getSignedUrl(version.storage_path);
        console.debug('Signed URL generated', url);
      } catch {}
      showToast('Document uploaded successfully', { severity: 'success' });
    } catch (err: any) {
      console.error('Upload failed', err);
      showToast(err?.message || 'Upload failed', { severity: 'error' });
    }
  }, [orgId, showToast]);

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
      <DocumentManagementLayout {...layoutProps} />
      <DocumentDetailsDrawer
        open={detailsOpen}
        onClose={() => setDetailsOpen(false)}
        document={selectedDocument}
      />
    </>
  );
};

export default DocumentManagementPage;