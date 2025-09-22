import { styled, Paper, Box, TextField, Button, Chip } from '@mui/material';

// Main ControlsBar container - sticky with modern styling
export const ControlsBarContainer = styled(Paper)(({ theme }) => ({
  background: 'var(--controlbar-bg)',
  border: '1px solid var(--controlbar-border)',
  borderRadius: 'var(--radius-xl)',
  boxShadow: 'var(--shadow-md)',
  padding: 'clamp(12px, 1.6vw, 20px)',
  marginBlockEnd: 'var(--section-gap)',
  marginBlockStart: 'calc(var(--toolbar-gap))', // Offset from top navigation
  position: 'sticky',
  top: 0,
  zIndex: 10, // Above content but below modals/popovers
  
  // Ensure proper logical properties for RTL
  direction: theme.direction,
}));

// Responsive grid container for control groups
export const ControlsGrid = styled(Box)(({ theme }) => ({
  display: 'grid',
  gap: 'var(--control-gap)',
  alignItems: 'start',
  
  // xl/lg: single-row layout (Primary | Filters | Actions)
  [theme.breakpoints.up('lg')]: {
    gridTemplateColumns: '1.2fr 1.8fr auto',
    gridTemplateAreas: '"primary filters actions"',
  },
  
  // md: two rows (Primary | Actions) on row 1, Filters on row 2
  [theme.breakpoints.between('md', 'lg')]: {
    gridTemplateColumns: '1.4fr auto',
    gridTemplateAreas: '"primary actions" "filters filters"',
  },
  
  // sm/xs: stacked; each group full width
  [theme.breakpoints.down('md')]: {
    gridTemplateColumns: '1fr',
    gridTemplateAreas: '"primary" "filters" "actions"',
  },
}));

// Control group base styles
const ControlGroupBase = styled(Box)({
  display: 'flex',
  flexWrap: 'wrap',
  gap: 'var(--control-gap)',
  alignItems: 'center',
  minInlineSize: 0, // Allow shrinking
});

// Primary selectors group (Organization, Project)
export const PrimaryGroup = styled(ControlGroupBase)({
  gridArea: 'primary',
});

// Filters/search group
export const FiltersGroup = styled(ControlGroupBase)({
  gridArea: 'filters',
  justifyContent: 'flex-start',
});

// Actions group (buttons)
export const ActionsGroup = styled(ControlGroupBase)({
  gridArea: 'actions',
  justifyContent: 'flex-end',
});

// Group divider for visual separation (only visible on lg+)
export const GroupDivider = styled(Box)(({ theme }) => ({
  width: '1px',
  height: '32px',
  background: 'var(--border)',
  opacity: 0.5,
  
  [theme.breakpoints.down('lg')]: {
    display: 'none',
  },
}));

// Styled controls components

// Selector controls (Organization, Project)
export const SelectorControl = styled(TextField)(({ theme }) => ({
  height: 'var(--control-height)',
  minInlineSize: '220px',
  inlineSize: 'clamp(220px, 30vw, 420px)',
  flex: '1 1 220px',
  
  '& .MuiInputBase-root': {
    height: 'var(--control-height)',
    background: 'var(--field_bg)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
  },
  
  '& .MuiInputLabel-root': {
    whiteSpace: 'nowrap',
    textOverflow: 'ellipsis',
    overflow: 'hidden',
    color: 'var(--muted_text)',
  },
  
  '& .MuiInputBase-input': {
    padding: '8px 12px',
    color: 'var(--text)',
  },
  
  // RTL support
  direction: theme.direction,
}));

// Search field with icon
export const SearchField = styled(TextField)(({ theme }) => ({
  height: 'var(--control-height)',
  inlineSize: 'clamp(240px, 36vw, 520px)',
  flex: '2 1 240px',
  
  '& .MuiInputBase-root': {
    height: 'var(--control-height)',
    background: 'var(--field_bg)',
    borderRadius: 'var(--radius-md)',
    border: '1px solid var(--border)',
    transition: 'border-color 120ms ease',
    
    '&:hover': {
      borderColor: 'var(--accent)',
    },
    
    '&.Mui-focused': {
      borderColor: 'var(--accent)',
      boxShadow: `0 0 0 2px var(--accent)33`, // 20% opacity accent
    },
  },
  
  '& .MuiInputBase-input': {
    padding: '8px 12px',
    color: 'var(--text)',
    
    '&::placeholder': {
      color: 'var(--muted_text)',
      opacity: 1,
    },
  },
  
  // RTL support
  direction: theme.direction,
}));

