import React, { useState, useCallback, useMemo } from 'react';
import {
  InputAdornment,
  IconButton,
  Menu,
  MenuItem,
  useMediaQuery,
  useTheme,
  Popover,
  Divider,
  Stack,
  FormControlLabel,
  Checkbox,
  alpha,
  Fade,
  Grow,
} from '@mui/material';
import {
  Search as SearchIcon,
  Add as AddIcon,
  CloudUpload as CloudUploadIcon,
  MoreVert as MoreVertIcon,
  Close as CloseIcon,
  Tune as TuneIcon,
  Download as DownloadIcon,
} from '@mui/icons-material';
import {
  Loader2,
  CheckCircle,
  AlertCircle,
} from 'lucide-react';

// Temporarily use plain MUI components
import {
  Paper,
  Box,
  TextField,
  Button,
  Chip,
  Typography,
} from '@mui/material';

// Import CSS for ultimate buttons
import './DocumentControlsBar.css';

interface ButtonState {
  loading: boolean;
  success: boolean;
  error: boolean;
}

export interface DocumentControlsBarProps {
  // Current values
  searchText: string;
  activeFilters: string[];
  
  // Change handlers
  onSearchChange: (search: string) => void;
  onFilterToggle: (filter: string) => void;
  onFilterClear: () => void;
  
  // Action handlers
  onNewDocument: () => Promise<void> | void;
  onUploadDocument: () => Promise<void> | void;
  onExportDocuments: () => Promise<void> | void;
  
  // Loading states
  isLoading?: boolean;
  
  // Permissions
  canCreate?: boolean;
  canUpload?: boolean;
  canExport?: boolean;
}

// Available document status filters
const STATUS_FILTERS = [
  { key: 'draft', label: 'Draft', color: 'default' as const },
  { key: 'submitted', label: 'Submitted', color: 'info' as const },
  { key: 'approved', label: 'Approved', color: 'success' as const },
  { key: 'rejected', label: 'Rejected', color: 'error' as const },
  { key: 'archived', label: 'Archived', color: 'secondary' as const },
];

