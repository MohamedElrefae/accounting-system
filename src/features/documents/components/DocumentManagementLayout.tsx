import React from 'react';
import { Typography, CircularProgress, IconButton, Menu, MenuItem } from '@mui/material';
import { 
  PageRoot, 
  PageContainer, 
  MainContent, 
  DocumentGrid,
  DocumentCard,
  LoadingContainer,
  EmptyState 
} from '../styles/documentManagement.styles';

import DocumentControlsBar, { type DocumentControlsBarProps } from './DocumentControlsBar';

export interface Document {
  id: string;
  title: string;
  description?: string;
  status: 'draft' | 'submitted' | 'approved' | 'rejected' | 'archived';
  category_id?: string;
  project_id?: string;
  updated_at: string;
  created_at: string;
  file_url?: string;
  file_size?: number;
  mime_type?: string;
}

export interface DocumentManagementLayoutProps extends DocumentControlsBarProps {
  // Document data
  documents: Document[];
  totalCount: number;
  
  // Loading states
  documentsLoading?: boolean;
  
  // View mode
  viewMode?: 'grid' | 'list';
  
  // Document interaction handlers
  onDocumentClick?: (document: Document) => void;
  onDocumentSelect?: (documentIds: string[]) => void;
  selectedDocumentIds?: string[];

  // Lookup maps for display (optional)
  categoryNames?: Record<string, string>;
  folderPaths?: Record<string, string>;
  
  // Actions
  onMoveToSelectedFolder?: (documentId: string) => void;
  onDownloadDocument?: (documentId: string) => void;
  onOpenDocumentPermissions?: (documentId: string) => void;
  onLinkToCurrentProject?: (documentId: string) => void;
  
  // Pagination
  currentPage?: number;
  pageSize?: number;
  onPageChange?: (page: number) => void;
  
  // Error handling
  error?: string | null;
}