// Filter chips container
export const FilterChipsContainer = styled(Box)({
  display: 'flex',
  flexWrap: 'wrap',
  gap: '8px',
  alignItems: 'center',
  background: 'transparent',
  minHeight: 'var(--control-height)',
});

// Custom filter chip
export const FilterChip = styled(Chip)(({ theme }) => ({
  background: 'var(--chip-bg)',
  color: 'var(--text)',
  border: '1px solid var(--border)',
  borderRadius: 'var(--radius-lg)',
  height: '32px',
  transition: 'all 120ms ease',
  
  '&:hover': {
    background: 'var(--hover-bg)',
    borderColor: 'var(--accent)',
  },
  
  '&.MuiChip-clickable': {
    cursor: 'pointer',
    
    '&:focus': {
      background: 'var(--hover-bg)',
      borderColor: 'var(--accent)',
    },
  },
  
  '& .MuiChip-deleteIcon': {
    color: 'var(--muted_text)',
    
    '&:hover': {
      color: 'var(--error)',
    },
  },
  
  // RTL support
  direction: theme.direction,
}));

// Action buttons
export const ActionButton = styled(Button)(({ theme }) => ({
  height: 'var(--control-height)',
  borderRadius: 'var(--radius-md)',
  transition: 'all 120ms ease',
  whiteSpace: 'nowrap',
  
  // Responsive width
  [theme.breakpoints.up('lg')]: {
    minInlineSize: '120px',
  },
  [theme.breakpoints.between('md', 'lg')]: {
    minInlineSize: '100px',
  },
  [theme.breakpoints.down('md')]: {
    minInlineSize: 'auto',
    padding: '8px 16px',
  },
  
  // Variant styles
  '&.MuiButton-contained': {
    background: 'var(--button_bg)',
    color: 'var(--button_text)',
    border: 'none',
    
    '&:hover': {
      background: 'var(--accent-primary-hover)',
      transform: 'translateY(-1px)',
      boxShadow: 'var(--shadow-sm)',
    },
    
    '&:disabled': {
      background: 'var(--border)',
      color: 'var(--muted_text)',
    },
  },
  
  '&.MuiButton-outlined': {
    border: '1px solid var(--border)',
    background: 'transparent',
    color: 'var(--text)',
    
    '&:hover': {
      background: 'var(--hover-bg)',
      borderColor: 'var(--accent)',
    },
    
    '&:disabled': {
      borderColor: 'var(--border)',
      color: 'var(--muted_text)',
    },
  },
  
  // RTL support
  direction: theme.direction,
}));

// Primary action button (New Document)
export const PrimaryActionButton = styled(ActionButton)({
  background: 'var(--accent)',
  color: 'var(--on-accent)',
  fontWeight: 600,
  
  '&:hover': {
    background: 'var(--accent-primary-hover)',
  },
});

// More menu button for overflow actions
export const MoreMenuButton = styled(Button)(({ theme }) => ({
  minWidth: 'var(--control-height)',
  width: 'var(--control-height)',
  height: 'var(--control-height)',
  borderRadius: 'var(--radius-md)',
  border: '1px solid var(--border)',
  background: 'transparent',
  color: 'var(--text)',
  
  '&:hover': {
    background: 'var(--hover-bg)',
    borderColor: 'var(--accent)',
  },
  
  // Only show on small screens
  [theme.breakpoints.up('md')]: {
    display: 'none',
  },
}));

// Optional group label for clarity
export const GroupLabel = styled(Box)(({ theme }) => ({
  fontSize: '0.75rem',
  fontWeight: 600,
  color: 'var(--muted_text)',
  textTransform: 'uppercase',
  letterSpacing: '0.5px',
  marginBlockEnd: '4px',
  
  // Only show on larger screens
  [theme.breakpoints.down('md')]: {
    display: 'none',
  },
}));