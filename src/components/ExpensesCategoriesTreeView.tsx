import React, { useState, useMemo } from 'react';
import {
  Box,
  IconButton,
  Typography,
  Chip,
  Tooltip,
  Collapse,
  Paper,
  Alert,
  CircularProgress,
  Fade
} from '@mui/material';
import {
  ChevronRight,
  ExpandMore,
  Edit,
  Add,
  Delete,
  VisibilityOff,
  Visibility,
  AccountTree,
  Category
} from '@mui/icons-material';
import { lightTheme as theme } from '../styles/theme';

type ExpensesCategoryView = {
  id: string;
  code: string;
  name: string;
  name_ar: string;
  is_active: boolean;
  parent_id?: string | null;
  child_count: number;
  linked_account_code?: string | null;
  linked_account_name?: string | null;
  linked_account_name_ar?: string | null;
  children?: ExpensesCategoryView[];
}

// Minimal i18n fallback for this component
const translations: Record<string, string> = {
  'common.inactive': 'غير نشط',
  'common.children': 'فرع',
  'common.edit': 'تعديل',
  'common.deactivate': 'تعطيل',
  'common.activate': 'تفعيل',
  'common.delete': 'حذف',
  'expensesCategories.addSubcategory': 'إضافة فرعي',
  'expensesCategories.cannotDeleteWithChildren': 'لا يمكن الحذف مع وجود فروع',
  'expensesCategories.linkedAccount': 'الحساب المربوط',
  'expensesCategories.noResultsFound': 'لا توجد نتائج مطابقة',
  'expensesCategories.noCategoriesYet': 'لا توجد فئات حتى الآن',
}
const t = (k: string) => translations[k] ?? k
const isRtlDocument = () => (typeof document !== 'undefined' ? document.documentElement.dir === 'rtl' : true)

interface ExpensesCategoriesTreeViewProps {
  categories: ExpensesCategoryView[];
  searchTerm: string;
  onEdit: (category: ExpensesCategoryView) => void;
  onAddChild: (parentId: string) => void;
  onToggleActive: (category: ExpensesCategoryView) => void;
  onDelete: (category: ExpensesCategoryView) => void;
  loading?: boolean;
  error?: string | null;
}

interface TreeNodeProps {
  category: ExpensesCategoryView;
  level: number;
  onEdit: (category: ExpensesCategoryView) => void;
  onAddChild: (parentId: string) => void;
  onToggleActive: (category: ExpensesCategoryView) => void;
  onDelete: (category: ExpensesCategoryView) => void;
  searchTerm: string;
}

