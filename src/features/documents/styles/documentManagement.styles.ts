import { styled, Box, Container } from '@mui/material';

// Full-screen page root with CSS Grid
export const PageRoot = styled(Box)(({ theme }) => ({
  display: 'grid',
  gridTemplateRows: 'auto 1fr',
  minHeight: '100dvh',
  background: 'var(--background)',
  color: 'var(--text)',
  direction: theme.direction,
}));

// Container with max width and responsive padding
export const PageContainer = styled(Container)(({ theme }) => ({
  maxInlineSize: 'var(--container-max)',
  inlineSize: '100%',
  marginInline: 'auto',
  paddingInline: 'var(--content-padding)',
  paddingBlock: 'var(--section-gap)',
  maxWidth: 'none !important', // Override MUI Container default maxWidth
  
  // RTL/LTR support through logical properties
  [theme.breakpoints.up('md')]: {
    paddingInline: 'calc(var(--content-padding) * 1.5)',
  },
  
  [theme.breakpoints.up('lg')]: {
    paddingInline: 'calc(var(--content-padding) * 2)',
  },
}));

// Main content area with proper overflow handling
export const MainContent = styled(Box)({
  minHeight: 0,
  height: '100%',
  overflow: 'auto',
  background: 'transparent',
  paddingBlockStart: 'var(--section-gap)',
  
  // Enable smooth scrolling
  scrollBehavior: 'smooth',
  
  // Custom scrollbar styling (webkit browsers)
  '&::-webkit-scrollbar': {
    width: '8px',
  },
  
  '&::-webkit-scrollbar-track': {
    background: 'transparent',
  },
  
  '&::-webkit-scrollbar-thumb': {
    background: 'var(--border)',
    borderRadius: '4px',
  },
  
  '&::-webkit-scrollbar-thumb:hover': {
    background: 'var(--muted_text)',
  },
});

// Document grid container for responsive document cards
export const DocumentGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gap: 'var(--control-gap)',
  
  // Responsive grid columns
  [theme.breakpoints.down('md')]: {
    gridTemplateColumns: '1fr',
  },
  
  [theme.breakpoints.up('md')]: {
    gridTemplateColumns: 'repeat(auto-fill, minmax(320px, 1fr))',
  },
  
  [theme.breakpoints.up('lg')]: {
    gridTemplateColumns: 'repeat(auto-fill, minmax(380px, 1fr))',
  },
}));

// Document card with theme-aware styling
export const DocumentCard = styled(Box)(({ theme }) => ({
  padding: 'var(--section-gap)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  background: 'var(--surface)',
  cursor: 'pointer',
  transition: 'all 120ms ease',
  position: 'relative',
  
  '&:hover': {
    background: 'var(--hover-bg)',
    borderColor: 'var(--accent)',
    boxShadow: 'var(--shadow-sm)',
    transform: 'translateY(-1px)',
  },
  
  '&:focus-within': {
    outline: '2px solid var(--accent)',
    outlineOffset: '2px',
  },
  
  // RTL support for any directional content
  direction: theme.direction,
}));

// Loading and empty states
export const LoadingContainer = styled(Box)({
  display: 'flex',
  justifyContent: 'center',
  alignItems: 'center',
  minHeight: '200px',
  color: 'var(--muted_text)',
});

export const EmptyState = styled(Box)({
  display: 'flex',
  flexDirection: 'column',
  alignItems: 'center',
  justifyContent: 'center',
  minHeight: '300px',
  color: 'var(--muted_text)',
  textAlign: 'center',
  gap: 'var(--control-gap)',
});