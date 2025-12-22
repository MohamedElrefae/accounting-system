import React from 'react';
import { Box, Typography, Avatar, Skeleton } from '@mui/material';
import useAppStore from '../../store/useAppStore';
import { useScopeOptional } from '../../contexts/ScopeContext';

interface BrandHeaderProps {
    collapsed: boolean;
}

const BrandHeader: React.FC<BrandHeaderProps> = ({ collapsed }) => {
    const { language } = useAppStore();
    const isRtl = language === 'ar';

    const scope = useScopeOptional();
    const activeOrg = scope?.currentOrg ?? null;

    const companyName = activeOrg
        ? (isRtl ? (activeOrg.name_ar || activeOrg.name) : activeOrg.name)
        : (isRtl ? 'نظام البركة' : 'Al-Baraka ERP');

    const logoUrl = activeOrg?.logo_url;

    // Modern gradient background
    const headerBg = (theme: any) =>
        `linear-gradient(135deg, ${theme.palette.primary.main}15 0%, ${theme.palette.primary.light}10 100%)`;

    const logoBg = (theme: any) =>
        `linear-gradient(135deg, ${theme.palette.primary.main} 0%, ${theme.palette.primary.dark} 100%)`;

    if (scope?.isLoadingOrgs) {
        return (
            <Box sx={{ p: 2, display: 'flex', alignItems: 'center', gap: 2, minHeight: 72 }}>
                <Skeleton variant="rounded" width={40} height={40} />
                {!collapsed && <Skeleton variant="text" width={120} height={32} />}
            </Box>
        );
    }

    return (
        <Box
            sx={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: collapsed ? 'center' : 'flex-start',
                px: collapsed ? 1 : 2.5,
                py: 2.5,
                minHeight: 72,
                borderBottom: 1,
                borderColor: 'divider',
                background: headerBg,
                position: 'relative',
                '&::after': {
                    content: '""',
                    position: 'absolute',
                    bottom: 0,
                    left: 0,
                    right: 0,
                    height: '1px',
                    background: (theme) =>
                        `linear-gradient(90deg, transparent 0%, ${theme.palette.primary.main}40 50%, transparent 100%)`,
                },
            }}
        >
            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1.5 }}>
                {logoUrl ? (
                    <Avatar
                        src={logoUrl}
                        variant="rounded"
                        sx={{
                            width: collapsed ? 44 : 40,
                            height: collapsed ? 44 : 40,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            border: '1px solid',
                            borderColor: 'divider'
                        }}
                    />
                ) : (
                    <Box
                        sx={{
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            width: collapsed ? 44 : 40,
                            height: collapsed ? 44 : 40,
                            borderRadius: '12px',
                            background: logoBg,
                            boxShadow: '0 4px 12px rgba(0,0,0,0.15)',
                            color: 'primary.contrastText',
                            fontWeight: 700,
                            fontSize: '1.2rem',
                        }}
                    >
                        {/* AB Badge - Always visible */}
                        AB
                    </Box>
                )}

                {!collapsed && (
                    <Typography
                        variant="h6"
                        noWrap
                        component="div"
                        sx={{
                            color: 'primary.main',
                            fontWeight: 700,
                            fontSize: '18px',
                            letterSpacing: '-0.5px',
                            animation: 'fadeIn 0.3s ease-in',
                            '@keyframes fadeIn': {
                                '0%': { opacity: 0, transform: 'translateX(-10px)' },
                                '100%': { opacity: 1, transform: 'translateX(0)' }
                            }
                        }}
                    >
                        {companyName}
                    </Typography>
                )}
            </Box>
        </Box>
    );
};

export default BrandHeader;