const DocumentManagementLayout: React.FC<DocumentManagementLayoutProps> = ({
  // Controls props
  organizations,
  projects,
  orgId,
  projectId,
  searchText,
  activeFilters,
  onOrgChange,
  onProjectChange,
  onSearchChange,
  onFilterToggle,
  onFilterClear,
  onNewDocument,
  onUploadDocument,
  onExportDocuments,
  isLoading,
  canCreate,
  canUpload,
  canExport,
  
  // Document data
  documents,
  totalCount,
  documentsLoading,
  viewMode = 'grid',
  onDocumentClick,
  onDocumentSelect,
  selectedDocumentIds = [],
  categoryNames,
  folderPaths,
  onMoveToSelectedFolder,
  onDownloadDocument,
  onOpenDocumentPermissions,
  onLinkToCurrentProject,
  currentPage = 1,
  pageSize = 20,
  onPageChange,
  error,
}) => {
  // Helper function to format file size
  const formatFileSize = (bytes?: number) => {
    if (!bytes) return '';
    const units = ['B', 'KB', 'MB', 'GB'];
    let size = bytes;
    let unitIndex = 0;
    
    while (size >= 1024 && unitIndex < units.length - 1) {
      size /= 1024;
      unitIndex++;
    }
    
    return `${Math.round(size * 10) / 10} ${units[unitIndex]}`;
  };
  
  // Helper function to format date
  const formatDate = (dateString: string) => {
    try {
      return new Date(dateString).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'short',
        day: 'numeric',
        hour: '2-digit',
        minute: '2-digit',
      });
    } catch {
      return dateString;
    }
  };
  
  // Helper function to get status color
  const getStatusColor = (status: Document['status']) => {
    switch (status) {
      case 'draft': return 'default';
      case 'submitted': return 'info';
      case 'approved': return 'success';
      case 'rejected': return 'error';
      case 'archived': return 'secondary';
      default: return 'default';
    }
  };
  
  const [menuAnchor, setMenuAnchor] = React.useState<null | HTMLElement>(null);
  const [menuDocId, setMenuDocId] = React.useState<string | null>(null);

  const openMenu = (e: React.MouseEvent<HTMLElement>, id: string) => { setMenuAnchor(e.currentTarget); setMenuDocId(id); };
  const closeMenu = () => { setMenuAnchor(null); setMenuDocId(null); };

  const renderDocuments = () => {
    // Error state
    if (error) {
      return (
        <EmptyState>
          <Typography variant="h6" color="error" gutterBottom>
            Error Loading Documents
          </Typography>
          <Typography variant="body2">
            {error}
          </Typography>
        </EmptyState>
      );
    }
    
    // Loading state
    if (documentsLoading) {
      return (
        <LoadingContainer>
          <CircularProgress />
          <Typography variant="body2" sx={{ mt: 2 }}>
            Loading documents...
          </Typography>
        </LoadingContainer>
      );
    }
    
    // Empty state
    if (!documents || documents.length === 0) {
      return (
        <EmptyState>
          <Typography variant="h6" gutterBottom>
            No Documents Found
          </Typography>
          <Typography variant="body2">
            {searchText || activeFilters.length > 0 
              ? 'Try adjusting your search or filters.'
              : 'Get started by creating your first document.'
            }
          </Typography>
          {canCreate && (
            <Typography 
              variant="body2" 
              color="primary" 
              sx={{ cursor: 'pointer', mt: 1 }}
              onClick={onNewDocument}
            >
              Create New Document
            </Typography>
          )}
        </EmptyState>
      );
    }
    
    // Grid view
    if (viewMode === 'grid') {
      return (
        <DocumentGrid>
          {documents.map((document) => (
            <DocumentCard
              key={document.id}
              onClick={() => onDocumentClick?.(document)}
              role="button"
              tabIndex={0}
              onKeyPress={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  onDocumentClick?.(document);
                }
              }}
              aria-label={`Document: ${document.title}`}
            >
              <div>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 8 }}>
                  {/* Selection checkbox */}
                  {onDocumentSelect && (
                    <input
                      type="checkbox"
                      checked={selectedDocumentIds.includes(document.id)}
                      onChange={(e) => {
                        const next = new Set(selectedDocumentIds);
                        if (e.target.checked) next.add(document.id); else next.delete(document.id);
                        onDocumentSelect(Array.from(next));
                      }}
                      onClick={(e) => e.stopPropagation()}
                      title="Select"
                    />
                  )}
                  <div style={{ marginLeft: 'auto', display: 'flex', gap: 6 }}>
                    {(onDownloadDocument || onMoveToSelectedFolder) && (
                      <IconButton size="small" onClick={(e) => { e.stopPropagation(); openMenu(e, document.id); }} aria-label="More actions">
                        ⋮
                      </IconButton>
                    )}
                  </div>
                </div>
                <Typography 
                  variant="h6" 
                  gutterBottom 
                  sx={{ 
                    fontSize: '1rem',
                    fontWeight: 600,
                    lineHeight: 1.2,
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    display: '-webkit-box',
                    WebkitLineClamp: 2,
                    WebkitBoxOrient: 'vertical',
                  }}
                >
                  {document.title}
                </Typography>
                
                {document.description && (
                  <Typography 
                    variant="body2" 
                    color="textSecondary"
                    sx={{
                      mb: 2,
                      overflow: 'hidden',
                      textOverflow: 'ellipsis',
                      display: '-webkit-box',
                      WebkitLineClamp: 3,
                      WebkitBoxOrient: 'vertical',
                    }}
                  >
                    {document.description}
                  </Typography>
                )}
                
                <div style={{ 
                  display: 'flex', 
                  alignItems: 'center', 
                  gap: '8px',
                  marginBottom: '8px',
                  flexWrap: 'wrap'
                }}>
                  <Typography 
                    variant="caption" 
                    sx={{
                      px: 1,
                      py: 0.25,
                      borderRadius: 'var(--radius-sm)',
                      background: `var(--chip-bg)`,
                      border: '1px solid var(--border)',
                      color: getStatusColor(document.status) === 'error' ? 'var(--error)' :
                             getStatusColor(document.status) === 'success' ? 'var(--success)' :
                             getStatusColor(document.status) === 'info' ? 'var(--accent)' :
                             'var(--text)',
                      textTransform: 'capitalize',
                    }}
                  >
                    {document.status}
                  </Typography>
                  
                  {document.file_size && (
                    <Typography variant="caption" color="textSecondary">
                      {formatFileSize(document.file_size)}
                    </Typography>
                  )}

                  {document.category_id && (
                    <Typography variant="caption" sx={{ px: 1, py: 0.25, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      Category
                    </Typography>
                  )}

                  {document.project_id && (
                    <Typography variant="caption" sx={{ px: 1, py: 0.25, borderRadius: 'var(--radius-sm)', border: '1px solid var(--border)' }}>
                      Project
                    </Typography>
                  )}
                </div>
                
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                  <Typography variant="caption" color="textSecondary">
                    Updated: {formatDate(document.updated_at)}
                  </Typography>
                  <div style={{ display: 'flex', gap: 6 }}>
                    {document.category_id && categoryNames?.[document.category_id] && (
                      <Typography variant="caption" color="textSecondary">{categoryNames[document.category_id]}</Typography>
                    )}
                    {folderPaths && (
                      <Typography variant="caption" color="textSecondary">{folderPaths[document.folder_id as any] || ''}</Typography>
                    )}
                  </div>
                </div>
              </div>
            </DocumentCard>
          ))}
        </DocumentGrid>
      );
    }
    
    // List view (virtualized when large)
    if (documents.length > 100) {
      const Row = ({ index, style }: { index: number; style: React.CSSProperties }) => {
        const document = documents[index];
        return (
          <div style={{ ...style, display: 'flex', alignItems: 'center', padding: '12px 16px', borderBottom: index < documents.length - 1 ? '1px solid var(--border)' : 'none', cursor: 'pointer' }} onClick={() => onDocumentClick?.(document)}>
            <div style={{ flex: 1, minWidth: 0 }}>
              <Typography variant="body2" sx={{ fontWeight: 500, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{document.title}</Typography>
              {document.description && (
                <Typography variant="caption" color="textSecondary" sx={{ overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap', display: 'block' }}>{document.description}</Typography>
              )}
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginLeft: '16px' }}>
              <Typography variant="caption" sx={{ px: 1, py: 0.25, borderRadius: 'var(--radius-sm)', background: 'var(--chip-bg)', border: '1px solid var(--border)', textTransform: 'capitalize', minWidth: '60px', textAlign: 'center' }}>{document.status}</Typography>
              <Typography variant="caption" color="textSecondary" sx={{ minWidth: '100px' }}>{formatDate(document.updated_at)}</Typography>
            </div>
          </div>
        );
      };
      return (
        <div style={{ border: '1px solid var(--border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
          <List height={520} itemCount={documents.length} itemSize={64} width={'100%'}>
            {Row as any}
          </List>
        </div>
      );
    }

    return (
      <div style={{ 
        border: '1px solid var(--border)', 
        borderRadius: 'var(--radius-lg)',
        overflow: 'hidden'
      }}>
        {documents.map((document, index) => (
          <div
            key={document.id}
            onClick={() => onDocumentClick?.(document)}
            style={{
              display: 'flex',
              alignItems: 'center',
              padding: '12px 16px',
              borderBottom: index < documents.length - 1 ? '1px solid var(--border)' : 'none',
              cursor: 'pointer',
              background: 'transparent',
              transition: 'background 120ms ease',
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = 'var(--hover-bg)';
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = 'transparent';
            }}
          >
            <div style={{ flex: 1, minWidth: 0 }}>
              <Typography 
                variant="body2" 
                sx={{ 
                  fontWeight: 500,
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {document.title}
              </Typography>
              {document.description && (
                <Typography 
                  variant="caption" 
                  color="textSecondary"
                  sx={{
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    whiteSpace: 'nowrap',
                    display: 'block',
                  }}
                >
                  {document.description}
                </Typography>
              )}
            </div>
            
            <div style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: '12px',
              marginLeft: '16px'
            }}>
              <Typography 
                variant="caption"
                sx={{
                  px: 1,
                  py: 0.25,
                  borderRadius: 'var(--radius-sm)',
                  background: 'var(--chip-bg)',
                  border: '1px solid var(--border)',
                  textTransform: 'capitalize',
                  minWidth: '60px',
                  textAlign: 'center',
                }}
              >
                {document.status}
              </Typography>
              
              <Typography variant="caption" color="textSecondary" sx={{ minWidth: '100px' }}>
                {formatDate(document.updated_at)}
              </Typography>
            </div>
          </div>
        ))}
      </div>
    );
  };
  
  return (
    <PageRoot>
      <PageContainer>
        {/* Controls Bar */}
        <DocumentControlsBar
          organizations={organizations}
          projects={projects}
          orgId={orgId}
          projectId={projectId}
          searchText={searchText}
          activeFilters={activeFilters}
          onOrgChange={onOrgChange}
          onProjectChange={onProjectChange}
          onSearchChange={onSearchChange}
          onFilterToggle={onFilterToggle}
          onFilterClear={onFilterClear}
          onNewDocument={onNewDocument}
          onUploadDocument={onUploadDocument}
          onExportDocuments={onExportDocuments}
          isLoading={isLoading}
          canCreate={canCreate}
          canUpload={canUpload}
          canExport={canExport}
        />
        
        {/* Main Content Area */}
        <MainContent>
          {renderDocuments()}
          
          {/* Simple pagination info - would typically be replaced with full pagination component */}
          {!documentsLoading && !error && documents.length > 0 && (
            <div style={{ 
              marginTop: 'var(--section-gap)',
              padding: 'var(--control-gap)',
              textAlign: 'center',
              borderTop: '1px solid var(--border)'
            }}>
              <Typography variant="caption" color="textSecondary">
                Showing {documents.length} of {totalCount} documents
                {currentPage > 1 && ` (Page ${currentPage})`}
              </Typography>
            </div>
          )}
        </MainContent>

        {/* Card actions menu */}
        <Menu anchorEl={menuAnchor} open={Boolean(menuAnchor)} onClose={closeMenu} keepMounted>
          {onDownloadDocument && (
            <MenuItem onClick={() => { if (menuDocId) onDownloadDocument(menuDocId); closeMenu(); }}>Download</MenuItem>
          )}
          {onMoveToSelectedFolder && (
            <MenuItem onClick={() => { if (menuDocId) onMoveToSelectedFolder(menuDocId); closeMenu(); }}>Move to selected folder</MenuItem>
          )}
          {onOpenDocumentPermissions && (
            <MenuItem onClick={() => { if (menuDocId) onOpenDocumentPermissions(menuDocId); closeMenu(); }}>Permissions…</MenuItem>
          )}
          {onLinkToCurrentProject && (
            <MenuItem onClick={() => { if (menuDocId) onLinkToCurrentProject(menuDocId); closeMenu(); }}>Link to current project</MenuItem>
          )}
        </Menu>
      </PageContainer>
    </PageRoot>
  );
};

export default DocumentManagementLayout;