const DocumentControlsBar: React.FC<DocumentControlsBarProps> = ({
  searchText,
  activeFilters,
  onSearchChange,
  onFilterToggle,
  onFilterClear,
  onNewDocument,
  onUploadDocument,
  onExportDocuments,
  isLoading = false,
  canCreate = true,
  canUpload = true,
  canExport = true,
}) => {
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('md'));
  const isRTL = theme.direction === 'rtl';
  
  // Button states for loading/success/error feedback
  const [buttonStates, setButtonStates] = useState<{[key: string]: ButtonState}>({});
  
  // Filter popover state
  const [filterAnchor, setFilterAnchor] = useState<null | HTMLElement>(null);
  const isFilterPopoverOpen = Boolean(filterAnchor);
  
  // More menu state for mobile overflow
  const [moreMenuAnchor, setMoreMenuAnchor] = useState<null | HTMLElement>(null);
  
  // Button state helpers
  const getButtonState = (buttonId: string): ButtonState => {
    return buttonStates[buttonId] || { loading: false, success: false, error: false };
  };

  const handleButtonWithStates = async (
    buttonId: string,
    action: () => Promise<void> | void
  ) => {
    try {
      // Set loading state
      setButtonStates(prev => ({
        ...prev,
        [buttonId]: { loading: true, success: false, error: false }
      }));

      await action();

      // Set success state
      setButtonStates(prev => ({
        ...prev,
        [buttonId]: { loading: false, success: true, error: false }
      }));

      // Reset after 2 seconds
      setTimeout(() => {
        setButtonStates(prev => {
          const newStates = { ...prev };
          delete newStates[buttonId];
          return newStates;
        });
      }, 2000);
    } catch {
      // Set error state
      setButtonStates(prev => ({
        ...prev,
        [buttonId]: { loading: false, success: false, error: true }
      }));

      // Reset after 2 seconds
      setTimeout(() => {
        setButtonStates(prev => {
          const newStates = { ...prev };
          delete newStates[buttonId];
          return newStates;
        });
      }, 2000);
    }
  };
  
  // Filter popover handlers
  const handleFilterOpen = (event: React.MouseEvent<HTMLElement>) => {
    setFilterAnchor(event.currentTarget);
  };
  
  const handleFilterClose = () => {
    setFilterAnchor(null);
  };
  
  // Debounced search handler
  const handleSearchChange = useCallback((event: React.ChangeEvent<HTMLInputElement>) => {
    onSearchChange(event.target.value);
  }, [onSearchChange]);
  
  // Filter chips
  const filterChips = useMemo(() => 
    STATUS_FILTERS.filter(filter => activeFilters.includes(filter.key))
      .map(filter => (
        <Chip
          key={filter.key}
          label={filter.label}
          onDelete={() => onFilterToggle(filter.key)}
          color={filter.color}
          size="small"
          clickable
          sx={{
            borderRadius: 1.5,
            fontWeight: 500,
            '&:hover': {
              backgroundColor: alpha(theme.palette[filter.color]?.main || theme.palette.primary.main, 0.1),
            },
          }}
        />
      )), [activeFilters, onFilterToggle, theme]
  );
  
  const handleMoreMenuOpen = (event: React.MouseEvent<HTMLElement>) => {
    setMoreMenuAnchor(event.currentTarget);
  };
  
  const handleMoreMenuClose = () => {
    setMoreMenuAnchor(null);
  };
  
  return (
    <Paper 
      elevation={0}
      sx={{ 
        p: 3, 
        mb: 3, 
        background: 'var(--content-bg)',
        borderRadius: 'var(--radius-lg)',
        border: '1px solid var(--border-light)',
        boxShadow: '0 2px 8px rgba(0,0,0,0.08)',
      }}
    >
      <Stack 
        direction={{ xs: 'column', md: 'row' }} 
        spacing={3} 
        alignItems={{ xs: 'stretch', md: 'center' }}
        sx={{ direction: isRTL ? 'rtl' : 'ltr' }}
      >
        {/* Search Section */}
        <Box sx={{ flex: 1, minWidth: { xs: '100%', md: 320 } }}>
          <TextField
            fullWidth
            placeholder="Search documents, tags, content..."
            value={searchText}
            onChange={handleSearchChange}
            disabled={isLoading}
            size="medium"
            InputProps={{
              startAdornment: (
                <InputAdornment position="start">
                  <SearchIcon sx={{ color: 'action.active' }} />
                </InputAdornment>
              ),
            }}
            aria-label="Search documents"
            sx={{
              '& .MuiOutlinedInput-root': {
                backgroundColor: 'background.paper',
                borderRadius: 2,
                '&:hover': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                  },
                },
                '&.Mui-focused': {
                  '& .MuiOutlinedInput-notchedOutline': {
                    borderColor: 'primary.main',
                    borderWidth: 2,
                  },
                },
              },
            }}
          />
        </Box>
        
        {/* Filters Section */}
        <Box sx={{ 
          display: 'flex', 
          alignItems: 'center', 
          gap: 1.5,
          flexWrap: 'wrap',
          justifyContent: { xs: 'center', md: 'flex-start' },
        }}>
          {/* Active Filter Chips */}
          {filterChips.length > 0 && (
            <Box sx={{ display: 'flex', gap: 0.5, flexWrap: 'wrap' }}>
              {filterChips}
            </Box>
          )}
          
          {/* Filter Button */}
          <IconButton
            onClick={handleFilterOpen}
            aria-label="Open filters"
            aria-haspopup="true"
            aria-expanded={isFilterPopoverOpen}
            sx={{
              backgroundColor: isFilterPopoverOpen ? 'primary.main' : 'background.paper',
              color: isFilterPopoverOpen ? 'primary.contrastText' : 'text.secondary',
              border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
              borderRadius: 2,
              p: 1.5,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: isFilterPopoverOpen ? 'primary.dark' : 'action.hover',
                transform: 'translateY(-1px)',
                boxShadow: '0 4px 8px rgba(0, 0, 0, 0.12)',
              },
            }}
          >
            <TuneIcon />
          </IconButton>
          
          {/* Clear Filters Button */}
          {activeFilters.length > 0 && (
            <Fade in={true}>
              <IconButton
                onClick={onFilterClear}
                aria-label="Clear all filters"
                size="small"
                sx={{
                  backgroundColor: 'error.light',
                  color: 'error.contrastText',
                  borderRadius: 2,
                  p: 1,
                  transition: 'all 0.2s ease-in-out',
                  '&:hover': {
                    backgroundColor: 'error.main',
                    transform: 'scale(1.05)',
                  },
                }}
              >
                <CloseIcon fontSize="small" />
              </IconButton>
            </Fade>
          )}
        </Box>
        
        {/* Actions Section */}
        <Box sx={{ 
          display: 'flex', 
          gap: 1.5, 
          alignItems: 'center',
          justifyContent: { xs: 'center', md: 'flex-end' },
        }}>
          {/* Primary Action - New Document */}
          <button
            onClick={() => handleButtonWithStates(
              'new-document',
              async () => onNewDocument && onNewDocument()
            )}
            className={`ultimate-btn ultimate-btn-add ${
              getButtonState('new-document').loading ? 'loading' : ''
            } ${
              getButtonState('new-document').success ? 'success' : ''
            } ${
              getButtonState('new-document').error ? 'error' : ''
            }`}
            disabled={isLoading || !canCreate || getButtonState('new-document').loading}
            title="Create new document"
          >
            <div className="btn-content">
              <div className={`btn-icon ${
                getButtonState('new-document').loading ? 'spinning' : ''
              }`}>
                {getButtonState('new-document').loading ? (
                  <Loader2 size={14} />
                ) : getButtonState('new-document').success ? (
                  <CheckCircle size={14} />
                ) : getButtonState('new-document').error ? (
                  <AlertCircle size={14} />
                ) : (
                  <AddIcon sx={{ fontSize: 14 }} />
                )}
              </div>
              <span className="btn-text">{isMobile ? 'New' : 'New Document'}</span>
            </div>
          </button>
          
          {/* Secondary Actions - Hidden on mobile, moved to overflow menu */}
          {!isMobile && (
            <>
              <button
                onClick={() => handleButtonWithStates(
                  'upload-document',
                  async () => onUploadDocument && onUploadDocument()
                )}
                className={`ultimate-btn ultimate-btn-edit ${
                  getButtonState('upload-document').loading ? 'loading' : ''
                } ${
                  getButtonState('upload-document').success ? 'success' : ''
                } ${
                  getButtonState('upload-document').error ? 'error' : ''
                }`}
                disabled={isLoading || !canUpload || getButtonState('upload-document').loading}
                title="Upload document file"
              >
                <div className="btn-content">
                  <div className={`btn-icon ${
                    getButtonState('upload-document').loading ? 'spinning' : ''
                  }`}>
                    {getButtonState('upload-document').loading ? (
                      <Loader2 size={14} />
                    ) : getButtonState('upload-document').success ? (
                      <CheckCircle size={14} />
                    ) : getButtonState('upload-document').error ? (
                      <AlertCircle size={14} />
                    ) : (
                      <CloudUploadIcon sx={{ fontSize: 14 }} />
                    )}
                  </div>
                  <span className="btn-text">Upload</span>
                </div>
              </button>
              
              <button
                onClick={() => handleButtonWithStates(
                  'export-documents',
                  async () => onExportDocuments && onExportDocuments()
                )}
                className={`ultimate-btn ultimate-btn-warning ${
                  getButtonState('export-documents').loading ? 'loading' : ''
                } ${
                  getButtonState('export-documents').success ? 'success' : ''
                } ${
                  getButtonState('export-documents').error ? 'error' : ''
                }`}
                disabled={isLoading || !canExport || getButtonState('export-documents').loading}
                title="Export documents"
              >
                <div className="btn-content">
                  <div className={`btn-icon ${
                    getButtonState('export-documents').loading ? 'spinning' : ''
                  }`}>
                    {getButtonState('export-documents').loading ? (
                      <Loader2 size={14} />
                    ) : getButtonState('export-documents').success ? (
                      <CheckCircle size={14} />
                    ) : getButtonState('export-documents').error ? (
                      <AlertCircle size={14} />
                    ) : (
                      <DownloadIcon sx={{ fontSize: 14 }} />
                    )}
                  </div>
                  <span className="btn-text">Export</span>
                </div>
              </button>
            </>
          )}
          
          {/* More menu for mobile overflow */}
          {isMobile && (
            <>
              <IconButton
                onClick={handleMoreMenuOpen}
                aria-label="More actions"
                aria-haspopup="true"
                aria-expanded={Boolean(moreMenuAnchor)}
                sx={{
                  backgroundColor: 'background.paper',
                  border: `1px solid ${alpha(theme.palette.divider, 0.2)}`,
                  borderRadius: 2,
                  p: 1.5,
                  '&:hover': {
                    backgroundColor: 'action.hover',
                  },
                }}
              >
                <MoreVertIcon />
              </IconButton>
              
              <Menu
                anchorEl={moreMenuAnchor}
                open={Boolean(moreMenuAnchor)}
                onClose={handleMoreMenuClose}
                anchorOrigin={{
                  vertical: 'bottom',
                  horizontal: isRTL ? 'left' : 'right',
                }}
                transformOrigin={{
                  vertical: 'top',
                  horizontal: isRTL ? 'left' : 'right',
                }}
                PaperProps={{
                  sx: {
                    borderRadius: 2,
                    boxShadow: '0 8px 24px rgba(0, 0, 0, 0.12)',
                    minWidth: 160,
                  },
                }}
              >
                <MenuItem
                  onClick={() => {
                    handleButtonWithStates(
                      'mobile-upload',
                      async () => onUploadDocument && onUploadDocument()
                    );
                    handleMoreMenuClose();
                  }}
                  disabled={!canUpload || getButtonState('mobile-upload').loading}
                  sx={{ py: 1.5, gap: 1.5 }}
                >
                  {getButtonState('mobile-upload').loading ? (
                    <Loader2 size={16} className="spinning" />
                  ) : (
                    <CloudUploadIcon fontSize="small" />
                  )}
                  Upload
                </MenuItem>
                <MenuItem
                  onClick={() => {
                    handleButtonWithStates(
                      'mobile-export',
                      async () => onExportDocuments && onExportDocuments()
                    );
                    handleMoreMenuClose();
                  }}
                  disabled={!canExport || getButtonState('mobile-export').loading}
                  sx={{ py: 1.5, gap: 1.5 }}
                >
                  {getButtonState('mobile-export').loading ? (
                    <Loader2 size={16} className="spinning" />
                  ) : (
                    <DownloadIcon fontSize="small" />
                  )}
                  Export
                </MenuItem>
              </Menu>
            </>
          )}
        </Box>
      </Stack>
      
      {/* Filter Popover */}
      <Popover
        open={isFilterPopoverOpen}
        anchorEl={filterAnchor}
        onClose={handleFilterClose}
        anchorOrigin={{
          vertical: 'bottom',
          horizontal: isRTL ? 'right' : 'left',
        }}
        transformOrigin={{
          vertical: 'top',
          horizontal: isRTL ? 'right' : 'left',
        }}
        PaperProps={{
          sx: {
            borderRadius: 3,
            boxShadow: '0 12px 32px rgba(0, 0, 0, 0.12)',
            border: `1px solid ${alpha(theme.palette.divider, 0.08)}`,
            minWidth: 320,
            maxWidth: 400,
          },
        }}
        TransitionComponent={Grow}
        transitionDuration={200}
      >
        <Box sx={{ p: 3 }}>
          <Box sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'space-between',
            mb: 2 
          }}>
            <Typography 
              variant="h6" 
              sx={{ 
                fontWeight: 600,
                color: 'text.primary',
                display: 'flex',
                alignItems: 'center',
                gap: 1,
              }}
            >
              <TuneIcon color="primary" />
              Document Filters
            </Typography>
            <IconButton
              onClick={handleFilterClose}
              size="small"
              aria-label="Close filters"
              sx={{
                color: 'text.secondary',
                '&:hover': {
                  backgroundColor: 'action.hover',
                },
              }}
            >
              <CloseIcon fontSize="small" />
            </IconButton>
          </Box>
          
          <Divider sx={{ mb: 2 }} />
          
          <Stack spacing={1.5}>
            <Typography 
              variant="subtitle2" 
              sx={{ 
                fontWeight: 600,
                color: 'text.secondary',
                textTransform: 'uppercase',
                fontSize: '0.75rem',
                letterSpacing: '0.5px',
              }}
            >
              Status Filters
            </Typography>
            
            {STATUS_FILTERS.map((filter) => {
              const isActive = activeFilters.includes(filter.key);
              return (
                <FormControlLabel
                  key={filter.key}
                  control={
                    <Checkbox
                      checked={isActive}
                      onChange={() => onFilterToggle(filter.key)}
                      size="small"
                      sx={{
                        color: `${filter.color}.main`,
                        '&.Mui-checked': {
                          color: `${filter.color}.main`,
                        },
                      }}
                    />
                  }
                  label={
                    <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                      <Typography 
                        variant="body2" 
                        sx={{ 
                          fontWeight: isActive ? 600 : 400,
                          color: isActive ? 'text.primary' : 'text.secondary',
                        }}
                      >
                        {filter.label}
                      </Typography>
                      {isActive && (
                        <Chip
                          size="small"
                          label="Active"
                          color={filter.color}
                          variant="outlined"
                          sx={{ 
                            height: 20,
                            fontSize: '0.6rem',
                            '& .MuiChip-label': {
                              px: 1,
                            },
                          }}
                        />
                      )}
                    </Box>
                  }
                  sx={{
                    m: 0,
                    p: 1,
                    borderRadius: 1,
                    transition: 'all 0.2s ease-in-out',
                    '&:hover': {
                      backgroundColor: alpha(theme.palette[filter.color]?.main || theme.palette.primary.main, 0.04),
                    },
                  }}
                />
              );
            })}
            
            {activeFilters.length > 0 && (
              <>
                <Divider sx={{ my: 1 }} />
                <Button
                  variant="outlined"
                  color="error"
                  size="small"
                  onClick={onFilterClear}
                  startIcon={<CloseIcon />}
                  fullWidth
                  sx={{
                    borderRadius: 2,
                    py: 1,
                    textTransform: 'none',
                    fontWeight: 500,
                  }}
                >
                  Clear All Filters
                </Button>
              </>
            )}
          </Stack>
        </Box>
      </Popover>
    </Paper>
  );
};

export default DocumentControlsBar;