const TreeNode: React.FC<TreeNodeProps> = ({
  category,
  level,
  onEdit,
  onAddChild,
  onToggleActive,
  onDelete,
  searchTerm
}) => {
  const [expanded, setExpanded] = useState(true);
  
  const hasChildren = category.child_count > 0;
  const canAddChild = level < 3; // Max depth is 4, so level 3 is the last that can have children
  const canDelete = category.child_count === 0; // Can only delete if no children
  
  const isRtl = isRtlDocument();
  const indentSize = 32;
  
  // Highlight search matches
  const highlightMatch = (text: string) => {
    if (!searchTerm) return text;
    const regex = new RegExp(`(${searchTerm})`, 'gi');
    const parts = text.split(regex);
    return (
      <>
        {parts.map((part, i) => 
          regex.test(part) ? (
            <Box
              key={i}
              component="span"
              sx={{ 
                backgroundColor: theme.palette.warning.light,
                color: theme.palette.warning.contrastText,
                px: 0.5,
                borderRadius: 0.5
              }}
            >
              {part}
            </Box>
          ) : (
            part
          )
        )}
      </>
    );
  };
  
  return (
    <Box>
      <Paper
        elevation={0}
        sx={{
          display: 'flex',
          alignItems: 'center',
          py: 1,
          px: 2,
          mb: 0.5,
          backgroundColor: category.is_active 
            ? 'background.paper' 
            : theme.palette.action.disabledBackground,
          borderLeft: `3px solid ${theme.palette.primary.main}`,
          '&:hover': {
            backgroundColor: theme.palette.action.hover,
            '& .action-buttons': {
              opacity: 1
            }
          },
          transition: 'all 0.2s',
          ...(isRtl ? { mr: level * indentSize / 8 } : { ml: level * indentSize / 8 })
        }}
      >
        {/* Expand/Collapse button */}
        <IconButton
          size="small"
          onClick={() => setExpanded(!expanded)}
          disabled={!hasChildren}
          sx={{ 
            visibility: hasChildren ? 'visible' : 'hidden',
            mr: 1
          }}
        >
          {expanded ? <ExpandMore /> : (isRtl ? <ChevronRight /> : <ChevronRight />)}
        </IconButton>
        
        {/* Category icon */}
        <Category 
          fontSize="small" 
          sx={{ 
            mr: 1.5,
            color: category.is_active ? theme.palette.primary.main : theme.palette.text.disabled
          }}
        />
        
        {/* Category info */}
        <Box sx={{ flexGrow: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
            <Typography
              variant="body1"
              sx={{ 
                fontWeight: level === 0 ? 600 : 400,
                textDecoration: !category.is_active ? 'line-through' : 'none',
                color: !category.is_active ? 'text.disabled' : 'text.primary'
              }}
            >
              {highlightMatch(category.code)}
            </Typography>
            <Typography variant="body1" sx={{ mx: 1 }}>-</Typography>
            <Typography
              variant="body1"
              sx={{
                color: !category.is_active ? 'text.disabled' : 'text.primary'
              }}
            >
              {highlightMatch(isRtl ? category.name_ar : category.name)}
            </Typography>
            
            {/* Status chips */}
            {!category.is_active && (
              <Chip
                label={t('common.inactive')}
                size="small"
                color="default"
                sx={{ ml: 1 }}
              />
            )}
            {hasChildren && (
              <Chip
                label={`${category.child_count} ${t('common.children')}`}
                size="small"
                variant="outlined"
                icon={<AccountTree fontSize="small" />}
                sx={{ ml: 1 }}
              />
            )}
          </Box>
          
          {/* Linked account info */}
          {category.linked_account_code && (
            <Typography
              variant="caption"
              sx={{
                color: 'text.secondary',
                display: 'block',
                mt: 0.5
              }}
            >
              {t('expensesCategories.linkedAccount')}: {category.linked_account_code} - {
                isRtl ? category.linked_account_name_ar : category.linked_account_name
              }
            </Typography>
          )}
        </Box>
        
        {/* Action buttons */}
        <Box
          className="action-buttons"
          sx={{
            display: 'flex',
            gap: 0.5,
            opacity: 0,
            transition: 'opacity 0.2s'
          }}
        >
          <Tooltip title={t('common.edit')}>
            <IconButton
              size="small"
              onClick={() => onEdit(category)}
              sx={{ color: theme.palette.primary.main }}
            >
              <Edit fontSize="small" />
            </IconButton>
          </Tooltip>
          
          {canAddChild && (
            <Tooltip title={t('expensesCategories.addSubcategory')}>
              <IconButton
                size="small"
                onClick={() => onAddChild(category.id)}
                sx={{ color: theme.palette.success.main }}
              >
                <Add fontSize="small" />
              </IconButton>
            </Tooltip>
          )}
          
          <Tooltip title={category.is_active ? t('common.deactivate') : t('common.activate')}>
            <IconButton
              size="small"
              onClick={() => onToggleActive(category)}
              sx={{ color: theme.palette.warning.main }}
            >
              {category.is_active ? <VisibilityOff fontSize="small" /> : <Visibility fontSize="small" />}
            </IconButton>
          </Tooltip>
          
          <Tooltip 
            title={
              canDelete 
                ? t('common.delete') 
                : t('expensesCategories.cannotDeleteWithChildren')
            }
          >
            <span>
              <IconButton
                size="small"
                onClick={() => onDelete(category)}
                disabled={!canDelete}
                sx={{ 
                  color: canDelete ? theme.palette.error.main : theme.palette.action.disabled
                }}
              >
                <Delete fontSize="small" />
              </IconButton>
            </span>
          </Tooltip>
        </Box>
      </Paper>
      
      {/* Children */}
      {hasChildren && (
        <Collapse in={expanded} timeout="auto" unmountOnExit>
          <Box>
            {category.children?.map((child: ExpensesCategoryView) => (
              <TreeNode
                key={child.id}
                category={child}
                level={level + 1}
                onEdit={onEdit}
                onAddChild={onAddChild}
                onToggleActive={onToggleActive}
                onDelete={onDelete}
                searchTerm={searchTerm}
              />
            ))}
          </Box>
        </Collapse>
      )}
    </Box>
  );
};

export const ExpensesCategoriesTreeView: React.FC<ExpensesCategoriesTreeViewProps> = ({
  categories,
  searchTerm,
  onEdit,
  onAddChild,
  onToggleActive,
  onDelete,
  loading = false,
  error = null
}) => {
  // Build tree structure from flat list
  const tree = useMemo(() => {
    const map = new Map<string, ExpensesCategoryView>();
    const roots: ExpensesCategoryView[] = [];
    
    // First pass: create map
    categories.forEach(cat => {
      map.set(cat.id, { ...cat, children: [] });
    });
    
    // Second pass: build tree
    categories.forEach(cat => {
      const node = map.get(cat.id)!;
      if (cat.parent_id) {
        const parent = map.get(cat.parent_id);
        if (parent) {
          if (!parent.children) parent.children = [];
          parent.children.push(node);
        }
      } else {
        roots.push(node);
      }
    });
    
    // Sort children at each level
    const sortNodes = (nodes: ExpensesCategoryView[]) => {
      nodes.sort((a, b) => a.code.localeCompare(b.code));
      nodes.forEach(node => {
        if (node.children && node.children.length > 0) {
          sortNodes(node.children);
        }
      });
    };
    
    sortNodes(roots);
    return roots;
  }, [categories]);
  
  // Filter tree based on search
  const filteredTree = useMemo(() => {
    if (!searchTerm) return tree;
    
    const filterNode = (node: ExpensesCategoryView): ExpensesCategoryView | null => {
      const matches = 
        node.code.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        node.name_ar.toLowerCase().includes(searchTerm.toLowerCase());
      
      const filteredChildren = node.children
        ?.map((child: ExpensesCategoryView) => filterNode(child))
        .filter(Boolean) as ExpensesCategoryView[] | undefined;
      
      if (matches || (filteredChildren && filteredChildren.length > 0)) {
        return {
          ...node,
          children: filteredChildren
        };
      }
      
      return null;
    };
    
    return tree.map(node => filterNode(node)).filter(Boolean) as ExpensesCategoryView[];
  }, [tree, searchTerm]);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  if (error) {
    return (
      <Alert severity="error" sx={{ m: 2 }}>
        {error}
      </Alert>
    );
  }
  
  if (filteredTree.length === 0) {
    return (
      <Box sx={{ p: 4, textAlign: 'center' }}>
        <Category sx={{ fontSize: 48, color: 'text.disabled', mb: 2 }} />
        <Typography variant="h6" color="text.secondary">
          {searchTerm 
            ? t('expensesCategories.noResultsFound')
            : t('expensesCategories.noCategoriesYet')
          }
        </Typography>
      </Box>
    );
  }
  
  return (
    <Fade in>
      <Box sx={{ p: 2 }}>
        {filteredTree.map((rootCategory) => (
          <TreeNode
            key={rootCategory.id}
            category={rootCategory}
            level={0}
            onEdit={onEdit}
            onAddChild={onAddChild}
            onToggleActive={onToggleActive}
            onDelete={onDelete}
            searchTerm={searchTerm}
          />
        ))}
      </Box>
    </Fade>
  );
};
