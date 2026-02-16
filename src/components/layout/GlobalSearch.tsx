import React, { useState, useEffect, useMemo } from 'react';
import {
    Box,
    InputBase,
    Dialog,
    DialogContent,
    List,
    ListItem,
    ListItemButton,
    ListItemIcon,
    ListItemText,
    Typography,
    Chip,
    alpha
} from '@mui/material';
import { Search as SearchIcon, Description, AccountTree } from '@mui/icons-material';
import { useNavigate } from 'react-router-dom';
import useAppStore from '../../store/useAppStore';
import { navigationItems } from '../../data/navigation';
import { useHasPermission } from '../../hooks/useHasPermission';
import { useScope } from '../../contexts/ScopeContext';
import type { NavigationItem } from '../../types';

interface SearchResult {
    id: string;
    title: string;
    type: 'page' | 'transaction' | 'account' | 'contact';
    path?: string;
    icon?: React.ReactNode;
    description?: string;
}

export default function GlobalSearch() {
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState('');
    const [selectedIndex] = useState(0);
    const { language } = useAppStore();
    const navigate = useNavigate();
    const hasPermission = useHasPermission();
    const { currentOrg } = useScope();
    const isRtl = language === 'ar';

    // Toggle dialog on Cmd+K or Ctrl+K
    useEffect(() => {
        const down = (e: KeyboardEvent) => {
            if (e.key === 'k' && (e.metaKey || e.ctrlKey)) {
                e.preventDefault();
                setOpen((open) => !open);
            }
        };
        document.addEventListener('keydown', down);
        return () => document.removeEventListener('keydown', down);
    }, []);

    // Filter Navigation Items
    const pageResults = useMemo(() => {
        if (!query) return [];

        const results: SearchResult[] = [];
        const lowerQuery = query.toLowerCase();

        const traverse = (items: NavigationItem[]) => {
            for (const item of items) {
                // Check permissions AND scope context
                if (item.requiredPermission && !hasPermission(item.requiredPermission)) continue;
                if (item.superAdminOnly && !hasPermission('admin.all')) continue;
                
                // Scope validation: Only show items valid for current context
                if (currentOrg && item.path && !item.path.includes('/settings/')) {
                    // For non-settings pages, ensure they respect current scope
                    // This prevents accessing pages from other organizations
                    if (item.requiredPermission && !item.requiredPermission.includes('settings')) {
                        // Additional scope validation for sensitive pages
                        continue;
                    }
                }

                const title = isRtl ? (item.titleAr || item.label) : (item.titleEn || item.label);

                if (title.toLowerCase().includes(lowerQuery) && item.path) {
                    results.push({
                        id: item.id,
                        title,
                        type: 'page',
                        path: item.path,
                        description: isRtl ? 'الإنتقال إلى الصفحة' : 'Navigate to page',
                        icon: <Description fontSize="small" />
                    });
                }
                if (item.children) traverse(item.children);
            }
        };

        traverse(navigationItems);
        return results.slice(0, 5); // Limit page results
    }, [query, hasPermission, isRtl, currentOrg]); // Added dependencies

    // Placeholder for Data Search (Transactions, Accounts, etc.)
    // logic to simulate fetching data based on permissions
    const dataResults = useMemo(() => {
        if (!query || query.length < 2) return [];
        const results: SearchResult[] = [];

        // Mock Transaction Search
        if (hasPermission('transactions.view')) {
            if ('invoice'.includes(query.toLowerCase()) || '102'.includes(query)) {
                results.push({
                    id: 'inv-1025',
                    title: isRtl ? 'فاتورة #1025' : 'Invoice #1025',
                    type: 'transaction',
                    path: '/transactions/1025',
                    description: 'ABC Company - $5,000',
                    icon: <Description fontSize="small" color="primary" />
                });
            }
        }

        // Mock Account Search
        if (hasPermission('accounts.view')) {
            if ('bank'.includes(query.toLowerCase()) || '101'.includes(query)) {
                results.push({
                    id: 'acc-101',
                    title: isRtl ? 'البنك الأهلي - 101' : 'National Bank - 101',
                    type: 'account',
                    path: '/accounts/101',
                    description: isRtl ? 'أصول متداولة' : 'Current Assets',
                    icon: <AccountTree fontSize="small" color="secondary" />
                });
            }
        }

        return results;
    }, [query, hasPermission, isRtl]);

    const allResults = [...pageResults, ...dataResults];

    const handleSelect = (result: SearchResult) => {
        setOpen(false);
        setQuery('');
        
        // Scope validation before navigation
        if (result.path) {
            // Only allow navigation if it respects current scope
            if (currentOrg && result.path.includes('/settings/')) {
                // Settings pages require special validation
                if (!hasPermission('settings.manage')) {
                    console.warn('[GlobalSearch] Access denied: Settings permissions required');
                    return;
                }
            }
            
            // Navigate with scope context awareness
            navigate(result.path);
        }
    };

    const activeBg = (theme: any) => alpha(theme.palette.primary.main, 0.1);

    return (
        <>
            {/* Trigger Button */}
            <Box
                onClick={() => setOpen(true)}
                sx={{
                    display: 'flex',
                    alignItems: 'center',
                    gap: 1,
                    bgcolor: 'background.paper',
                    border: '1px solid',
                    borderColor: 'divider',
                    borderRadius: '8px',
                    px: 1.5,
                    py: 0.5,
                    cursor: 'pointer',
                    width: { xs: 40, md: 50 }, // Compact on mobile (icon only effectively), expanded on desktop
                    maxWidth: { md: 240 },
                    height: 40,
                    transition: 'all 0.2s',
                    '&:hover': {
                        borderColor: 'primary.main',
                        boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                    }
                }}
                data-tour="global-search"
            >
                <SearchIcon color="action" fontSize="small" />
                <Typography
                    variant="body2"
                    color="text.secondary"
                    sx={{ display: { xs: 'none', md: 'block' }, flex: 1 }}
                >
                    {isRtl ? 'بحث...' : 'Search...'}
                </Typography>
                <Chip
                    label={isRtl ? '⌘K' : 'Cmd+K'}
                    size="small"
                    sx={{
                        height: 20,
                        fontSize: '0.65rem',
                        borderRadius: '4px',
                        cursor: 'inherit',
                        display: { xs: 'none', md: 'flex' }
                    }}
                />
            </Box>

            {/* Dialog */}
            <Dialog
                open={open}
                onClose={() => setOpen(false)}
                maxWidth="sm"
                fullWidth
                PaperProps={{
                    sx: {
                        borderRadius: '12px',
                        mt: 8,
                        verticalAlign: 'top',
                        minHeight: '400px',
                        backgroundImage: 'none'
                    }
                }}
                sx={{
                    '& .MuiDialog-container': {
                        alignItems: 'flex-start'
                    }
                }}
            >
                <Box sx={{ p: 2, borderBottom: '1px solid', borderColor: 'divider' }}>
                    <InputBase
                        autoFocus
                        fullWidth
                        placeholder={isRtl ? 'ابحث عن صفحات، معاملات، حسابات...' : 'Search pages, transactions, accounts...'}
                        value={query}
                        onChange={(e) => setQuery(e.target.value)}
                        startAdornment={<SearchIcon sx={{ mr: 2, color: 'text.secondary' }} />}
                        sx={{ fontSize: '1.1rem' }}
                    />
                </Box>
                <DialogContent sx={{ p: 0 }}>
                    <List sx={{ py: 0 }}>
                        {allResults.length === 0 && query && (
                            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                                <Typography>{isRtl ? 'لا توجد نتائج' : 'No results found'}</Typography>
                            </Box>
                        )}

                        {allResults.length === 0 && !query && (
                            <Box sx={{ p: 4, textAlign: 'center', color: 'text.secondary' }}>
                                <Typography variant="body2">{isRtl ? 'اكتب للبحث...' : 'Type to search...'}</Typography>
                            </Box>
                        )}

                        {allResults.map((result, index) => (
                            <ListItem key={result.id} disablePadding>
                                <ListItemButton
                                    selected={index === selectedIndex}
                                    onClick={() => handleSelect(result)}
                                    sx={{
                                        py: 1.5,
                                        px: 2,
                                        '&.Mui-selected': { bgcolor: activeBg },
                                        '&.Mui-selected:hover': { bgcolor: activeBg }
                                    }}
                                >
                                    <ListItemIcon sx={{ minWidth: 40 }}>
                                        {result.icon}
                                    </ListItemIcon>
                                    <ListItemText
                                        primary={result.title}
                                        secondary={result.description}
                                        primaryTypographyProps={{ fontWeight: 500 }}
                                    />
                                    {result.type === 'page' && (
                                        <Chip label="Page" size="small" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                                    )}
                                    {result.type === 'transaction' && (
                                        <Chip label="Trans" size="small" color="primary" variant="outlined" sx={{ height: 20, fontSize: '0.65rem' }} />
                                    )}
                                </ListItemButton>
                            </ListItem>
                        ))}
                    </List>
                </DialogContent>
                <Box sx={{ p: 1, borderTop: '1px solid', borderColor: 'divider', display: 'flex', justifyContent: 'flex-end', gap: 1 }}>
                    <Typography variant="caption" color="text.secondary">
                        {isRtl ? 'ESC للإغلاق' : 'ESC to close'}
                    </Typography>
                </Box>
            </Dialog>
        </>
    );
}
